import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { items, supplierName, billNumber } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items provided' }, { status: 400 });
    }

    // Wrap in a transaction to ensure all or nothing
    const result = await prisma.$transaction(async (tx) => {
      const createdMasters = [];
      const purchases = [];

      for (const item of items) {
        // 1. Create or update PartMaster
        // Simple logic: If we find a part with same name, update it. Else create new.
        let master = await tx.partsMaster.findFirst({
          where: { partName: item.partName }
        });

        if (master) {
          master = await tx.partsMaster.update({
            where: { id: master.id },
            data: {
              stockQuantity: (master.stockQuantity || 0) + (parseFloat(item.quantity) || 0),
              defaultSellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : master.defaultSellingPrice,
              hsnCode: item.hsnCode || master.hsnCode,
              defaultTaxRate: item.gstRate ? parseFloat(item.gstRate) : master.defaultTaxRate,
            }
          });
        } else {
          master = await tx.partsMaster.create({
            data: {
              partName: item.partName,
              partNumber: item.partNumber || null,
              hsnCode: item.hsnCode || null,
              defaultTaxRate: item.gstRate ? parseFloat(item.gstRate) : null,
              defaultSellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : null,
              stockQuantity: parseFloat(item.quantity) || 0,
            }
          });
        }
        createdMasters.push(master);

        // 2. Record Inventory Ledger entry
        if (parseFloat(item.quantity) > 0) {
          await tx.inventoryLedger.create({
            data: {
              partMasterId: master.id,
              transactionType: 'PURCHASE_IN',
              quantity: parseFloat(item.quantity),
              runningStock: master.stockQuantity || 0,
              supplierName: supplierName || 'Unknown Supplier'
            }
          });
        }
      }

      return createdMasters;
    });

    return NextResponse.json({ success: true, count: result.length });
  } catch (err: any) {
    console.error('Bulk Import Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
