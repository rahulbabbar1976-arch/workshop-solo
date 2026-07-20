import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || null;
    const userId = searchParams.get('userId');

    const whereClause: any = tenantId ? { tenantId } : {};
    if (userId) {
      whereClause.userId = userId;
    }

    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        user: true
      }
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, status, clockIn, clockOut, notes, tenantId } = body;

    if (!userId || !date) {
      return NextResponse.json({ success: false, error: 'User ID and Date are required' }, { status: 400 });
    }

    const log = await prisma.attendanceLog.create({
      data: {
        userId,
        date: new Date(date),
        status: status || 'Present',
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        notes: notes || null,
        tenantId: tenantId || null
      }
    });

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
