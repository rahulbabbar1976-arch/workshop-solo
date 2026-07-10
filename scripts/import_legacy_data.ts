import { getPrismaForDb } from '../src/lib/db';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const prisma = getPrismaForDb('dev.db');
const EXPORT_DIR = 'C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program';

async function parseCSV(fileName: string): Promise<any[]> {
  const filePath = path.join(EXPORT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve) => {
    Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
    });
  });
}

async function main() {
  console.log('Starting Legacy Data Import...');

  // Get BABBARSONS tenant
  const tenant = await prisma.tenant.findFirst({ where: { name: 'BABBARSONS' } });
  if (!tenant) throw new Error('Tenant BABBARSONS not found. Please seed the database first.');

  console.log(`Importing data into Tenant: ${tenant.name} (${tenant.id})`);

  // 1. Import Customers & Addresses
  console.log('Reading Customers & Addresses...');
  const customersRaw = await parseCSV('customer.csv');
  const addressesRaw = await parseCSV('address.csv');

  // Map Addresses by Customer ID
  // ADDRESS columns: 0=ADDRESS_ID, 1=TYPE, 2=CUSTOMER_ID, 3=NAME, 6=STREET_ADDRESS
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

  let customerCount = 0;
  // CUSTOMER columns: 0=CUSTOMER_ID, 11=DATA_20(mobile/phone), 14=DATA_24(active?)
  for (const row of customersRaw) {
    const legacyId = row[0];
    const mobile = row[11] || '';
    const addressData = addressMap.get(legacyId) || { name: 'Unknown Customer ' + legacyId, address: '' };

    await prisma.customer.upsert({
      where: {
        id: `legacy-cust-${legacyId}`,
      },
      update: {},
      create: {
        id: `legacy-cust-${legacyId}`,
        tenantId: tenant.id,
        displayName: addressData.name,
        primaryMobile: mobile,
        addressLine1: addressData.address,
        sourceSystem: 'jobcard2',
        sourceRecordId: legacyId
      }
    });
    customerCount++;
  }
  console.log(`Imported ${customerCount} customers.`);

  // 2. Import Vehicles (THING)
  // THING columns: 0=THING_ID, 1=CUSTOMER_ID, 2=NAME(LPN), 3=NOTES, 8=DATA_10(VIN?), 9=DATA_11(Year?), 10=DATA_12(Make?), 11=DATA_13(Model?)
  console.log('Reading Vehicles...');
  const thingsRaw = await parseCSV('thing.csv');
  let vehicleCount = 0;

  for (const row of thingsRaw) {
    const legacyId = row[0];
    const customerId = row[1];
    const lpn = row[2] || `UNKNOWN-${legacyId}`;
    const normalizedLpn = lpn.toUpperCase().replace(/[\s-]/g, '');
    const make = row[10] || 'Unknown';
    const model = row[11] || 'Unknown';
    const vin = row[8] || '';

    try {
      const vehicle = await prisma.vehicle.upsert({
        where: { registrationNumberNormalized: normalizedLpn },
        update: {},
        create: {
          tenantId: tenant.id,
          registrationNumberRaw: lpn,
          registrationNumberNormalized: normalizedLpn,
          manufacturer: make,
          model: model,
          vin: vin,
          sourceSystem: 'jobcard2',
          sourceRecordId: legacyId
        }
      });

      // Link Ownership if customer exists
      if (customerId) {
        await prisma.vehicleOwnershipHistory.create({
          data: {
            tenantId: tenant.id,
            vehicleId: vehicle.id,
            customerId: `legacy-cust-${customerId}`,
            isCurrentOwner: true
          }
        });
      }
      vehicleCount++;
    } catch (e) {
      console.warn(`Skipped duplicate vehicle: ${normalizedLpn}`);
    }
  }
  console.log(`Imported ${vehicleCount} vehicles.`);

  console.log('Data import complete!');
}

main().catch(console.error);
