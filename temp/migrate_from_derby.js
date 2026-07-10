/**
 * migrate_from_derby.js
 * Imports data from the old JobCard-2-Windows (Derby) CSV exports into the new workshop SQLite DB.
 * Run: node temp/migrate_from_derby.js
 */

const { PrismaClient } = require('../src/generated/client');
const { PrismaBetterSqlite3 } = require('../node_modules/@prisma/adapter-better-sqlite3');
const Database = require('../node_modules/better-sqlite3');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

// ── Prisma setup ──────────────────────────────────────────────────────────────
const dbPath = path.resolve(__dirname, '../prisma/dev.db');
const sqlite = new Database(dbPath);
const adapter = new PrismaBetterSqlite3(sqlite);
const prisma = new PrismaClient({ adapter });

const CSV_DIR = path.resolve(__dirname, 'derby_export');

// ── CSV Parser (handles quoted fields with embedded newlines / commas) ─────────
function parseCSV(content) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i], nx = content[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n') {
        cur.push(field); field = '';
        if (cur.some(f => f.trim())) rows.push(cur);
        cur = [];
      } else if (ch !== '\r') { field += ch; }
    }
  }
  if (cur.length) { cur.push(field); if (cur.some(f => f.trim())) rows.push(cur); }
  return rows;
}

const g  = v => (v && v.trim()) ? v.trim() : null;
const gf = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const gi = v => { const n = parseInt(v);   return isNaN(n) ? null : n; };
const gd = v => {
  if (!v || !v.trim()) return null;
  try { const d = new Date(v.trim()); return isNaN(d.getTime()) ? null : d; } catch { return null; }
};

const now = new Date();

// ── Status map: old Derby state codes → new system statuses ──────────────────
const WS_STATUS = {
  '1': 'legacy_imported_read_only',
  '2': 'legacy_imported_read_only',
  '3': 'legacy_imported_read_only',
  '4': 'legacy_imported_read_only',
  '5': 'legacy_imported_read_only',
};

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Derby → Workshop Migration');
  console.log('═══════════════════════════════════════════════\n');

  // Load CSVs
  const customers_raw   = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'customers.csv'),   'utf8'));
  const addresses_raw   = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'addresses.csv'),   'utf8'));
  const vehicles_raw    = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'vehicles.csv'),    'utf8'));
  const worksheets_raw  = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'worksheets.csv'),  'utf8'));
  const items_raw       = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'parts.csv'),       'utf8'));
  const masterItems_raw = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'master_items.csv'),'utf8'));

  console.log(`Loaded:  ${customers_raw.length} customers  |  ${vehicles_raw.length} vehicles`);
  console.log(`         ${worksheets_raw.length} worksheets  |  ${items_raw.length} items  |  ${masterItems_raw.length} catalog parts\n`);

  // Build name map from ADDRESS table:  derbyCustomerId → { name, street }
  // ADDRESS cols: 0=ID, 2=CUSTOMER_ID, 3=NAME, 5=OLD_STREET, 6=STREET_ADDRESS
  const addrMap = new Map();
  for (const r of addresses_raw) {
    const cid = g(r[2]);
    if (cid && !addrMap.has(cid)) {
      addrMap.set(cid, { name: g(r[3]), street: g(r[6]) || g(r[5]) });
    }
  }

  // ── 1. CUSTOMERS ────────────────────────────────────────────────────────────
  // CUSTOMER cols: 0=ID, 11=MOBILE, 8=CREATION_TIME, last=SYSTEM_TRASH
  console.log('▶ Importing customers...');
  const customerIdMap = new Map(); // derbyId → newUUID
  let custOk = 0, custSkip = 0;

  for (const r of customers_raw) {
    const did = g(r[0]);
    if (!did) { custSkip++; continue; }
    if (g(r[r.length - 1]) === '1') { custSkip++; continue; } // trashed

    const addr    = addrMap.get(did);
    const name    = addr?.name || ('Customer ' + did);
    const mobile  = g(r[11]) || g(r[12]) || ('IMPORT-' + did);
    const street  = addr?.street || null;

    const newId = randomUUID();
    customerIdMap.set(did, newId);

    try {
      await prisma.customer.create({
        data: {
          id: newId,
          displayName: name,
          primaryMobile: mobile,
          addressLine1: street,
          sourceSystem: 'derby_migration',
          sourceRecordId: did,
          createdAt: gd(r[8]) || now,
          updatedAt: now,
        }
      });
      custOk++;
    } catch (e) {
      // duplicate mobile: suffix with derby ID
      try {
        await prisma.customer.create({
          data: {
            id: newId,
            displayName: name,
            primaryMobile: mobile + '-' + did,
            addressLine1: street,
            sourceSystem: 'derby_migration',
            sourceRecordId: did,
            createdAt: gd(r[8]) || now,
            updatedAt: now,
          }
        });
        custOk++;
      } catch (e2) {
        custSkip++;
      }
    }
  }
  console.log(`  ✓ ${custOk} imported  |  ${custSkip} skipped\n`);

  // ── 2. VEHICLES ─────────────────────────────────────────────────────────────
  // THING cols (from sample analysis):
  // 0=THING_ID, 1=CUSTOMER_ID, 2=REGISTRATION, 3=NOTES, 6=CREATION_TIME,
  // 10=YEAR, 24=MAKE, 25=MODEL, 26=VARIANT, 27=FUEL_TYPE, last=SYSTEM_TRASH
  console.log('▶ Importing vehicles...');
  const vehicleIdMap = new Map(); // derbyId → newUUID
  let vehOk = 0, vehSkip = 0;

  for (const r of vehicles_raw) {
    const did = g(r[0]);
    if (!did) { vehSkip++; continue; }
    if (g(r[r.length - 1]) === '1') { vehSkip++; continue; }

    const custDid    = g(r[1]);
    const custNewId  = custDid ? customerIdMap.get(custDid) : null;

    const rawReg     = g(r[2]) || ('UNKNOWN-' + did);
    const normReg    = rawReg.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const make       = g(r[24]);
    const model      = g(r[25]);
    const variant    = g(r[26]);
    const fuel       = g(r[27]);
    const year       = gi(r[10]);
    const notes      = g(r[3]);
    const newId      = randomUUID();

    // Skip if no customer link (vehicle requires currentCustomerId)
    if (!custNewId) { vehSkip++; continue; }

    vehicleIdMap.set(did, newId);

    // Ensure unique normalized reg
    let finalNormReg = normReg || ('NOPLATE' + did);
    try {
      const existing = await prisma.vehicle.findUnique({ where: { registrationNumberNormalized: finalNormReg } });
      if (existing) finalNormReg = finalNormReg + '_' + did;
    } catch {}

    try {
      await prisma.vehicle.create({
        data: {
          id: newId,
          registrationNumberRaw: rawReg,
          registrationNumberNormalized: finalNormReg,
          manufacturer: make,
          model,
          variant,
          fuelType: fuel,
          manufactureYear: year,
          notes,
          currentCustomerId: custNewId,
          sourceSystem: 'derby_migration',
          sourceRecordId: did,
          createdAt: gd(r[6]) || now,
          updatedAt: now,
        }
      });
      vehOk++;
    } catch (e) {
      vehSkip++;
    }
  }
  console.log(`  ✓ ${vehOk} imported  |  ${vehSkip} skipped\n`);

  // ── 3. PARTS MASTER CATALOG ─────────────────────────────────────────────────
  // MASTER_ITEM cols: 0=ID, 5=NAME, 7=QTY, 9=UNIT, 10=CODE, 11=ITEM_NUMBER,
  //                   13=BARCODE, 15=COST_PRICE, 18=SELLING_PRICE
  console.log('▶ Importing parts catalog...');
  const masterIdMap = new Map(); // derbyId → newUUID
  let catOk = 0, catSkip = 0;

  for (const r of masterItems_raw) {
    const did  = g(r[0]);
    const name = g(r[5]);
    if (!did || !name) { catSkip++; continue; }

    const newId = randomUUID();
    masterIdMap.set(did, newId);

    try {
      await prisma.partsMaster.create({
        data: {
          id: newId,
          partName: name,
          itemCode: g(r[10]),
          partNumber: g(r[11]),
          barcode: g(r[13]),
          unit: g(r[9]) || 'pcs',
          defaultSellingPrice: gf(r[18]),
          stockQuantity: Math.max(0, gf(r[7])),
          safetyStock: Math.max(0, gf(r[8])),
          sourceSystem: 'derby_migration',
          sourceRecordId: did,
          createdAt: now,
          updatedAt: now,
        }
      });
      catOk++;
    } catch (e) {
      catSkip++;
    }
  }
  console.log(`  ✓ ${catOk} imported  |  ${catSkip} skipped\n`);

  // ── 4. JOB CARDS (WORKSHEETS) ────────────────────────────────────────────────
  // WORKSHEET cols: 0=ID, 1=THING_ID, 3=CUST_ID, 4=STATE, 7=CREATION_TIME,
  //                 8=COMPLETION_TIME, 10=CLOSING_TIME, 13=NET_SUM, 14=TAX_SUM,
  //                 19=NOTES, 20=INTERNAL_NOTES, last=SYSTEM_TRASH
  console.log('▶ Importing job cards...');
  const worksheetIdMap = new Map(); // derbyId → newUUID
  let jcOk = 0, jcSkip = 0, jcSeq = 1;

  for (const r of worksheets_raw) {
    const did = g(r[0]);
    if (!did) { jcSkip++; continue; }
    if (g(r[r.length - 1]) === '1') { jcSkip++; continue; }

    const thingDid = g(r[1]);
    const custDid  = g(r[3]);
    const vehicleId  = thingDid ? vehicleIdMap.get(thingDid)  : null;
    const customerId = custDid  ? customerIdMap.get(custDid)  : null;

    if (!vehicleId || !customerId) { jcSkip++; jcSeq++; continue; }

    const dateIn   = gd(r[7]) || now;
    const closedAt = gd(r[10]) || gd(r[8]);
    const netSum   = gf(r[13]);
    const taxSum   = gf(r[14]);
    const notes    = g(r[19]);
    const intNotes = g(r[20]);
    const newId    = randomUUID();
    const jcNumber = 'IMP-' + String(jcSeq).padStart(5, '0');

    worksheetIdMap.set(did, newId);
    jcSeq++;

    try {
      await prisma.jobCard.create({
        data: {
          id: newId,
          jobcardNumber: jcNumber,
          customerId,
          vehicleId,
          status: 'legacy_imported_read_only',
          dateIn,
          closedAt,
          externalNotes: notes,
          internalNotes: intNotes,
          subtotalAmount: netSum,
          taxAmount: taxSum,
          totalAmount: netSum + taxSum,
          legacyImportFlag: true,
          readOnlyFlag: true,
          sourceSystem: 'derby_migration',
          sourceRecordId: did,
          createdAt: dateIn,
          updatedAt: now,
        }
      });
      jcOk++;
    } catch (e) {
      jcSkip++;
    }
  }
  console.log(`  ✓ ${jcOk} imported  |  ${jcSkip} skipped\n`);

  // ── 5. LINE ITEMS (PARTS + LABOUR) ──────────────────────────────────────────
  // ITEM cols: 0=ID, 4=CANCELLED, 7=CONNECTION_ID, 8=CONNECTION_KEY,
  //            10=TRANSACTION_TIME, 11=BASE_QTY, 12=PRICE, 13=TAX_RATE,
  //            22=NAME, 24=QTY, 26=UNIT, 27=CODE, 28=ITEM_NUMBER, 40=WORKING_TIME
  console.log('▶ Importing line items (parts & labour)...');
  let partsOk = 0, labourOk = 0, itemSkip = 0;

  for (const r of items_raw) {
    const did     = g(r[0]);
    const connKey = g(r[8]);
    if (!did || connKey !== 'WORKSHEET') { itemSkip++; continue; }
    if (g(r[4]) === '1') { itemSkip++; continue; } // cancelled

    const connId    = g(r[7]);
    const jobcardId = connId ? worksheetIdMap.get(connId) : null;
    if (!jobcardId) { itemSkip++; continue; }

    const name        = g(r[22]);
    if (!name) { itemSkip++; continue; }

    const qty         = Math.max(gf(r[24]) || gf(r[11]) || 1, 0.001);
    const price       = gf(r[12]);
    const tax         = gf(r[13]) || 18;
    const workingTime = gf(r[40]);
    const isLabour    = workingTime > 0;
    const txDate      = gd(r[10]) || now;

    try {
      if (isLabour) {
        await prisma.jobCardLabour.create({
          data: {
            id: randomUUID(),
            jobcardId,
            labourName: name,
            status: 'completed',
            sellingPrice: price,
            taxRate: tax,
            quantity: qty,
            createdAt: txDate,
            updatedAt: now,
          }
        });
        labourOk++;
      } else {
        await prisma.jobCardPart.create({
          data: {
            id: randomUUID(),
            jobcardId,
            partName: name,
            itemCode: g(r[27]),
            partNumber: g(r[28]),
            quantityRequested: qty,
            quantityUsed: qty,
            status: 'used',
            sellingPrice: price,
            taxRate: tax,
            createdAt: txDate,
            updatedAt: now,
          }
        });
        partsOk++;
      }
    } catch (e) {
      itemSkip++;
    }
  }
  console.log(`  ✓ ${partsOk} parts lines  |  ${labourOk} labour lines  |  ${itemSkip} skipped\n`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('  Migration Complete!');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Customers  : ${custOk}`);
  console.log(`  Vehicles   : ${vehOk}`);
  console.log(`  Job Cards  : ${jcOk}`);
  console.log(`  Parts lines: ${partsOk}`);
  console.log(`  Labour lines: ${labourOk}`);
  console.log(`  Parts catalog: ${catOk}`);
  console.log('═══════════════════════════════════════════════\n');
  console.log('All imported job cards are marked READ-ONLY (legacy_imported_read_only)');
  console.log('They are visible in history but cannot be edited.\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Migration failed:', e.message);
  console.error(e.stack);
  process.exit(1);
});
