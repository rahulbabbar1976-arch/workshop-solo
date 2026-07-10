import prisma from './src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  // Delete all users except rahulbabbar@babbarsons.com
  await prisma.user.deleteMany({
    where: { NOT: { email: 'rahulbabbar@babbarsons.com' } }
  });
  
  // Make sure admin role exists
  let adminRole = await prisma.role.findUnique({ where: { roleKey: 'admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { roleKey: 'admin', roleName: 'Admin', description: 'System Administrator' }
    });
  }

  // Create or update admin user
  const pinHash = await bcrypt.hash('1002', 10);
  
  let user = await prisma.user.findFirst({ where: { email: 'rahulbabbar@babbarsons.com' } });
  
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { quickPinHash: pinHash, fullName: 'Rahul Babbar' }
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: 'rahulbabbar@babbarsons.com',
        quickPinHash: pinHash,
        fullName: 'Rahul Babbar'
      }
    });
  }

  // Ensure role is assigned
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id
      }
    },
    update: { isPrimary: true },
    create: {
      userId: user.id,
      roleId: adminRole.id,
      isPrimary: true
    }
  });
  
  console.log('Admin user setup complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
