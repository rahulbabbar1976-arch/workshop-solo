import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = 'postgresql://postgres.hhxedpejjumnnjmvzkbv:G3singh%401704@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function main() {
  console.log('Connecting...');
  try {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    let tenantId: string | undefined = undefined;
    
    console.log('Fetching active jobs...');
    const activeJobs = await prisma.jobCard.count({
      where: { tenantId, status: "IN_PROGRESS" }
    });
    console.log('Active jobs:', activeJobs);
    
    console.log('Fetching raw jobs...');
    const rawJobs = await prisma.jobCard.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: true,
        vehicle: true,
      }
    });
    console.log('Raw jobs:', rawJobs.length);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
main();
