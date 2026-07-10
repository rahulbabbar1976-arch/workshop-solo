import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const parts = await prisma.partsMaster.findMany({
      where: {
        stockQuantity: { gt: 0 }
      },
      select: {
        id: true,
        partName: true,
        partNumber: true,
        stockQuantity: true,
        defaultSellingPrice: true
      }
    });

    // Find the most recent PURCHASE_IN for each part
    const ledgers = await prisma.inventoryLedger.groupBy({
      by: ['partMasterId'],
      where: { transactionType: 'PURCHASE_IN' },
      _max: {
        transactionDate: true
      }
    });

    const ledgerMap = new Map();
    ledgers.forEach(l => {
      ledgerMap.set(l.partMasterId, l._max.transactionDate);
    });

    const now = new Date();
    
    let fresh = 0; // < 30 days
    let aging = 0; // 30-90 days
    let deadStock = 0; // > 90 days
    let deadStockValue = 0;
    
    const deadStockParts: any[] = [];

    parts.forEach(part => {
      const lastPurchased = ledgerMap.get(part.id);
      
      // If no purchase record, fallback to a default (assume very old)
      const dateToCheck = lastPurchased ? new Date(lastPurchased) : new Date(0); 
      const diffTime = Math.abs(now.getTime() - dateToCheck.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        fresh += 1;
      } else if (diffDays >= 30 && diffDays <= 90) {
        aging += 1;
      } else {
        deadStock += 1;
        deadStockValue += ((part.stockQuantity || 0) * (part.defaultSellingPrice || 0));
        deadStockParts.push({
          id: part.id,
          name: part.partName,
          partNo: part.partNumber,
          qty: part.stockQuantity,
          daysOld: diffDays === Math.ceil(now.getTime() / (1000*60*60*24)) ? '90+' : diffDays,
          value: (part.stockQuantity || 0) * (part.defaultSellingPrice || 0)
        });
      }
    });

    // Sort dead stock by value (highest first)
    deadStockParts.sort((a, b) => b.value - a.value);

    return NextResponse.json({
      success: true,
      summary: {
        fresh,
        aging,
        deadStock,
        deadStockValue
      },
      deadStockParts: deadStockParts.slice(0, 10) // Top 10 dead stock items
    });

  } catch (err: any) {
    console.error('Aging Report Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
