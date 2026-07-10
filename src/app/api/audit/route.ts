import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const logs = await prisma.jobCardAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        jobCard: {
          select: {
            jobcardNumber: true
          }
        }
      },
      take: 100
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
