import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const maxDuration = 60;

// List of models to try in order - 1.5-flash first (wider free-tier support)
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

async function tryGeminiModel(apiKey: string, modelName: string, prompt: string, imageData: string, mimeType: string) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const imageParts = [
    {
      inlineData: {
        data: imageData.includes(',') ? imageData.split(',')[1] : imageData,
        mimeType: mimeType
      }
    }
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  return response.text();
}

export async function POST(request: Request) {
  try {
    const { base64Image, mimeType, ocrText } = await request.json();

    // --- PATH 1: OCR text was sent from client (Tesseract fallback) ---
    if (ocrText && !base64Image) {
      const parsed = parseOCRTextToItems(ocrText);
      return NextResponse.json({ success: true, items: parsed, method: 'ocr' });
    }

    if (!base64Image || !mimeType) {
      return NextResponse.json({ success: false, error: 'Image data is required' }, { status: 400 });
    }

    // --- PATH 2: Try Gemini AI (if API key configured) ---
    const profile = await prisma.workshopProfile.findFirst();
    const apiKey = profile?.geminiApiKey;

    if (apiKey) {
      const prompt = `Analyze this purchase invoice/bill image. Extract all line items representing automotive parts, oils, or consumables.
For each item extract:
- partName: the product/part name
- partNumber: item/part code or SKU (empty string if not found)
- quantity: the quantity purchased (number)
- purchasePrice: unit price excluding GST/tax (number)
- gstRate: GST percentage rate (number, e.g. 18 for 18%)
- hsnCode: HSN/SAC code (empty string if not found, but try to guess from part name)

If HSN/GST is missing, make an educated guess:
- Engine Oil → HSN 2710, 18% GST
- Oil Filter → HSN 8421, 18% GST
- Air Filter → HSN 8421, 18% GST
- Brake Pad → HSN 8708, 28% GST
- Battery → HSN 8507, 28% GST
- Tyres → HSN 4011, 28% GST
- Wipers → HSN 8512, 28% GST
- Coolant/Antifreeze → HSN 3820, 18% GST
- General Parts/Labour → HSN 9987, 18% GST

Return ONLY valid JSON with this exact structure, no markdown, no extra text:
{"items": [{"partName": string, "partNumber": string, "quantity": number, "purchasePrice": number, "gstRate": number, "hsnCode": string}]}`;

      // Try each model in order until one works
      for (const modelName of GEMINI_MODELS) {
        try {
          console.log(`Trying Gemini model: ${modelName}`);
          const aiText = await tryGeminiModel(apiKey, modelName, prompt, base64Image, mimeType);

          if (aiText) {
            const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            const items = parsed.items || [];
            console.log(`Success with model: ${modelName}, found ${items.length} items`);
            return NextResponse.json({ success: true, items, method: `gemini-${modelName}` });
          }
        } catch (modelErr: any) {
          const errMsg = modelErr?.message || '';
          console.warn(`Model ${modelName} failed:`, errMsg.substring(0, 100));
          
          // If quota/billing error on this model, try next model
          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('billing') || errMsg.includes('depleted')) {
            console.warn(`Quota/billing issue on ${modelName}, trying next model...`);
            continue;
          }
          // If 404, try next model
          if (errMsg.includes('404')) {
            continue;
          }
          // For other errors, break
          break;
        }
      }
    }

    // --- PATH 3: No API key or all Gemini models failed → return signal to client to use Tesseract ---
    return NextResponse.json({
      success: false,
      fallbackToOCR: true,
      error: !apiKey
        ? 'No Gemini API key configured. Using free OCR scanner instead.'
        : 'Gemini API unavailable (quota/billing issue). Using free OCR scanner instead.'
    }, { status: 200 }); // Return 200 so client can handle gracefully

  } catch (err: any) {
    console.error('AI Scan Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Simple regex-based parser for OCR text output
function parseOCRTextToItems(text: string): any[] {
  const items: any[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Known HSN/GST mappings for common auto parts
  const hsnMap: Record<string, { hsn: string; gst: number }> = {
    'engine oil': { hsn: '2710', gst: 18 },
    'oil filter': { hsn: '8421', gst: 18 },
    'air filter': { hsn: '8421', gst: 18 },
    'fuel filter': { hsn: '8421', gst: 18 },
    'brake pad': { hsn: '8708', gst: 28 },
    'brake shoe': { hsn: '8708', gst: 28 },
    'battery': { hsn: '8507', gst: 28 },
    'tyre': { hsn: '4011', gst: 28 },
    'tire': { hsn: '4011', gst: 28 },
    'wiper': { hsn: '8512', gst: 28 },
    'coolant': { hsn: '3820', gst: 18 },
    'antifreeze': { hsn: '3820', gst: 18 },
    'spark plug': { hsn: '8511', gst: 18 },
    'clutch': { hsn: '8708', gst: 28 },
  };

  const priceRegex = /[\d,]+\.?\d*/g;

  for (const line of lines) {
    // Skip header-like lines
    if (/^(sr|item|description|qty|price|amount|total|gst|hsn|rate|s\.no)/i.test(line)) continue;
    if (line.length < 5) continue;

    const prices = line.match(priceRegex)?.map(p => parseFloat(p.replace(/,/g, ''))) || [];
    const validPrices = prices.filter(p => p > 0 && p < 1000000);

    if (validPrices.length === 0) continue;

    // Determine part name (text before numbers)
    const namePart = line.replace(/[\d,\.%\/]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (namePart.length < 3) continue;

    // Lookup HSN/GST
    let hsn = '';
    let gst = 18;
    const lowerName = namePart.toLowerCase();
    for (const [keyword, mapping] of Object.entries(hsnMap)) {
      if (lowerName.includes(keyword)) {
        hsn = mapping.hsn;
        gst = mapping.gst;
        break;
      }
    }

    const purchasePrice = validPrices.length >= 2 ? validPrices[validPrices.length - 2] : validPrices[0];
    const qty = validPrices.length >= 3 ? validPrices[0] : 1;

    if (purchasePrice > 0) {
      items.push({
        partName: namePart,
        partNumber: '',
        quantity: qty,
        purchasePrice: purchasePrice,
        gstRate: gst,
        hsnCode: hsn
      });
    }
  }

  return items;
}
