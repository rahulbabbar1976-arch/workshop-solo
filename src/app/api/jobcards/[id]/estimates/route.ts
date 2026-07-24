import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('workshop_user_id')?.value;
    
    let tenantId = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      tenantId = user?.tenantId || null;
    }

    const estimates = await prisma.estimate.findMany({
      where: { 
        jobCardId: id,
        ...(tenantId ? { tenantId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, estimates });
  } catch (error: any) {
    console.error("Fetch estimates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('workshop_user_id')?.value;
    
    let tenantId = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      tenantId = user?.tenantId || null;
    }

    const jobCard = await prisma.jobCard.findUnique({
      where: { id },
      include: {
        partLines: true,
        labourLines: true,
        customer: true,
        vehicle: true,
      }
    });

    if (!jobCard || (tenantId && jobCard.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Jobcard not found" }, { status: 404 });
    }

    // Generate Estimate Number
    const year = new Date().getFullYear();
    const allEstimates = await prisma.estimate.findMany({
      select: { estimateNumber: true },
      where: { estimateNumber: { startsWith: `EST-${year}-` } }
    });
    
    let maxNum = 0;
    for (const est of allEstimates) {
      const match = est.estimateNumber.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const seqStr = String(maxNum + 1).padStart(4, '0');
    const estimateNumber = `EST-${year}-${seqStr}`;

    // Calculate Totals
    let totalParts = 0;
    let partsDiscount = 0;
    jobCard.partLines.forEach((p: any) => {
      const qty = p.quantityRequested || 0;
      const price = p.sellingPrice || 0;
      const itemTotal = qty * price;
      totalParts += itemTotal;
      if (p.discountType === 'percentage' && p.discountValue) {
        partsDiscount += itemTotal * (p.discountValue / 100);
      } else if (p.discountType === 'amount' && p.discountValue) {
        partsDiscount += p.discountValue;
      }
    });

    let totalLabor = 0;
    let laborDiscount = 0;
    jobCard.labourLines.forEach((l: any) => {
      const qty = l.quantity || 0;
      const price = l.sellingPrice || 0;
      const itemTotal = qty * price;
      totalLabor += itemTotal;
      if (l.discountType === 'percentage' && l.discountValue) {
        laborDiscount += itemTotal * (l.discountValue / 100);
      } else if (l.discountType === 'amount' && l.discountValue) {
        laborDiscount += l.discountValue;
      }
    });

    const totalAmount = totalParts + totalLabor;
    const discountAmount = partsDiscount + laborDiscount;
    const taxAmount = 0; // Or calculate tax based on your logic
    const grandTotal = totalAmount - discountAmount + taxAmount;

    // Snapshot of lines
    const partsSnapshot = JSON.stringify(jobCard.partLines.map(p => ({
       partName: p.partName,
       partNumber: p.partNumber,
       quantity: p.quantityRequested,
       sellingPrice: p.sellingPrice,
       discountType: p.discountType,
       discountValue: p.discountValue
    })));

    const laborSnapshot = JSON.stringify(jobCard.labourLines.map(l => ({
       labourName: l.labourName,
       quantity: l.quantity,
       sellingPrice: l.sellingPrice,
       discountType: l.discountType,
       discountValue: l.discountValue
    })));

    const estimate = await prisma.estimate.create({
      data: {
        jobCardId: id,
        tenantId,
        estimateNumber,
        customerName: jobCard.customer?.displayName || "Unknown",
        totalAmount,
        discountAmount,
        taxAmount,
        grandTotal,
        status: 'DRAFT',
        partsSnapshot,
        laborSnapshot
      }
    });

    return NextResponse.json({ success: true, estimate });
  } catch (error: any) {
    console.error("Estimate creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
