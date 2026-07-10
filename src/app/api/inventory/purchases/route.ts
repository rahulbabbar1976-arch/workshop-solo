import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // We need partMasterId to record a purchase
    if (!data.partMasterId) {
      return NextResponse.json({ success: false, error: 'Missing partMasterId' }, { status: 400 });
    }

    const qty = parseFloat(data.quantityBought) || 0;

    // Use a transaction to create the purchase ledger entry and update stock
    const [purchase, updatedPart] = await prisma.$transaction([
      prisma.partPurchase.create({
        data: {
          partMasterId: data.partMasterId,
          dateOfPurchase: new Date(data.dateOfPurchase || new Date()),
          invoiceNumber: data.invoiceNumber || null,
          supplierName: data.supplierName || null,
          supplierContact: data.supplierContact || null,
          purchasePrice: parseFloat(data.purchasePrice) || 0,
          quantityBought: qty
        }
      }),
      prisma.partsMaster.update({
        where: { id: data.partMasterId },
        data: {
          stockQuantity: { increment: qty }
        }
      })
    ]);

    return NextResponse.json({ success: true, purchase, updatedPart });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
