import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiKey } from '@/lib/gemini';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { buildBatteryKey, checkBrain, saveToiBrain } from '@/lib/ai-brain';

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();
    
    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
    
    // ── 1. Try to check AI Brain with local OCR text first ────────────────
    let cleanOcrText = '';
    let cacheKey = '';
    try {
      const optimizedBuffer = await sharp(buffer).grayscale().normalize().toBuffer();
      const tesseractPromise = Tesseract.recognize(optimizedBuffer, 'eng');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tesseract timeout')), 2500));
      const result: any = await Promise.race([tesseractPromise, timeoutPromise]);
      
      cleanOcrText = result.data.text;
      
      // Attempt to extract brand and model via simple regexes on OCR text
      // E.g. AMARON, EXIDE, BOSCH, etc.
      const brandMatch = cleanOcrText.match(/(AMARON|EXIDE|BOSCH|VARTA|LUMINOUS|SF SONIC)/i);
      const modelMatch = cleanOcrText.match(/([A-Z0-9]{5,10})/i); // basic model heuristic
      
      if (brandMatch && modelMatch) {
        cacheKey = buildBatteryKey(brandMatch[1], modelMatch[1]);
        const brainRes = await checkBrain('BATTERY_SCAN', cacheKey);
        
        if (brainRes.hit && brainRes.response) {
          return NextResponse.json({ 
            success: true, 
            batteryData: brainRes.response,
            rawText: JSON.stringify(brainRes.response),
            source: 'local_brain'
          });
        }
      }
    } catch (ocrErr) {
      console.warn('Local OCR for battery failed:', ocrErr);
    }

    const apiKey = await getGeminiKey();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured. Please add it in Admin Settings → AI & API Integrations.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `
Analyze this image of an automotive battery label.
Extract the following information and return it as a pure JSON object (no markdown formatting, no code blocks):
{
  "brand": "string",
  "model": "string",
  "cca": "number or string (Cold Cranking Amps)",
  "ah": "number or string (Amp Hours)",
  "voltage": "string (usually 12V)",
  "chemistry": "string (e.g. Lead Acid, AGM, Lithium)",
  "dateCode": "string (if visible)"
}
If a field is not found or not visible, set its value to null.
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
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(jsonStr);
      
      // Save to AI Brain so next time we OCR this brand/model it serves locally
      if (parsedData.brand && parsedData.model) {
        const newCacheKey = buildBatteryKey(parsedData.brand, parsedData.model);
        await saveToiBrain('BATTERY_SCAN', newCacheKey, `${parsedData.brand} ${parsedData.model}`, parsedData);
      }
      return NextResponse.json({
        success: true, 
        batteryData: parsedData,
        rawText: jsonStr,
        source: 'gemini_api'
      });
    } catch (e: any) {
      console.warn("Battery vision generation or parse failed", e.message);
      return NextResponse.json({ success: false, error: 'AI limit exceeded or failed to parse response' }, { status: 429 });
    }
    
  } catch (err: any) {
    console.error('AI Battery Vision Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
