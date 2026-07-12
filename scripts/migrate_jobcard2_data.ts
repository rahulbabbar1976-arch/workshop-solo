import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // expects DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

function parseNumber(numStr: string | null | undefined): number | null {
  if (!numStr) return null;
  const clean = numStr.replace(/,/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

function normalizeRegNo(regNo: string | null | undefined): string {
  if (!regNo) return '';
  return regNo.toUpperCase().replace(/[\s-]/g, '');
}

async function migrateCustomers(csvFilePath: string) {
  console.log(`Starting migration for customers from ${csvFilePath}`);
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  
  const records = result.data as any[];
  console.log(`Found ${records.length} records in ${csvFilePath}`);

  let createdCount = 0;
  for (const row of records) {
    const id = row['Id'];
    const name = row['Name'];
    
    if (!name) continue; // Skip invalid rows

    const primaryMobile = row['Phone number'] || row['Mobile Numer'] || '';
    const alternateMobile = row['Mobile Numer'] && row['Mobile Numer'] !== primaryMobile ? row['Mobile Numer'] : undefined;
    const email = row['E-mail']?.toLowerCase().trim();

    // Let's do a simple findFirst and then create/update.
    let existing = await prisma.customer.findFirst({
      where: { sourceRecordId: id, sourceSystem: 'legacy_csv_partners' }
    });

    const data = {
      sourceSystem: 'legacy_csv_partners',
      sourceRecordId: id,
      displayName: name,
      customerType: 'retail',
      primaryMobile: primaryMobile || null,
      alternateMobile: alternateMobile || null,
      addressLine1: row['Address'] || null,
      city: row['Settlement'] || null,
      state: row['State'] || null,
      postalCode: row['ZIP'] || null,
      country: row['Country'] || 'IN',
      email: email || null,
      taxId: row['Vat number'] || null,
      driverName: row['Driver Name'] || null,
      notes: row['Notes'] || null,
      isActive: true,
    };

    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data });
    } else {
      await prisma.customer.create({ data });
      createdCount++;
    }
  }

  console.log(`Customers migration complete. Created: ${createdCount}`);
}

async function migrateVehicles(csvFilePath: string) {
  console.log(`Starting migration for vehicles from ${csvFilePath}`);
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  
  const records = result.data as any[];
  console.log(`Found ${records.length} records in ${csvFilePath}`);

  let createdCount = 0;
  for (const row of records) {
    const id = row['Id'];
    const rawLpn = row['LPN'];
    if (!rawLpn) continue;

    const normalizedLpn = normalizeRegNo(rawLpn);
    const customerLegacyId = row['Customer id.'];

    let customerId = undefined;
    if (customerLegacyId) {
      const customer = await prisma.customer.findFirst({
        where: { sourceRecordId: customerLegacyId, sourceSystem: 'legacy_csv_partners' }
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    if (!customerId) {
      console.warn(`Could not resolve customer for vehicle ${rawLpn} (Customer legacy id: ${customerLegacyId})`);
      // We must link to a customer, so we might skip or create a dummy. 
      // The schema requires `currentCustomerId`. Let's skip if no customer found.
      continue;
    }

    const data = {
      sourceSystem: 'legacy_csv_auto',
      sourceRecordId: id,
      registrationNumberRaw: rawLpn,
      registrationNumberNormalized: normalizedLpn,
      vin: row['VIN'] || null,
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
      nextServiceDate: parseDate(row['Next service']),
      nextOilChangeDate: parseDate(row['Next oil change']),
      nextOilChangeDistance: parseNumber(row['Next oil change dist.']),
      emissionInspectionExpiryDate: parseDate(row['Next P.U.C']),
      nextTimingBeltChangeDate: parseDate(row['Next timing belt change']),
    };

    let existing = await prisma.vehicle.findUnique({
      where: { registrationNumberNormalized: normalizedLpn }
    });

    if (existing) {
      await prisma.vehicle.update({ where: { id: existing.id }, data });
    } else {
      const vehicle = await prisma.vehicle.create({ data });
      createdCount++;
      
      // Create ownership history
      await prisma.vehicleOwnershipHistory.create({
        data: {
          vehicleId: vehicle.id,
          customerId: customerId,
          transferNotes: 'Legacy import'
        }
      });
    }
  }

  console.log(`Vehicles migration complete. Created: ${createdCount}`);
}

async function main() {
  const args = process.argv.slice(2);
  const partnersCsv = args[0] || 'legacy_data/Partners.csv';
  const autoCsv = args[1] || 'legacy_data/Auto object table.csv';

  if (!fs.existsSync(partnersCsv)) {
    console.error(`Missing file: ${partnersCsv}. Please provide the path to Partners.csv as the first argument.`);
    process.exit(1);
  }

  if (!fs.existsSync(autoCsv)) {
    console.error(`Missing file: ${autoCsv}. Please provide the path to Auto object table.csv as the second argument.`);
    process.exit(1);
  }

  await migrateCustomers(partnersCsv);
  await migrateVehicles(autoCsv);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
