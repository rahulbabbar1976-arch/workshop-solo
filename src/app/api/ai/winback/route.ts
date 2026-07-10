import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiKey } from '@/lib/gemini';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const apiKey = await getGeminiKey();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured.' }, { status: 400 });
    }

    // Find customers with closed jobs more than 6 months ago, and NO jobs in the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const dormantJobs = await prisma.jobCard.findMany({
      where: {
        status: 'closed',
        closedAt: { lt: sixMonthsAgo }
      },
      include: {
        customer: true,
        vehicle: true
      },
      orderBy: { closedAt: 'desc' }
    });

    const recentJobs = await prisma.jobCard.findMany({
      where: {
        status: 'closed',
        closedAt: { gte: sixMonthsAgo }
      },
      select: { customerId: true }
    });

    const recentCustomerIds = new Set(recentJobs.map(j => j.customerId));
    
    // Filter out those who have visited recently
    const winbackCandidates = new Map();
    for (const job of dormantJobs) {
      if (!recentCustomerIds.has(job.customerId) && !winbackCandidates.has(job.customerId)) {
        winbackCandidates.set(job.customerId, {
          customerId: job.customerId,
          name: job.customer?.displayName || 'Customer',
          mobile: job.customer?.primaryMobile,
          vehicle: `${job.vehicle?.manufacturer || ''} ${job.vehicle?.model || ''}`.trim(),
          lastVisit: job.closedAt
        });
      }
    }

    const candidatesList = Array.from(winbackCandidates.values()).slice(0, 5); // Limit to top 5 for generation speed

    if (candidatesList.length === 0) {
      return NextResponse.json({ success: true, campaigns: [] });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
    You are an auto repair shop AI CRM assistant.
    For each of the following dormant customers (haven't visited in 6+ months), write a short, friendly, personalized SMS (max 160 characters) offering them a "Welcome Back" 10% discount on service for their specific vehicle.
    
    Customers:
    ${candidatesList.map(c => `- ${c.name}, Vehicle: ${c.vehicle}`).join('\n')}

    Format your response exactly like this JSON array:
    [
      { "name": "...", "vehicle": "...", "smsDraft": "..." }
    ]
    `;

    let campaigns = [];
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
      campaigns = JSON.parse(jsonStr);
      // attach the mobile number back
      campaigns = campaigns.map((c: any) => {
        const match = candidatesList.find(cand => cand.name === c.name);
        return { ...c, mobile: match?.mobile || '' };
      });
    } catch (e: any) {
      console.warn("Winback generation or parse failed", e.message);
      return NextResponse.json({ success: false, error: 'AI limit exceeded or failed to generate content' }, { status: 429 });
    }

    return NextResponse.json({ success: true, campaigns });

  } catch (err: any) {
    console.error('AI Winback Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
