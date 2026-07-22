import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import * as xlsx from 'xlsx';

const DOC_DIR = 'C:\\Users\\rahul\\OneDrive\\Documents\\jc transfer';

function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return String(phone).trim();
}

function normalizeLPN(lpn: string | undefined | null): string {
  if (!lpn) return 'UNKNOWN';
  const clean = String(lpn).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean || 'UNKNOWN';
}

function parseDate(dateStr: any): Date | null {
  if (!dateStr || String(dateStr).trim() === '') return null;
  // Handle Excel serial dates
  if (typeof dateStr === 'number') {
    return new Date((dateStr - (25567 + 2)) * 86400 * 1000);
  }
  const parts = String(dateStr).split('-');
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

function parseAmount(amtStr: any): number {
  if (!amtStr) return 0;
  if (typeof amtStr === 'number') return amtStr;
  const clean = String(amtStr).replace(/,/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function parseTaxRate(taxStr: any): number {
  if (!taxStr) return 0;
  if (typeof taxStr === 'number') return taxStr * 100 > 100 ? taxStr : taxStr * 100; // if it's 0.18 -> 18. If it's 18 -> 18
  const clean = String(taxStr).replace(/%/g, '').trim();
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
  if (!fs.existsSync(filePath)) return [];
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

function parseXLSX(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
}

export async function POST() {
  const start = Date.now();
  try {
    const summary: Record<string, any> = {};
    console.log('--- STARTING SOFT-MERGE IMPORT WORKFLOW ---');

    console.log('Loading database caches into memory...');
    const allCustomers = await prisma.customer.findMany({ where: { isActive: true } });
    const allVehicles = await prisma.vehicle.findMany({ where: { isActive: true } });
    const allParts = await prisma.partsMaster.findMany();
    const allLabour = await prisma.labourMaster.findMany();
    const allJobCards = await prisma.jobCard.findMany();

    const customerByMobile = new Map<string, any>();
    const customerByEmail = new Map<string, any>();
    const customerBySourceId = new Map<string, string>(); 
    
    allCustomers.forEach(c => {
      if (c.primaryMobile) customerByMobile.set(c.primaryMobile, c);
      if (c.email) customerByEmail.set(c.email, c);
      if (c.sourceRecordId) customerBySourceId.set(c.sourceRecordId, c.id);
    });

    const vehicleByLpn = new Map<string, any>();
    const vehicleBySourceId = new Map<string, string>(); 
    allVehicles.forEach(v => {
      vehicleByLpn.set(v.registrationNumberNormalized, v);
      if (v.sourceRecordId) vehicleBySourceId.set(v.sourceRecordId, v.id);
    });

    const partsByName = new Map<string, string>();
    allParts.forEach(p => {
      partsByName.set(p.partName.toLowerCase(), p.id);
    });

    const laborByName = new Map<string, string>();
    allLabour.forEach(l => {
      laborByName.set(l.labourName.toLowerCase(), l.id);
    });

    const jobcardsBySourceId = new Map<string, string>();
    allJobCards.forEach(jc => {
      if (jc.sourceRecordId) jobcardsBySourceId.set(jc.sourceRecordId, jc.id);
    });

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

    // 1. PROCESS CUSTOMERS (Partners.xls)
    const partnersFile = path.join(DOC_DIR, 'Partners.xls');
    const partnersData = parseXLSX(partnersFile);
    
    const customersToCreate: any[] = [];
    const customerUpdates: { id: string; data: any }[] = [];

    for (const row of partnersData) {
      if (!row.Name || String(row.Name).trim() === '') continue;
      
      const displayName = String(row.Name).trim();
      const rawMobile = row['Mobile Numer'] || row['Phone number'] || row['Mobile'] || '';
      const primaryMobile = normalizePhone(rawMobile);
      const email = row['E-mail'] ? String(row['E-mail']).toLowerCase().trim() : null;
      const taxId = row['Vat number'] ? String(row['Vat number']).trim() : null;
      const addressLine1 = row.Address ? String(row.Address).trim() : null;
      const state = row.State ? String(row.State).trim() : null;
      const postalCode = row.ZIP ? String(row.ZIP).trim() : null;
      const notes = row.Notes ? String(row.Notes).trim() : null;
      const sourceRecordId = row.Id ? String(row.Id).trim() : null;
      
      const driverName = (row['Driver name'] || row.DriverName || row.Driver)?.toString().trim() || null;
      const driverMobile = normalizePhone(row['Driver mobile'] || row.DriverMobile || row.DriverPhone);
      
      let matchedCust = null;
      if (sourceRecordId && customerBySourceId.has(sourceRecordId)) {
        matchedCust = allCustomers.find(c => c.id === customerBySourceId.get(sourceRecordId));
      }
      if (!matchedCust && primaryMobile) matchedCust = customerByMobile.get(primaryMobile);
      if (!matchedCust && email) matchedCust = customerByEmail.get(email);

      if (matchedCust) {
        // Soft Merge: ONLY update if current value is null/empty
        const updateData: any = {};
        if (!matchedCust.alternateMobile && normalizePhone(row['Phone number'])) updateData.alternateMobile = normalizePhone(row['Phone number']);
        if (!matchedCust.driverName && driverName) updateData.driverName = driverName;
        if (!matchedCust.driverMobile && driverMobile) updateData.driverMobile = driverMobile;
        if (!matchedCust.addressLine1 && addressLine1) updateData.addressLine1 = addressLine1;
        if (!matchedCust.state && state) updateData.state = state;
        if (!matchedCust.postalCode && postalCode) updateData.postalCode = postalCode;
        if (!matchedCust.taxId && taxId) updateData.taxId = taxId;
        if (!matchedCust.notes && notes) updateData.notes = notes;
        if (!matchedCust.sourceRecordId && sourceRecordId) updateData.sourceRecordId = sourceRecordId;

        if (Object.keys(updateData).length > 0) {
          customerUpdates.push({ id: matchedCust.id, data: updateData });
        }
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

    if (customersToCreate.length > 0) await prisma.customer.createMany({ data: customersToCreate });
    for (const u of customerUpdates) {
      await prisma.customer.update({ where: { id: u.id }, data: u.data });
    }
    summary.customers = { created: customersToCreate.length, updated: customerUpdates.length };

    // 2. PROCESS VEHICLES (Auto object table.xls)
    const autosFile = path.join(DOC_DIR, 'Auto object table.xls');
    const autosData = parseXLSX(autosFile);

    const vehiclesToCreate: any[] = [];
    const vehicleUpdates: { id: string; data: any }[] = [];
    const ownershipHistoryToCreate: any[] = [];

    for (const row of autosData) {
      const rawLPN = String(row.LPN || '');
      const registrationNumberNormalized = normalizeLPN(rawLPN);
      if (registrationNumberNormalized === 'UNKNOWN' && !row.Manufacturer) continue;

      const sourceRecordId = row.Id ? String(row.Id).trim() : null;
      const manufacturer = row.Manufacturer ? String(row.Manufacturer).trim() : null;
      const model = row.Model ? String(row.Model).trim() : null;
      const vin = row.VIN ? String(row.VIN).trim() : null;
      const engineNumber = row['Engine number'] ? String(row['Engine number']).trim() : null;
      const manufactureYear = row['Manufacture year'] ? parseInt(String(row['Manufacture year']), 10) || null : null;
      const color = row.Color ? String(row.Color).trim() : null;
      const currentOdometer = row['Next oil change dist.'] ? parseInt(String(row['Next oil change dist.']), 10) || null : null;
      
      let customerId = customerBySourceId.get(row['Customer id.']) || legacyUnresolvedId!;
      let existingVeh = null;
      if (sourceRecordId && vehicleBySourceId.has(sourceRecordId)) {
        existingVeh = allVehicles.find(v => v.id === vehicleBySourceId.get(sourceRecordId));
      }
      if (!existingVeh) {
        existingVeh = vehicleByLpn.get(registrationNumberNormalized);
      }

      if (existingVeh) {
        // Soft Merge
        const updateData: any = {};
        if (!existingVeh.vin && vin) updateData.vin = vin;
        if (!existingVeh.engineNumber && engineNumber) updateData.engineNumber = engineNumber;
        if (!existingVeh.manufacturer && manufacturer) updateData.manufacturer = manufacturer;
        if (!existingVeh.model && model) updateData.model = model;
        if (!existingVeh.color && color) updateData.color = color;
        if (!existingVeh.currentOdometer && currentOdometer) updateData.currentOdometer = currentOdometer;
        if (!existingVeh.sourceRecordId && sourceRecordId) updateData.sourceRecordId = sourceRecordId;

        if (Object.keys(updateData).length > 0) {
          vehicleUpdates.push({ id: existingVeh.id, data: updateData });
        }
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
          color,
          manufactureYear,
          currentOdometer,
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

    if (vehiclesToCreate.length > 0) {
      await prisma.vehicle.createMany({ data: vehiclesToCreate });
      await prisma.vehicleOwnershipHistory.createMany({ data: ownershipHistoryToCreate });
    }
    for (const u of vehicleUpdates) {
      await prisma.vehicle.update({ where: { id: u.id }, data: u.data });
    }
    summary.vehicles = { created: vehiclesToCreate.length, updated: vehicleUpdates.length };

    // 3. PROCESS PARTS CATALOG (Items.xls)
    const itemsFile = path.join(DOC_DIR, 'Items.xls');
    const itemsData = parseXLSX(itemsFile);
    const partsToCreate: any[] = [];

    for (const row of itemsData) {
      const pName = String(row.Name || '').trim();
      if (!pName) continue;

      const defaultSellingPrice = parseAmount(row['Net list price'] || row['Net price']);
      if (defaultSellingPrice <= 0) continue;

      const existingPartId = partsByName.get(pName.toLowerCase());
      if (!existingPartId) {
        const newPartId = crypto.randomUUID();
        partsToCreate.push({
          id: newPartId,
          partName: pName,
          itemCode: row['Item code'] ? String(row['Item code']) : null,
          partNumber: row['Part number'] ? String(row['Part number']) : null,
          brand: row.Seller ? String(row.Seller) : null,
          unit: row.Unit ? String(row.Unit) : 'pcs',
          defaultTaxRate: parseTaxRate(row['Tax r.'] || 0),
          defaultSellingPrice,
          stockQuantity: parseFloat(row.Stock) || 0,
          sourceSystem: 'legacy_csv_items',
          sourceRecordId: row.Id ? String(row.Id) : null
        });
        partsByName.set(pName.toLowerCase(), newPartId);
      }
    }
    if (partsToCreate.length > 0) await prisma.partsMaster.createMany({ data: partsToCreate });
    summary.parts = { created: partsToCreate.length };

    // 4. PROCESS LABOR CATALOG (services.xls)
    const servicesFile = path.join(DOC_DIR, 'services.xls');
    const servicesData = parseXLSX(servicesFile);
    const labourToCreate: any[] = [];

    for (const row of servicesData) {
      const lName = String(row.Name || '').trim();
      if (!lName) continue;

      const defaultSellingPrice = parseAmount(row['Net list price'] || row['Net price']);
      if (defaultSellingPrice <= 0) continue;

      const existingLaborId = laborByName.get(lName.toLowerCase());
      if (!existingLaborId) {
        const newLaborId = crypto.randomUUID();
        labourToCreate.push({
          id: newLaborId,
          labourName: lName,
          labourCode: row['Item code'] ? String(row['Item code']) : null,
          unitType: row.Unit ? String(row.Unit) : 'job',
          defaultTaxRate: parseTaxRate(row['Tax r.'] || 0),
          defaultSellingPrice,
          sourceSystem: 'legacy_csv_items1',
          sourceRecordId: row.Id ? String(row.Id) : null
        });
        laborByName.set(lName.toLowerCase(), newLaborId);
      }
    }
    if (labourToCreate.length > 0) await prisma.labourMaster.createMany({ data: labourToCreate });
    summary.labor = { created: labourToCreate.length };

    // 5. PROCESS JOB CARDS (Job cards.csv)
    // ONLY ADD MISSING
    const jobsFile = path.join(DOC_DIR, 'Job cards.csv');
    const jobsData = parseCSV(jobsFile); // assuming it's still CSV as per dir listing
    
    const jobcardsToCreate: any[] = [];
    const snapshotsToCreate: any[] = [];

    for (const row of jobsData) {
      if (!row.Id) continue;
      
      const sourceRecordId = String(row.Id).trim();
      if (jobcardsBySourceId.has(sourceRecordId)) {
        continue; // Exists, DO NOT TOUCH IT! (Soft merge only means adding missing ones for JobCards)
      }
      
      const jobcardNumber = `LEGACY-${sourceRecordId}`;
      const cleanLpn = normalizeLPN(row.LPN || 'LEGACY-TEMP');
      
      let vehicleId = vehicleBySourceId.get(row['Auto id.']);
      if (!vehicleId) vehicleId = vehicleByLpn.get(cleanLpn)?.id;

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
      if (row.State === 'Opened') status = 'open';
      else if (row.State === 'Closed') status = 'closed';

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
        customerName: row.Customer ? String(row.Customer).trim() : 'Legacy Customer',
        customerAddress: row.Address ? String(row.Address).trim() : null,
        vehicleRegistrationNumber: row.LPN || 'UNKNOWN',
        vehicleManufacturer: row.Manufacturer || null,
        vehicleModel: row.Model || null,
        intakeOdometerSnapshot: intakeOdometer
      });
    }

    if (jobcardsToCreate.length > 0) {
      await prisma.jobCard.createMany({ data: jobcardsToCreate });
      await prisma.jobCardSnapshot.createMany({ data: snapshotsToCreate });
    }
    summary.jobcards = { created: jobcardsToCreate.length };

    const durationSeconds = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`--- IMPORT COMPLETED IN ${durationSeconds}s ---`);

    return NextResponse.json({
      success: true,
      message: 'Soft merge import completed successfully!',
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
