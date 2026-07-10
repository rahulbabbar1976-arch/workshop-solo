import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { partId, partName, brand } = await request.json();

    if (!partId || !partName) {
      return NextResponse.json({ success: false, error: 'Missing part information' }, { status: 400 });
    }

    // Call Gemini to enrich the part
    const prompt = `You are an expert automotive parts specialist. 
I have an auto part named "${partName}" made by "${brand || 'Unknown'}".
Please determine the most likely vehicle compatibility for this part.
Return the result strictly as a JSON object with NO markdown formatting, containing the following fields:
- vehicleMake: string (e.g., "Maruti Suzuki", "Hyundai", "Toyota", etc., or "Universal" if it fits all/many)
- vehicleModel: string (e.g., "Swift", "i20", "Innova", etc., or "All Models" if universal)
- vehicleYear: string (e.g., "2018-2023", "2010+", or "All Years")
`;

    // Fetch API Key from WorkshopProfile
    const profile = await prisma.workshopProfile.findFirst();
    const apiKey = profile?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
       return NextResponse.json({ success: false, error: 'AI is not configured. Please add your Gemini API Key in the Owner Settings.' }, { status: 500 });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    let aiText = '';
    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      aiText = result.text || '';
    } catch (e: any) {
      console.warn('Parts AI enrichment failed:', e.message);
      return NextResponse.json({ success: false, error: 'AI limit exceeded or failed to enrich parts' }, { status: 429 });
    }
    
    // Clean up potential markdown formatting
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let enrichedData;
    try {
      enrichedData = JSON.parse(aiText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiText);
      return NextResponse.json({ success: false, error: 'AI returned invalid format' }, { status: 500 });
    }

    // Update the database
    const updatedPart = await prisma.partsMaster.update({
      where: { id: partId },
      data: {
        vehicleMake: enrichedData.vehicleMake || null,
        vehicleModel: enrichedData.vehicleModel || null,
        vehicleYear: enrichedData.vehicleYear || null
      }
    });

    return NextResponse.json({ success: true, part: updatedPart });
  } catch (err: any) {
    console.error('Error enriching part:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
