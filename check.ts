import prisma from './src/lib/db';
async function run() {
  const pc = await prisma.partPurchase.count();
  const sc = await prisma.supplierBill.count();
  const jc = await prisma.jobCardPart.count();
  console.log('PartPurchases:', pc);
  console.log('SupplierBills:', sc);
  console.log('JobCardParts:', jc);
}
run().catch(console.error).finally(() => process.exit(0));
