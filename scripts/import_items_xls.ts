import 'dotenv/config';
import * as xlsx from 'xlsx';
import { prisma } from '../src/lib/db';

async function main() {
  console.log("Reading Items.xls...");
  const filePath = 'C:/Users/rahul/OneDrive/Desktop/Items.xls';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { range: 2 });
  
  // Deduplicate by Name to avoid inserting the same part multiple times
  // because the excel might have multiple transactions for the same item.
  const uniqueItems = new Map();
  data.forEach((row: any) => {
    if (row.Name && row.Type === 'Product') {
      if (!uniqueItems.has(row.Name)) {
        let taxRate = 0;
        if (typeof row['Tax r.'] === 'string') {
          taxRate = parseFloat(row['Tax r.'].replace('%', ''));
        } else if (typeof row['Tax r.'] === 'number') {
          taxRate = row['Tax r.'];
        }

        uniqueItems.set(row.Name, {
          partName: row.Name,
          partNumber: row['Part number'] ? String(row['Part number']) : null,
          oemPartNumber: row['Factory num.'] ? String(row['Factory num.']) : null,
          barcode: row['Barcode'] ? String(row['Barcode']) : null,
          unit: row.Unit || 'pcs',
          defaultSellingPrice: Number(row['Gross price']) || 0,
          defaultTaxRate: taxRate,
          stockQuantity: 0,
          sourceSystem: 'jobcard2_xls',
        });
      }
    }
  });

  const partsToInsert = Array.from(uniqueItems.values());
  console.log(`Found ${partsToInsert.length} unique parts to insert.`);

  // Get existing parts
  const existingParts = await prisma.partsMaster.findMany({
    select: { partName: true }
  });
  const existingNames = new Set(existingParts.map(p => p.partName));

  const newParts = partsToInsert.filter(p => !existingNames.has(p.partName));
  console.log(`Inserting ${newParts.length} new parts...`);

  // Batch insert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < newParts.length; i += chunkSize) {
    const chunk = newParts.slice(i, i + chunkSize);
    await prisma.partsMaster.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Inserted chunk ${i / chunkSize + 1}`);
  }

  console.log("Import complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
