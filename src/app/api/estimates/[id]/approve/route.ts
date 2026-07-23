import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { approvedByName = "Customer", approvalMethod = "whatsapp" } = body;

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

    if (!estimate || (tenantId && estimate.jobCard?.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Estimate Status & Lock it
      const updatedEstimate = await tx.estimate.update({
        where: { id },
        data: {
          status: "approved",
          isLocked: true,
          approvedAt: new Date(),
          approvedByName,
          approvalMethod
        }
      });

      // 2. Clean current job card parts and labor
      await tx.jobCardPart.deleteMany({
        where: { jobcardId: estimate.jobCardId! }
      });
      await tx.jobCardLabour.deleteMany({
        where: { jobcardId: estimate.jobCardId! }
      });

      // 3. Re-populate JobCardPart from snapshot
      if (estimate.partsSnapshot) {
        const parts = JSON.parse(estimate.partsSnapshot);
        if (Array.isArray(parts)) {
          for (const p of parts) {
            await tx.jobCardPart.create({
              data: {
                jobcardId: estimate.jobCardId!,
                partName: p.partName || "Unknown Part",
                partNumber: p.partNumber || null,
                quantityRequested: parseFloat(String(p.quantity)) || 1,
                sellingPrice: parseFloat(String(p.sellingPrice)) || 0,
                discountType: p.discountType || null,
                discountValue: parseFloat(String(p.discountValue)) || null,
                status: "requested"
              }
            });
          }
        }
      }

      // 4. Re-populate JobCardLabour from snapshot
      if (estimate.laborSnapshot) {
        const labors = JSON.parse(estimate.laborSnapshot);
        if (Array.isArray(labors)) {
          for (const l of labors) {
            await tx.jobCardLabour.create({
              data: {
                jobcardId: estimate.jobCardId!,
                labourName: l.labourName || "Unknown Service",
                quantity: parseFloat(String(l.quantity)) || 1,
                sellingPrice: parseFloat(String(l.sellingPrice)) || 0,
                discountType: l.discountType || null,
                discountValue: parseFloat(String(l.discountValue)) || null,
                status: "pending"
              }
            });
          }
        }
      }

      return updatedEstimate;
    });

    return NextResponse.json({ success: true, estimate: result });
  } catch (error: any) {
    console.error("Approve estimate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
