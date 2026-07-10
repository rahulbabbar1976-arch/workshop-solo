import prisma from './src/lib/db';

async function main() {
  console.log('Purging demo data...');
  
  // Keep admin user, roles, and WorkshopProfile, integration configs
  // Delete transactional data:
  
  await prisma.jobCardMechanic.deleteMany({});
  await prisma.jobCardPart.deleteMany({});
  await prisma.jobCardLabour.deleteMany({});
  await prisma.estimateItem.deleteMany({});
  await prisma.estimate.deleteMany({});
  await prisma.jobCard.deleteMany({});
  await prisma.reservation.deleteMany({});
  
  await prisma.vehicleOwnershipHistory.deleteMany({});
  await prisma.vehicle.deleteMany({});
  
  await prisma.customer.deleteMany({});
  
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.purchaseOrderLine.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.partReturn.deleteMany({});
  await prisma.partCrossReference.deleteMany({});
  await prisma.inventoryPart.deleteMany({});
  
  await prisma.supplier.deleteMany({});
  await prisma.labourMaster.deleteMany({});
  
  await prisma.taxSettings.deleteMany({});
  await prisma.numberingSettings.deleteMany({});
  await prisma.printSettings.deleteMany({});
  await prisma.documentTemplate.deleteMany({});
  
  // We keep AIKnowledgeCache since it's trained data
  
  console.log('Demo data purged successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
