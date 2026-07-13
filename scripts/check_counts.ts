import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log("Customer:", await prisma.customer.count());
  console.log("Vehicle:", await prisma.vehicle.count());
  console.log("PartsMaster:", await prisma.partsMaster.count());
  console.log("LabourMaster:", await prisma.labourMaster.count());
  console.log("JobCard:", await prisma.jobCard.count());
}

main().finally(() => prisma.$disconnect());
