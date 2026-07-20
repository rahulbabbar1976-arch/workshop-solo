import { prisma } from '../src/lib/db';

async function main() {
  console.log('Finding babbarsons tenant...');
  const tenant = await prisma.tenant.findFirst({
    where: { name: 'babbarsons' }
  });

  if (!tenant) {
    console.error('Tenant babbarsons not found!');
    return;
  }

  console.log(`Found tenant ${tenant.id}. Updating legacy data...`);

  // Update Customers
  const customersResult = await prisma.customer.updateMany({
    where: { sourceSystem: 'legacy_jobcard2' },
    data: { tenantId: tenant.id }
  });
  console.log(`Updated ${customersResult.count} customers to babbarsons tenant.`);

  // Update Vehicles
  const vehiclesResult = await prisma.vehicle.updateMany({
    where: { sourceSystem: 'legacy_jobcard2' },
    data: { tenantId: tenant.id }
  });
  console.log(`Updated ${vehiclesResult.count} vehicles to babbarsons tenant.`);

  // Update JobCards
  const jobcardsResult = await prisma.jobCard.updateMany({
    where: { sourceSystem: 'legacy_jobcard2' },
    data: { tenantId: tenant.id }
  });
  console.log(`Updated ${jobcardsResult.count} job cards to babbarsons tenant.`);
  
  // Update Bookings (if any were legacy, though probably not)
  // ...

  console.log('Legacy data reassignment complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
