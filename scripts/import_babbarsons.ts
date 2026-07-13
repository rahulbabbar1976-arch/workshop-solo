import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Loading dumped data...");
  const customersRaw = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/babbarsons_customers.json', 'utf8');
  const vehiclesRaw = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/babbarsons_vehicles.json', 'utf8');

  const customers = JSON.parse(customersRaw);
  const vehicles = JSON.parse(vehiclesRaw);

  console.log(`Read ${customers.length} customers and ${vehicles.length} vehicles from JSON.`);

  let customersCreated = 0;
  for (const c of customers) {
    // Remove tenantId before inserting
    const { tenantId, ...data } = c;
    try {
      await prisma.customer.upsert({
        where: { id: data.id },
        update: {},
        create: data
      });
      customersCreated++;
    } catch(e: any) {
      console.warn(`Could not insert customer ${data.id}:`, e.message);
    }
  }
  console.log(`Successfully migrated ${customersCreated} customers.`);

  let vehiclesCreated = 0;
  for (const v of vehicles) {
    const { tenantId, ...data } = v;
    try {
      await prisma.vehicle.upsert({
        where: { id: data.id },
        update: {},
        create: data
      });
      vehiclesCreated++;
    } catch(e: any) {
      console.warn(`Could not insert vehicle ${data.id}:`, e.message);
    }
  }
  console.log(`Successfully migrated ${vehiclesCreated} vehicles.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
