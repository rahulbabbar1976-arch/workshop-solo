import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';

const DOC_DIR = 'C:\\Users\\rahul\\OneDrive\\Documents';

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

function parseTaxRate(taxStr: string): number {
  if (!taxStr) return 0;
  const clean = taxStr.replace(/%/g, '').trim();
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

function parseCSV(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || lines[0] === '') return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((h, index) => {
      row[h] = values[index] || '';
    });
    rows.push(row);
  }
  return rows;
}

export async function POST() {
  const start = Date.now();
  try {
    const summary: Record<string, any> = {};
    console.log('--- STARTING HIGH-PERFORMANCE IMPORT WORKFLOW ---');

    // Pre-load all database entities into memory for instant O(1) matching
    console.log('Loading database caches into memory...');
    const allCustomers = await prisma.customer.findMany({ where: { isActive: true } });
    const allVehicles = await prisma.vehicle.findMany({ where: { isActive: true } });

    // Maps to store cached lookup records
    const customerByMobile = new Map<string, any>();
    const customerByEmail = new Map<string, any>();
    const customerBySourceId = new Map<string, string>(); // sourceRecordId -> dbId
    
    allCustomers.forEach(c => {
      if (c.primaryMobile) customerByMobile.set(c.primaryMobile, c);
      if (c.email) customerByEmail.set(c.email, c);
      if (c.sourceRecordId) customerBySourceId.set(c.sourceRecordId, c.id);
    });

    const vehicleByLpn = new Map<string, any>();
    const vehicleBySourceId = new Map<string, string>(); // sourceRecordId -> dbId

    allVehicles.forEach(v => {
      vehicleByLpn.set(v.registrationNumberNormalized, v);
      if (v.sourceRecordId) vehicleBySourceId.set(v.sourceRecordId, v.id);
    });

    // 1. PROCESS CUSTOMERS (Partners.csv)
    const partnersFile = path.join(DOC_DIR, 'Partners.csv');
    const partnersData = parseCSV(partnersFile);
    
    const customersToCreate: any[] = [];
    const customerUpdates: { id: string; data: any }[] = [];

    // Pre-generate seed primary key for dummy unresolved owner
    let legacyUnresolvedId = customerBySourceId.get('legacy-unresolved-owner');
    if (!legacyUnresolvedId) {
      const createdDummy = await prisma.customer.upsert({
        where: { id: 'legacy-unresolved-owner' },
        update: {},
        create: {
          id: 'legacy-unresolved-owner',
          displayName: 'Legacy Unresolved Customer',
          customerType: 'retail'
        }
      });
      legacyUnresolvedId = createdDummy.id;
      customerBySourceId.set('legacy-unresolved-owner', legacyUnresolvedId);
    }

    for (const row of partnersData) {
      if (!row.Name || row.Name.trim() === '') continue;
      
      const displayName = row.Name.trim();
      const rawMobile = row['Mobile Numer'] || row['Phone number'] || '';
      const primaryMobile = normalizePhone(rawMobile);
      const email = row['E-mail'] ? row['E-mail'].toLowerCase().trim() : null;
      const taxId = row['Vat number'] ? row['Vat number'].trim() : null;
      const addressLine1 = row.Address ? row.Address.trim() : null;
      const state = row.State ? row.State.trim() : null;
      const postalCode = row.ZIP ? row.ZIP.trim() : null;
      const notes = row.Notes ? row.Notes.trim() : null;
      const sourceRecordId = row.Id ? row.Id.trim() : null;
      
      const driverName = (row['Driver name'] || row['Driver Name'] || row.driverName || row.DriverName || row.Driver)?.trim() || null;
      const driverMobile = normalizePhone(row['Driver mobile'] || row['Driver Mobile'] || row.driverMobile || row.DriverMobile || row.DriverPhone);
      
      const priorityRaw = row.Priority || row.Importance || row['Customer Importance'] || row.isPriority || '';
      const isPriority = String(priorityRaw).trim().toLowerCase() === 'yes' || String(priorityRaw).trim().toLowerCase() === 'true' || priorityRaw === 1 || priorityRaw === '1';

      // Find match in memory
      let matchedCust = null;
      if (primaryMobile) matchedCust = customerByMobile.get(primaryMobile);
      if (!matchedCust && email) matchedCust = customerByEmail.get(email);

      if (matchedCust) {
        customerUpdates.push({
          id: matchedCust.id,
          data: {
            alternateMobile: matchedCust.alternateMobile || normalizePhone(row['Phone number']),
            driverName: matchedCust.driverName || driverName,
            driverMobile: matchedCust.driverMobile || driverMobile,
            isPriority: isPriority || matchedCust.isPriority,
            addressLine1: matchedCust.addressLine1 || addressLine1,
            state: matchedCust.state || state,
            postalCode: matchedCust.postalCode || postalCode,
            taxId: matchedCust.taxId || taxId,
            notes: matchedCust.notes ? `${matchedCust.notes}\n${notes || ''}`.trim() : notes,
            sourceRecordId: sourceRecordId || matchedCust.sourceRecordId
          }
        });
        if (sourceRecordId) customerBySourceId.set(sourceRecordId, matchedCust.id);
      } else {
        const newId = crypto.randomUUID();
        customersToCreate.push({
          id: newId,
          displayName,
          customerType: 'retail',
          primaryMobile,
          alternateMobile: normalizePhone(row['Phone number']),
          driverName,
          driverMobile,
          isPriority,
          email,
          taxId,
          addressLine1,
          state,
          postalCode,
          notes,
          sourceSystem: 'legacy_csv_partners',
          sourceRecordId
        });
        if (sourceRecordId) customerBySourceId.set(sourceRecordId, newId);
        if (primaryMobile) customerByMobile.set(primaryMobile, { id: newId });
        if (email) customerByEmail.set(email, { id: newId });
      }
    }

    // Execute customer DB writes in batch
    await prisma.$transaction([
      prisma.customer.createMany({ data: customersToCreate }),
      ...customerUpdates.map(u => prisma.customer.update({ where: { id: u.id }, data: u.data }))
    ]);
    summary.customers = { created: customersToCreate.length, updated: customerUpdates.length, total: customersToCreate.length + customerUpdates.length };

    // 2. PROCESS VEHICLES (Auto object table.csv)
    const autosFile = path.join(DOC_DIR, 'Auto object table.csv');
    const autosData = parseCSV(autosFile);

    const vehiclesToCreate: any[] = [];
    const vehicleUpdates: { id: string; data: any }[] = [];
    const ownershipHistoryToCreate: any[] = [];

    for (const row of autosData) {
      const rawLPN = row.LPN || '';
      const registrationNumberNormalized = normalizeLPN(rawLPN);
      if (registrationNumberNormalized === 'UNKNOWN' && !row.Manufacturer) continue;

      const sourceRecordId = row.Id ? row.Id.trim() : null;
      const manufacturer = row.Manufacturer ? row.Manufacturer.trim() : null;
      const model = row.Model ? row.Model.trim() : null;
      const variant = row['Engine type'] ? row['Engine type'].trim() : null;
      const fuelType = row['Fuel type'] ? row['Fuel type'].trim() : null;
      const vin = row.VIN ? row.VIN.trim() : null;
      const engineNumber = row['Engine number'] ? row['Engine number'].trim() : null;
      const manufactureYear = row['Manufacture year'] ? parseInt(row['Manufacture year'], 10) || null : null;
      const color = row.Color ? row.Color.trim() : null;
      const batteryDetails = row['Battery Details'] ? row['Battery Details'].trim() : null;
      const currentOdometer = row['Next oil change dist.'] ? parseInt(row['Next oil change dist.'], 10) || null : null;
      const insurerName = row.Insurer ? row.Insurer.trim() : null;
      const notes = row.Notes ? row.Notes.trim() : null;

      const nextServiceDate = parseDate(row['Next service']);
      const nextPucDate = parseDate(row['Next P.U.C']);
      const nextOilChangeDate = parseDate(row['Next oil change']);
      const nextTimingBeltChangeDate = parseDate(row['Next timing belt change']);

      // Resolve Owner
      let customerId = customerBySourceId.get(row['Customer id.']) || legacyUnresolvedId!;

      const existingVeh = vehicleByLpn.get(registrationNumberNormalized);

      if (existingVeh) {
        vehicleUpdates.push({
          id: existingVeh.id,
          data: {
            vin: existingVeh.vin || vin,
            engineNumber: existingVeh.engineNumber || engineNumber,
            manufacturer: existingVeh.manufacturer || manufacturer,
            model: existingVeh.model || model,
            variant: existingVeh.variant || variant,
            fuelType: existingVeh.fuelType || fuelType,
            color: existingVeh.color || color,
            batteryDetails: existingVeh.batteryDetails || batteryDetails,
            currentOdometer: currentOdometer || existingVeh.currentOdometer,
            nextServiceDate: nextServiceDate || existingVeh.nextServiceDate,
            emissionInspectionExpiryDate: nextPucDate || existingVeh.emissionInspectionExpiryDate,
            nextOilChangeDate: nextOilChangeDate || existingVeh.nextOilChangeDate,
            nextTimingBeltChangeDate: nextTimingBeltChangeDate || existingVeh.nextTimingBeltChangeDate,
            notes: existingVeh.notes ? `${existingVeh.notes}\n${notes || ''}`.trim() : notes,
            currentCustomerId: customerId,
            sourceRecordId: sourceRecordId || existingVeh.sourceRecordId
          }
        });
        if (sourceRecordId) vehicleBySourceId.set(sourceRecordId, existingVeh.id);
      } else {
        const newVehId = crypto.randomUUID();
        vehiclesToCreate.push({
          id: newVehId,
          registrationNumberRaw: rawLPN,
          registrationNumberNormalized,
          vin,
          engineNumber,
          manufacturer,
          model,
          variant,
          fuelType,
          color,
          manufactureYear,
          batteryDetails,
          currentOdometer,
          insurerName,
          nextServiceDate,
          emissionInspectionExpiryDate: nextPucDate,
          nextOilChangeDate,
          nextTimingBeltChangeDate,
          notes,
          currentCustomerId: customerId,
          sourceSystem: 'legacy_csv_autos',
          sourceRecordId
        });

        ownershipHistoryToCreate.push({
          id: crypto.randomUUID(),
          vehicleId: newVehId,
          customerId,
          transferNotes: 'Legacy ownership imported'
        });

        if (sourceRecordId) vehicleBySourceId.set(sourceRecordId, newVehId);
        vehicleByLpn.set(registrationNumberNormalized, { id: newVehId });
      }
    }

    // Execute vehicle DB batch writes
    await prisma.$transaction([
      prisma.vehicle.createMany({ data: vehiclesToCreate }),
      prisma.vehicleOwnershipHistory.createMany({ data: ownershipHistoryToCreate }),
      ...vehicleUpdates.map(u => prisma.vehicle.update({ where: { id: u.id }, data: u.data }))
    ]);
    summary.vehicles = { created: vehiclesToCreate.length, updated: vehicleUpdates.length, total: vehiclesToCreate.length + vehicleUpdates.length };

    // 3. PROCESS PARTS CATALOG (Items.csv -> PartsMaster)
    const itemsFile = path.join(DOC_DIR, 'Items.csv');
    const itemsData = parseCSV(itemsFile);
    
    // Clear and do bulk insert for catalog items
    await prisma.partsMaster.deleteMany();
    const partsToCreate: any[] = [];

    for (const row of itemsData) {
      if (row.Type !== 'Product') continue;
      if (!row.Name || row.Name.trim() === '') continue;

      const defaultSellingPrice = parseAmount(row['Net list price'] || row['Net price']);
      if (defaultSellingPrice <= 0) continue;

      partsToCreate.push({
        id: crypto.randomUUID(),
        partName: row.Name.trim(),
        itemCode: row['Item code'] || null,
        partNumber: row['Part number'] || null,
        barcode: row.Barcode || null,
        brand: row.Seller || null,
        unit: row.Unit || 'pcs',
        defaultTaxRate: parseTaxRate(row['Tax r.']),
        defaultSellingPrice,
        stockQuantity: parseFloat(row.Stock) || 0,
        sourceSystem: 'legacy_csv_items',
        sourceRecordId: row.Id || null
      });
    }

    // Bulk creation in single step
    await prisma.partsMaster.createMany({ data: partsToCreate });
    summary.partsCatalog = { imported: partsToCreate.length };

    // 4. PROCESS LABOUR CATALOG (Items 1.csv -> LabourMaster)
    const items1File = path.join(DOC_DIR, 'Items 1.csv');
    const items1Data = parseCSV(items1File);
    
    await prisma.labourMaster.deleteMany();
    const labourToCreate: any[] = [];

    for (const row of items1Data) {
      if (row.Type !== 'Service') continue;
      if (!row.Name || row.Name.trim() === '') continue;

      const defaultSellingPrice = parseAmount(row['Net list price'] || row['Net price']);
      if (defaultSellingPrice <= 0) continue;

      labourToCreate.push({
        id: crypto.randomUUID(),
        labourName: row.Name.trim(),
        labourCode: row['Item code'] || null,
        unitType: row.Unit || 'job',
        defaultTaxRate: parseTaxRate(row['Tax r.']),
        defaultSellingPrice,
        sourceSystem: 'legacy_csv_items1',
        sourceRecordId: row.Id || null
      });
    }

    await prisma.labourMaster.createMany({ data: labourToCreate });
    summary.labourCatalog = { imported: labourToCreate.length };

    // 5. PROCESS JOB CARDS (Job cards.csv -> JobCard & JobCardSnapshot)
    const jobsFile = path.join(DOC_DIR, 'Job cards.csv');
    const jobsData = parseCSV(jobsFile);
    
    // Clean old legacy job cards to avoid primary key/unique clashes during re-migration
    await prisma.jobCard.deleteMany({ where: { legacyImportFlag: true } });
    
    const jobcardsToCreate: any[] = [];
    const snapshotsToCreate: any[] = [];

    for (const row of jobsData) {
      if (!row.Id) continue;
      
      const jobcardNumber = `LEGACY-${row.Id.trim()}`;
      const sourceRecordId = row.Id.trim();
      
      const cleanLpn = normalizeLPN(row.LPN || 'LEGACY-TEMP');
      let vehicleId = vehicleBySourceId.get(row['Auto id.']);
      if (!vehicleId) {
        vehicleId = vehicleByLpn.get(cleanLpn)?.id;
      }

      // If vehicle still unresolved, skip or link to a dummy legacy vehicle
      if (!vehicleId) {
        const dummyVehId = crypto.randomUUID();
        await prisma.vehicle.create({
          data: {
            id: dummyVehId,
            registrationNumberRaw: row.LPN || 'LEGACY-TEMP',
            registrationNumberNormalized: cleanLpn,
            manufacturer: row.Manufacturer || 'Unknown Make',
            model: row.Model || 'Unknown Model',
            currentCustomerId: legacyUnresolvedId!,
            notes: 'Legacy unresolved vehicle created during import'
          }
        });
        vehicleId = dummyVehId;
        vehicleByLpn.set(cleanLpn, { id: dummyVehId });
      }

      let customerId = customerBySourceId.get(row['Customer id.']) || legacyUnresolvedId!;

      let status = 'legacy_imported_read_only';
      if (row.State === 'Opened') {
        status = 'open';
      } else if (row.State === 'Closed') {
        status = 'closed';
      }

      const dateIn = parseDate(row.Created) || new Date();
      const expectedDeliveryAt = parseDate(row.Deadline);
      const closedAt = parseDate(row.Closed || row.Completed);
      
      const subtotalAmount = parseAmount(row['Net sum']);
      const taxAmount = parseAmount(row['Tax sum']);
      const totalAmount = parseAmount(row['Gross sum']);
      const paymentStatus = row.Paid === 'Yes' ? 'paid' : 'unpaid';
      const intakeOdometer = parseInt(row['Odometer mileage'], 10) || null;

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
        sourceSystem: 'legacy_csv_jobcards',
        sourceRecordId
      });

      snapshotsToCreate.push({
        id: crypto.randomUUID(),
        jobcardId,
        customerName: row.Customer ? row.Customer.trim() : 'Legacy Customer',
        customerAddress: row.Address ? row.Address.trim() : null,
        vehicleRegistrationNumber: row.LPN || 'UNKNOWN',
        vehicleManufacturer: row.Manufacturer || null,
        vehicleModel: row.Model || null,
        vehicleColor: row.Color || null,
        intakeOdometerSnapshot: intakeOdometer
      });
    }

    await prisma.$transaction([
      prisma.jobCard.createMany({ data: jobcardsToCreate }),
      prisma.jobCardSnapshot.createMany({ data: snapshotsToCreate })
    ]);
    summary.jobcards = { imported: jobcardsToCreate.length };

    const durationSeconds = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`--- IMPORT COMPLETED IN ${durationSeconds}s ---`);

    return NextResponse.json({
      success: true,
      message: 'Legacy CSV data imported and merged successfully!',
      durationSeconds,
      summary
    });
  } catch (err: any) {
    console.error('Migration failed:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Legacy import operation failed'
    }, { status: 500 });
  }
}
