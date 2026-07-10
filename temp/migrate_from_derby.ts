/**
 * migrate_from_derby.ts
 * Imports old JobCard-2-Windows (Derby) data into the new workshop app.
 * Run from project root: npx tsx temp/migrate_from_derby.ts
 *
 * Column indices confirmed via debug_migration.ts:
 *  CUSTOMER:   [0]=ID  [8]=DATE  [11]=MOBILE  [17]=ALT_MOBILE  [21]=TRASH
 *  ADDRESS:    [0]=ID  [2]=CUST_ID  [3]=NAME  [5]=OLD_STREET  [6]=STREET
 *  VEHICLE:    [0]=ID  [1]=CUST_ID  [2]=REG  [3]=NOTES  [5]=DATE  [9]=YEAR
 *              [10]=COLOR  [18]=ODOMETER  [22]=MAKE  [23]=MODEL  [24]=VARIANT
 *              [25]=FUEL  [27]=TRASH
 *  WORKSHEET:  [0]=ID  [1]=THING_ID  [3]=CUST_ID  [4]=STATE
 *              [7]=DATE_IN  [8]=COMPLETION  [10]=CLOSING  [13]=NET  [14]=TAX
 *              [19]=NOTES  [20]=INT_NOTES  [31]=TRASH
 *  ITEM:       [0]=ID  [4]=CANCELLED  [7]=CONN_ID  [8]=CONN_KEY
 *              [10]=DATE  [11]=BASE_QTY  [12]=PRICE  [13]=TAX_RATE
 *              [22]=NAME  [24]=QTY  [27]=CODE  [28]=ITEM_NUM  [40]=WORK_TIME
 *  MASTER_ITEM:[0]=ID  [5]=NAME  [7]=QTY  [8]=QTY_MIN  [9]=UNIT  [10]=CODE
 *              [11]=ITEM_NUM  [13]=BARCODE  [15]=COST  [18]=SELL_PRICE
 */

import { PrismaClient } from '../src/generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ── Prisma (same pattern as seed.ts) ─────────────────────────────────────────
const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

const CSV_DIR = path.resolve('temp/derby_export');

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
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

const g  = (v?: string) => (v && v.trim()) ? v.trim() : null;
const gf = (v?: string) => { const n = parseFloat(v ?? ''); return isNaN(n) ? 0 : n; };
const gi = (v?: string) => { const n = parseInt(v  ?? ''); return isNaN(n) ? null : n; };
const gd = (v?: string) => {
  if (!v?.trim()) return null;
  try { const d = new Date(v.trim()); return isNaN(d.getTime()) ? null : d; } catch { return null; }
};

const now = new Date();

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Derby → Workshop Migration');
  console.log('═══════════════════════════════════════════════\n');

  const customers_raw   = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'customers.csv'),    'utf8'));
  const addresses_raw   = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'addresses.csv'),    'utf8'));
  const vehicles_raw    = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'vehicles.csv'),     'utf8'));
  const worksheets_raw  = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'worksheets.csv'),   'utf8'));
  const items_raw       = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'parts.csv'),        'utf8'));
  const masterItems_raw = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'master_items.csv'), 'utf8'));

  console.log(`Loaded: ${customers_raw.length} customers | ${vehicles_raw.length} vehicles`);
  console.log(`        ${worksheets_raw.length} worksheets | ${items_raw.length} items | ${masterItems_raw.length} catalog\n`);

  // ADDRESS: [2]=CUST_ID  [3]=NAME  [5]=OLD_STREET  [6]=STREET
  const addrMap = new Map<string, { name: string|null; street: string|null }>();
  for (const r of addresses_raw) {
    const cid = g(r[2]);
    if (cid && !addrMap.has(cid)) addrMap.set(cid, { name: g(r[3]), street: g(r[6]) || g(r[5]) });
  }

  // ── 1. CUSTOMERS ─────────────────────────────────────────────────────────────
  // [0]=ID [8]=DATE [11]=MOBILE [17]=ALT_MOBILE [21]=TRASH
  console.log('▶ Importing customers...');
  const customerIdMap = new Map<string, string>();
  let custOk = 0, custSkip = 0;
  let firstErr = '';

  for (const r of customers_raw) {
    const did = g(r[0]);
    if (!did) { custSkip++; continue; }
    if (g(r[21]) === '1') { custSkip++; continue; }  // SYSTEM_TRASH

    const addr   = addrMap.get(did);
    const name   = addr?.name || ('Customer ' + did);
    const mobile = g(r[11]) || g(r[17]) || ('IMPORT-' + did);
    const newId  = randomUUID();
    customerIdMap.set(did, newId);

    try {
      await prisma.customer.create({
        data: { id: newId, displayName: name, primaryMobile: mobile,
          alternateMobile: g(r[17]) !== mobile ? g(r[17]) : null,
          addressLine1: addr?.street ?? null,
          sourceSystem: 'derby_migration', sourceRecordId: did,
          createdAt: gd(r[8]) || now, updatedAt: now }
      });
      custOk++;
    } catch (e: any) {
      if (!firstErr) firstErr = 'Customer: ' + e.message;
      // retry with deduplicated mobile
      try {
        await prisma.customer.create({
          data: { id: newId, displayName: name, primaryMobile: mobile + '-' + did,
            addressLine1: addr?.street ?? null,
            sourceSystem: 'derby_migration', sourceRecordId: did,
            createdAt: gd(r[8]) || now, updatedAt: now }
        });
        custOk++;
      } catch { custSkip++; }
    }
  }
  if (firstErr) console.log(`  ⚠ First error: ${firstErr}`);
  console.log(`  ✓ ${custOk} imported  |  ${custSkip} skipped\n`);

  // ── 2. VEHICLES ───────────────────────────────────────────────────────────────
  // [0]=ID [1]=CUST_ID [2]=REG [3]=NOTES [5]=DATE [9]=YEAR [10]=COLOR
  // [18]=ODOMETER [22]=MAKE [23]=MODEL [24]=VARIANT [25]=FUEL [27]=TRASH
  console.log('▶ Importing vehicles...');
  const vehicleIdMap = new Map<string, string>();
  let vehOk = 0, vehSkip = 0;
  firstErr = '';

  for (const r of vehicles_raw) {
    const did = g(r[0]);
    if (!did) { vehSkip++; continue; }
    if (g(r[27]) === '1') { vehSkip++; continue; }

    const custDid   = g(r[1]);
    const custNewId = custDid ? customerIdMap.get(custDid) : null;
    if (!custNewId) { vehSkip++; continue; }

    const rawReg = g(r[2]) || ('UNKNOWN-' + did);
    let normReg  = rawReg.toUpperCase().replace(/[^A-Z0-9]/g, '') || ('NOPLATE' + did);
    const newId  = randomUUID();
    vehicleIdMap.set(did, newId);

    // handle duplicate normalized reg
    try {
      const ex = await prisma.vehicle.findUnique({ where: { registrationNumberNormalized: normReg } });
      if (ex) normReg = normReg + 'X' + did;
    } catch {}

    try {
      await prisma.vehicle.create({
        data: {
          id: newId,
          registrationNumberRaw: rawReg,
          registrationNumberNormalized: normReg,
          manufacturer: g(r[22]),
          model: g(r[23]),
          variant: g(r[24]),
          fuelType: g(r[25]),
          color: g(r[10]),
          manufactureYear: gi(r[9]),
          currentOdometer: gi(r[18]),
          notes: g(r[3]),
          currentCustomerId: custNewId,
          sourceSystem: 'derby_migration',
          sourceRecordId: did,
          createdAt: gd(r[5]) || now,
          updatedAt: now,
        }
      });
      vehOk++;
    } catch (e: any) {
      if (!firstErr) firstErr = 'Vehicle: ' + e.message;
      vehSkip++;
    }
  }
  if (firstErr) console.log(`  ⚠ First error: ${firstErr}`);
  console.log(`  ✓ ${vehOk} imported  |  ${vehSkip} skipped\n`);

  // ── 3. PARTS CATALOG ─────────────────────────────────────────────────────────
  // [0]=ID [5]=NAME [7]=QTY [8]=QTY_MIN [9]=UNIT [10]=CODE [11]=ITEM_NUM
  // [13]=BARCODE [15]=COST [18]=SELL_PRICE
  console.log('▶ Importing parts catalog...');
  const masterIdMap = new Map<string, string>();
  let catOk = 0, catSkip = 0;
  firstErr = '';

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
    } catch (e: any) {
      if (!firstErr) firstErr = 'Part: ' + e.message;
      catSkip++;
    }
  }
  if (firstErr) console.log(`  ⚠ First error: ${firstErr}`);
  console.log(`  ✓ ${catOk} imported  |  ${catSkip} skipped\n`);

  // ── 4. JOB CARDS ─────────────────────────────────────────────────────────────
  // [0]=ID [1]=THING_ID [3]=CUST_ID [4]=STATE [7]=DATE_IN [8]=COMPLETION
  // [10]=CLOSING [13]=NET [14]=TAX [19]=NOTES [20]=INT_NOTES [31]=TRASH
  console.log('▶ Importing job cards...');
  const worksheetIdMap = new Map<string, string>();
  let jcOk = 0, jcSkip = 0, jcSeq = 1;
  firstErr = '';

  for (const r of worksheets_raw) {
    const did = g(r[0]);
    if (!did) { jcSkip++; jcSeq++; continue; }
    if (g(r[31]) === '1') { jcSkip++; jcSeq++; continue; }

    const vehicleId  = g(r[1]) ? vehicleIdMap.get(g(r[1])!)  : null;
    const customerId = g(r[3]) ? customerIdMap.get(g(r[3])!) : null;
    if (!vehicleId || !customerId) { jcSkip++; jcSeq++; continue; }

    const dateIn   = gd(r[7]) || now;
    const closedAt = gd(r[10]) || gd(r[8]);
    const netSum   = gf(r[13]);
    const taxSum   = gf(r[14]);
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
          externalNotes: g(r[19]),
          internalNotes: g(r[20]),
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
    } catch (e: any) {
      if (!firstErr) firstErr = 'JobCard: ' + e.message;
      jcSkip++;
    }
  }
  if (firstErr) console.log(`  ⚠ First error: ${firstErr}`);
  console.log(`  ✓ ${jcOk} imported  |  ${jcSkip} skipped\n`);

  // ── 5. LINE ITEMS ─────────────────────────────────────────────────────────────
  // [0]=ID [4]=CANCELLED [7]=CONN_ID [8]=CONN_KEY [10]=DATE [11]=BASE_QTY
  // [12]=PRICE [13]=TAX [22]=NAME [24]=QTY [27]=CODE [28]=ITEM_NUM [40]=WORK_TIME
  console.log('▶ Importing line items...');
  let partsOk = 0, labourOk = 0, itemSkip = 0;
  firstErr = '';

  for (const r of items_raw) {
    if (g(r[8]) !== 'WORKSHEET') { itemSkip++; continue; }
    if (g(r[4]) === '1')         { itemSkip++; continue; }

    const jobcardId = g(r[7]) ? worksheetIdMap.get(g(r[7])!) : null;
    const name      = g(r[22]);
    if (!jobcardId || !name)     { itemSkip++; continue; }

    const qty         = Math.max(gf(r[24]) || gf(r[11]) || 1, 0.001);
    const price       = gf(r[12]);
    const tax         = gf(r[13]) || 18;
    const workingTime = gf(r[40]);
    const txDate      = gd(r[10]) || now;

    try {
      if (workingTime > 0) {
        await prisma.jobCardLabour.create({
          data: { id: randomUUID(), jobcardId, labourName: name, status: 'completed',
            sellingPrice: price, taxRate: tax, quantity: qty,
            createdAt: txDate, updatedAt: now }
        });
        labourOk++;
      } else {
        await prisma.jobCardPart.create({
          data: { id: randomUUID(), jobcardId, partName: name,
            itemCode: g(r[27]), partNumber: g(r[28]),
            quantityRequested: qty, quantityUsed: qty,
            status: 'used', sellingPrice: price, taxRate: tax,
            createdAt: txDate, updatedAt: now }
        });
        partsOk++;
      }
    } catch (e: any) {
      if (!firstErr) firstErr = 'Item: ' + e.message;
      itemSkip++;
    }
  }
  if (firstErr) console.log(`  ⚠ First error: ${firstErr}`);
  console.log(`  ✓ ${partsOk} parts  |  ${labourOk} labour  |  ${itemSkip} skipped\n`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('  Migration Complete!');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Customers    : ${custOk}`);
  console.log(`  Vehicles     : ${vehOk}`);
  console.log(`  Job Cards    : ${jcOk}`);
  console.log(`  Parts lines  : ${partsOk}`);
  console.log(`  Labour lines : ${labourOk}`);
  console.log(`  Parts catalog: ${catOk}`);
  console.log('═══════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(e => { console.error('Fatal:', e.message, '\n', e.stack?.split('\n').slice(0,5).join('\n')); process.exit(1); });
