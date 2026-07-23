import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const profile = await prisma.workshopProfile.findFirst();
  console.log(JSON.stringify(profile, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
