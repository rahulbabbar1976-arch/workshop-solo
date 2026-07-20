import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import * as xlsx from 'xlsx';
import { prisma } from '../src/lib/db';
import * as crypto from 'crypto';

// Setup directories
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'v-photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    // basic validation
    if (year > 1900 && year < 2100) {
       const date = new Date(year, month, day);
       if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function parseNumber(numStr: string | null | undefined): number | null {
  if (!numStr) return null;
  const clean = String(numStr).replace(/,/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

function normalizeRegNo(regNo: string | null | undefined): string {
  if (!regNo) return '';
  return String(regNo).toUpperCase().replace(/[\s-]/g, '');
}

function readData(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xls' || ext === '.xlsx') {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Skip the first 2 rows (title rows) which interfere with header parsing
    return xlsx.utils.sheet_to_json(sheet, { range: 2 });
  } else {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    return result.data;
  }
}

async function migrateCustomers(filePath: string) {
  console.log(`\n=== Migrating Customers from ${filePath} ===`);
  const records = readData(filePath) as any[];
  console.log(`Found ${records.length} records`);

  let created = 0; let updated = 0;
  for (const row of records) {
    const id = row['Id'];
    if (!id && !row['Name'] && !row['Phone number']) continue; 
    const name = row['Name'] || `Unknown Customer (ID: ${id || 'N/A'})`;
    const primaryMobile = row['Phone number'] || row['Mobile Numer'] || '';
    
    let existing = null;
    if (id) {
      existing = await prisma.customer.findFirst({
        where: { sourceRecordId: String(id), sourceSystem: 'legacy_jobcard2' }
      });
    }

    const data = {
      sourceSystem: 'legacy_jobcard2',
      sourceRecordId: String(id),
      displayName: name,
      customerType: 'retail',
      primaryMobile: String(primaryMobile).substring(0, 50) || null,
      addressLine1: row['Address'] || null,
      city: row['Settlement'] || null,
      state: row['State'] || null,
      postalCode: row['ZIP'] || null,
      country: row['Country'] || 'IN',
      email: row['E-mail']?.toLowerCase().trim() || null,
      taxId: row['Vat number'] || null,
      driverName: row['Driver Name'] || null,
      notes: row['Notes'] || null,
      isActive: true,
    };

    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.customer.create({ data });
      created++;
    }
  }
  console.log(`Customers migrated. Created: ${created}, Updated: ${updated}`);
}

async function migrateVehicles(filePath: string) {
  console.log(`\n=== Migrating Vehicles from ${filePath} ===`);
  const records = readData(filePath) as any[];
  console.log(`Found ${records.length} records`);

  let fallbackCustomer = await prisma.customer.findFirst({
    where: { sourceRecordId: 'FALLBACK_UNASSIGNED' }
  });
  if (!fallbackCustomer) {
    fallbackCustomer = await prisma.customer.create({
      data: {
        sourceSystem: 'legacy_jobcard2',
        sourceRecordId: 'FALLBACK_UNASSIGNED',
        displayName: 'Unassigned Vehicle Owner',
        customerType: 'retail'
      }
    });
  }

  let created = 0; let updated = 0;
  for (const row of records) {
    const id = String(row['Id'] || '');
    const rawLpn = String(row['LPN'] || '');
    const vin = String(row['VIN'] || '');
    
    if (!rawLpn && !vin && !id) continue;
    const finalLpn = rawLpn || `UNKNOWN-REG-${id}`;
    const normalizedLpn = normalizeRegNo(finalLpn);
    
    const customerLegacyId = row['Customer id.'];
    let customerId = fallbackCustomer.id;
    if (customerLegacyId) {
      const customer = await prisma.customer.findFirst({
        where: { sourceRecordId: String(customerLegacyId), sourceSystem: 'legacy_jobcard2' }
      });
      if (customer) customerId = customer.id;
    }

    const data = {
      sourceSystem: 'legacy_jobcard2',
      sourceRecordId: id || null,
      registrationNumberRaw: finalLpn,
      registrationNumberNormalized: normalizedLpn,
      vin: vin || null,
      engineNumber: row['Engine number'] || null,
      manufacturer: row['Manufacturer'] || null,
      model: row['Model'] || null,
      variant: row['Engine type'] || null,
      fuelType: row['Fuel type'] || null,
      color: row['Color'] || null,
      manufactureYear: parseNumber(row['Manufacture year']),
      batteryDetails: row['Battery Details'] || null,
      insurerName: row['Insurer'] || null,
      notes: row['Notes'] || null,
      currentCustomerId: customerId,
    };

    let existing = await prisma.vehicle.findUnique({
      where: { registrationNumberNormalized: normalizedLpn }
    });

    if (existing) {
      await prisma.vehicle.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.vehicle.create({ data });
      created++;
    }
  }
  console.log(`Vehicles migrated. Created: ${created}, Updated: ${updated}`);
}

async function migrateJobCardsAndAttachments(csvPath: string, attachmentsPath: string) {
  console.log(`\n=== Migrating Job Cards and Attachments ===`);
  const records = readData(csvPath) as any[];
  console.log(`Found ${records.length} job cards`);

  let createdJC = 0; let updatedJC = 0; let filesCopied = 0;
  
  // ensure a dummy tenant
  let tenant = await prisma.tenant.findFirst();
  if(!tenant) tenant = await prisma.tenant.create({ data: { name: 'Default', status: 'ACTIVE' } });

  for (const row of records) {
    const id = String(row['Id'] || '');
    if (!id || id === 'undefined') continue;

    const legacyCustId = row['Customer id.'];
    const legacyAutoId = row['Auto id.'];
    
    // Resolve relations
    const customer = await prisma.customer.findFirst({ where: { sourceRecordId: String(legacyCustId), sourceSystem: 'legacy_jobcard2' } });
    const vehicle = await prisma.vehicle.findFirst({ where: { sourceRecordId: String(legacyAutoId), sourceSystem: 'legacy_jobcard2' } });

    if (!customer || !vehicle) {
      continue; // skip orphan job cards for now to prevent crashing
    }

    // Map status
    const state = String(row['State'] || '').toLowerCase();
    let status = 'closed';
    if (state.includes('open')) status = 'open';

    const jcData = {
      jobcardNumber: `JC-LEGACY-${id}`,
      customerId: customer.id,
      vehicleId: vehicle.id,
      status: status,
      dateIn: parseDate(row['Created']) || new Date(),
      expectedDeliveryAt: parseDate(row['Deadline']),
      closedAt: parseDate(row['Completed']),
      intakeOdometer: parseNumber(row['Odometer mileage']),
      internalNotes: row['Notes'] || null,
      subtotalAmount: parseNumber(row['Net sum']) || 0,
      taxAmount: parseNumber(row['Tax sum']) || 0,
      totalAmount: parseNumber(row['Gross sum']) || 0,
      paymentStatus: String(row['Paid']).toLowerCase() === 'yes' ? 'paid' : 'unpaid',
      sourceSystem: 'legacy_jobcard2',
      sourceRecordId: id,
      legacyImportFlag: true,
      readOnlyFlag: true,
      tenantId: tenant.id
    };

    let jc = await prisma.jobCard.findFirst({
      where: { sourceRecordId: id, sourceSystem: 'legacy_jobcard2' }
    });

    if (jc) {
      await prisma.jobCard.update({ where: { id: jc.id }, data: jcData });
      updatedJC++;
    } else {
      jc = await prisma.jobCard.create({ data: jcData });
      createdJC++;
    }

    // Attachments processing
    if (attachmentsPath && fs.existsSync(attachmentsPath)) {
      const folderName = `Job card (${id})`;
      const sourceFolder = path.join(attachmentsPath, folderName);
      
      if (fs.existsSync(sourceFolder)) {
        const files = fs.readdirSync(sourceFolder);
        for (const file of files) {
          const ext = path.extname(file);
          const oldPath = path.join(sourceFolder, file);
          
          // Generate new unique filename
          const newFileName = `${crypto.randomUUID()}${ext}`;
          const newPath = path.join(uploadsDir, newFileName);
          
          // Copy file
          fs.copyFileSync(oldPath, newPath);
          const stats = fs.statSync(newPath);
          
          // Create VehiclePhoto record linked to jobcard and vehicle
          await prisma.vehiclePhoto.create({
             data: {
                vehicleId: vehicle.id,
                jobcardId: jc.id,
                fileUrl: `/uploads/v-photos/${newFileName}`,
                fileName: file,
                fileSizeBytes: stats.size,
                captureLabel: 'legacy_attachment'
             }
          });
          filesCopied++;
        }
      }
    }
  }

  console.log(`JobCards migrated. Created: ${createdJC}, Updated: ${updatedJC}`);
  console.log(`Legacy attachments copied and linked: ${filesCopied}`);
}

async function main() {
  const baseDir = `C:\\Users\\rahul\\OneDrive\\Documents\\jc transfer`;
  const partnersFile = path.join(baseDir, 'Partners.xls');
  const autoFile = path.join(baseDir, 'Auto object table.xls');
  const jobcardsFile = path.join(baseDir, 'Job cards.csv');
  const attachmentsDir = path.join(baseDir, 'Job card Attachements (29.06.2026 22_17)');

  if (fs.existsSync(partnersFile)) {
    await migrateCustomers(partnersFile);
  } else {
    console.error(`Not found: ${partnersFile}`);
  }

  if (fs.existsSync(autoFile)) {
    await migrateVehicles(autoFile);
  } else {
    console.error(`Not found: ${autoFile}`);
  }

  if (fs.existsSync(jobcardsFile)) {
    await migrateJobCardsAndAttachments(jobcardsFile, attachmentsDir);
  } else {
    console.error(`Not found: ${jobcardsFile}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
