const { PrismaClient } = require('../src/generated/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, 'dev.db');
const sqlite = new Database(dbPath);
const adapter = new PrismaBetterSqlite3(sqlite);
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // 1. Create Roles
  const rolesData = [
    { roleKey: 'admin', roleName: 'Administrator', description: 'Full system control' },
    { roleKey: 'manager', roleName: 'Manager', description: 'Pricing, approvals, and operational control' },
    { roleKey: 'advisor', roleName: 'Service Advisor', description: 'Intake and customer coordination' },
    { roleKey: 'mechanic', roleName: 'Mechanic', description: 'Task execution and parts requests' },
    { roleKey: 'parts_manager', roleName: 'Parts Manager', description: 'Inventory and stock dispatch' },
    { roleKey: 'accounts', roleName: 'Accounts / Billing', description: 'Zoho books synchronization' }
  ];

  const seededRoles = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { roleKey: r.roleKey },
      update: {},
      create: r
    });
    seededRoles[r.roleKey] = role;
    console.log(`Role seeded: ${r.roleKey}`);
  }

  // 2. Create Default Admin User
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Workshop Admin',
      mobile: '9999999999',
      email: 'admin@workshop.local',
      passwordHash: hashPassword('admin123'),
      quickPinHash: hashPassword('1234'),
      isActive: true,
      roles: {
        create: {
          roleId: seededRoles['admin'].id,
          isPrimary: true
        }
      }
    }
  });
  console.log(`Admin user seeded: ${adminUser.fullName}`);

  // Create Default Mechanic User for Testing
  const mechanicUser = await prisma.user.create({
    data: {
      fullName: 'Ramesh Singh',
      mobile: '8888888888',
      email: 'ramesh@workshop.local',
      passwordHash: hashPassword('mechanic123'),
      quickPinHash: hashPassword('4321'),
      skillCategory: 'mechanical',
      isActive: true,
      roles: {
        create: {
          roleId: seededRoles['mechanic'].id,
          isPrimary: true
        }
      }
    }
  });
  console.log(`Mechanic user seeded: ${mechanicUser.fullName}`);

  // 3. Create Default Workshop Profile
  const profile = await prisma.workshopProfile.create({
    data: {
      workshopName: 'Autosports Multibrand Repair',
      brandName: 'Autosports',
      addressLine1: 'B-108, Phase-I',
      addressLine2: 'Okhla Industrial Area',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110020',
      country: 'IN',
      mobile: '+91-9876543210',
      email: 'info@autosports.co.in',
      gstin: '07AAAAA1111A1Z1',
      workshopTimings: '09:00 AM - 07:00 PM',
      invoiceFooterText: 'Thank you for choosing Autosports! Drive safe.',
      termsConditionsText: '1. All repairs carry a 30-day warranty. 2. Vehicle left at owner\'s risk.'
    }
  });
  console.log(`Workshop profile seeded: ${profile.workshopName}`);

  // 4. Create Settings
  await prisma.taxSettings.create({
    data: {
      workshopProfileId: profile.id,
      defaultTaxMode: 'exclusive',
      intrastateCgstRate: 9.00,
      intrastateSgstRate: 9.00,
      interstateIgstRate: 18.00,
      defaultDiscountMode: 'line_item'
    }
  });

  await prisma.numberingSettings.create({
    data: {
      workshopProfileId: profile.id,
      estimateNumberFormat: 'EST-{YYYY}-{####}',
      jobcardNumberFormat: 'JC-{YYYY}-{####}',
      partsOrderNumberFormat: 'PO-{YYYY}-{####}'
    }
  });

  await prisma.printSettings.create({
    data: {
      workshopProfileId: profile.id,
      showTaxByDefault: true,
      showDiscountByDefault: true,
      includeSignature: true,
      includeIntakePhotos: true,
      showPartsLabourSeparately: true
    }
  });
  console.log('Settings seeded.');

  // 5. Seed Complaint Icons
  const icons = [
    { iconKey: 'service', displayName: 'Periodic Service', category: 'General', sortOrder: 1 },
    { iconKey: 'ac', displayName: 'AC Repair / Service', category: 'Climate', sortOrder: 2 },
    { iconKey: 'body', displayName: 'Body Repair / Denting', category: 'Denting', sortOrder: 3 },
    { iconKey: 'accessories', displayName: 'Accessories / Electricals', category: 'Electrical', sortOrder: 4 },
    { iconKey: 'brakes', displayName: 'Brakes & Suspension', category: 'Mechanical', sortOrder: 5 },
    { iconKey: 'engine', displayName: 'Engine Diagnostics', category: 'Diagnostics', sortOrder: 6 },
    { iconKey: 'tires', displayName: 'Wheel Alignment / Tires', category: 'Mechanical', sortOrder: 7 },
    { iconKey: 'detailing', displayName: 'Washing & Detailing', category: 'General', sortOrder: 8 }
  ];

  for (const i of icons) {
    await prisma.complaintIconMaster.create({
      data: i
    });
  }
  console.log('Complaint icons seeded.');

  // 6. Seed Feature Flags
  const flags = [
    { featureKey: 'plate_scan', featureName: 'ANPR plate scan' },
    { featureKey: 'intake_360_photos', featureName: 'Intake 360 photos' },
    { featureKey: 'intake_video', featureName: 'Intake Video recording' },
    { featureKey: 'customer_signature', featureName: 'Customer signature on glass' },
    { featureKey: 'whatsapp_share', featureName: 'WhatsApp share integration' },
    { featureKey: 'offline_sync', featureName: 'Offline sync logic' }
  ];

  for (const f of flags) {
    await prisma.featureFlags.create({
      data: f
    });
  }
  console.log('Feature flags seeded.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
