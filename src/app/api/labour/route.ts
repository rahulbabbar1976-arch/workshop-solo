import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  try {
    const labour = await prisma.labourMaster.findMany({
      where: {
        OR: [
          { labourName: { contains: q } },
          { labourCode: { contains: q } }
        ],
        isActive: true
      },
      take: 15
    });

    return NextResponse.json({ success: true, labour });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
