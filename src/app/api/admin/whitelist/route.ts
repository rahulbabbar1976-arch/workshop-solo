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
    const invites = await db.tenantInvite.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, invites });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    await verifySuperAdmin();
    const { identifier } = await request.json();
    if (!identifier) {
      return NextResponse.json({ success: false, error: 'Identifier is required' }, { status: 400 });
    }

    const db = getPrismaForDb('dev.db');
    const invite = await db.tenantInvite.create({
      data: { identifier }
    });

    return NextResponse.json({ success: true, invite });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}
