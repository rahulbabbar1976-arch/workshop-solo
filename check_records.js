const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobcards = await prisma.jobCard.findMany();
  console.log('JobCards count:', jobcards.length);
  if (jobcards.length > 0) {
    console.log('Sample sourceRecordIds:', jobcards.map(j => j.sourceRecordId).filter(Boolean));
  }
  const parts = await prisma.jobCardPart.findMany();
  console.log('Parts count:', parts.length);
  if (parts.length > 0) {
    console.log('Sample part qty and price:', parts.slice(0,5).map(p => ({
      qtyReq: p.quantityRequested,
      qtyUsed: p.quantityUsed,
      sellPrice: p.sellingPrice,
      totalPrice: p.totalPrice
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
