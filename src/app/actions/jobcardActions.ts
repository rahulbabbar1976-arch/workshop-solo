"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Action to search for a vehicle and its customer by Registration Number
export async function searchVehicleAction(regNo: string) {
  if (!regNo || regNo.length < 4) return null;
  
  const normalizedLpn = regNo.replace(/[^A-Z0-9]/g, '');
  
  const vehicle = await prisma.vehicle.findUnique({
    where: { registrationNumberNormalized: normalizedLpn },
    include: {
      currentCustomer: true
    }
  });
  
  if (!vehicle) return null;
  
  return {
    make: vehicle.manufacturer || "",
    model: vehicle.model || "",
    year: vehicle.manufactureYear?.toString() || "",
    color: vehicle.color || "",
    odometer: vehicle.currentOdometer?.toString() || "",
    nextServiceDueKm: vehicle.nextServiceOdometer?.toString() || "",
    customerName: vehicle.currentCustomer?.displayName || "",
    mobile: vehicle.currentCustomer?.primaryMobile || "",
    address: vehicle.currentCustomer?.addressLine1 || "",
    driverName: vehicle.currentCustomer?.driverName || "",
    driverMobile: vehicle.currentCustomer?.driverMobile || "",
  };
}

// Action to save a new JobCard (and upsert Vehicle/Customer)
export async function createJobCardAction(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  let tenantId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    tenantId = user?.tenantId || null;
  }

  const rawRegNo = formData.get("regNo") as string;
  const normalizedLpn = rawRegNo.replace(/[^A-Z0-9]/g, '');
  
  const customerName = formData.get("customerName") as string;
  const mobile = formData.get("mobile") as string;
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const odometer = formData.get("odometer") ? parseInt(formData.get("odometer") as string) : null;
  const complaint = formData.get("complaint") as string;
  const address = formData.get("address") as string;

  // Transaction to Upsert Customer -> Upsert Vehicle -> Create JobCard
  const result = await prisma.$transaction(async (tx) => {
    
    // 1. Upsert Customer
    let customer;
    if (mobile) {
      customer = await tx.customer.findFirst({ where: { primaryMobile: mobile, tenantId } });
    }
    if (!customer) {
      customer = await tx.customer.create({
        data: {
          displayName: customerName || "Unknown Customer",
          primaryMobile: mobile,
          addressLine1: address,
          tenantId
        }
      });
    }

    // 2. Upsert Vehicle
    const vehicle = await tx.vehicle.upsert({
      where: { registrationNumberNormalized: normalizedLpn },
      update: {
        manufacturer: make,
        model: model,
        currentOdometer: odometer,
        currentCustomerId: customer.id,
      },
      create: {
        registrationNumberRaw: rawRegNo,
        registrationNumberNormalized: normalizedLpn,
        manufacturer: make,
        model: model,
        currentOdometer: odometer,
        currentCustomerId: customer.id,
        tenantId
      }
    });

    // 3. Create Job Card
    const jobcardNumber = `JC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const jobCard = await tx.jobCard.create({
      data: {
        jobcardNumber,
        status: "open",
        externalNotes: complaint,
        intakeOdometer: odometer,
        tenantId,
        customerId: customer.id,
        vehicleId: vehicle.id,
      }
    });

    // Also create the formal JobCardComplaint record
    await tx.jobCardComplaint.create({
      data: {
        jobcardId: jobCard.id,
        customerComplaintText: complaint,
        tenantId
      }
    });

    const mediaStr = formData.get("media") as string;
    if (mediaStr) {
      try {
        const mediaArr = JSON.parse(mediaStr);
        if (Array.isArray(mediaArr)) {
          for (const m of mediaArr) {
            await tx.jobCardMedia.create({
              data: {
                jobcardId: jobCard.id,
                mediaType: 'intake_photo',
                phase: 'intake',
                fileUrl: m.fileUrl,
                fileName: m.fileName || null,
              }
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse media", e);
      }
    }

    return jobCard;
  });

  revalidatePath('/solo/dashboard');
  revalidatePath('/solo/jobcards');
  
  return { success: true, jobCardId: result.jobcardNumber };
}
