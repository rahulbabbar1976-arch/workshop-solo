import { NextResponse } from 'next/server';
import { getPrismaForDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const centralDb = getPrismaForDb('dev.db');
    
    // Fetch all users with their roles
    const users = await centralDb.user.findMany({
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    const tenantsMap = new Map();

    users.forEach(user => {
      const db = user.tenantDb || 'dev.db';
      if (!tenantsMap.has(db)) {
        tenantsMap.set(db, {
          dbName: db,
          users: 0,
          owner: null,
          createdAt: user.createdAt
        });
      }
      
      const tenant = tenantsMap.get(db);
      tenant.users += 1;
      
      // Check if user is owner (accounts)
      const isOwner = user.roles.some(r => r.role.roleKey === 'accounts' || r.role.roleKey === 'owner');
      if (isOwner && !tenant.owner) {
        tenant.owner = {
          name: user.fullName,
          email: user.email,
          mobile: user.mobile
        };
      }
    });

    const tenants = Array.from(tenantsMap.values());

    return NextResponse.json({ success: true, tenants });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
