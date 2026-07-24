"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  if (!userId) throw new Error("Not logged in");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.tenantId) throw new Error("Tenant not found");
  return user.tenantId;
}

function parseDatesInObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(parseDatesInObject);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = parseDatesInObject(obj[key]);
    }
    return res;
  }
  return obj;
}

import fs from "fs";
import path from "path";

function encodeImageFileToBase64(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('data:image/')) return fileUrl;
  
  if (fileUrl.startsWith('/uploads/')) {
    try {
      const relPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
      const absPath = path.join(process.cwd(), 'public', relPath);
      if (fs.existsSync(absPath)) {
        const buf = fs.readFileSync(absPath);
        const ext = path.extname(absPath).toLowerCase().replace('.', '') || 'jpeg';
        return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buf.toString('base64')}`;
      }
    } catch (e) {
      console.error('Error encoding image file for backup:', e);
    }
  }
  return null;
}

function restoreBase64ToImageFile(base64Data: string | null | undefined, defaultSubfolder: string, preferredFileName?: string): string | null {
  if (!base64Data || !base64Data.startsWith('data:image/')) return null;

  try {
    const parts = base64Data.split(';base64,');
    if (parts.length !== 2) return null;
    const header = parts[0];
    const dataStr = parts[1];
    const extMatch = header.match(/data:image\/([a-zA-Z0-9]+)/);
    const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'jpg';

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', defaultSubfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = preferredFileName ? (preferredFileName.includes('.') ? preferredFileName : `${preferredFileName}.${ext}`) : `restored_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const absPath = path.join(uploadDir, filename);
    fs.writeFileSync(absPath, Buffer.from(dataStr, 'base64'));

    return `/uploads/${defaultSubfolder}/${filename}`;
  } catch (e) {
    console.error('Error writing restored image to disk:', e);
    return null;
  }
}

// 1. Export Complete Tenant Data
export async function exportTenantDataAction() {
  const tenantId = await getTenantId();

  const rawVehiclePhotos = await prisma.vehiclePhoto.findMany({ where: { vehicle: { tenantId } } });
  const vehiclePhotos = rawVehiclePhotos.map(p => ({
    ...p,
    imageDataBase64: encodeImageFileToBase64(p.fileUrl)
  }));

  const rawJobCardMedias = await prisma.jobCardMedia.findMany({ where: { jobCard: { tenantId } } });
  const jobCardMedias = rawJobCardMedias.map(m => ({
    ...m,
    fileSizeBytes: m.fileSizeBytes ? Number(m.fileSizeBytes) : null,
    imageDataBase64: encodeImageFileToBase64(m.fileUrl)
  }));

  const data = {
    version: "2.0",
    exportDate: new Date().toISOString(),
    tenantId,

    // Settings & Profiles
    workshopProfile: await prisma.workshopProfile.findFirst(),
    taxSettings: await prisma.taxSettings.findFirst(),
    numberingSettings: await prisma.numberingSettings.findFirst(),
    workflowSettings: await prisma.workflowSettings.findFirst(),
    printSettings: await prisma.printSettings.findFirst(),
    featureFlags: await prisma.featureFlags.findFirst(),
    documentTemplates: await prisma.documentTemplate.findMany(),
    zohoIntegration: await prisma.zohoIntegration.findFirst(),

    // Users & Roles
    users: await prisma.user.findMany({ where: { tenantId } }),
    userRoles: await prisma.userRole.findMany(),

    // Customers, Vehicles, Pictures & Service Next Data
    customers: await prisma.customer.findMany({ where: { tenantId } }),
    vehicles: await prisma.vehicle.findMany({ where: { tenantId } }),
    vehiclePhotos,
    vehicleOwnershipHistories: await prisma.vehicleOwnershipHistory.findMany(),

    // Master Catalogs (Parts & Labour)
    partsMaster: await prisma.partsMaster.findMany({ where: { tenantId } }),
    partPurchases: await prisma.partPurchase.findMany(),
    supplierBills: await prisma.supplierBill.findMany(),
    labourMaster: await prisma.labourMaster.findMany({ where: { tenantId } }),
    complaintIconMasters: await prisma.complaintIconMaster.findMany(),

    // Procurement & Suppliers
    suppliers: await prisma.supplier.findMany(),
    purchaseOrders: await prisma.purchaseOrder.findMany(),
    purchaseOrderLines: await prisma.purchaseOrderLine.findMany(),
    supplierTransactions: await prisma.supplierTransaction.findMany(),
    partReturns: await prisma.partReturn.findMany(),
    inventoryLedgers: await prisma.inventoryLedger.findMany(),

    // Job Cards & Lines (with complaints, parts, labor, pictures/media)
    jobCards: await prisma.jobCard.findMany({ where: { tenantId } }),
    jobCardParts: await prisma.jobCardPart.findMany(),
    jobCardLabours: await prisma.jobCardLabour.findMany(),
    jobCardComplaints: await prisma.jobCardComplaint.findMany({ where: { tenantId } }),
    jobCardComplaintIcons: await prisma.jobCardComplaintIcon.findMany(),
    jobCardMechanics: await prisma.jobCardMechanic.findMany(),
    jobCardSnapshots: await prisma.jobCardSnapshot.findMany(),
    jobCardMedias,

    // Estimates & Line Items
    estimates: await prisma.estimate.findMany({ where: { tenantId } }),
    estimateLines: await prisma.estimateLine.findMany(),

    // Reminders & Pre-bookings (Service Next Reminders)
    reminderEvents: await prisma.reminderEvent.findMany(),
    diagnosticsReports: await prisma.diagnosticsReport.findMany(),
    preBookings: await prisma.preBooking.findMany(),
  };

  return JSON.stringify(data, null, 2);
}

// 2. Restore Complete Tenant Data
export async function restoreTenantDataAction(formData: FormData) {
  const tenantId = await getTenantId();
  const file = formData.get("backupFile") as File;
  if (!file) throw new Error("No file uploaded");

  const fileText = await file.text();
  const rawData = JSON.parse(fileText);
  const data = parseDatesInObject(rawData);

  if (!data.customers && !data.vehicles && !data.jobCards && !data.partsMaster && !data.estimates) {
    throw new Error("Invalid backup file format: missing core data structures");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Settings & Profiles
    if (data.workshopProfile) {
      await tx.workshopProfile.upsert({
        where: { id: data.workshopProfile.id || `profile-${tenantId}` },
        update: { ...data.workshopProfile },
        create: { ...data.workshopProfile }
      });
    }
    if (data.printSettings) {
      await tx.printSettings.upsert({
        where: { id: data.printSettings.id || `print-${tenantId}` },
        update: { ...data.printSettings },
        create: { ...data.printSettings }
      });
    }
    if (data.taxSettings) {
      await tx.taxSettings.upsert({
        where: { id: data.taxSettings.id || `tax-${tenantId}` },
        update: { ...data.taxSettings },
        create: { ...data.taxSettings }
      });
    }
    if (data.numberingSettings) {
      await tx.numberingSettings.upsert({
        where: { id: data.numberingSettings.id || `num-${tenantId}` },
        update: { ...data.numberingSettings },
        create: { ...data.numberingSettings }
      });
    }

    // 2. Customers
    if (data.customers && Array.isArray(data.customers)) {
      for (const c of data.customers) {
        await tx.customer.upsert({
          where: { id: c.id },
          update: { ...c, tenantId },
          create: { ...c, tenantId }
        });
      }
    }

    // 3. Vehicles (with nextServiceDate, nextServiceKm, emissionInspectionExpiryDate, etc.)
    if (data.vehicles && Array.isArray(data.vehicles)) {
      for (const v of data.vehicles) {
        await tx.vehicle.upsert({
          where: { id: v.id },
          update: { ...v, tenantId },
          create: { ...v, tenantId }
        });
      }
    }
    if (data.vehiclePhotos && Array.isArray(data.vehiclePhotos)) {
      for (const vp of data.vehiclePhotos) {
        let fileUrl = vp.fileUrl;
        if (vp.imageDataBase64) {
          const restored = restoreBase64ToImageFile(vp.imageDataBase64, 'v-photos', vp.fileName);
          if (restored) fileUrl = restored;
        }
        const { imageDataBase64, ...vpClean } = vp;
        await tx.vehiclePhoto.upsert({
          where: { id: vpClean.id },
          update: { ...vpClean, fileUrl },
          create: { ...vpClean, fileUrl }
        });
      }
    }

    // 4. Parts Master & Labour Master
    if (data.partsMaster && Array.isArray(data.partsMaster)) {
      for (const p of data.partsMaster) {
        await tx.partsMaster.upsert({
          where: { id: p.id },
          update: { ...p, tenantId },
          create: { ...p, tenantId }
        });
      }
    }
    if (data.labourMaster && Array.isArray(data.labourMaster)) {
      for (const l of data.labourMaster) {
        await tx.labourMaster.upsert({
          where: { id: l.id },
          update: { ...l, tenantId },
          create: { ...l, tenantId }
        });
      }
    }

    // 5. Suppliers & Procurement
    if (data.suppliers && Array.isArray(data.suppliers)) {
      for (const s of data.suppliers) {
        await tx.supplier.upsert({
          where: { id: s.id },
          update: { ...s, tenantId },
          create: { ...s, tenantId }
        });
      }
    }
    if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
      for (const po of data.purchaseOrders) {
        await tx.purchaseOrder.upsert({
          where: { id: po.id },
          update: { ...po, tenantId },
          create: { ...po, tenantId }
        });
      }
    }
    if (data.purchaseOrderLines && Array.isArray(data.purchaseOrderLines)) {
      for (const pol of data.purchaseOrderLines) {
        await tx.purchaseOrderLine.upsert({
          where: { id: pol.id },
          update: { ...pol },
          create: { ...pol }
        });
      }
    }

    // 6. Job Cards & Items
    if (data.jobCards && Array.isArray(data.jobCards)) {
      for (const j of data.jobCards) {
        await tx.jobCard.upsert({
          where: { id: j.id },
          update: { ...j, tenantId },
          create: { ...j, tenantId }
        });
      }
    }
    if (data.jobCardParts && Array.isArray(data.jobCardParts)) {
      for (const jp of data.jobCardParts) {
        await tx.jobCardPart.upsert({
          where: { id: jp.id },
          update: { ...jp },
          create: { ...jp }
        });
      }
    }
    if (data.jobCardLabours && Array.isArray(data.jobCardLabours)) {
      for (const jl of data.jobCardLabours) {
        await tx.jobCardLabour.upsert({
          where: { id: jl.id },
          update: { ...jl },
          create: { ...jl }
        });
      }
    }
    if (data.jobCardComplaints && Array.isArray(data.jobCardComplaints)) {
      for (const jc of data.jobCardComplaints) {
        await tx.jobCardComplaint.upsert({
          where: { id: jc.id },
          update: { ...jc, tenantId },
          create: { ...jc, tenantId }
        });
      }
    }
    if (data.jobCardMedias && Array.isArray(data.jobCardMedias)) {
      for (const jm of data.jobCardMedias) {
        let fileUrl = jm.fileUrl;
        if (jm.imageDataBase64) {
          const restored = restoreBase64ToImageFile(jm.imageDataBase64, 'jobcard-media', jm.fileName);
          if (restored) fileUrl = restored;
        }
        const { imageDataBase64, ...jmClean } = jm;
        const fileSizeBytes = jmClean.fileSizeBytes ? BigInt(jmClean.fileSizeBytes) : null;
        await tx.jobCardMedia.upsert({
          where: { id: jmClean.id },
          update: { ...jmClean, fileUrl, fileSizeBytes },
          create: { ...jmClean, fileUrl, fileSizeBytes }
        });
      }
    }

    // 7. Estimates & Lines
    if (data.estimates && Array.isArray(data.estimates)) {
      for (const est of data.estimates) {
        await tx.estimate.upsert({
          where: { id: est.id },
          update: { ...est, tenantId },
          create: { ...est, tenantId }
        });
      }
    }
    if (data.estimateLines && Array.isArray(data.estimateLines)) {
      for (const el of data.estimateLines) {
        await tx.estimateLine.upsert({
          where: { id: el.id },
          update: { ...el },
          create: { ...el }
        });
      }
    }

    // 8. Service Reminders & Prebookings
    if (data.reminderEvents && Array.isArray(data.reminderEvents)) {
      for (const re of data.reminderEvents) {
        await tx.reminderEvent.upsert({
          where: { id: re.id },
          update: { ...re, tenantId },
          create: { ...re, tenantId }
        });
      }
    }
    if (data.preBookings && Array.isArray(data.preBookings)) {
      for (const pb of data.preBookings) {
        await tx.preBooking.upsert({
          where: { id: pb.id },
          update: { ...pb, tenantId },
          create: { ...pb, tenantId }
        });
      }
    }
  });

  revalidatePath('/solo/dashboard');
  revalidatePath('/solo/vehicles');
  revalidatePath('/solo/estimates');
  revalidatePath('/solo/inventory');
  revalidatePath('/solo/jobcards');
  return { success: true };
}

// ----------------------------------------------------------------------
// CHUNKED LEGACY IMPORT ACTIONS
// ----------------------------------------------------------------------

export async function importLegacyCustomersAction(customersRaw: any[], addressesRaw: any[]) {
  const tenantId = await getTenantId();

  await prisma.$transaction(async (tx) => {
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
  });

  return { success: true };
}

export async function importLegacyVehiclesAction(thingsRaw: any[]) {
  const tenantId = await getTenantId();

  await prisma.$transaction(async (tx) => {
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
  });

  return { success: true };
}

export async function importLegacyWorksheetsAction(worksheetsRaw: any[]) {
  const tenantId = await getTenantId();

  await prisma.$transaction(async (tx) => {
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

      let mappedVehicleId = null;
      if (thingId) {
        const v = await tx.vehicle.findFirst({ where: { sourceSystem: 'jobcard2', sourceRecordId: thingId, tenantId } });
        if (v) mappedVehicleId = v.id;
      }

      if (!mappedVehicleId) continue;

      const dateIn = dateInStr ? new Date(dateInStr) : new Date();

      const exists = await tx.jobCard.findUnique({ where: { jobcardNumber } });
      if (!exists) {
        await tx.jobCard.create({
          data: {
            id: `legacy-jc-uuid-${legacyId}`,
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

  return { success: true };
}

export async function importLegacyProblemsAction(problemsRaw: any[]) {
  const tenantId = await getTenantId();

  await prisma.$transaction(async (tx) => {
    for (const row of problemsRaw) {
      const problemLegacyId = row[0];
      const worksheetId = row[1];
      const text = row[8] || '';

      if (!worksheetId || !text) continue;
      const jobcardUuid = `legacy-jc-uuid-${worksheetId}`;

      const validJobCard = await tx.jobCard.findUnique({ where: { id: jobcardUuid } });
      if (!validJobCard) continue;

      await tx.jobCardComplaint.create({
        data: {
          jobcardId: jobcardUuid,
          tenantId,
          customerComplaintText: text
        }
      });
    }
  });

  return { success: true };
}

export async function importLegacyItemsAction(itemsRaw: any[]) {
  const tenantId = await getTenantId();

  await prisma.$transaction(async (tx) => {
    for (const row of itemsRaw) {
      const itemLegacyId = row[0];
      const worksheetId = row[2];
      const parentType = row[8]; 
      const itemName = row[22] || '';
      const priceStr = row[24];
      const unit = row[26] || '';
      const qtyStr = row[29];

      if (!worksheetId || parentType !== 'WORKSHEET' || !itemName) continue;
      const jobcardUuid = `legacy-jc-uuid-${worksheetId}`;

      const validJobCard = await tx.jobCard.findUnique({ where: { id: jobcardUuid } });
      if (!validJobCard) continue;

      const price = priceStr && !isNaN(parseFloat(priceStr)) ? parseFloat(priceStr) : 0;
      const qty = qtyStr && !isNaN(parseFloat(qtyStr)) ? parseFloat(qtyStr) : 1;
      const absolutePrice = Math.abs(price);

      const isLabor = itemName.toLowerCase().includes('labour') || itemName.toLowerCase().includes('labor') || itemName.toLowerCase().includes('service') || itemName.toLowerCase().includes('repair');

      if (isLabor) {
        await tx.jobCardLabour.create({
          data: {
            jobcardId: jobcardUuid,
            labourName: itemName,
            sellingPrice: absolutePrice,
            quantity: qty,
            status: "completed"
          }
        });
      } else {
        await tx.jobCardPart.create({
          data: {
            jobcardId: jobcardUuid,
            partName: itemName,
            sellingPrice: absolutePrice,
            quantityRequested: qty,
            status: "used"
          }
        });
      }
    }
  });

  revalidatePath('/solo/dashboard');
  revalidatePath('/solo/vehicles');
  return { success: true };
}
