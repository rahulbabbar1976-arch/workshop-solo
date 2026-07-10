import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const updatedPart = await prisma.partsMaster.update({
      where: { id },
      data: {
        partName: data.partName,
        partNumber: data.partNumber || null,
        oemPartNumber: data.oemPartNumber || null,
        brand: data.brand || null,
        manufacturerName: data.manufacturerName || null,
        compatibility: data.compatibility || null,
        vehicleMake: data.vehicleMake || null,
        vehicleModel: data.vehicleModel || null,
        vehicleYear: data.vehicleYear || null,
        hsnCode: data.hsnCode || null,
        category: data.category || null,
        stockQuantity: data.stockQuantity !== undefined ? parseFloat(data.stockQuantity) : undefined,
        defaultSellingPrice: data.defaultSellingPrice ? parseFloat(data.defaultSellingPrice) : null,
        defaultTaxRate: data.defaultTaxRate ? parseFloat(data.defaultTaxRate) : null,
        rackNumber: data.rackNumber || null,
        binNumber: data.binNumber || null,
      }
    });

    return NextResponse.json({ success: true, part: updatedPart });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check if it's used in jobcards
    const used = await prisma.jobCardPart.findFirst({ where: { partMasterId: id } });
    if (used) {
        return NextResponse.json({ success: false, error: 'Cannot delete part that has been used in a jobcard' }, { status: 400 });
    }

    // Delete purchases first
    await prisma.partPurchase.deleteMany({ where: { partMasterId: id } });
    await prisma.partsMaster.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
