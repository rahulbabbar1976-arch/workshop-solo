import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const returns = await prisma.partReturn.findMany({
      orderBy: { returnDate: 'desc' }
    });
    return NextResponse.json({ success: true, returns });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supplierId, purchaseOrderId, partName, partNumber, quantity, unitCost, reason } = await request.json();
    if (!supplierId || !partName || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Supplier, Part Name, and a valid quantity are required.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found.' }, { status: 404 });
    }

    const cost = unitCost || 0;
    const totalAmount = quantity * cost;

    // Use transaction for consistency
    const [partReturn, transaction, updatedSupplier] = await prisma.$transaction([
      prisma.partReturn.create({
        data: {
          purchaseOrderId,
          supplierId,
          supplierName: supplier.name,
          partName,
          partNumber,
          quantity: parseFloat(quantity),
          unitCost: parseFloat(cost),
          totalAmount,
          reason: reason || 'Parts returned to supplier'
        }
      }),
      prisma.supplierTransaction.create({
        data: {
          supplierId,
          type: 'return',
          amount: -totalAmount,
          notes: `Return: ${quantity}x ${partName} (${reason || 'no reason stated'})`
        }
      }),
      prisma.supplier.update({
        where: { id: supplierId },
        data: {
          outstandingBalance: {
            decrement: totalAmount
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      partReturn,
      transaction,
      outstandingBalance: updatedSupplier.outstandingBalance,
      message: `Successfully returned ${quantity}x ${partName} to ${supplier.name}. Supplier balance adjusted by -₹${totalAmount}.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
