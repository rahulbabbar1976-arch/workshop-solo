import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const maxDuration = 60; // Set max duration for Vercel/Next.js if applicable

export async function POST(request: Request) {
  try {
    const { base64Image, mimeType } = await request.json();

    if (!base64Image || !mimeType) {
      return NextResponse.json({ success: false, error: 'Image data is required' }, { status: 400 });
    }

    // Fetch the Gemini API key from WorkshopProfile
    const profile = await prisma.workshopProfile.findFirst();
    const apiKey = profile?.geminiApiKey;

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gemini API key is not configured. Please set it in Settings.' 
      }, { status: 403 });
    }

    // Call Gemini 1.5 Flash Vision API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Analyze this purchase invoice/bill. Extract all the line items representing automotive parts, oils, or labor. For each item, extract the Name, Part Number/Item Code (if available), Quantity, Unit Purchase Price (excluding tax if possible), GST/Tax Rate percentage, and HSN/SAC Code. If HSN code or GST rate is missing, make your best educated guess based on the part name (e.g. Engine Oil usually 18% GST and HSN 2710). Return the response strictly as a JSON object with a single key 'items' containing an array of these objects: { \"partName\": string, \"partNumber\": string, \"quantity\": number, \"purchasePrice\": number, \"gstRate\": number, \"hsnCode\": string }. Do not include any other text or markdown formatting outside the JSON."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image.split(',')[1] || base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json({ success: false, error: `Failed to process image with Gemini API: ${errorData}` }, { status: 500 });
    }

    const data = await response.json();
    
    // Extract JSON from Gemini response
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      return NextResponse.json({ success: false, error: 'Empty response from AI' }, { status: 500 });
    }

    let parsedItems = [];
    try {
      // In case it still wrapped in markdown despite response_mime_type
      const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      parsedItems = parsed.items || [];
    } catch (parseError) {
      console.error('Parse error on AI text:', aiText);
      return NextResponse.json({ success: false, error: 'Failed to parse AI response into JSON' }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: parsedItems });

  } catch (err: any) {
    console.error('AI Scan Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
