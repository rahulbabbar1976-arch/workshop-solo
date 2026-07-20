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

    const ledgers = await prisma.payrollLedger.findMany({
      where: whereClause,
      orderBy: { transactionDate: 'desc' },
      include: {
        user: true
      }
    });

    return NextResponse.json({ success: true, ledgers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, transactionDate, transactionType, amount, description, tenantId } = body;

    if (!userId || !transactionDate || !transactionType || amount === undefined) {
      return NextResponse.json({ success: false, error: 'User ID, Date, Type, and Amount are required' }, { status: 400 });
    }

    const ledger = await prisma.payrollLedger.create({
      data: {
        userId,
        transactionDate: new Date(transactionDate),
        transactionType,
        amount: parseFloat(amount),
        description: description || null,
        tenantId: tenantId || null
      }
    });

    return NextResponse.json({ success: true, ledger });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
