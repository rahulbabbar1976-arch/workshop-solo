import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { supplierId, amount, paymentMethod, notes } = await request.json();
    if (!supplierId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Supplier ID and a valid positive amount are required.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found.' }, { status: 404 });
    }

    // Record the transaction as negative amount (reduces outstanding balance)
    const negativeAmount = -Math.abs(amount);

    // Use a transaction to ensure atomic updates
    const [transaction, updatedSupplier] = await prisma.$transaction([
      prisma.supplierTransaction.create({
        data: {
          supplierId,
          type: 'payment',
          amount: negativeAmount,
          paymentMethod: paymentMethod || 'UPI',
          notes: notes || 'Supplier payment logged'
        }
      }),
      prisma.supplier.update({
        where: { id: supplierId },
        data: {
          outstandingBalance: {
            decrement: amount
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      transaction,
      outstandingBalance: updatedSupplier.outstandingBalance,
      message: `Successfully recorded payment of ₹${amount} to ${supplier.name}.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
