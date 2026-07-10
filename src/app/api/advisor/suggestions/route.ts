import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getGeminiKey } from '@/lib/gemini';
import { buildServiceKey, checkBrain, saveToiBrain } from '@/lib/ai-brain';

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, make, model, year, odometer } = await request.json();

    // ── 1. Fetch vehicle service history ────────────────────────────────────
    const history: any[] = [];
    if (vehicleId) {
      const jobcards = await prisma.jobCard.findMany({
        where: { vehicleId },
        orderBy: { dateIn: 'desc' },
        take: 10,
        select: {
          jobcardNumber: true,
          dateIn: true,
          closedAt: true,
          intakeOdometer: true,
          status: true,
          complaints: {
            select: { customerComplaintText: true, advisorObservationText: true }
          },
          labourLines: { select: { labourName: true } },
          partLines:   { select: { partName: true } },
        }
      });

      jobcards.forEach(jc => {
        const services = jc.labourLines.map(l => l.labourName).join(', ');
        const parts    = jc.partLines.map(p => p.partName).join(', ');
        history.push({
          jobcard: jc.jobcardNumber,
          date:    jc.dateIn ? new Date(jc.dateIn).toLocaleDateString('en-IN') : '',
          odo:     jc.intakeOdometer,
          services,
          parts,
        });
      });
    }

    // ── 1.5 Check AI Brain ──────────────────────────────────────────────────
    const cacheKey = buildServiceKey(make, model, odometer || 0);
    const brainRes = await checkBrain('SERVICE_SUGGESTION', cacheKey);
    
    if (brainRes.hit && brainRes.response) {
      return NextResponse.json({ 
        success: true, 
        suggestions: brainRes.response, 
        history, 
        source: 'local_brain',
        confidence: brainRes.confidence
      });
    }

    // ── 2. Build prompt for Gemini ───────────────────────────────────────────
    const historyText = history.length
      ? history.map(h =>
          `• ${h.date} @ ${h.odo ?? '?'} km — Services: ${h.services || 'N/A'}, Parts: ${h.parts || 'N/A'}`
        ).join('\n')
      : 'No prior service history on record.';

    const prompt = `You are an expert automotive service advisor AI for an Indian multi-brand workshop.

Vehicle: ${make || 'Unknown'} ${model || ''} ${year ? `(${year})` : ''}
Current Odometer: ${odometer ? odometer + ' km' : 'Unknown'}

Service History:
${historyText}

Based on the vehicle details and service history, suggest the TOP 3-5 most important services this vehicle likely needs right now.
For each suggestion, provide:
- A short service name (e.g. "Engine Oil Change")
- A one-line reason why it's recommended (based on history gaps, typical intervals, or Indian driving conditions)
- Estimated parts needed (if applicable)
- Priority: HIGH / MEDIUM / LOW

Respond ONLY with a valid JSON array in this format (no markdown, no explanation, just the array):
[
  {
    "service": "Engine Oil Change",
    "reason": "Last oil change was over 8,000 km ago. Standard interval is 5,000-7,500 km.",
    "parts": ["Engine Oil 5W-30", "Oil Filter"],
    "priority": "HIGH"
  }
]`;

    const apiKey = await getGeminiKey();
    if (!apiKey) {
      // Return empty suggestions gracefully — caller can still proceed without AI
      return NextResponse.json({ success: true, suggestions: [], history, noKey: true });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim();

    let suggestions: any[] = [];
    try {
      const parsed = JSON.parse(jsonStr);
      suggestions  = Array.isArray(parsed) ? parsed : [];
      
      // Save successful AI response to Brain
      if (suggestions.length > 0) {
        await saveToiBrain(
          'SERVICE_SUGGESTION',
          cacheKey,
          `${make || 'Unknown'} ${model || 'Unknown'} (${odometer || 0} km)`,
          suggestions
        );
      }
    } catch {
      suggestions = [];
    }

    return NextResponse.json({ success: true, suggestions, history, source: 'gemini_api' });

  } catch (err: any) {
    console.error('[/api/advisor/suggestions] Error:', err);
    return NextResponse.json({ success: false, error: err.message, suggestions: [], history: [] }, { status: 500 });
  }
}
