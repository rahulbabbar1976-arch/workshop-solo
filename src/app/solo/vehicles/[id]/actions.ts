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

export async function updateVehicleDetailsAction(
  vehicleId: string, 
  data: { 
    registrationNumberRaw: string, 
    manufacturer: string, 
    model: string, 
    manufactureYear: string,
    vin: string,
    color: string
  }
) {
  const normalizedReg = data.registrationNumberRaw.toUpperCase().replace(/\s+/g, '');
  
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      registrationNumberRaw: data.registrationNumberRaw,
      registrationNumberNormalized: normalizedReg,
      manufacturer: data.manufacturer,
      model: data.model,
      manufactureYear: data.manufactureYear ? parseInt(data.manufactureYear, 10) : null,
      vin: data.vin,
      color: data.color
    }
  });

  revalidatePath(`/solo/vehicles/${vehicleId}`);
  return { success: true };
}
