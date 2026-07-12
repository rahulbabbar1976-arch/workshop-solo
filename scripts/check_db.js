const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobcards = await prisma.jobCard.findMany({
    where: { jobcardNumber: { startsWith: 'LEGACY-' } },
    take: 5,
    include: {
      vehicle: true,
      customer: true
    }
  });

  console.log(JSON.stringify(jobcards, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
