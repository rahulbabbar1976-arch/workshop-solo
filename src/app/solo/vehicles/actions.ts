"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function transferVehicleOwnershipAction(vehicleId: string, newCustomerId: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  if (!userId) throw new Error("Unauthorized");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId }
  });

  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.currentCustomerId === newCustomerId) {
    throw new Error("Vehicle is already owned by this customer");
  }

  await prisma.$transaction(async (tx) => {
    // End the current ownership record
    await tx.vehicleOwnershipHistory.updateMany({
      where: {
        vehicleId: vehicleId,
        toDate: null
      },
      data: {
        toDate: new Date()
      }
    });

    // Update vehicle's current customer
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { currentCustomerId: newCustomerId }
    });

    // Create new ownership history record
    await tx.vehicleOwnershipHistory.create({
      data: {
        vehicleId: vehicleId,
        customerId: newCustomerId,
        fromDate: new Date(),
        transferNotes: "Transferred via Solo interface"
      }
    });
  });

  revalidatePath("/solo/vehicles");
  revalidatePath(`/solo/vehicles/${vehicleId}`);
  return { success: true };
}
