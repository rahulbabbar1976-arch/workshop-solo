import 'dotenv/config';
import { getPrismaForDb } from '../src/lib/db';

async function main() {
  const prisma = getPrismaForDb('dev.db');
  
  // Find BABBARSONS tenant
  const tenant = await prisma.tenant.findFirst({
    where: { name: 'BABBARSONS' }
  });
  
  if (!tenant) {
    console.log('Tenant not found');
    return;
  }
  
  // Find the tenant admin
  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id }
  });
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: 'rahulbabbar@msn.com', mobile: null }
    });
    console.log('Updated BABBARSONS admin to rahulbabbar@msn.com');
  } else {
    console.log('User not found');
  }
}

main().catch(console.error);
