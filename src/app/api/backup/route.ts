import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return phone.trim();
}

function normalizeLPN(lpn: string): string {
  if (!lpn) return 'UNKNOWN';
  const clean = lpn.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean || 'UNKNOWN';
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseAmount(amtStr: string): number {
  if (!amtStr) return 0;
  const clean = amtStr.replace(/,/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSVText(csvText: string): any[] {
  const result: string[][] = [];
  let currentField = '';
  let inQuotes = false;
  let currentRow: string[] = [];
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      result.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    result.push(currentRow);
  }

  if (result.length === 0) return [];
  
  const headers = result[0].map(h => h.trim());
  const rows: any[] = [];
  for (let i = 1; i < result.length; i++) {
    const row = result[i];
    if (row.length === 1 && row[0] === '') continue;
    const obj: any = {};
    headers.forEach((h, index) => {
      obj[h] = row[index] || '';
    });
    rows.push(obj);
  }
  return rows;
}

function parseItemsCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let currentField = '';
  let inQuotes = false;
  let currentRow: string[] = [];
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      result.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    result.push(currentRow);
  }
  return result;
}


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

export async function GET() {
  try {
    const rawVehiclePhotos = await prisma.vehiclePhoto.findMany();
    const vehiclePhotos = rawVehiclePhotos.map(p => ({
      ...p,
      imageDataBase64: encodeImageFileToBase64(p.fileUrl)
    }));

    const rawJobCardMedias = await prisma.jobCardMedia.findMany();
    const jobCardMedias = rawJobCardMedias.map(m => ({
      ...m,
      fileSizeBytes: m.fileSizeBytes ? Number(m.fileSizeBytes) : null,
      imageDataBase64: encodeImageFileToBase64(m.fileUrl)
    }));

    const data = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      workshopProfiles: await prisma.workshopProfile.findMany(),
      taxSettings: await prisma.taxSettings.findMany(),
      numberingSettings: await prisma.numberingSettings.findMany(),
      workflowSettings: await prisma.workflowSettings.findMany(),
      printSettings: await prisma.printSettings.findMany(),
      featureFlags: await prisma.featureFlags.findMany(),
      documentTemplates: await prisma.documentTemplate.findMany(),
      zohoIntegrations: await prisma.zohoIntegration.findMany(),

      users: await prisma.user.findMany(),
      userRoles: await prisma.userRole.findMany(),

      customers: await prisma.customer.findMany(),
      vehicles: await prisma.vehicle.findMany(),
      vehiclePhotos,
      vehicleOwnershipHistories: await prisma.vehicleOwnershipHistory.findMany(),

      partsMaster: await prisma.partsMaster.findMany(),
      partPurchases: await prisma.partPurchase.findMany(),
      supplierBills: await prisma.supplierBill.findMany(),
      labourMaster: await prisma.labourMaster.findMany(),
      complaintIconMasters: await prisma.complaintIconMaster.findMany(),

      suppliers: await prisma.supplier.findMany(),
      purchaseOrders: await prisma.purchaseOrder.findMany(),
      purchaseOrderLines: await prisma.purchaseOrderLine.findMany(),
      supplierTransactions: await prisma.supplierTransaction.findMany(),
      partReturns: await prisma.partReturn.findMany(),
      inventoryLedgers: await prisma.inventoryLedger.findMany(),

      jobCards: await prisma.jobCard.findMany(),
      jobCardParts: await prisma.jobCardPart.findMany(),
      jobCardLabours: await prisma.jobCardLabour.findMany(),
      jobCardComplaints: await prisma.jobCardComplaint.findMany(),
      jobCardComplaintIcons: await prisma.jobCardComplaintIcon.findMany(),
      jobCardMechanics: await prisma.jobCardMechanic.findMany(),
      jobCardSnapshots: await prisma.jobCardSnapshot.findMany(),
      jobCardMedias,

      estimates: await prisma.estimate.findMany(),
      estimateLines: await prisma.estimateLine.findMany(),

      reminderEvents: await prisma.reminderEvent.findMany(),
      diagnosticsReports: await prisma.diagnosticsReport.findMany(),
      preBookings: await prisma.preBooking.findMany(),
    };

    return NextResponse.json({ success: true, backup: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, currentUserId } = body;

    if (action === 'clean') {
      const { transactions, procurement, directories, parts, bookings, staff } = body;

      // 1. Transaction logs
      if (transactions) {
        await prisma.diagnosticsReport.deleteMany({});
        await prisma.reminderEvent.deleteMany({});
        await prisma.jobCardPart.deleteMany({});
        await prisma.jobCardLabour.deleteMany({});
        await prisma.jobCardComplaint.deleteMany({});
        await prisma.jobCardComplaintIcon.deleteMany({});
        await prisma.jobCardMechanic.deleteMany({});
        await prisma.jobCardSnapshot.deleteMany({});
        await prisma.jobCardMedia.deleteMany({});
        await prisma.jobCard.deleteMany({});
      }

      // 2. Procurement logs
      if (procurement) {
        await prisma.partReturn.deleteMany({});
        await prisma.purchaseOrderLine.deleteMany({});
        await prisma.supplierTransaction.deleteMany({});
        await prisma.purchaseOrder.deleteMany({});
        await prisma.supplier.deleteMany({});
      }

      // 3. Customer & Vehicle Master Directories
      if (directories) {
        await prisma.vehicleOwnershipHistory.deleteMany({});
        await prisma.diagnosticsReport.deleteMany({});
        await prisma.reminderEvent.deleteMany({});
        await prisma.jobCardPart.deleteMany({});
        await prisma.jobCardLabour.deleteMany({});
        await prisma.jobCardComplaint.deleteMany({});
        await prisma.jobCardComplaintIcon.deleteMany({});
        await prisma.jobCardMechanic.deleteMany({});
        await prisma.jobCardSnapshot.deleteMany({});
        await prisma.jobCardMedia.deleteMany({});
        await prisma.jobCard.deleteMany({});
        
        await prisma.vehicle.deleteMany({});
        await prisma.customer.deleteMany({});
      }

      // 4. Parts & Labour Catalogs
      if (parts) {
        await prisma.partsMaster.deleteMany({});
        await prisma.labourMaster.deleteMany({});
      }

      // 5. Reservations & Pre-bookings
      if (bookings) {
        await prisma.preBooking.deleteMany({});
      }

      // 6. Staff accounts
      if (staff && currentUserId) {
        await prisma.userRole.deleteMany({
          where: {
            userId: { not: currentUserId }
          }
        });
        await prisma.user.deleteMany({
          where: {
            id: { not: currentUserId }
          }
        });
      }

      return NextResponse.json({ success: true, message: 'Database cleaned successfully' });
    }

    if (action === 'factory_reset') {
      if (!currentUserId) {
        return NextResponse.json({ success: false, error: 'Authorization required for Factory Reset' }, { status: 400 });
      }

      await prisma.diagnosticsReport.deleteMany({});
      await prisma.reminderEvent.deleteMany({});
      await prisma.jobCardPart.deleteMany({});
      await prisma.jobCardLabour.deleteMany({});
      await prisma.jobCardComplaint.deleteMany({});
      await prisma.jobCardComplaintIcon.deleteMany({});
      await prisma.jobCardMechanic.deleteMany({});
      await prisma.jobCardSnapshot.deleteMany({});
      await prisma.jobCardMedia.deleteMany({});
      await prisma.jobCard.deleteMany({});
      await prisma.partReturn.deleteMany({});
      await prisma.purchaseOrderLine.deleteMany({});
      await prisma.supplierTransaction.deleteMany({});
      await prisma.purchaseOrder.deleteMany({});
      await prisma.supplier.deleteMany({});
      await prisma.vehicleOwnershipHistory.deleteMany({});
      await prisma.vehicle.deleteMany({});
      await prisma.customer.deleteMany({});
      await prisma.partsMaster.deleteMany({});
      await prisma.labourMaster.deleteMany({});
      await prisma.preBooking.deleteMany({});
      await prisma.auditLog.deleteMany({});

      await prisma.userRole.deleteMany({
        where: {
          userId: { not: currentUserId }
        }
      });
      await prisma.user.deleteMany({
        where: {
          id: { not: currentUserId }
        }
      });

      return NextResponse.json({ success: true, message: 'Wiped to stock. Clean slate created successfully.' });
    }

    if (action === 'restore') {
      const { backupData } = body;
      if (!backupData) {
        return NextResponse.json({ success: false, error: 'Missing backup payload' }, { status: 400 });
      }

      await prisma.diagnosticsReport.deleteMany({});
      await prisma.reminderEvent.deleteMany({});
      await prisma.jobCardPart.deleteMany({});
      await prisma.jobCardLabour.deleteMany({});
      await prisma.jobCardComplaint.deleteMany({});
      await prisma.jobCardComplaintIcon.deleteMany({});
      await prisma.jobCardMechanic.deleteMany({});
      await prisma.jobCardSnapshot.deleteMany({});
      await prisma.jobCardMedia.deleteMany({});
      await prisma.jobCard.deleteMany({});
      await prisma.partReturn.deleteMany({});
      await prisma.purchaseOrderLine.deleteMany({});
      await prisma.supplierTransaction.deleteMany({});
      await prisma.purchaseOrder.deleteMany({});
      await prisma.supplier.deleteMany({});
      await prisma.vehicleOwnershipHistory.deleteMany({});
      await prisma.vehicle.deleteMany({});
      await prisma.customer.deleteMany({});
      await prisma.partsMaster.deleteMany({});
      await prisma.labourMaster.deleteMany({});
      await prisma.preBooking.deleteMany({});
      await prisma.userRole.deleteMany({});
      await prisma.user.deleteMany({});

      if (backupData.users) {
        for (const u of backupData.users) {
          await prisma.user.create({ data: u });
        }
      }
      if (backupData.userRoles) {
        for (const ur of backupData.userRoles) {
          await prisma.userRole.create({ data: ur });
        }
      }
      if (backupData.customers) {
        for (const c of backupData.customers) {
          await prisma.customer.create({ data: c });
        }
      }
      if (backupData.vehicles) {
        for (const v of backupData.vehicles) {
          await prisma.vehicle.create({ data: v });
        }
      }
      if (backupData.partsMaster) {
        for (const p of backupData.partsMaster) {
          await prisma.partsMaster.create({ data: p });
        }
      }
      if (backupData.labourMaster) {
        for (const l of backupData.labourMaster) {
          await prisma.labourMaster.create({ data: l });
        }
      }
      if (backupData.suppliers) {
        for (const s of backupData.suppliers) {
          await prisma.supplier.create({ data: s });
        }
      }
      if (backupData.purchaseOrders) {
        for (const po of backupData.purchaseOrders) {
          await prisma.purchaseOrder.create({ data: po });
        }
      }
      if (backupData.purchaseOrderLines) {
        for (const pol of backupData.purchaseOrderLines) {
          await prisma.purchaseOrderLine.create({ data: pol });
        }
      }
      if (backupData.supplierTransactions) {
        for (const st of backupData.supplierTransactions) {
          await prisma.supplierTransaction.create({ data: st });
        }
      }
      if (backupData.partReturns) {
        for (const pr of backupData.partReturns) {
          await prisma.partReturn.create({ data: pr });
        }
      }
      if (backupData.jobCards) {
        for (const jc of backupData.jobCards) {
          await prisma.jobCard.create({ data: jc });
        }
      }
      if (backupData.jobCardParts) {
        for (const jp of backupData.jobCardParts) {
          await prisma.jobCardPart.create({ data: jp });
        }
      }
      if (backupData.jobCardLabours) {
        for (const jl of backupData.jobCardLabours) {
          await prisma.jobCardLabour.create({ data: jl });
        }
      }
      if (backupData.jobCardComplaints) {
        for (const jcomp of backupData.jobCardComplaints) {
          await prisma.jobCardComplaint.create({ data: jcomp });
        }
      }
      if (backupData.preBookings) {
        for (const pb of backupData.preBookings) {
          await prisma.preBooking.create({ data: pb });
        }
      }

      return NextResponse.json({ success: true, message: 'Restore completed successfully' });
    }

    if (action === 'import_csv') {
      const { type, csvData } = body;
      if (!type || !csvData) {
        return NextResponse.json({ success: false, error: 'Missing type or CSV contents' }, { status: 400 });
      }

      const rows = parseCSVText(csvData);
      let count = 0;

      if (type === 'customers') {
        for (const r of rows) {
          const displayName = r['Display Name'] || r['customerName'] || r['Name'] || r['Full Name'] || r['Customer Name'] || r['Contact Name'] || '';
          if (!displayName) continue;
          const mobile = r['Mobile'] || r['primaryMobile'] || r['Phone'] || r['Mobile Numer'] || r['Phone number'] || r['Cell Phone'] || r['Customer Phone'] || r['Phone Number'] || '';
          
          await prisma.customer.create({
            data: {
              displayName,
              primaryMobile: mobile ? normalizePhone(mobile) : null,
              email: r['Email'] || r['E-mail'] || r['Email Address'] || r['Customer Email'] || '',
              taxId: r['GSTIN'] || r['GST'] || r['Vat number'] || r['VAT'] || r['Tax ID'] || r['GST Number'] || '',
              addressLine1: r['Address'] || r['Address Line 1'] || r['Street Address'] || r['Location'] || '',
              city: r['City'] || r['Town'] || '',
              state: r['State'] || r['Province'] || r['Region'] || '',
              postalCode: r['PIN'] || r['Postal Code'] || r['ZIP'] || r['Zip Code'] || r['Zipcode'] || '',
            }
          });
          count++;
        }
      }

      if (type === 'vehicles') {
        for (const r of rows) {
          const regNo = r['Reg No'] || r['registrationNumber'] || r['Plate'] || r['Car Plate'] || r['Registration Number'] || r['Plate Number'] || r['License Plate'] || r['LPN'] || '';
          if (!regNo) continue;
          
          const manufacturer = r['Make'] || r['manufacturer'] || r['Brand'] || r['Vehicle Make'] || r['Car Make'] || '';
          const model = r['Model'] || r['Vehicle Model'] || r['Car Model'] || '';
          const customerMobile = r['Customer Mobile'] || r['Phone'] || r['Mobile'] || r['Customer Phone'] || '';
          
          let customerId = '';
          if (customerMobile) {
            const cleaned = normalizePhone(customerMobile);
            if (cleaned) {
              const cust = await prisma.customer.findFirst({
                where: { primaryMobile: cleaned }
              });
              if (cust) customerId = cust.id;
            }
          }

          if (!customerId) {
            const tempCust = await prisma.customer.create({
              data: {
                displayName: r['Customer Name'] || r['Owner'] || `Owner ${regNo}`,
                primaryMobile: customerMobile ? normalizePhone(customerMobile) : null
              }
            });
            customerId = tempCust.id;
          }

          await prisma.vehicle.create({
            data: {
              registrationNumberRaw: regNo,
              registrationNumberNormalized: regNo.toUpperCase().replace(/[^A-Z0-9]/g, ''),
              vin: r['VIN'] || r['Chassis Number'] || r['VIN Number'] || r['Serial Number'] || '',
              engineNumber: r['Engine No'] || r['Engine Number'] || '',
              manufacturer,
              model,
              variant: r['Variant'] || r['Submodel'] || r['Trim'] || '',
              fuelType: r['Fuel'] || r['Fuel Type'] || '',
              manufactureYear: r['Year'] ? parseInt(r['Year']) : null,
              currentCustomerId: customerId
            }
          });
          count++;
        }
      }

      if (type === 'parts') {
        for (const r of rows) {
          const partName = r['Part Name'] || r['partName'] || r['Item Name'] || r['Description'] || r['Part Description'] || r['Product Name'] || '';
          if (!partName) continue;

          await prisma.partsMaster.create({
            data: {
              partName,
              partNumber: r['Part Number'] || r['Part No'] || r['Item Code'] || r['Part Code'] || r['SKU'] || r['Product Code'] || '',
              brand: r['Brand'] || r['Manufacturer'] || r['Vendor'] || '',
              sku: r['SKU'] || '',
              defaultSellingPrice: r['Price'] || r['Selling Price'] || r['Unit Price'] || r['Retail Price'] || r['Cost'] ? parseFloat(r['Price'] || r['Selling Price'] || r['Unit Price'] || r['Retail Price'] || r['Cost']) : null,
              stockQuantity: r['Qty'] || r['Stock'] || r['Quantity'] || r['On Hand'] || r['Available'] || r['Current Stock'] ? parseFloat(r['Qty'] || r['Stock'] || r['Quantity'] || r['On Hand'] || r['Available'] || r['Current Stock']) : 0,
              rackNumber: r['Rack'] || r['Shelf'] || r['Storage Location'] || r['Location'] || '',
              binNumber: r['Bin'] || r['Aisle'] || ''
            }
          });
          count++;
        }
      }

      return NextResponse.json({ success: true, count, message: `Successfully imported ${count} items` });
    }

    if (action === 'import_local_folder') {
      const { folderPath, customersFile, vehiclesFile, partsFile, jobcardsFile } = body;
      if (!folderPath) {
        return NextResponse.json({ success: false, error: 'Folder path is required' }, { status: 400 });
      }

      const summary: Record<string, any> = {};
      const customerBySourceId = new Map<string, string>();
      const customerByMobile = new Map<string, string>();
      const vehicleBySourceId = new Map<string, string>();
      const vehicleByLpn = new Map<string, string>();

      // 1. DUMMY UNRESOLVED OWNER
      const createdDummy = await prisma.customer.upsert({
        where: { id: 'legacy-unresolved-owner' },
        update: {},
        create: {
          id: 'legacy-unresolved-owner',
          displayName: 'Legacy Unresolved Customer',
          customerType: 'retail'
        }
      });
      const legacyUnresolvedId = createdDummy.id;
      customerBySourceId.set('legacy-unresolved-owner', legacyUnresolvedId);

      // Load existing caches
      const allCustomers = await prisma.customer.findMany();
      allCustomers.forEach(c => {
        if (c.primaryMobile) customerByMobile.set(c.primaryMobile, c.id);
        if (c.sourceRecordId) customerBySourceId.set(c.sourceRecordId, c.id);
      });

      const allVehicles = await prisma.vehicle.findMany();
      allVehicles.forEach(v => {
        vehicleByLpn.set(v.registrationNumberNormalized, v.id);
        if (v.sourceRecordId) vehicleBySourceId.set(v.sourceRecordId, v.id);
      });

      // 2. MIGRATING CUSTOMERS
      if (customersFile) {
        const fullPath = path.join(folderPath, customersFile);
        if (fs.existsSync(fullPath)) {
          const csvData = fs.readFileSync(fullPath, 'utf-8');
          const rows = parseCSVText(csvData);
          let count = 0;
          for (const r of rows) {
            const displayName = r['Display Name'] || r['customerName'] || r['Name'] || r['Full Name'] || r['Customer Name'] || r['Contact Name'];
            if (!displayName) continue;
            const mobile = r['Mobile'] || r['primaryMobile'] || r['Phone'] || r['Mobile Numer'] || r['Phone number'] || r['Cell Phone'] || r['Customer Phone'] || r['Phone Number'] || '';
            const normalized = mobile ? normalizePhone(mobile) : null;
            const email = r['Email'] || r['E-mail'] || r['Email Address'] || r['Customer Email'] || '';
            const sourceId = r['Id'] || r['id'] || r['Customer ID'] || r['CustomerID'] || '';

            let existingId = sourceId ? customerBySourceId.get(sourceId) : null;
            if (!existingId && normalized) existingId = customerByMobile.get(normalized);

            if (!existingId) {
              const newCust = await prisma.customer.create({
                data: {
                  displayName,
                  primaryMobile: normalized,
                  email,
                  taxId: r['GSTIN'] || r['GST'] || r['Vat number'] || r['VAT'] || r['Tax ID'] || r['GST Number'] || '',
                  addressLine1: r['Address'] || r['Address Line 1'] || r['Street Address'] || r['Location'] || '',
                  city: r['City'] || r['Town'] || '',
                  state: r['State'] || r['Province'] || r['Region'] || '',
                  postalCode: r['PIN'] || r['Postal Code'] || r['ZIP'] || r['Zip Code'] || r['Zipcode'] || '',
                  sourceRecordId: sourceId || null
                }
              });
              if (sourceId) customerBySourceId.set(sourceId, newCust.id);
              if (normalized) customerByMobile.set(normalized, newCust.id);
              count++;
            }
          }
          summary.customers = `Imported ${count} customers`;
        } else {
          summary.customers = `File not found: ${customersFile}`;
        }
      }

      // 3. MIGRATING VEHICLES
      if (vehiclesFile) {
        const fullPath = path.join(folderPath, vehiclesFile);
        if (fs.existsSync(fullPath)) {
          const csvData = fs.readFileSync(fullPath, 'utf-8');
          const rows = parseCSVText(csvData);
          let count = 0;
          for (const r of rows) {
            const regNo = r['Reg No'] || r['registrationNumber'] || r['Plate'] || r['Car Plate'] || r['Registration Number'] || r['Plate Number'] || r['License Plate'] || r['LPN'];
            if (!regNo) continue;
            const normalizedPlate = normalizeLPN(regNo);
            const sourceId = r['Id'] || r['id'] || r['Vehicle ID'] || r['VehicleID'] || r['Auto id.'] || '';
            const customerSourceId = r['Customer id.'] || r['CustomerID'] || r['Customer ID'] || '';

            let existingId = sourceId ? vehicleBySourceId.get(sourceId) : null;
            if (!existingId) existingId = vehicleByLpn.get(normalizedPlate);

            if (!existingId) {
              let customerId = customerSourceId ? customerBySourceId.get(customerSourceId) : null;
              if (!customerId) {
                const customerMobile = r['Customer Mobile'] || r['Phone'] || r['Mobile'] || '';
                const cleanMob = customerMobile ? normalizePhone(customerMobile) : null;
                if (cleanMob) customerId = customerByMobile.get(cleanMob);
              }
              if (!customerId) customerId = legacyUnresolvedId;

              const newVeh = await prisma.vehicle.create({
                data: {
                  registrationNumberRaw: regNo,
                  registrationNumberNormalized: normalizedPlate,
                  vin: r['VIN'] || r['Chassis Number'] || r['VIN Number'] || r['Serial Number'] || '',
                  engineNumber: r['Engine No'] || r['Engine Number'] || '',
                  manufacturer: r['Make'] || r['manufacturer'] || r['Brand'] || r['Vehicle Make'] || r['Car Make'] || '',
                  model: r['Model'] || r['Vehicle Model'] || r['Car Model'] || '',
                  variant: r['Variant'] || r['Submodel'] || r['Trim'] || '',
                  fuelType: r['Fuel'] || r['Fuel Type'] || '',
                  manufactureYear: r['Year'] ? parseInt(r['Year']) : null,
                  currentCustomerId: customerId!,
                  sourceRecordId: sourceId || null
                }
              });
              if (sourceId) vehicleBySourceId.set(sourceId, newVeh.id);
              vehicleByLpn.set(normalizedPlate, newVeh.id);
              count++;
            }
          }
          summary.vehicles = `Imported ${count} vehicles`;
        } else {
          summary.vehicles = `File not found: ${vehiclesFile}`;
        }
      }

      // 4. MIGRATING PARTS
      if (partsFile) {
        const fullPath = path.join(folderPath, partsFile);
        if (fs.existsSync(fullPath)) {
          const csvData = fs.readFileSync(fullPath, 'utf-8');
          const rows = parseCSVText(csvData);
          let count = 0;
          for (const r of rows) {
            const partName = r['Part Name'] || r['partName'] || r['Item Name'] || r['Description'] || r['Part Description'] || r['Product Name'] || '';
            if (!partName) continue;

            await prisma.partsMaster.create({
              data: {
                partName,
                partNumber: r['Part Number'] || r['Part No'] || r['Item Code'] || r['Part Code'] || r['SKU'] || r['Product Code'] || '',
                brand: r['Brand'] || r['Manufacturer'] || r['Vendor'] || '',
                sku: r['SKU'] || '',
                defaultSellingPrice: r['Price'] || r['Selling Price'] || r['Unit Price'] || r['Retail Price'] || r['Cost'] ? parseFloat(r['Price'] || r['Selling Price'] || r['Unit Price'] || r['Retail Price'] || r['Cost']) : null,
                stockQuantity: r['Qty'] || r['Stock'] || r['Quantity'] || r['On Hand'] || r['Available'] || r['Current Stock'] ? parseFloat(r['Qty'] || r['Stock'] || r['Quantity'] || r['On Hand'] || r['Available'] || r['Current Stock']) : 0,
                rackNumber: r['Rack'] || r['Shelf'] || r['Storage Location'] || r['Location'] || '',
                binNumber: r['Bin'] || r['Aisle'] || ''
              }
            });
            count++;
          }
          summary.parts = `Imported ${count} parts`;
        } else {
          summary.parts = `File not found: ${partsFile}`;
        }
      }

      // 5. MIGRATING JOBCARDS / INVOICES / ESTIMATES / VEHICLE HISTORY
      if (jobcardsFile) {
        const fullPath = path.join(folderPath, jobcardsFile);
        if (fs.existsSync(fullPath)) {
          const csvData = fs.readFileSync(fullPath, 'utf-8');
          const rows = parseCSVText(csvData);
          let count = 0;
          const jobcardsToCreate: any[] = [];
          const snapshotsToCreate: any[] = [];

          for (const r of rows) {
            const sourceId = r['Id'] || r['id'] || r['JobCardID'] || r['InvoiceID'] || r['JobCard Number'] || r['Invoice Number'] || '';
            if (!sourceId || isNaN(Number(sourceId.trim()))) continue;

            const jobcardNumber = `LEGACY-${sourceId.trim()}`;
            const vehicleSourceId = r['Auto id.'] || r['VehicleID'] || r['Vehicle ID'] || '';
            const customerSourceId = r['Customer id.'] || r['CustomerID'] || r['Customer ID'] || '';
            const cleanLpn = normalizeLPN(r['LPN'] || r['Plate'] || r['License Plate'] || 'LEGACY-TEMP');

            let vehicleId = vehicleSourceId ? vehicleBySourceId.get(vehicleSourceId) : null;
            if (!vehicleId) vehicleId = vehicleByLpn.get(cleanLpn);

            if (!vehicleId) {
              const dummyVehId = crypto.randomUUID();
              await prisma.vehicle.create({
                data: {
                  id: dummyVehId,
                  registrationNumberRaw: r['LPN'] || r['Plate'] || 'LEGACY-TEMP',
                  registrationNumberNormalized: cleanLpn,
                  manufacturer: r['Manufacturer'] || r['Make'] || 'Unknown Make',
                  model: r['Model'] || 'Unknown Model',
                  currentCustomerId: legacyUnresolvedId!,
                  notes: 'Unresolved vehicle created during legacy folder import'
                }
              });
              vehicleId = dummyVehId;
              vehicleByLpn.set(cleanLpn, dummyVehId);
            }

            let customerId = customerSourceId ? customerBySourceId.get(customerSourceId) : null;
            if (!customerId) customerId = legacyUnresolvedId;

            let status = 'closed';
            const state = (r['State'] || r['Status'] || '').toLowerCase();
            if (state === 'open' || state === 'opened' || state === 'active') {
              status = 'open';
            } else if (state === 'draft' || state === 'estimate') {
              status = 'draft';
            }

            const dateIn = parseDate(r['Created'] || r['Date'] || r['Date In']) || new Date();
            const expectedDeliveryAt = parseDate(r['Deadline'] || r['Expected Delivery']);
            const closedAt = parseDate(r['Closed'] || r['Completed'] || r['Closed Date']);

            const subtotalAmount = parseAmount(r['Net sum'] || r['Subtotal']);
            const taxAmount = parseAmount(r['Tax sum'] || r['Tax']);
            const totalAmount = parseAmount(r['Gross sum'] || r['Total'] || r['Grand Total']);
            const paymentStatus = (r['Paid'] || '').toLowerCase() === 'yes' || (r['Payment Status'] || '').toLowerCase() === 'paid' ? 'paid' : 'unpaid';
            const intakeOdometer = parseInt(r['Odometer mileage'] || r['Odometer'] || r['Odo'], 10) || null;

            const jobcardId = crypto.randomUUID();

            jobcardsToCreate.push({
              id: jobcardId,
              jobcardNumber,
              customerId,
              vehicleId,
              status,
              dateIn,
              expectedDeliveryAt,
              closedAt,
              intakeOdometer,
              subtotalAmount,
              taxAmount,
              totalAmount,
              paymentStatus,
              legacyImportFlag: true,
              readOnlyFlag: true,
              sourceSystem: 'legacy_csv_folder_jobcards',
              sourceRecordId: sourceId
            });

            snapshotsToCreate.push({
              id: crypto.randomUUID(),
              jobcardId,
              customerName: r['Customer'] || r['Customer Name'] || 'Legacy Customer',
              customerAddress: r['Address'] || null,
              vehicleRegistrationNumber: r['LPN'] || r['Plate'] || 'UNKNOWN',
              vehicleManufacturer: r['Manufacturer'] || r['Make'] || null,
              vehicleModel: r['Model'] || null,
              vehicleColor: r['Color'] || null,
              intakeOdometerSnapshot: intakeOdometer
            });
            count++;
          }

          // Import detailed items from JobCard_Items.csv, invoice_items.csv, or item.csv
          let itemsCsvFile = path.join(folderPath, 'invoice_items.csv');
          let isInvoiceItems = true;
          if (!fs.existsSync(itemsCsvFile)) {
            itemsCsvFile = path.join(folderPath, 'item.csv');
            isInvoiceItems = false;
          }
          if (!fs.existsSync(itemsCsvFile)) {
            itemsCsvFile = path.join(folderPath, 'JobCard_Items.csv');
            isInvoiceItems = false;
          }

          const jobCardPartsToCreate: any[] = [];
          const jobCardLaboursToCreate: any[] = [];
          
          if (fs.existsSync(itemsCsvFile)) {
            const itemsData = fs.readFileSync(itemsCsvFile, 'utf-8');
            const itemRows = parseItemsCSV(itemsData);
            
            // Build a lookup map of sourceId (string) -> new jobcard UUID (string)
            const jcIdMap = new Map<string, string>();
            
            // Load already existing legacy jobcards from DB to ensure we match them
            const existingLegacyJcs = await prisma.jobCard.findMany({
              where: { legacyImportFlag: true },
              select: { id: true, sourceRecordId: true }
            });
            for (const jc of existingLegacyJcs) {
              if (jc.sourceRecordId) {
                jcIdMap.set(jc.sourceRecordId, jc.id);
              }
            }
            
            // Add newly created jobcards
            for (const jc of jobcardsToCreate) {
              if (jc.sourceRecordId) {
                jcIdMap.set(jc.sourceRecordId, jc.id);
              }
            }
            
            for (const row of itemRows) {
              let connectionId = '';
              let type = '';
              let name = '';
              let quantity = 1;
              let price = 0.0;
              let taxRate = 0.0;
              let discountValue = 0.0;

              if (isInvoiceItems) {
                if (row.length < 15) continue;
                connectionId = row[1];
                name = row[5] || '';
                type = row[7]; // '1' = Labor, '0' = Part
                quantity = Math.abs(parseFloat(row[12]) || 1.0);
                price = parseFloat(row[14]) || 0.0;
                taxRate = parseFloat(row[16]) || 0.0; // optional
              } else {
                // Ensure we have enough columns and connection is WORKSHEET or INVOICE
                if (row.length < 28) continue;
                const connectionKey = row[8];
                if (connectionKey !== 'WORKSHEET' && connectionKey !== 'INVOICE') continue;
                
                connectionId = row[7];
                price = parseFloat(row[12]) || 0.0;
                taxRate = parseFloat(row[13]) || 0.0;
                const rawDiscount = parseFloat(row[15]) || 0.0;
                discountValue = Math.abs(rawDiscount) * 100;
                type = row[18]; 
                name = row[22] || '';
                quantity = Math.abs(parseFloat(row[24]) || 1.0);
              }
              
              if (!name.trim()) continue;
              const jobcardId = jcIdMap.get(connectionId);
              if (!jobcardId) continue;
              
              if (type === '0') {
                jobCardPartsToCreate.push({
                  id: crypto.randomUUID(),
                  jobcardId,
                  partName: name.trim(),
                  quantityRequested: quantity,
                  quantityUsed: quantity,
                  status: 'used',
                  sellingPrice: price,
                  taxRate,
                  discountType: discountValue > 0 ? 'percent' : null,
                  discountValue: discountValue > 0 ? discountValue : null,
                  totalPrice: quantity * price
                });
              } else if (type === '1') {
                jobCardLaboursToCreate.push({
                  id: crypto.randomUUID(),
                  jobcardId,
                  labourName: name.trim(),
                  status: 'completed',
                  sellingPrice: price,
                  taxRate,
                  discountType: discountValue > 0 ? 'percent' : null,
                  discountValue: discountValue > 0 ? discountValue : null,
                  quantity,
                  totalPrice: quantity * price
                });
              }
            }
          }

          if (jobcardsToCreate.length > 0) {
            await prisma.jobCard.deleteMany({ where: { legacyImportFlag: true } });
            await prisma.$transaction([
              prisma.jobCard.createMany({ data: jobcardsToCreate }),
              prisma.jobCardSnapshot.createMany({ data: snapshotsToCreate })
            ]);
            
            // Batch create parts and labors to avoid SQLite limit
            if (jobCardPartsToCreate.length > 0) {
              const chunkSize = 500;
              for (let i = 0; i < jobCardPartsToCreate.length; i += chunkSize) {
                const chunk = jobCardPartsToCreate.slice(i, i + chunkSize);
                await prisma.jobCardPart.createMany({ data: chunk });
              }
            }
            if (jobCardLaboursToCreate.length > 0) {
              const chunkSize = 500;
              for (let i = 0; i < jobCardLaboursToCreate.length; i += chunkSize) {
                const chunk = jobCardLaboursToCreate.slice(i, i + chunkSize);
                await prisma.jobCardLabour.createMany({ data: chunk });
              }
            }
          }
          summary.jobcards = `Imported ${count} history logs with ${jobCardPartsToCreate.length} parts and ${jobCardLaboursToCreate.length} services`;
        } else {
          summary.jobcards = `File not found: ${jobcardsFile}`;
        }
      }

      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ success: false, error: 'Invalid Action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
