import 'dotenv/config';
import Database from 'better-sqlite3';
import { prisma } from '../src/lib/db';

async function main() {
  const dbPath = 'C:/Users/rahul/OneDrive/Desktop/workshop/dev_tenant_ab4506dc-03f7-41c8-83ab-1eb525f7d002.db';
  console.log(`Connecting to old database at ${dbPath}...`);
  const db = new Database(dbPath, { readonly: true });

  const customers: any[] = db.prepare("SELECT * FROM Customer").all();
  const vehicles: any[] = db.prepare("SELECT * FROM Vehicle").all();

  console.log(`Found ${customers.length} customers and ${vehicles.length} vehicles.`);

  let customersImported = 0;
  for (const c of customers) {
    if (c.createdAt) c.createdAt = new Date(c.createdAt);
    if (c.updatedAt) c.updatedAt = new Date(c.updatedAt);
    
    // SQLite boolean map
    if (c.isActive !== undefined && c.isActive !== null) c.isActive = Boolean(c.isActive);
    if (c.isPriority !== undefined && c.isPriority !== null) c.isPriority = Boolean(c.isPriority);

    // Schema mapping
    if (c.gstNumber !== undefined) {
      c.taxId = c.gstNumber;
      delete c.gstNumber;
    }

    try {
      console.log('Inserting customer:', c);
      await prisma.customer.upsert({
        where: { id: c.id },
        update: {},
        create: c
      });
      customersImported++;
    } catch(e: any) {
      console.error(e.message);
      throw e;
    }
  }

  let vehiclesImported = 0;
  for (const v of vehicles) {
    if (v.createdAt) v.createdAt = new Date(v.createdAt);
    if (v.updatedAt) v.updatedAt = new Date(v.updatedAt);
    if (v.batteryInstallationDate) v.batteryInstallationDate = new Date(v.batteryInstallationDate);
    if (v.insuranceExpiryDate) v.insuranceExpiryDate = new Date(v.insuranceExpiryDate);
    if (v.nextServiceDate) v.nextServiceDate = new Date(v.nextServiceDate);
    if (v.nextPucDate) {
      v.emissionInspectionExpiryDate = new Date(v.nextPucDate);
      delete v.nextPucDate;
    }
    if (v.pucNumber !== undefined) {
      v.emissionInspectionNumber = v.pucNumber;
      delete v.pucNumber;
    }
    if (v.nextOilChangeDate) v.nextOilChangeDate = new Date(v.nextOilChangeDate);
    if (v.nextTimingBeltChangeDate) v.nextTimingBeltChangeDate = new Date(v.nextTimingBeltChangeDate);

    if (v.isActive !== undefined && v.isActive !== null) v.isActive = Boolean(v.isActive);

    try {
      console.log('Inserting vehicle:', v);
      await prisma.vehicle.upsert({
        where: { id: v.id },
        update: {},
        create: v
      });
      vehiclesImported++;
    } catch(e: any) {
      console.error(e.message);
      throw e;
    }
  }

  console.log(`Import complete! Imported ${customersImported} customers and ${vehiclesImported} vehicles.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
