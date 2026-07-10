import { NextResponse } from 'next/server';
import { getPrismaForDb } from '@/lib/db';
import crypto from 'crypto';

// ONE-TIME SETUP ENDPOINT — Delete this file after first use
// Access: GET /api/admin/init-admin
// This creates the real admin account and removes all demo users.

export async function GET() {
  try {
    const db = getPrismaForDb('dev.db');

    function hash(p: string) {
      return crypto.createHash('sha256').update(String(p)).digest('hex');
    }

    // Remove demo users
    const deleted = await db.user.deleteMany({
      where: {
        OR: [
          { email: 'admin@workshop.local' },
          { email: 'ramesh@workshop.local' },
          { mobile: '9999999999' },
          { mobile: '8888888888' },
        ]
      }
    });

    // Ensure super_admin role
    const role = await db.role.upsert({
      where: { roleKey: 'super_admin' },
      update: {},
      create: { roleKey: 'super_admin', roleName: 'Super Admin', description: 'System owner — unrestricted access' }
    });

    // Ensure standard roles exist too
    const standardRoles = [
      { roleKey: 'admin',         roleName: 'Administrator'   },
      { roleKey: 'manager',       roleName: 'Manager'         },
      { roleKey: 'advisor',       roleName: 'Service Advisor' },
      { roleKey: 'mechanic',      roleName: 'Mechanic'        },
      { roleKey: 'parts_manager', roleName: 'Parts Manager'   },
      { roleKey: 'accounts',      roleName: 'Accounts'        },
      { roleKey: 'solo',          roleName: 'Solo Operator'   },
    ];
    for (const r of standardRoles) {
      await db.role.upsert({ where: { roleKey: r.roleKey }, update: {}, create: { ...r, description: '' } });
    }

    // Create or update real admin
    const ADMIN_EMAIL = 'rahulbabbar@babbarsons.com';
    const ADMIN_PIN   = '1002';
    const existing = await db.user.findFirst({ where: { email: ADMIN_EMAIL } });

    let action = '';
    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: { quickPinHash: hash(ADMIN_PIN), isActive: true, fullName: 'Rahul Babbar' }
      });
      action = 'updated';
    } else {
      await db.user.create({
        data: {
          fullName:     'Rahul Babbar',
          email:        ADMIN_EMAIL,
          quickPinHash: hash(ADMIN_PIN),
          isActive:     true,
          roles: { create: [{ roleId: role.id, isPrimary: true }] }
        }
      });
      action = 'created';
    }

    return NextResponse.json({
      success: true,
      message: `Admin account ${action} successfully. Demo users removed: ${deleted.count}.`,
      credentials: {
        email: ADMIN_EMAIL,
        pin: ADMIN_PIN,
        note: '⚠️ Delete /api/admin/init-admin after this run!'
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
