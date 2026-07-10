import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Generate an estimate number
async function generateEstimateNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.estimate.count();
  return `EST-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  try {
    const estimates = await prisma.estimate.findMany({
      where: status ? { status } : {},
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return NextResponse.json({ success: true, estimates });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId, vehicleId, advisorId,
      customerName, customerMobile,
      vehicleRegNo, vehicleMake, vehicleModel,
      customerNotes, internalNotes,
      validityDays = 7,
      lines = [],
      photos = []
    } = body;

    const estimateNumber = await generateEstimateNumber();

    // Calculate totals from lines
    let subtotal = 0, taxTotal = 0;
    const processedLines = lines.map((l: any) => {
      const qty = parseFloat(l.quantity) || 1;
      const price = parseFloat(l.unitPrice) || 0;
      const taxRate = parseFloat(l.taxRate) || 18;
      const discVal = l.discountType === 'percent'
        ? (price * qty * (parseFloat(l.discountValue) || 0) / 100)
        : (parseFloat(l.discountValue) || 0);
      const lineBase = price * qty - discVal;
      const lineTax = lineBase * taxRate / 100;
      const lineTotal = lineBase + lineTax;
      subtotal += lineBase;
      taxTotal += lineTax;
      return {
        lineType: l.lineType || 'part',
        name: l.name,
        partNumber: l.partNumber || null,
        brand: l.brand || null,
        quantity: qty,
        unitPrice: price,
        taxRate,
        discountType: l.discountType || null,
        discountValue: parseFloat(l.discountValue) || null,
        lineTotal
      };
    });

    const estimate = await prisma.estimate.create({
      data: {
        estimateNumber,
        customerId: customerId || null,
        vehicleId: vehicleId || null,
        advisorId: advisorId || null,
        customerName: customerName || 'Walk-in Customer',
        customerMobile: customerMobile || null,
        vehicleRegNo: vehicleRegNo || null,
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        customerNotes: customerNotes || null,
        internalNotes: internalNotes || null,
        photos: JSON.stringify(photos),
        validityDays,
        subtotalAmount: subtotal,
        taxAmount: taxTotal,
        totalAmount: subtotal + taxTotal,
        lines: { create: processedLines }
      },
      include: { lines: true }
    });

    return NextResponse.json({ success: true, estimate });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
