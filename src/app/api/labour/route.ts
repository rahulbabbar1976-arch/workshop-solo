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

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const newLabour = await prisma.labourMaster.create({
      data: {
        labourName: data.labourName,
        labourCode: data.labourCode || null,
        defaultSellingPrice: data.defaultSellingPrice ? parseFloat(data.defaultSellingPrice) : null,
        defaultTaxRate: data.defaultTaxRate ? parseFloat(data.defaultTaxRate) : null,
      }
    });

    return NextResponse.json({ success: true, labour: newLabour });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
