import { prisma } from "../src/lib/db";

async function main() {
  const v = await prisma.vehicle.findFirst({
    where: { registrationNumberNormalized: { contains: "MH01" } }
  });
  console.log("Vehicle MH01:", v);
  
  const jcs = await prisma.jobCard.findMany({ take: 3 });
  console.log("First 3 JobCards:", jcs.map(j => j.id + " / " + j.jobcardNumber));
}
main().catch(console.error);
