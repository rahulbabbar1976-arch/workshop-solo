import 'dotenv/config';
import Database from 'better-sqlite3';
import { prisma } from '../src/lib/db';

async function main() {
  const dbPath = 'C:/Users/rahul/OneDrive/Desktop/workshop/dev.db';
  console.log(`Connecting to old database at ${dbPath}...`);
  const db = new Database(dbPath, { readonly: true });

  const tablesToMigrate = ['Customer', 'Vehicle', 'PartsMaster', 'LabourMaster', 'JobCard', 'JobCardPart', 'JobCardLabour', 'ReminderEvent'];
  
  for (const tableName of tablesToMigrate) {
    let rows: any[] = [];
    try {
      rows = db.prepare(`SELECT * FROM ${tableName}`).all();
      console.log(`\nFound ${rows.length} records in ${tableName}`);
    } catch (e: any) {
      console.log(`\nTable ${tableName} not found or error: ${e.message}`);
      continue;
    }

    let importedCount = 0;
    for (const row of rows) {
      // Clean up tenantId
      delete row.tenantId;

      // Convert SQLite 1/0 to Booleans
      for (const key of Object.keys(row)) {
        if (
          key.startsWith('is') || 
          key.startsWith('has') || 
          key.endsWith('Flag') || 
          key.endsWith('Required') || 
          key === 'lockAfterClose' || 
          key === 'showCompanyName' // Add any specific boolean fields if needed
        ) {
          if (row[key] !== null && row[key] !== undefined) {
            row[key] = Boolean(row[key]);
          }
        }
        
        // Convert ISO strings to Date objects
        if (
          key.endsWith('At') || 
          key.endsWith('Date') || 
          key === 'dateIn' || 
          key === 'dueDate'
        ) {
          if (row[key]) {
            row[key] = new Date(row[key]);
          }
        }
      }

      // Customer specific fixes
      if (tableName === 'Customer' && row.gstNumber !== undefined) {
        row.taxId = row.gstNumber;
        delete row.gstNumber;
      }
      
      // Vehicle specific fixes
      if (tableName === 'Vehicle') {
        if (row.nextPucDate) {
          row.emissionInspectionExpiryDate = new Date(row.nextPucDate);
          delete row.nextPucDate;
        }
        if (row.pucNumber !== undefined) {
          row.emissionInspectionNumber = row.pucNumber;
          delete row.pucNumber;
        }
      }

      try {
        const delegate = (prisma as any)[tableName.charAt(0).toLowerCase() + tableName.slice(1)];
        await delegate.upsert({
          where: { id: row.id },
          update: {},
          create: row
        });
        importedCount++;
      } catch(e: any) {
        console.warn(`Could not import ${tableName} ${row.id}: ${e.message}`);
      }
    }
    console.log(`Successfully imported ${importedCount} records for ${tableName}`);
  }

  console.log(`\nMigration complete!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
