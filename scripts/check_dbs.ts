import Database from 'better-sqlite3';

function checkDb(path: string) {
  try {
    const db = new Database(path, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`\n=== Tables in ${path} ===`);
    console.log(tables.map((t: any) => t.name).join(', '));
    
    // Check specific tables
    const checkTable = (name: string) => {
      try {
        const count = db.prepare(`SELECT count(*) as count FROM ${name}`).get();
        console.log(`Table ${name} has ${(count as any).count} rows`);
      } catch (e) {}
    }
    checkTable('Partners');
    checkTable('Auto');
    checkTable('Services');
    checkTable('JobCards');
    checkTable('Products');
    checkTable('Customer');
  } catch (e: any) {
    console.error(`Failed to open ${path}:`, e.message);
  }
}

checkDb('C:/Users/rahul/OneDrive/Desktop/today.wdg');
checkDb('C:/Users/rahul/OneDrive/Desktop/workshop/dev.db');
checkDb('C:/Users/rahul/OneDrive/Desktop/workshop/dev_tenant_ab4506dc-03f7-41c8-83ab-1eb525f7d002.db');
