import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
async function generateJobCardNumber(tenantId: string | undefined) {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  const count = await prisma.jobCard.count({
    where: { 
      tenantId: tenantId || null,
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    }
  });

  const nextNumber = count + 1;
  const padding = "000";
  const numStr = (padding + nextNumber).slice(-padding.length);
  return `JC-${currentYear}${currentMonth}-${numStr}`;
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

    const original = await prisma.jobCard.findUnique({
      where: { id, tenantId },
      include: {
        snapshot: true,
        partLines: true,
        labourLines: true,
      }
    });

    if (!original) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    const newJobcardNumber = await generateJobCardNumber(tenantId || undefined);

    const cloned = await prisma.jobCard.create({
      data: {
        jobcardNumber: newJobcardNumber,
        customerId: original.customerId,
        vehicleId: original.vehicleId,
        advisorId: original.advisorId,
        tenantId: original.tenantId,
        status: "open",
        dateIn: new Date(),
        intakeOdometer: original.intakeOdometer,
        fuelLevel: original.fuelLevel,
        externalNotes: original.externalNotes,
        internalNotes: original.internalNotes,
        
        snapshot: original.snapshot ? {
          create: {
            customerName: original.snapshot.customerName,
            customerMobile: original.snapshot.customerMobile,
            customerDriverName: original.snapshot.customerDriverName,
            customerDriverMobile: original.snapshot.customerDriverMobile,
            customerAddress: original.snapshot.customerAddress,
            customerTaxId: original.snapshot.customerTaxId,
            vehicleRegistrationNumber: original.snapshot.vehicleRegistrationNumber,
            vehicleManufacturer: original.snapshot.vehicleManufacturer,
            vehicleModel: original.snapshot.vehicleModel,
            vehicleColor: original.snapshot.vehicleColor,
            vehicleVin: original.snapshot.vehicleVin,
            intakeOdometerSnapshot: original.snapshot.intakeOdometerSnapshot,
          }
        } : undefined,

        partLines: {
          create: original.partLines.map(p => ({
            partMasterId: p.partMasterId,
            partName: p.partName,
            partNumber: p.partNumber,
            brand: p.brand,
            hsnCode: p.hsnCode,
            quantityRequested: p.quantityRequested,
            sellingPrice: p.sellingPrice,
            taxRate: p.taxRate,
            discountType: p.discountType,
            discountValue: p.discountValue,
            status: "pending",
          }))
        },

        labourLines: {
          create: original.labourLines.map(l => ({
            labourName: l.labourName,
            hsnCode: l.hsnCode,
            quantity: l.quantity,
            sellingPrice: l.sellingPrice,
            taxRate: l.taxRate,
            discountType: l.discountType,
            discountValue: l.discountValue,
            status: "pending",
          }))
        }
      }
    });

    return NextResponse.json({ success: true, id: cloned.id });
  } catch (error: any) {
    console.error("Clone error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
