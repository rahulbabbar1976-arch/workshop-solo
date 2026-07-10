import 'dotenv/config';
import { getPrismaForDb } from '../src/lib/db';
import bcrypt from 'bcryptjs';

const prisma = getPrismaForDb('dev.db');

async function main() {
  console.log('Seeding Database with Tenants and Super Admin...');

  // 1. Create BABBARSONS Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'BABBARSONS',
      status: 'ACTIVE',
    }
  });

  console.log(`Created Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Setup Super Admin Role (and other roles)
  const superAdminRole = await prisma.role.upsert({
    where: { roleKey: 'super_admin' },
    update: {},
    create: {
      roleKey: 'super_admin',
      roleName: 'Super Admin',
      description: 'System Administrator with full access across all tenants'
    }
  });
  
  const adminRole = await prisma.role.upsert({
    where: { roleKey: 'admin' },
    update: {},
    create: {
      roleKey: 'admin',
      roleName: 'Admin',
      description: 'Tenant Administrator'
    }
  });

  // 3. Create Super Admin User (rahulbabbar1976@gmail.com / Easy@1234)
  const superAdminPassword = await bcrypt.hash('Easy@1234', 10);
  const superAdminUser = await prisma.user.create({
    data: {
      fullName: 'Rahul Babbar (Super Admin)',
      email: 'rahulbabbar1976@gmail.com',
      passwordHash: superAdminPassword,
      isActive: true,
      roles: {
        create: {
          roleId: superAdminRole.id,
          isPrimary: true
        }
      }
    }
  });

  console.log(`Created Super Admin: ${superAdminUser.email}`);

  // 4. Create BABBARSONS Admin User (999998547 / 1111)
  const tenantAdminPin = await bcrypt.hash('1111', 10);
  const tenantUser = await prisma.user.create({
    data: {
      fullName: 'Babbarsons Admin',
      mobile: '999998547',
      quickPinHash: tenantAdminPin,
      tenantId: tenant.id,
      isActive: true,
      roles: {
        create: {
          roleId: adminRole.id,
          isPrimary: true
        }
      }
    }
  });

  console.log(`Created Tenant Admin: ${tenantUser.mobile}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
