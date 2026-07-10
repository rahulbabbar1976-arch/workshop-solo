import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import prisma from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { buildPartsKey, checkBrain, saveToiBrain } from '@/lib/ai-brain';


export async function POST(request: Request) {
  try {
    const { fileUrl } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'No fileUrl provided' }, { status: 400 });
    }

    // Fetch API Key from WorkshopProfile
    const profile = await prisma.workshopProfile.findFirst();
    const apiKey = profile?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
       return NextResponse.json({ success: false, error: 'AI is not configured. Please add your Gemini API Key in the Owner Settings.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Read the file locally to get base64
    const filename = path.basename(fileUrl);
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
    const fileBuffer = await readFile(filepath);
    const mimeType = filename.endsWith('.png') ? 'image/png' : (filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg');

    // Step A: Hash Image & Check Exact Image Match
    const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const cachedByHash = await prisma.partScanCache.findUnique({
      where: { imageHash }
    });

    if (cachedByHash && cachedByHash.partDataJson) {
      try {
        const cachedPartsList = JSON.parse(cachedByHash.partDataJson);
        return NextResponse.json({ success: true, parts: cachedPartsList, source: 'local_hash_cache' });
      } catch (e) {
        // ignore JSON parse error in cache
      }
    }

    let cleanOcrText = '';
    let cacheKey = '';
    try {
      const optimizedBuffer = await sharp(fileBuffer).grayscale().normalize().toBuffer();
      const tesseractPromise = Tesseract.recognize(optimizedBuffer, 'eng');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tesseract timeout')), 3000));
      const result: any = await Promise.race([tesseractPromise, timeoutPromise]);
      cleanOcrText = result.data.text.replace(/[^A-Z0-9]/ig, '').toUpperCase();

      if (cleanOcrText && cleanOcrText.length > 3) {
        cacheKey = buildPartsKey(cleanOcrText);
        const brainRes = await checkBrain('PARTS_SCAN', cacheKey);
        if (brainRes.hit && brainRes.response) {
          return NextResponse.json({ 
            success: true, 
            parts: brainRes.response, 
            source: 'local_brain' 
          });
        }
      }
    } catch (ocrErr) {
      console.warn('Local OCR failed, falling back to local brain scan:', ocrErr);
    }

    // Step B: Query Local Ollama Vision VLM (Mimicking/Learning to run offline)
    let partsList = null;
    let localScannedSource = 'cloud_gemini';

    try {
      // Find top 2 lessons mapped from previous Gemini runs
      const lessons = await prisma.aIKnowledgeCache.findMany({
        where: { cacheType: 'PARTS_SCAN', source: { in: ['gemini', 'user'] } },
        orderBy: { useCount: 'desc' },
        take: 2
      });

      let fewShotContext = "";
      if (lessons.length > 0) {
        fewShotContext = "\nHere are examples of how physical parts or label texts were analyzed:\n" + 
          lessons.map(l => `Input Text: "${l.inputSummary}"\nOutput JSON:\n${l.responseJson}`).join("\n---\n") + "\n";
      }

      const ollamaPayload = {
        model: "llava",
        prompt: `You are an expert auto-mechanic AI. Please visually analyze this image to identify all vehicle parts present.
The image may contain one or multiple physical parts, or their packaging/labels.
Identify the visual physical part itself if there is no box/label.
Extract maximum details for future data usage.
Return the result strictly as a JSON array of objects. Do not include markdown formatting or backticks.
Format:
[
  {
    "partName": "string (e.g. Brake Pads, Oil Filter)",
    "brand": "string or null",
    "partNumber": "string or null",
    "category": "string (e.g. Brakes, Engine, Service)",
    "quantityRequested": 1
  }
]
${fewShotContext}
Please analyze this new image and return ONLY the JSON representation:`,
        images: [fileBuffer.toString("base64")],
        stream: false
      };

      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ollamaPayload),
        signal: AbortSignal.timeout(15000) // 15s timeout
      });

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json();
        const responseText = (ollamaData.response || "").trim();
        partsList = JSON.parse(responseText.replace(/```json|```/g, ''));
        localScannedSource = 'local_ollama_vlm';
      }
    } catch (ollamaErr) {
      console.warn('Local Ollama VLM scan failed or timed out. Falling back to Gemini:', ollamaErr);
    }

    // Step C: Gemini Fallback if Ollama was not loaded/failed
    if (!partsList) {
      const prompt = `You are an expert auto-mechanic AI. Please visually analyze this image to identify all vehicle parts present.
The image may contain one or multiple physical parts, or their packaging/labels.
Identify the visual physical part itself if there is no box/label.
Extract maximum details for future data usage.
Return the result strictly as a JSON array of objects. Do not include markdown formatting or backticks.
Format:
[
  {
    "partName": "string (e.g. Brake Pads, Oil Filter)",
    "brand": "string or null",
    "partNumber": "string or null",
    "category": "string (e.g. Brakes, Engine, Service)",
    "quantityRequested": 1
  }
]`;

      let resultText = '[]';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [
                { text: prompt }, 
                { inlineData: { data: fileBuffer.toString("base64"), mimeType } }
            ]}
          ],
          config: {
            responseMimeType: "application/json"
          }
        });
        resultText = response.text || '[]';
        partsList = JSON.parse(resultText);
      } catch (e: any) {
        console.warn("Parts AI generation failed", e.message);
        return NextResponse.json({ success: false, error: 'AI limit exceeded or failed to parse parts list' }, { status: 429 });
      }
    }

    // Match against PartsMaster
    const matchedParts = await Promise.all(partsList.map(async (p: any) => {
        if (!p.partName) return null;
        
        // Search by partName or partNumber
        const query: any = { OR: [] };
        if (p.partName) query.OR.push({ partName: { contains: p.partName } });
        if (p.partNumber) query.OR.push({ partNumber: { contains: p.partNumber } });
        if (query.OR.length === 0) return { ...p, status: 'pending_verification', partMasterId: null, mechanicNote: 'AI Scanned - Verification Required' };

        const matches = await prisma.partsMaster.findMany({ where: query, take: 1 });
        if (matches.length > 0) {
            return {
                partMasterId: matches[0].id,
                partName: matches[0].partName,
                partNumber: matches[0].partNumber,
                brand: matches[0].brand || p.brand,
                category: matches[0].category || p.category,
                quantityRequested: p.quantityRequested || 1,
                status: 'requested',
                mechanicNote: 'AI Scanned & Matched'
            };
        }

        return {
            ...p,
            partMasterId: null,
            status: 'pending_verification',
            mechanicNote: 'AI Scanned - Verification Required'
        };
    }));

    const finalParts = matchedParts.filter(Boolean);

    // Save to AI Brain (caching lessons so it learns locally)
    try {
      if (cacheKey) {
        await saveToiBrain(
          'PARTS_SCAN', 
          cacheKey, 
          cleanOcrText.slice(0, 80), 
          finalParts, 
          localScannedSource === 'local_ollama_vlm' ? 'user' : 'gemini',
          JSON.stringify(finalParts)
        );
      }
      
      const imageOcrKey = buildPartsKey(imageHash);
      await saveToiBrain(
        'PARTS_SCAN',
        imageOcrKey,
        'image_hash_fingerprint',
        finalParts,
        localScannedSource === 'local_ollama_vlm' ? 'user' : 'gemini',
        JSON.stringify(finalParts)
      );
    } catch (e) {
      console.error('Failed to save part scan to Brain:', e);
    }

    return NextResponse.json({ 
      success: true, 
      parts: finalParts,
      source: localScannedSource
    });
  } catch (error: any) {
    console.error('Vision API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

