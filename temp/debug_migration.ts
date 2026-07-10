/**
 * debug_migration.ts - diagnose CSV parsing and Prisma insert
 * Run: npx tsx temp/debug_migration.ts
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../src/generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const CSV_DIR = path.resolve('temp/derby_export');

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

async function main() {
  // --- Print first 3 rows of customers.csv with field indices ---
  console.log('\n=== CUSTOMER CSV (first 3 rows) ===');
  const cust = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'customers.csv'), 'utf8'));
  console.log('Total rows:', cust.length);
  for (let i = 0; i < Math.min(3, cust.length); i++) {
    const r = cust[i];
    console.log(`Row ${i}: ${r.length} fields, last=[${JSON.stringify(r[r.length-1])}]`);
    r.forEach((v, j) => { if (v.trim()) console.log(`  [${j}] = ${JSON.stringify(v)}`); });
  }

  // --- Print first 3 rows of vehicles.csv ---
  console.log('\n=== VEHICLE CSV (first 3 rows) ===');
  const veh = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'vehicles.csv'), 'utf8'));
  console.log('Total rows:', veh.length);
  for (let i = 0; i < Math.min(3, veh.length); i++) {
    const r = veh[i];
    console.log(`Row ${i}: ${r.length} fields, last=[${JSON.stringify(r[r.length-1])}]`);
    r.forEach((v, j) => { if (v.trim()) console.log(`  [${j}] = ${JSON.stringify(v)}`); });
  }

  // --- Test Prisma connection ---
  console.log('\n=== PRISMA INSERT TEST ===');
  try {
    const sqlite = new Database(path.resolve('prisma/dev.db'));
    const adapter = new PrismaBetterSqlite3(sqlite as any);
    const prisma = new PrismaClient({ adapter } as any);

    const testId = randomUUID();
    const result = await (prisma as any).customer.create({
      data: { id: testId, displayName: 'Debug Test', primaryMobile: '8000000001' }
    });
    console.log('✓ Prisma insert works! ID:', result.id);
    await (prisma as any).customer.delete({ where: { id: testId } });
    console.log('✓ Cleanup done');
    await prisma.$disconnect();
  } catch (e: any) {
    console.error('✗ Prisma error:', e.message);
    console.error(e.stack?.split('\n').slice(0, 5).join('\n'));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
