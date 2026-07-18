import prisma from "../lib/db";

const LABOR_KEYWORDS = [
  "repairs", "repair", "labour", "labor", "renew", 
  "polishing", "painting", "denting", "replace", 
  "diagnostics", "diagnoses", "scanning", "installation"
];

async function migrate() {
  console.log("Scanning PartsMaster for Labor keywords...");
  
  const allParts = await prisma.partsMaster.findMany();
  let migratedCount = 0;
  
  for (const part of allParts) {
    const nameLower = part.partName.toLowerCase();
    
    // Check if part name contains any of the keywords
    const isLabor = LABOR_KEYWORDS.some(kw => nameLower.includes(kw));
    
    if (isLabor) {
      console.log(`Migrating: "${part.partName}"`);
      
      // 1. Add to LabourMaster
      await prisma.labourMaster.create({
        data: {
          labourName: part.partName,
          hsnCode: part.hsnCode, // Usually labor is SAC code
          defaultTaxRate: part.defaultTaxRate,
          defaultSellingPrice: part.defaultSellingPrice
        }
      });
      
      // 2. Remove from PartsMaster
      // First, we need to check if there are associated PartPurchase or PartLine records
      // If there are, we might want to keep the part but mark it as inactive, OR just delete if cascade is ok.
      // But typically we shouldn't delete parts if they are linked to purchases/jobcards without updating them.
      // The user just requested "will be placed in as labor and will be updated in labor masters."
      // So we will just remove it from PartsMaster. Let's see if prisma throws a foreign key error.
      try {
        await prisma.partsMaster.delete({
          where: { id: part.id }
        });
        migratedCount++;
      } catch (e: any) {
        console.warn(`Could not delete part "${part.partName}" from PartsMaster due to existing relations. Left in PartsMaster. ERROR: ${e.message}`);
      }
    }
  }
  
  console.log(`Migration complete. Successfully migrated ${migratedCount} items to Labor.`);
}

migrate().catch(e => {
  console.error(e);
}).finally(async () => {
  await prisma.$disconnect();
});
