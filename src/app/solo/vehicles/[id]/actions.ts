"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateVehicleBatteryAction(
  vehicleId: string, 
  data: { 
    batteryMake: string, 
    batterySerialNumber: string, 
    batteryWarrantyMonths: number | null, 
    batteryInstallationDate: Date | null 
  }
) {
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      batteryMake: data.batteryMake,
      batterySerialNumber: data.batterySerialNumber,
      batteryWarrantyMonths: data.batteryWarrantyMonths,
      batteryInstallationDate: data.batteryInstallationDate,
    }
  });

  revalidatePath(`/solo/vehicles/${vehicleId}`);
  return { success: true };
}
