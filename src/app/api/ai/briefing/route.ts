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

    // 1. Gather Data Context
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bookings
    const todayBookings = await prisma.preBooking.count({
      where: {
        bookingDate: { gte: today, lt: tomorrow },
        status: { not: 'cancelled' }
      }
    });

    // Low Stock Parts
    const lowStockParts = await prisma.partsMaster.findMany({
      where: { stockQuantity: { lte: 5 } },
      take: 10
    });

    // Pending Purchase Orders
    const pendingPOs = await prisma.purchaseOrder.findMany({
      where: { status: 'approved' },
      select: { poNumber: true, supplierName: true, totalAmount: true }
    });

    // Recent closed jobs revenue (yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentJobs = await prisma.jobCard.aggregate({
      where: {
        status: 'completed',
        updatedAt: { gte: yesterday, lt: today }
      },
      _sum: { totalAmount: true },
      _count: true
    });

    // 2. Generate Briefing
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const contextStr = `
    Today's Workshop Data:
    - Appointments Today: ${todayBookings}
    - Low Stock Items: ${lowStockParts.length} (e.g. ${lowStockParts.map(p => p.partName).join(', ')})
    - Pending Orders to Receive: ${pendingPOs.length} (Total expected value: ₹${pendingPOs.reduce((acc, po) => acc + po.totalAmount, 0)})
    - Yesterday's Performance: ${recentJobs._count} jobs closed for ₹${recentJobs._sum.totalAmount || 0}
    `;

    const prompt = `
    You are an AI assistant for an auto repair shop owner.
    Based on the following real-time data, write a short, punchy "Morning Briefing" (3 bullet points max).
    Focus on what the owner needs to pay attention to today (e.g. busy schedule, ordering parts, chasing vendors).
    Keep it extremely concise and professional.
    
    Data:
    ${contextStr}
    `;

    const result = await model.generateContent(prompt);
    const briefingText = result.response.text();

    return NextResponse.json({ success: true, briefing: briefingText });

  } catch (err: any) {
    console.error('AI Briefing Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
