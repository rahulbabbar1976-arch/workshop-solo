import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await request.json();
    
    const updatedLabour = await prisma.labourMaster.update({
      where: { id },
      data: {
        labourName: data.labourName !== undefined ? data.labourName : undefined,
        labourCode: data.labourCode !== undefined ? data.labourCode : undefined,
        defaultSellingPrice: data.defaultSellingPrice !== undefined ? parseFloat(data.defaultSellingPrice) : undefined,
      }
    });

    return NextResponse.json({ success: true, labour: updatedLabour });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const used = await prisma.jobCardLabour.findFirst({ where: { labourMasterId: id } });
    if (used) {
      return NextResponse.json({ success: false, error: 'Cannot delete labour that has been used in a jobcard' }, { status: 400 });
    }

    await prisma.labourMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
