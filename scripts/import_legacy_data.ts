import 'dotenv/config';
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

  // Get tenant associated with rahulbabbar@msn.com
  const user = await prisma.user.findFirst({ where: { email: 'rahulbabbar@msn.com' } });
  if (!user || !user.tenantId) throw new Error('User rahulbabbar@msn.com not found or has no tenant assigned.');

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) throw new Error('Tenant not found.');

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

  // Create a fallback customer for orphaned vehicles
  await prisma.customer.upsert({
    where: { id: `legacy-cust-unknown` },
    update: {},
    create: {
      id: `legacy-cust-unknown`,
      tenantId: tenant.id,
      displayName: 'Unknown Legacy Customer',
      customerType: 'retail',
      sourceSystem: 'jobcard2'
    }
  });

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
    const make = row[22] || 'Unknown';
    const model = row[23] || 'Unknown';
    const variant = row[24] || '';
    const fuelType = row[25] || '';
    const vin = row[8] || '';
    const yearRaw = parseInt(row[9]);
    const year = isNaN(yearRaw) ? null : yearRaw;
    const color = row[10] || '';
    const batteryDetails = row[21] || '';
    const nextServiceDate = row[12] ? new Date(row[12]) : null;
    const nextOilChangeDate = row[14] ? new Date(row[14]) : null;
    const nextPucDate = row[16] ? new Date(row[16]) : null;
    const odometerRaw = parseInt(row[18]);
    const currentOdometer = isNaN(odometerRaw) ? null : odometerRaw;
    const notes = row[3] || '';

    const finalCustomerId = customerId ? `legacy-cust-${customerId}` : `legacy-cust-unknown`;
    
    try {
      const vehicleData = {
          tenantId: tenant.id,
          registrationNumberRaw: lpn,
          registrationNumberNormalized: normalizedLpn,
          manufacturer: make,
          model: model,
          variant: variant,
          fuelType: fuelType,
          vin: vin,
          manufactureYear: year,
          color: color,
          batteryDetails: batteryDetails,
          nextServiceDate: nextServiceDate,
          nextOilChangeDate: nextOilChangeDate,
          emissionInspectionExpiryDate: nextPucDate,
          currentOdometer: currentOdometer,
          notes: notes,
          sourceSystem: 'jobcard2',
          sourceRecordId: legacyId,
          currentCustomerId: finalCustomerId
      };

      const vehicle = await prisma.vehicle.upsert({
        where: { registrationNumberNormalized: normalizedLpn },
        update: vehicleData,
        create: vehicleData
      });

      // Link Ownership if customer exists
      if (customerId) {
        await prisma.vehicleOwnershipHistory.create({
          data: {
            vehicleId: vehicle.id,
            customerId: finalCustomerId,
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

  // 3. Import Worksheets (JobCards)
  console.log('Reading Worksheets...');
  const worksheetsRaw = await parseCSV('worksheet.csv');
  let worksheetCount = 0;
  for (const row of worksheetsRaw) {
    const legacyId = row[0];
    const customerId = row[1];
    const vehicleId = row[3];
    if (!legacyId) continue;
    
    // Convert dates safely
    const dateIn = row[7] ? new Date(row[7]) : new Date();
    
    let finalCustomerId = customerId ? `legacy-cust-${customerId}` : `legacy-cust-unknown`;
    
    // We don't have vehicle primary keys, so we lookup by sourceRecordId
    const vehicle = await prisma.vehicle.findFirst({ where: { sourceRecordId: vehicleId } });
    
    if (vehicle) {
      // Ensure customer exists to avoid Foreign Key violations
      const custExists = await prisma.customer.findUnique({ where: { id: finalCustomerId } });
      if (!custExists) {
        finalCustomerId = 'legacy-cust-unknown';
      }
      
      const rawNotes = row[19] || '';
      let driverName = '';
      let driverMobile = '';
      let internalNotes = rawNotes;

      // Extract driver name and mobile: "Driver Name Deeraj. (9873292195)"
      const driverMatch = rawNotes.match(/Driver Name\s+([^.]+)\.?\s*\((\d+)\)/i);
      if (driverMatch) {
          driverName = driverMatch[1].trim();
          driverMobile = driverMatch[2].trim();
          internalNotes = rawNotes.replace(driverMatch[0], '').trim();
      }

      // If we found a driver, let's also update the Customer record if it doesn't have one
      if (driverName && custExists && !custExists.driverName) {
         await prisma.customer.update({
             where: { id: finalCustomerId },
             data: { driverName, driverMobile }
         });
      }

      const jobCardData = {
          jobcardNumber: `LEGACY-${legacyId}`,
          tenantId: tenant.id,
          customerId: finalCustomerId,
          vehicleId: vehicle.id,
          status: 'closed',
          createdAt: dateIn,
          internalNotes: internalNotes
      };

      await prisma.jobCard.upsert({
        where: { jobcardNumber: `LEGACY-${legacyId}` },
        update: jobCardData,
        create: jobCardData
      });
      worksheetCount++;
    }
  }
  console.log(`Imported ${worksheetCount} worksheets.`);

  // 4. Import Problems (Complaints)
  console.log('Reading Problems...');
  const problemsRaw = await parseCSV('problem.csv');
  let problemCount = 0;
  for (const row of problemsRaw) {
    const legacyId = row[0];
    const worksheetId = row[5];
    const desc = row[8] || '';
    if (!legacyId || !worksheetId || !desc.trim()) continue;

    const jobCard = await prisma.jobCard.findUnique({ where: { jobcardNumber: `LEGACY-${worksheetId}` } });
    if (jobCard) {
      // Find existing to avoid duplicates if re-run
      const existing = await prisma.jobCardComplaint.findFirst({
        where: { jobcardId: jobCard.id, customerComplaintText: desc }
      });
      if (!existing) {
        await prisma.jobCardComplaint.create({
          data: {
            jobcardId: jobCard.id,
            tenantId: tenant.id,
            customerComplaintText: desc
          }
        });
        problemCount++;
      }
    }
  }
  console.log(`Imported ${problemCount} problems.`);

  // 5. Import Items (Parts and Labour)
  console.log('Reading Items...');
  const itemsRaw = await parseCSV('item.csv');
  let itemCount = 0;
  let labourCount = 0;
  for (const row of itemsRaw) {
    const legacyId = row[0];
    const worksheetId = row[7];
    const desc = row[22] || '';
    const rawQty = parseFloat(row[24] || '0');
    const qty = Math.abs(rawQty) || 1; 
    const price = parseFloat(row[32] || '0');
    
    if (!legacyId || !worksheetId || !desc.trim()) continue;
    
    const jobCard = await prisma.jobCard.findUnique({ where: { jobcardNumber: `LEGACY-${worksheetId}` } });
    if (jobCard) {
      const isLabour = /labour|service|charge|repair|fixing|open|fitment/i.test(desc);
      if (isLabour) {
        const existing = await prisma.jobCardLabour.findFirst({
          where: { jobcardId: jobCard.id, labourName: desc }
        });
        if (!existing) {
          await prisma.jobCardLabour.create({
            data: {
              jobcardId: jobCard.id,
              labourName: desc,
              sellingPrice: price,
              quantity: qty,
              status: 'completed'
            }
          });
          labourCount++;
        }
      } else {
        const existing = await prisma.jobCardPart.findFirst({
          where: { jobcardId: jobCard.id, partName: desc }
        });
        if (!existing) {
          await prisma.jobCardPart.create({
            data: {
              jobcardId: jobCard.id,
              partName: desc,
              sellingPrice: price,
              quantityRequested: qty,
              status: 'used'
            }
          });
          itemCount++;
        }
      }
    }
  }
  console.log(`Imported ${itemCount} parts and ${labourCount} labour items.`);

}

main().catch(console.error);
