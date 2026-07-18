import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import prisma from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';

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

    const prompt = `You are an expert auto-mechanic inventory AI. You are analyzing an image which could be a printed supplier purchase invoice OR a photograph of physical auto part boxes/labels.
Please visually analyze this image to extract the parts details.
CRITICAL RULES:
1. Do NOT confuse the HSN Code with the OEM Part Number. HSN is a tax code (usually 4 to 8 digits, e.g. 31021000). The OEM Part Number is the manufacturer's item code (e.g. 58101-1RA00, 16510M68K00).
2. If it is an invoice, extract the supplier name, invoice number, and date. If it's a part box, leave them null.
3. EXTRACT SERIAL NUMBERS: For items like batteries or electronics, if serial numbers are listed, extract them as an array of strings.
Extract maximum details for future data usage in a Purchase Ledger.
Return the result strictly as a JSON object containing the invoice metadata and an array of items. Do not include markdown formatting or backticks.
Format:
{
  "invoiceNumber": "string or null",
  "supplierName": "string or null",
  "supplierContact": "string or null",
  "dateOfPurchase": "YYYY-MM-DD or null",
  "paymentMode": "Cash, UPI, Credit, Bank Transfer, or null",
  "items": [
    {
      "partName": "string",
      "brand": "string or null",
      "partNumber": "string or null",
      "hsnCode": "string or null",
      "purchasePrice": 0.0,
      "quantityBought": 1,
      "vehicleMake": "string or null (e.g. Maruti Suzuki)",
      "vehicleModel": "string or null (e.g. Swift)",
      "vehicleYear": "string or null (e.g. 2018)",
      "serialNumbers": [] 
    }
  ]
}`;

    let resultText = '{}';
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
      resultText = response.text || '{}';
    } catch (e: any) {
      console.warn("Invoice AI generation failed", e.message);
      return NextResponse.json({ success: false, error: 'AI limit exceeded or failed to parse invoice' }, { status: 429 });
    }

    let invoiceData: any = {};
    try {
        invoiceData = JSON.parse(resultText);
    } catch(e) {
        console.error("Failed to parse Gemini response", resultText);
        return NextResponse.json({ success: false, error: 'AI returned invalid JSON format' }, { status: 500 });
    }

    // Check if this invoice is a duplicate
    let isDuplicate = false;
    if (invoiceData.invoiceNumber && invoiceData.supplierName) {
      const existingPurchase = await prisma.partPurchase.findFirst({
        where: {
          invoiceNumber: invoiceData.invoiceNumber,
          supplierName: invoiceData.supplierName
        }
      });
      if (existingPurchase) {
        isDuplicate = true;
      }
    }

    // Map matched parts
    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      const itemsWithMatches = await Promise.all(invoiceData.items.map(async (item: any) => {
        if (!item.partName && !item.partNumber) return { ...item, match: null };

        const query: any = { OR: [] };
        if (item.partName) query.OR.push({ partName: { contains: item.partName } });
        if (item.partNumber) query.OR.push({ partNumber: { contains: item.partNumber } });

        let match = null;
        if (query.OR.length > 0) {
          const matches = await prisma.partsMaster.findMany({ where: query, take: 1 });
          if (matches.length > 0) {
            match = {
              id: matches[0].id,
              partName: matches[0].partName,
              stockQuantity: matches[0].stockQuantity
            };
          }
        }
        
        return {
          ...item,
          match
        };
      }));
      invoiceData.items = itemsWithMatches;
    }

    return NextResponse.json({ 
      success: true, 
      invoiceData,
      isDuplicate
    });
  } catch (error: any) {
    console.error('Vision API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
