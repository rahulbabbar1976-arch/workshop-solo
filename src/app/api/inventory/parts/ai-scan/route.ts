import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const maxDuration = 60;

const INVOICE_PROMPT = `Analyze this purchase invoice/bill image. Extract all supplier details and line items representing automotive parts, oils, filters, or consumables.
Extract:
- supplierName: name of the seller/supplier/merchant (string or null)
- supplierGstin: GST number of the seller/supplier (15-character alphanumeric, e.g. 07AAAAA1111A1Z1, string or null)
- billNumber: invoice/bill number (string or null)
- paymentMode: payment type if mentioned, e.g. Cash, UPI, Credit, Bank Transfer (string or null)
- items: array of parts representing:
  - partName: the product/part name (string)
  - partNumber: item/part code or SKU (string, empty if not found)
  - quantity: the quantity purchased (number)
  - purchasePrice: unit price excluding GST/tax (number)
  - gstRate: GST percentage rate (number, e.g. 18 for 18%)
  - hsnCode: HSN/SAC code (string, empty if not found)

If HSN/GST for items is missing, make an educated guess:
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
{
  "supplierName": string | null,
  "supplierGstin": string | null,
  "billNumber": string | null,
  "paymentMode": string | null,
  "items": [
    {
      "partName": string,
      "partNumber": string,
      "quantity": number,
      "purchasePrice": number,
      "gstRate": number,
      "hsnCode": string
    }
  ]
}`;

// --- OpenRouter (free, no billing required) ---
async function tryOpenRouter(apiKey: string, imageData: string, mimeType: string): Promise<string> {
  // Free vision-capable models on OpenRouter (in order of preference)
  const FREE_MODELS = [
    'google/gemini-1.5-flash',
    'openrouter/free',
    'google/gemini-2.5-flash:free',
    'google/gemini-1.5-pro',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
  ];

  const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

  for (const model of FREE_MODELS) {
    try {
      console.log(`Trying OpenRouter model: ${model}`);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://workshop-solo.vercel.app',
          'X-Title': 'Workshop Solo',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: INVOICE_PROMPT },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`OpenRouter model ${model} failed (${res.status}):`, errText.substring(0, 150));
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        console.log(`OpenRouter success with model: ${model}`);
        return text;
      }
    } catch (e: any) {
      console.warn(`OpenRouter model ${model} error:`, e.message?.substring(0, 100));
    }
  }

  throw new Error('All OpenRouter models failed');
}

// --- Gemini (fallback, requires billing in some regions) ---
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];

async function tryGemini(apiKey: string, imageData: string, mimeType: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`Trying Gemini model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const imageParts = [{
        inlineData: {
          data: imageData.includes(',') ? imageData.split(',')[1] : imageData,
          mimeType
        }
      }];
      const result = await model.generateContent([INVOICE_PROMPT, ...imageParts]);
      const text = result.response.text();
      if (text) {
        console.log(`Gemini success with model: ${modelName}`);
        return text;
      }
    } catch (e: any) {
      const msg = e?.message || '';
      console.warn(`Gemini model ${modelName} failed:`, msg.substring(0, 100));
      // Always continue to next model
    }
  }

  throw new Error('All Gemini models failed');
}

function parseAIText(text: string) {
  const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  // Find the JSON object in the response
  const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  const parsed = JSON.parse(jsonMatch[0]);
  return parsed;
}

export async function POST(request: Request) {
  try {
    const { base64Image, mimeType, ocrText } = await request.json();

    // --- PATH 1: OCR text from client (last resort fallback) ---
    if (ocrText && !base64Image) {
      const parsedItems = parseOCRTextToItems(ocrText);
      const scanData = {
        supplierName: '',
        supplierGstin: '',
        billNumber: '',
        paymentMode: 'Cash',
        items: parsedItems
      };
      return NextResponse.json({ success: true, scanData, method: 'ocr' });
    }

    if (!base64Image || !mimeType) {
      return NextResponse.json({ success: false, error: 'Image data is required' }, { status: 400 });
    }

    const profile = await prisma.workshopProfile.findFirst();
    const openRouterKey = (profile as any)?.openRouterApiKey;
    const geminiKey = profile?.geminiApiKey;

    // --- PATH 2: Try OpenRouter first (free, no billing) ---
    if (openRouterKey) {
      try {
        const aiText = await tryOpenRouter(openRouterKey, base64Image, mimeType);
        const scanData = parseAIText(aiText);
        return NextResponse.json({ success: true, scanData, method: 'openrouter' });
      } catch (e: any) {
        console.warn('OpenRouter failed, falling back to Gemini:', e.message);
      }
    }

    // --- PATH 3: Try Gemini (fallback) ---
    if (geminiKey) {
      try {
        const aiText = await tryGemini(geminiKey, base64Image, mimeType);
        const scanData = parseAIText(aiText);
        return NextResponse.json({ success: true, scanData, method: 'gemini' });
      } catch (e: any) {
        console.warn('Gemini failed:', e.message);
      }
    }

    // --- PATH 4: No AI available → signal client to use Tesseract OCR ---
    const reason = !openRouterKey && !geminiKey
      ? 'No AI key configured. Go to Settings → AI Integration to add a free OpenRouter key.'
      : 'AI unavailable. Using free OCR scanner instead.';

    return NextResponse.json({ success: false, fallbackToOCR: true, error: reason }, { status: 200 });

  } catch (err: any) {
    console.error('AI Scan Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Basic regex parser for Tesseract OCR text
function parseOCRTextToItems(text: string): any[] {
  const items: any[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

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

  for (const line of lines) {
    if (/^(sr|item|description|qty|price|amount|total|gst|hsn|rate|s\.no)/i.test(line)) continue;
    if (line.length < 5) continue;

    const prices = line.match(/[\d,]+\.?\d*/g)?.map(p => parseFloat(p.replace(/,/g, ''))) || [];
    const validPrices = prices.filter(p => p > 0 && p < 1000000);
    if (validPrices.length === 0) continue;

    const namePart = line.replace(/[\d,\.%\/]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (namePart.length < 3) continue;

    let hsn = '', gst = 18;
    for (const [keyword, mapping] of Object.entries(hsnMap)) {
      if (namePart.toLowerCase().includes(keyword)) {
        hsn = mapping.hsn;
        gst = mapping.gst;
        break;
      }
    }

    const purchasePrice = validPrices.length >= 2 ? validPrices[validPrices.length - 2] : validPrices[0];
    const qty = validPrices.length >= 3 ? validPrices[0] : 1;

    if (purchasePrice > 0) {
      items.push({ partName: namePart, partNumber: '', quantity: qty, purchasePrice, gstRate: gst, hsnCode: hsn });
    }
  }

  return items;
}
