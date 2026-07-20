import { prisma } from '../src/lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const jcs = await prisma.jobCard.findMany({ select: { jobcardNumber: true }, take: 5 });
  console.log(jcs);
  await prisma.$disconnect();
}
main();
