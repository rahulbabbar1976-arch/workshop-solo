import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        lines: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      supplierName, 
      notes, 
      lines,
      jobCardId,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleVin
    } = body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ success: false, error: 'Purchase Order must contain at least one line item.' }, { status: 400 });
    }

    // Auto-generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.$transaction(async (tx) => {
      // Create PO Header
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierName: supplierName || 'General Vendor',
          notes: notes || '',
          status: 'draft',
          totalAmount: 0, // Will calculate below
          jobCardId: jobCardId || null,
          vehicleMake: vehicleMake || null,
          vehicleModel: vehicleModel || null,
          vehicleYear: vehicleYear || null,
          vehicleVin: vehicleVin || null
        }
      });

      let total = 0;

      // Create lines
      for (const line of lines) {
        const qty = parseFloat(line.quantity) || 1;
        const cost = parseFloat(line.estimatedUnitCost) || 0;
        const lineTotal = qty * cost;
        total += lineTotal;

        await tx.purchaseOrderLine.create({
          data: {
            purchaseOrderId: po.id,
            partMasterId: line.partMasterId || null,
            partName: line.partName,
            partNumber: line.partNumber || null,
            brand: line.brand || null,
            category: line.category || 'Other',
            quantity: qty,
            estimatedUnitCost: cost,
            totalCost: lineTotal
          }
        });
      }

      // Update PO total
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { totalAmount: total },
        include: { lines: true }
      });

      return updatedPo;
    });

    return NextResponse.json({ success: true, order });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
