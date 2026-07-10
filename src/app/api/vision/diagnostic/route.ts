import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiKey } from '@/lib/gemini';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { buildDiagnosticKey, checkBrain, saveToiBrain } from '@/lib/ai-brain';

export async function POST(request: Request) {
  try {
    const { imageBase64, context } = await request.json();
    
    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
    
    // ── 1. Try to check AI Brain with local OCR text first ────────────────
    let dtcCodes: string[] = [];
    try {
      const optimizedBuffer = await sharp(buffer).grayscale().normalize().toBuffer();
      const tesseractPromise = Tesseract.recognize(optimizedBuffer, 'eng');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tesseract timeout')), 3000));
      const result: any = await Promise.race([tesseractPromise, timeoutPromise]);
      
      const cleanOcrText = result.data.text;
      
      // Look for standard OBD-II DTC codes: P, C, B, U followed by 4 hex digits (e.g. P0420)
      const dtcMatches = cleanOcrText.match(/[PCBU][0-9A-F]{4}/ig);
      if (dtcMatches && dtcMatches.length > 0) {
        dtcCodes = Array.from(new Set(dtcMatches.map((m: string) => m.toUpperCase())));
        const cacheKey = buildDiagnosticKey(dtcCodes);
        const brainRes = await checkBrain('DIAGNOSTIC', cacheKey);
        
        if (brainRes.hit && brainRes.response) {
          return NextResponse.json({ 
            success: true, 
            analysis: brainRes.response.analysis,
            source: 'local_brain'
          });
        }
      }
    } catch (ocrErr) {
      console.warn('Local OCR for diagnostic failed:', ocrErr);
    }

    const apiKey = await getGeminiKey();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured. Please add it in Admin Settings → AI & API Integrations.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `
You are an expert automotive master technician.
Analyze this diagnostic scan tool image or vehicle component image.
Context: ${context || 'No context provided'}

Provide a structured response:
1. Identify any fault codes (DTCs) or component issues visible.
2. Explain what these codes/issues mean in plain English.
3. Provide a step-by-step repair guide or troubleshooting steps.
4. List likely parts needed for the repair.
`;

    try {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64.split(',')[1] || imageBase64,
            mimeType: imageBase64.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'
          }
        }
      ]);

      const responseText = result.response.text();

      // If we found DTC codes via OCR, or Gemini found them (we could parse Gemini's text for codes too)
      // Let's parse Gemini's text just in case OCR missed some
      const geminiDtcMatches = responseText.match(/[PCBU][0-9A-F]{4}/ig);
      if (geminiDtcMatches && geminiDtcMatches.length > 0) {
        const finalDtcCodes = Array.from(new Set(geminiDtcMatches.map((m: string) => m.toUpperCase())));
        const newCacheKey = buildDiagnosticKey(finalDtcCodes);
        await saveToiBrain('DIAGNOSTIC', newCacheKey, `DTC: ${finalDtcCodes.join(', ')}`, { analysis: responseText });
      } else if (dtcCodes.length > 0) {
        const newCacheKey = buildDiagnosticKey(dtcCodes);
        await saveToiBrain('DIAGNOSTIC', newCacheKey, `DTC: ${dtcCodes.join(', ')}`, { analysis: responseText });
      }

      return NextResponse.json({ 
        success: true, 
        analysis: responseText,
        source: 'gemini_api'
      });
    } catch (e: any) {
      console.warn("Diagnostic generation failed", e.message);
      return NextResponse.json({ success: false, error: 'AI limit exceeded or failed to generate content' }, { status: 429 });
    }
    
  } catch (err: any) {
    console.error('AI Diagnostic Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
