"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  if (!userId) throw new Error("Not logged in");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.tenantId) throw new Error("Tenant not found");
  return user.tenantId;
}

// 1. Export Tenant Data
export async function exportTenantDataAction() {
  const tenantId = await getTenantId();

  const customers = await prisma.customer.findMany({ where: { tenantId } });
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId } });
  const jobCards = await prisma.jobCard.findMany({ where: { tenantId }, include: { complaints: true } });

  const data = {
    exportDate: new Date().toISOString(),
    customers,
    vehicles,
    jobCards
  };

  return JSON.stringify(data, null, 2);
}

// 2. Restore Tenant Data
export async function restoreTenantDataAction(formData: FormData) {
  const tenantId = await getTenantId();
  const file = formData.get("backupFile") as File;
  if (!file) throw new Error("No file uploaded");

  const fileText = await file.text();
  const data = JSON.parse(fileText);

  if (!data.customers || !data.vehicles || !data.jobCards) {
    throw new Error("Invalid backup file format");
  }

  await prisma.$transaction(async (tx) => {
    // Merge Customers
    for (const c of data.customers) {
      await tx.customer.upsert({
        where: { id: c.id },
        update: {
          displayName: c.displayName,
          primaryMobile: c.primaryMobile,
          addressLine1: c.addressLine1
        },
        create: {
          id: c.id,
          tenantId,
          displayName: c.displayName,
          primaryMobile: c.primaryMobile,
          addressLine1: c.addressLine1,
          sourceSystem: c.sourceSystem,
          sourceRecordId: c.sourceRecordId
        }
      });
    }

    // Merge Vehicles
    for (const v of data.vehicles) {
      await tx.vehicle.upsert({
        where: { id: v.id },
        update: {
          manufacturer: v.manufacturer,
          model: v.model,
          currentOdometer: v.currentOdometer,
          currentCustomerId: v.currentCustomerId
        },
        create: {
          id: v.id,
          tenantId,
          registrationNumberRaw: v.registrationNumberRaw,
          registrationNumberNormalized: v.registrationNumberNormalized,
          manufacturer: v.manufacturer,
          model: v.model,
          currentOdometer: v.currentOdometer,
          currentCustomerId: v.currentCustomerId,
          sourceSystem: v.sourceSystem,
          sourceRecordId: v.sourceRecordId
        }
      });
    }

    // Merge JobCards
    for (const j of data.jobCards) {
      const exists = await tx.jobCard.findUnique({ where: { id: j.id } });
      if (!exists) {
        await tx.jobCard.create({
          data: {
            id: j.id,
            tenantId,
            jobcardNumber: j.jobcardNumber,
            status: j.status,
            externalNotes: j.externalNotes,
            intakeOdometer: j.intakeOdometer,
            customerId: j.customerId,
            vehicleId: j.vehicleId,
            createdAt: j.createdAt ? new Date(j.createdAt) : undefined
          }
        });
      }
    }
  });

  revalidatePath('/solo/dashboard');
  revalidatePath('/solo/vehicles');
  return { success: true };
}

// 3. Import Legacy Jobcard2 Data
export async function importLegacyCsvAction(formData: FormData) {
  const tenantId = await getTenantId();
  
  const custFile = formData.get("customerFile") as File;
  const addrFile = formData.get("addressFile") as File;
  const thingFile = formData.get("thingFile") as File;
  const worksheetFile = formData.get("worksheetFile") as File;

  if (!custFile || !addrFile || !thingFile || !worksheetFile) {
    throw new Error("Missing required CSV files");
  }

  const custText = await custFile.text();
  const addrText = await addrFile.text();
  const thingText = await thingFile.text();
  const worksheetText = await worksheetFile.text();

  const parseCsv = (text: string) => {
    return new Promise<any[]>((resolve) => {
      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
      });
    });
  };

  const addressesRaw = await parseCsv(addrText);
  const customersRaw = await parseCsv(custText);
  const thingsRaw = await parseCsv(thingText);
  const worksheetsRaw = await parseCsv(worksheetText);

  await prisma.$transaction(async (tx) => {
    // 1. Map Addresses
    const addressMap = new Map();
    for (const row of addressesRaw) {
      const customerId = row[2];
      if (customerId) {
        addressMap.set(customerId, {
          name: row[3] || 'Unknown Customer',
          address: row[6] || ''
        });
      }
    }

    // 2. Insert Customers
    for (const row of customersRaw) {
      const legacyId = row[0];
      const mobile = row[11] || '';
      const addressData = addressMap.get(legacyId) || { name: 'Unknown Customer ' + legacyId, address: '' };

      await tx.customer.upsert({
        where: { id: `legacy-cust-${legacyId}` },
        update: {},
        create: {
          id: `legacy-cust-${legacyId}`,
          tenantId,
          displayName: addressData.name,
          primaryMobile: mobile,
          addressLine1: addressData.address,
          sourceSystem: 'jobcard2',
          sourceRecordId: legacyId
        }
      });
    }

    // Fallback Customer
    await tx.customer.upsert({
      where: { id: `legacy-cust-unknown` },
      update: {},
      create: {
        id: `legacy-cust-unknown`,
        tenantId,
        displayName: 'Unknown Legacy Customer',
        customerType: 'retail',
        sourceSystem: 'jobcard2'
      }
    });

    // 3. Insert Vehicles (Things)
    for (const row of thingsRaw) {
      const legacyId = row[0];
      let custId = row[1];
      const lpn = row[2] || `UNKNOWN-${legacyId}`;
      const make = row[10] || '';
      const model = row[11] || '';
      const yearStr = row[9];
      const year = yearStr && !isNaN(parseInt(yearStr)) ? parseInt(yearStr) : null;
      const notes = row[3] || '';

      const normalizedLpn = lpn.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (!normalizedLpn) continue;

      let validCustomer = await tx.customer.findUnique({ where: { id: `legacy-cust-${custId}` } });
      if (!validCustomer) {
        custId = 'unknown';
      }

      await tx.vehicle.upsert({
        where: { registrationNumberNormalized: normalizedLpn },
        update: {},
        create: {
          tenantId,
          registrationNumberRaw: lpn,
          registrationNumberNormalized: normalizedLpn,
          manufacturer: make,
          model: model,
          manufactureYear: year,
          notes: notes,
          currentCustomerId: `legacy-cust-${custId}`,
          sourceSystem: 'jobcard2',
          sourceRecordId: legacyId
        }
      });
    }

    // 4. Insert Worksheets (JobCards)
    for (const row of worksheetsRaw) {
      const legacyId = row[0];
      const thingId = row[1];
      const custId = row[3];
      const dateInStr = row[7];
      const notes = row[19] || '';
      
      if (!legacyId) continue;

      const jobcardNumber = `LEGACY-JC-${legacyId}`;

      let mappedCustId = `legacy-cust-${custId}`;
      let validCustomer = await tx.customer.findUnique({ where: { id: mappedCustId } });
      if (!validCustomer) mappedCustId = `legacy-cust-unknown`;

      // Find Vehicle by sourceRecordId = thingId
      let mappedVehicleId = null;
      if (thingId) {
        const v = await tx.vehicle.findFirst({ where: { sourceSystem: 'jobcard2', sourceRecordId: thingId, tenantId } });
        if (v) mappedVehicleId = v.id;
      }

      if (!mappedVehicleId) {
        // Can't link a jobcard without a vehicle in our schema. 
        // We will create a dummy vehicle if it doesn't exist, or just skip.
        // It's safer to skip if the vehicle is missing.
        continue;
      }

      const dateIn = dateInStr ? new Date(dateInStr) : new Date();

      const exists = await tx.jobCard.findUnique({ where: { jobcardNumber } });
      if (!exists) {
        await tx.jobCard.create({
          data: {
            jobcardNumber,
            tenantId,
            customerId: mappedCustId,
            vehicleId: mappedVehicleId,
            status: 'legacy_imported_read_only',
            createdAt: dateIn,
            dateIn: dateIn,
            externalNotes: notes,
            legacyImportFlag: true,
            readOnlyFlag: true,
            sourceSystem: 'jobcard2',
            sourceRecordId: legacyId
          }
        });
      }
    }
  });

  revalidatePath('/solo/dashboard');
  revalidatePath('/solo/vehicles');
  return { success: true };
}
