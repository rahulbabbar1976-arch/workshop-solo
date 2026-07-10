import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const all = searchParams.get('all') === 'true';

  try {
    const whereClause = q ? {
      OR: [
        { partName: { contains: q } },
        { itemCode: { contains: q } },
        { partNumber: { contains: q } }
      ],
      isActive: true
    } : { isActive: true };

    const parts = await prisma.partsMaster.findMany({
      where: whereClause,
      take: all ? undefined : 15,
      include: all ? { inventoryLedgers: { orderBy: { createdAt: 'desc' } } } : undefined
    });

    return NextResponse.json({ success: true, parts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
