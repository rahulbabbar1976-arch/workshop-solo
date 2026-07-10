import { NextResponse } from 'next/server';
import { getPrismaForDb } from '@/lib/db';
import { cookies } from 'next/headers';

async function verifySuperAdmin() {
  const cookieStore = cookies();
  const role = cookieStore.get('workshop_user_role')?.value;
  if (role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
}

export async function GET() {
  try {
    await verifySuperAdmin();
    const db = getPrismaForDb('dev.db');
    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, customers: true, jobCards: true }
        }
      }
    });
    return NextResponse.json({ success: true, tenants });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}
