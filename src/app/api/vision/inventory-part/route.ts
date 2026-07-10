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

    // Step A: Hash Image & Try to check AI Brain with local OCR text first
    let cleanOcrText = '';
    let ocrCacheKey = '';
    try {
      const optimizedBuffer = await sharp(fileBuffer).grayscale().normalize().toBuffer();
      const tesseractPromise = Tesseract.recognize(optimizedBuffer, 'eng');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tesseract timeout')), 3000));
      const result: any = await Promise.race([tesseractPromise, timeoutPromise]);
      cleanOcrText = result.data.text;
      
      ocrCacheKey = buildPartsKey(cleanOcrText);

      if (ocrCacheKey.length > 5) {
        const brainRes = await checkBrain('PARTS_SCAN', ocrCacheKey);
        
        if (brainRes.hit && brainRes.response) {
          // Attempt to match against existing PartsMaster
          const match = await findPartMatch(brainRes.response);
          return NextResponse.json({ success: true, partData: brainRes.response, match, source: 'local_brain_ocr' });
        }
      }
    } catch (ocrErr) {
      console.warn('Local OCR failed, falling back to Gemini:', ocrErr);
    }

    const prompt = `You are an expert auto-mechanic inventory AI. Please visually analyze this image to identify the physical vehicle part or its packaging/label.
Extract maximum details for future data usage in a Parts Catalog.
Return the result strictly as a JSON object. Do not include markdown formatting or backticks.
Format:
{
  "partName": "string (e.g. Brake Pads, Oil Filter)",
  "partNumber": "string or null",
  "oemPartNumber": "string or null",
  "brand": "string or null",
  "manufacturerName": "string or null",
  "vehicleMake": "string (e.g. Maruti Suzuki, Hyundai) or null",
  "vehicleModel": "string (e.g. Swift, i20) or null",
  "vehicleYear": "string (e.g. 2018-2022, 2020) or null",
  "compatibility": "string (Any other compatibility notes) or null",
  "category": "string (e.g. Brakes, Engine) or null"
}`;

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

    const resultText = response.text || '{}';
    let partData: any = {};
    try {
        partData = JSON.parse(resultText);
    } catch(e) {
        console.error("Failed to parse Gemini response", resultText);
        return NextResponse.json({ success: false, error: 'AI returned invalid JSON format' }, { status: 500 });
    }

    // Cache the result in AI Brain
    try {
      if (ocrCacheKey && ocrCacheKey.length > 5 && partData.partName) {
        await saveToiBrain('PARTS_SCAN', ocrCacheKey, `Part: ${partData.partName} ${partData.brand || ''}`, partData);
      }
    } catch (e) {
      console.error('Failed to cache part scan to AI Brain:', e);
    }

    // Attempt to match against existing PartsMaster
    const match = await findPartMatch(partData);

    return NextResponse.json({
      success: true,
      partData,
      match: match ? {
        id: match.id,
        partName: match.partName,
        stockQuantity: match.stockQuantity
      } : null,
      source: 'cloud_gemini'
    });

  } catch (err: any) {
    console.error('Inventory Part Vision API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function findPartMatch(partData: any) {
  const query: any = { OR: [] };
  if (partData.partName) query.OR.push({ partName: { contains: partData.partName } });
  if (partData.partNumber) query.OR.push({ partNumber: { contains: partData.partNumber } });
  if (partData.oemPartNumber) query.OR.push({ oemPartNumber: { contains: partData.oemPartNumber } });
  if (partData.vehicleMake) query.OR.push({ vehicleMake: { contains: partData.vehicleMake } });
  if (partData.vehicleModel) query.OR.push({ vehicleModel: { contains: partData.vehicleModel } });

  if (query.OR.length > 0) {
    const matches = await prisma.partsMaster.findMany({ where: query, take: 1 });
    if (matches.length > 0) {
      return matches[0];
    }
  }
  return null;
}
