import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const jobcard = await prisma.jobCard.findFirst();
    if (!jobcard) return NextResponse.json({ error: 'No jobcard' });

    await prisma.jobCard.update({
      where: { id: jobcard.id },
      data: { amountPaid: 100 }
    });

    return NextResponse.json({ success: true, message: 'Updated amountPaid' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
