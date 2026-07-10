const { PrismaClient } = require('../src/generated/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, 'dev.db');
const sqlite = new Database(dbPath);
const adapter = new PrismaBetterSqlite3(sqlite);
const prisma = new PrismaClient({ adapter });

function hash(p) { return crypto.createHash('sha256').update(String(p)).digest('hex'); }

async function run() {
  // Remove demo users
  const del = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: 'admin@workshop.local' },
        { email: 'ramesh@workshop.local' },
        { mobile: '9999999999' },
        { mobile: '8888888888' }
      ]
    }
  });
  console.log('Removed demo users:', del.count);

  // Ensure super_admin role exists
  const role = await prisma.role.upsert({
    where: { roleKey: 'super_admin' },
    update: {},
    create: { roleKey: 'super_admin', roleName: 'Super Admin', description: 'System owner access' }
  });
  console.log('Role ready: super_admin');

  // Create or update admin account
  const existing = await prisma.user.findFirst({ where: { email: 'rahulbabbar@babbarsons.com' } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { quickPinHash: hash('1002'), isActive: true, fullName: 'Rahul Babbar' }
    });
    console.log('Updated existing admin PIN');
  } else {
    const u = await prisma.user.create({
      data: {
        fullName: 'Rahul Babbar',
        email: 'rahulbabbar@babbarsons.com',
        quickPinHash: hash('1002'),
        isActive: true,
        roles: { create: [{ roleId: role.id, isPrimary: true }] }
      }
    });
    console.log('Created admin:', u.email);
  }

  console.log('\n=== Admin account ready ===');
  console.log('Email: rahulbabbar@babbarsons.com');
  console.log('PIN  : 1002');
}

run()
  .catch(function(e) { console.error('ERROR:', e.message); process.exit(1); })
  .finally(function() { sqlite.close(); });
