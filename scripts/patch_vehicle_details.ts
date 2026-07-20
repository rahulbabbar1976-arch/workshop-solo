import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import { prisma } from '../src/lib/db';

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
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

async function patchVehicles() {
  const jobcardsFile = path.join('C:', 'Users', 'rahul', 'OneDrive', 'Documents', 'jc transfer', 'Job cards.csv');
  console.log(`Reading from ${jobcardsFile}`);
  const fileContent = fs.readFileSync(jobcardsFile, 'utf8');
  const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  const records = result.data as any[];

  console.log(`Found ${records.length} records in Job cards.csv.`);

  // Map vehicles to the latest job card data
  const vehicleUpdates = new Map<string, any>();

  for (const row of records) {
    const legacyAutoId = row['Auto id.'];
    if (!legacyAutoId) continue;
    
    const createdDate = parseDate(row['Created']) || new Date();
    const odometer = parseNumber(row['Odometer mileage']) || 0;
    
    const updateData: any = {};
    
    // Calculate Next Service
    updateData.nextServiceDate = parseDate(row['Next service']);
    if (!updateData.nextServiceDate) {
      updateData.nextServiceDate = new Date(createdDate);
      updateData.nextServiceDate.setMonth(updateData.nextServiceDate.getMonth() + 6);
    }
    updateData.nextServiceOdometer = odometer > 0 ? odometer + 5000 : null;

    // Calculate Next Oil Change
    updateData.nextOilChangeDate = parseDate(row['Next oil change']);
    if (!updateData.nextOilChangeDate) {
      updateData.nextOilChangeDate = new Date(createdDate);
      updateData.nextOilChangeDate.setMonth(updateData.nextOilChangeDate.getMonth() + 12);
    }
    updateData.nextOilChangeDistance = parseNumber(row['Next oil change dist.']);
    if (!updateData.nextOilChangeDistance) {
      updateData.nextOilChangeDistance = odometer > 0 ? odometer + 10000 : null;
    }

    if (row['Next P.U.C']) updateData.emissionInspectionExpiryDate = parseDate(row['Next P.U.C']);
    if (row['Next timing belt change']) updateData.nextTimingBeltChangeDate = parseDate(row['Next timing belt change']);
    
    // Battery merging (saving exact details to proper fields)
    if (row['Battery Details']) updateData.batteryDetails = row['Battery Details'];
    if (row['Battery Make']) updateData.batteryMake = row['Battery Make'];
    if (row['Battery S/N and Date']) updateData.batterySerialNumber = row['Battery S/N and Date'];

    if (Object.keys(updateData).length > 0) {
      const existing = vehicleUpdates.get(legacyAutoId) || { _date: new Date(0) };
      // Update if this row is newer than what we have saved
      if (createdDate >= existing._date) {
        updateData._date = createdDate;
        vehicleUpdates.set(legacyAutoId, updateData);
      }
    }
  }

  console.log(`Found updates for ${vehicleUpdates.size} vehicles. Updating DB...`);
  
  let updatedCount = 0;
  for (const [legacyAutoId, data] of vehicleUpdates.entries()) {
    delete data._date;
    
    const vehicle = await prisma.vehicle.findFirst({
      where: { sourceRecordId: String(legacyAutoId), sourceSystem: 'legacy_jobcard2' }
    });

    if (vehicle) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: data
      });
      updatedCount++;
    }
  }

  console.log(`Successfully patched ${updatedCount} vehicles with calculated service/battery data.`);
}

patchVehicles()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
