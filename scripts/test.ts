import { prisma } from '../src/lib/db';
async function main() {
  const jc = await prisma.jobCard.findFirst();
  console.log(jc);
  await prisma.$disconnect();
}
main();
