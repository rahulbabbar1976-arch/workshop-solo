import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: { 
        lines: true,
        approvals: true,
        variance: true,
        jobCard: true
      }
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, estimate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('workshop_user_id')?.value;
    
    let tenantId = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      tenantId = user?.tenantId || null;
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: { jobCard: true }
    });

    if (!estimate || (tenantId && estimate.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (estimate.status !== 'DRAFT' && estimate.status !== 'REJECTED') {
      return NextResponse.json({ error: "Only DRAFT or REJECTED estimates can be cancelled/deleted" }, { status: 400 });
    }

    // Soft delete by updating status to CANCELLED
    await prisma.estimate.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({ success: true, message: 'Estimate cancelled successfully' });
  } catch (error: any) {
    console.error("Delete estimate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const estimate = await prisma.estimate.findUnique({
      where: { id }
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (estimate.isLockedForEditing || estimate.isLocked) {
      return NextResponse.json({ error: "Locked estimates cannot be modified" }, { status: 403 });
    }
    
    const { lines, ...updateData } = body;
    
    // Ensure we don't accidentally override the ID or timestamps
    delete updateData.id;
    delete updateData.createdAt;
    
    const updated = await prisma.estimate.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    if (lines && Array.isArray(lines)) {
      // Re-create lines
      await prisma.estimateLine.deleteMany({ where: { estimateId: id } });
      
      const newLines = lines.map((l: any, index: number) => {
        const qty = parseFloat(l.quantity) || 1;
        const price = parseFloat(l.unitPrice) || 0;
        const taxRate = parseFloat(l.taxRate) || 18;
        const discVal = l.discountType === 'percent'
          ? (price * qty * (parseFloat(l.discountValue) || 0) / 100)
          : (parseFloat(l.discountValue) || 0);
        const lineBase = price * qty - discVal;
        const lineTax = lineBase * taxRate / 100;
        
        const type = (l.lineType || l.itemType || 'PART').toUpperCase();
        
        return {
          estimateId: id,
          itemType: (type === 'LABOUR' ? 'LABOR' : (type === 'CHARGE' ? 'CHARGE' : 'PART')) as any,
          lineItemNumber: index + 1,
          lineType: type,
          name: l.name || l.partDescription || l.serviceName || 'Item',
          partNumber: l.partNumber || null,
          brand: l.brand || null,
          quantity: qty,
          unitPrice: price,
          taxRate,
          gstPercent: taxRate,
          gstAmount: lineTax,
          discountType: l.discountType || null,
          discountValue: parseFloat(l.discountValue) || 0,
          discountAmountItem: discVal,
          lineTotal: lineBase + lineTax,
          reason: l.reason || null,
          estimatedHours: l.estimatedHours || null,
          complexity: l.complexity || null,
        }
      });
      
      await prisma.estimateLine.createMany({ data: newLines });
    }

    return NextResponse.json({ success: true, estimate: updated });
  } catch (error: any) {
    console.error("Update estimate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
