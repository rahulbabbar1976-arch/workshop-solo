import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const jobCards = await prisma.jobCard.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' },
      select: {
        jobcardNumber: true,
        createdAt: true,
        dateIn: true,
        expectedDeliveryAt: true,
        closedAt: true
      }
    });
    
    return NextResponse.json({ success: true, jobCards });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
