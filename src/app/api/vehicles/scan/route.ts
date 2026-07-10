import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { buildPlateKey, checkBrain, saveToiBrain } from '@/lib/ai-brain';

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file uploaded' }, { status: 400 });
    }

    // Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Step A: Hash Image
    const imageHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Create temp file for Python ANPR
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `${imageHash}.jpg`);
    await writeFileAsync(tempFilePath, buffer);
    
    let cleanOcrText = '';
    let detectedPlateType = 'Private Vehicle';
    try {
      // Execute local Python ANPR pipeline using the installed virtual env
      const pythonPath = `C:\\Users\\rahul\\OneDrive\\Desktop\\files\\APNR\\.venv\\Scripts\\python.exe`;
      const anprDir   = `C:\\Users\\rahul\\OneDrive\\Desktop\\files\\APNR`;
      const scriptPath = path.join(anprDir, 'cli.py');
      const command = `"${pythonPath}" "${scriptPath}" --image "${tempFilePath}" --detector yolo --yolo-weights "C:\\Users\\rahul\\OneDrive\\Desktop\\workshop\\plate_yolo.pt" --no-log --no-display`;
      
      const { stdout } = await execAsync(command, { timeout: 45000, cwd: anprDir });

      
      // Parse output: Plate: <PLATE>  type=<TYPE>  confidence=<CONF>
      const match = stdout.match(/Plate:\s*([A-Z0-9]+)\s+type=([^\n\r\t]+?)\s+confidence=([0-9.]+)/i);
      if (match) {
        cleanOcrText = buildPlateKey(match[1]);
        detectedPlateType = match[2].trim();
        
        // Check AI Brain for make and model
        const brainRes = await checkBrain('PLATE_SCAN', cleanOcrText);
        
        // Clean up temp file
        try { await unlinkAsync(tempFilePath); } catch {}
        
        return NextResponse.json({ 
          success: true, 
          plateNumber: cleanOcrText, 
          plateType: detectedPlateType,
          make: brainRes.hit && brainRes.response?.make ? brainRes.response.make : null, 
          model: brainRes.hit && brainRes.response?.model ? brainRes.response.model : null, 
          source: 'local_python_anpr' 
        });
      }
    } catch (ocrErr) {
      console.warn('Local Python ANPR failed, falling back to cloud:', ocrErr);
    } finally {
      // Clean up temp file if not already deleted
      if (fs.existsSync(tempFilePath)) {
        try { await unlinkAsync(tempFilePath); } catch {}
      }
    }


    // Step D: Query Local Ollama Vision VLM (Mimicking/Learning to run offline)
    let parsed: any = null;
    let localScannedSource = 'cloud_gemini';

    try {
      // Find top 2 lessons mapped from previous Gemini runs
      const lessons = await prisma.aIKnowledgeCache.findMany({
        where: { cacheType: 'PLATE_SCAN', source: { in: ['gemini', 'user'] } },
        orderBy: { useCount: 'desc' },
        take: 2
      });

      let fewShotContext = "";
      if (lessons.length > 0) {
        fewShotContext = "\nHere are examples of how plates and vehicle details were extracted:\n" +
          lessons.map(l => `OCR Scan: "${l.inputSummary}"\nOutput JSON:\n${l.responseJson}`).join("\n---\n") + "\n";
      }

      const base64Data = buffer.toString('base64');
      const ollamaPayload = {
        model: "llava",
        prompt: `You are a specialized Automatic Number Plate Recognition (ANPR) and Vehicle Identification system. Read this image of a vehicle and extract the registration plate number. Also identify the vehicle manufacturer (make) and model if visible.
Return the response as a JSON object with the following keys: 'plateNumber' (string, final uppercase alphanumeric with no spaces or punctuation; or 'NONE' if not found), 'make' (string or null), 'model' (string or null). Do not include markdown formatting or backticks.
${fewShotContext}
Please analyze this new image and return ONLY the JSON representation:`,
        images: [base64Data],
        stream: false
      };

      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ollamaPayload),
        signal: AbortSignal.timeout(15000) // 15s timeout
      });

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.ok ? await ollamaRes.json() : {};
        const responseText = (ollamaData.response || "").trim();
        parsed = JSON.parse(responseText.replace(/```json|```/g, ''));
        localScannedSource = 'local_ollama_vlm';
      }
    } catch (ollamaErr) {
      console.warn('Local Ollama VLM scan failed or timed out. Falling back to Gemini:', ollamaErr);
    }

    // Step E: Gemini Fallback
    if (!parsed) {
      const profile = await prisma.workshopProfile.findFirst({
        select: { geminiApiKey: true }
      });
      
      const apiKey = profile?.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ 
          success: false, 
          error: 'Gemini AI API Key not configured and local OCR could not find a match. Please paste your Google AI Studio API Key in Admin Settings.' 
        }, { status: 400 });
      }

      const base64Data = buffer.toString('base64');
      const fileType = file.type || 'image/jpeg';

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "You are a specialized Automatic Number Plate Recognition (ANPR) and Vehicle Identification system. Read this image of a vehicle and extract the registration plate number. Also identify the vehicle manufacturer (make) and model if visible. Return the response as a JSON object with the following keys: 'plateNumber' (string, final uppercase alphanumeric with no spaces or punctuation; or 'NONE' if not found), 'make' (string or null), 'model' (string or null)."
                },
                {
                  inlineData: { mimeType: fileType, data: base64Data }
                }
              ]
            }
          ],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({ success: false, error: `Gemini API error: ${errText}` }, { status: response.status });
      }

      const data = await response.json();
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
      
      try {
        parsed = JSON.parse(extractedText);
      } catch (e) {
        console.error('Failed to parse Gemini JSON:', extractedText);
        return NextResponse.json({ success: false, error: 'AI returned invalid JSON format' }, { status: 500 });
      }
    }

    if (!parsed.plateNumber || parsed.plateNumber.toUpperCase() === 'NONE') {
      return NextResponse.json({ success: false, error: 'AI scanner could not locate a valid registration plate. Please try another angle or enter manually.' });
    }

    const cleanPlate = buildPlateKey(parsed.plateNumber);

    // Save to AI Brain so next time this plate is OCR'd, it serves locally
    try {
      const payload = {
        plateNumber: cleanPlate,
        make: parsed.make,
        model: parsed.model
      };

      if (cleanOcrText && cleanOcrText.length > 3) {
        // Map the dirty OCR text to the clean plate/make/model
        await saveToiBrain(
          'PLATE_SCAN', 
          cleanOcrText, 
          cleanPlate, 
          payload,
          localScannedSource === 'local_ollama_vlm' ? 'user' : 'gemini'
        );
      }
      
      // Also save the clean plate itself in case OCR is perfect next time
      await saveToiBrain(
        'PLATE_SCAN', 
        cleanPlate, 
        cleanPlate, 
        payload,
        localScannedSource === 'local_ollama_vlm' ? 'user' : 'gemini'
      );
    } catch (cacheErr) {
      console.error('Failed to update AI Brain:', cacheErr);
    }

    return NextResponse.json({ 
      success: true, 
      plateNumber: cleanPlate, 
      make: parsed.make, 
      model: parsed.model, 
      source: localScannedSource 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

