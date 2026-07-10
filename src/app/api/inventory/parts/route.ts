import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    let whereClause = {};
    if (query) {
      whereClause = {
        OR: [
          { partName: { contains: query } },
          { partNumber: { contains: query } },
          { oemPartNumber: { contains: query } },
          { manufacturerName: { contains: query } },
          { vehicleMake: { contains: query } },
          { vehicleModel: { contains: query } },
        ]
      };
    }

    const parts = await prisma.partsMaster.findMany({
      where: whereClause,
      include: {
        purchases: {
          orderBy: { dateOfPurchase: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, parts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const newPart = await prisma.partsMaster.create({
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
        stockQuantity: data.stockQuantity ? parseFloat(data.stockQuantity) : 0,
        defaultSellingPrice: data.defaultSellingPrice ? parseFloat(data.defaultSellingPrice) : null,
        defaultTaxRate: data.defaultTaxRate ? parseFloat(data.defaultTaxRate) : null,
        rackNumber: data.rackNumber || null,
        binNumber: data.binNumber || null,
      }
    });

    return NextResponse.json({ success: true, part: newPart });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
