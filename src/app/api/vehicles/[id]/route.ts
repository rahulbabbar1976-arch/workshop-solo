import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('workshop_user_id')?.value;
    
    let tenantId = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      tenantId = user?.tenantId || null;
    }

    const data = await req.json();

    const vehicle = await prisma.vehicle.findUnique({
      where: { id }
    });

    if (!vehicle || (tenantId && vehicle.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        vin: data.vin !== undefined ? (data.vin || null) : vehicle.vin,
        manufactureYear: data.manufactureYear ? parseInt(data.manufactureYear, 10) : (data.manufactureYear === null ? null : vehicle.manufactureYear),
        color: data.color !== undefined ? (data.color || null) : vehicle.color,
        nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : (data.nextServiceDate === null ? null : vehicle.nextServiceDate),
        emissionInspectionExpiryDate: data.emissionInspectionExpiryDate ? new Date(data.emissionInspectionExpiryDate) : (data.emissionInspectionExpiryDate === null ? null : vehicle.emissionInspectionExpiryDate),
        nextOilChangeDate: data.nextOilChangeDate ? new Date(data.nextOilChangeDate) : null,
        nextOilChangeDistance: data.nextOilChangeDistance ? parseInt(data.nextOilChangeDistance) : null,
        batteryMake: data.batteryMake || null,
        batterySerialNumber: data.batterySerialNumber || null,
        batteryInstallationDate: data.batteryInstallationDate ? new Date(data.batteryInstallationDate) : null,
        insurerName: data.insurerName || null,
        insurancePolicyNumber: data.insurancePolicyNumber || null,
        insuranceExpiryDate: data.insuranceExpiryDate ? new Date(data.insuranceExpiryDate) : null,
      }
    });

    return NextResponse.json({ success: true, vehicle: updatedVehicle });
  } catch (error: any) {
    console.error("Vehicle update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
