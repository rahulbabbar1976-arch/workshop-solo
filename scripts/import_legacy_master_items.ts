import 'dotenv/config';
import { getPrismaForDb } from '../src/lib/db';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const prisma = getPrismaForDb('dev.db');
const EXPORT_DIR = 'C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program';

async function parseCSV(fileName: string): Promise<any[]> {
  const filePath = path.join(EXPORT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve) => {
    Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
    });
  });
}

async function main() {
  console.log('Starting Master Items Migration...');

  // Get tenant associated with rahulbabbar@msn.com
  const user = await prisma.user.findFirst({ where: { email: 'rahulbabbar@msn.com' } });
  if (!user || !user.tenantId) throw new Error('User rahulbabbar@msn.com not found or has no tenant assigned.');

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) throw new Error('Tenant not found.');

  console.log(`Importing data into Tenant: ${tenant.name} (${tenant.id})`);

  console.log('Reading Master Items...');
  const masterItemsRaw = await parseCSV('master_item.csv');
  
  let partsCount = 0;
  let labourCount = 0;

  const laborKeywords = ['labor', 'labour', 'service', 'repair', 'fitting', 'installation', 'checking', 'charges', 'wiring', 'removal'];

  for (const row of masterItemsRaw) {
    if (!row || row.length < 5) continue;

    const legacyId = row[0];
    const name = row[5] || row[4] || ''; // Sometimes it shifts due to empty commas
    if (!name) continue;

    const stockStr = row[7] || row[6] || '0';
    const stockQuantity = Math.abs(parseFloat(stockStr)) || 0; // Legacy used negatives for stock consumption

    const price1 = parseFloat(row[15] || row[14]) || 0;
    const price2 = parseFloat(row[18] || row[17]) || 0;
    const defaultSellingPrice = Math.max(price1, price2);

    const nameLower = name.toLowerCase();
    
    let isLabor = false;
    for (const word of laborKeywords) {
        if (nameLower.includes(word)) {
            isLabor = true;
            break;
        }
    }

    if (isLabor) {
      const existing = await prisma.labourMaster.findFirst({
        where: { tenantId: tenant.id, sourceRecordId: `legacy-${legacyId}` }
      });
      if (existing) {
        await prisma.labourMaster.update({
          where: { id: existing.id },
          data: {
            labourName: name,
            labourCode: `LEGACY-${legacyId}`,
            defaultSellingPrice: defaultSellingPrice
          }
        });
      } else {
        await prisma.labourMaster.create({
          data: {
            tenantId: tenant.id,
            labourName: name,
            labourCode: `LEGACY-${legacyId}`,
            sourceSystem: 'jobcard2',
            sourceRecordId: `legacy-${legacyId}`,
            defaultSellingPrice: defaultSellingPrice
          }
        });
      }
      labourCount++;
    } else {
      const existing = await prisma.partsMaster.findFirst({
        where: { tenantId: tenant.id, sourceRecordId: `legacy-${legacyId}` }
      });
      if (existing) {
        await prisma.partsMaster.update({
          where: { id: existing.id },
          data: {
            partName: name,
            partNumber: `LEGACY-${legacyId}`,
            stockQuantity: stockQuantity,
            defaultSellingPrice: defaultSellingPrice
          }
        });
      } else {
        await prisma.partsMaster.create({
          data: {
            tenantId: tenant.id,
            partName: name,
            partNumber: `LEGACY-${legacyId}`,
            sourceSystem: 'jobcard2',
            sourceRecordId: `legacy-${legacyId}`,
            stockQuantity: stockQuantity,
            defaultSellingPrice: defaultSellingPrice
          }
        });
      }
      partsCount++;
    }
  }

  console.log(`Migration Complete!`);
  console.log(`Imported ${partsCount} Parts and ${labourCount} Labor tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
