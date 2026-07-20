import { prisma } from '../src/lib/db';

async function main() {
  const email = 'rahulbabbar@msn.com';
  console.log(`Setting up super_admin access for ${email}`);

  // Get or create tenant
  let tenant = await prisma.tenant.findFirst({
    where: { name: 'babbarsons' }
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'babbarsons', status: 'ACTIVE' }
    });
    console.log('Created tenant babbarsons');
  }

  // Get or create user
  let user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        fullName: 'Rahul Babbar',
        isActive: true,
        tenantId: tenant.id
      }
    });
    console.log('Created user rahulbabbar@msn.com');
  } else {
    // Update tenant
    await prisma.user.update({
      where: { id: user.id },
      data: { tenantId: tenant.id }
    });
    console.log('Updated user tenant mapping');
  }

  // Ensure role exists
  let superAdminRole = await prisma.role.findUnique({
    where: { roleKey: 'super_admin' }
  });
  
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        roleKey: 'super_admin',
        roleName: 'Super Administrator',
        canCreateJobCard: true,
        canEditJobCard: true,
        canViewPartPrices: true,
        canViewLaborPrices: true,
        canChangeJobCardStatus: true
      }
    });
    console.log('Created super_admin role');
  }

  // Assign role
  const existingRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id
      }
    }
  });

  if (!existingRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
        isPrimary: true
      }
    });
    console.log('Assigned super_admin role to user');
  } else {
    console.log('User already has super_admin role');
  }

  console.log('Setup complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
