const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const sourceDbPath = path.join(rootDir, 'dev.db');
  const targetDbPath = path.join(rootDir, 'template.db');

  console.log('Generating template.db from dev.db...');

  // 1. Copy dev.db to template.db
  if (!fs.existsSync(sourceDbPath)) {
    console.error(`Error: Source database dev.db not found at ${sourceDbPath}`);
    process.exit(1);
  }
  
  fs.copyFileSync(sourceDbPath, targetDbPath);
  console.log(`Copied database file to ${targetDbPath}`);

  // 2. Clear tables using better-sqlite3
  const db = new Database(targetDbPath);

  const tablesToClear = [
    'UserRole',
    'User',
    'Customer',
    'Vehicle',
    'VehicleOwnershipHistory',
    'JobCardMechanic',
    'JobCardComplaintIcon',
    'JobCardComplaint',
    'JobCardLabour',
    'JobCardPart',
    'JobCardMedia',
    'JobCardSnapshot',
    'JobCard',
    'DiagnosticsReport',
    'ReminderEvent',
    'AuditLog',
    'PurchaseOrderLine',
    'PurchaseOrder',
    'SupplierTransaction',
    'Supplier',
    'PartReturn',
    'PreBooking',
    'TaxSettings',
    'NumberingSettings',
    'PrintSettings',
    'WorkflowSettings',
    'WorkshopProfile'
  ];

  try {
    db.pragma('foreign_keys = OFF');
    
    for (const table of tablesToClear) {
      db.prepare(`DELETE FROM ${table}`).run();
      console.log(`Cleared table: ${table}`);
    }

    // Clean up database file size
    db.prepare('VACUUM').run();
    console.log('Database vacuumed successfully.');

  } catch (error) {
    console.error('Error clearing database tables:', error);
    process.exit(1);
  } finally {
    db.pragma('foreign_keys = ON');
    db.close();
  }

  console.log('Clean template.db generated successfully!');
}

main();
