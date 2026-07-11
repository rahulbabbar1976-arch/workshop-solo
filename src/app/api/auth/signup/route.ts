import { NextResponse } from 'next/server';
import { getPrismaForDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      identifier, 
      pin, 
      workshopName, 
      addressLine1, 
      city, 
      fullName 
    } = body;

    if (!identifier || !pin || !workshopName || !fullName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const db = getPrismaForDb('dev.db');

    // 1. Verify Whitelist
    const invite = await db.tenantInvite.findUnique({
      where: { identifier }
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: 'This email or mobile number is not authorized to create an account. Please contact support.' }, { status: 403 });
    }

    if (invite.isClaimed) {
      return NextResponse.json({ success: false, error: 'This invite has already been claimed.' }, { status: 400 });
    }

    // 2. Start Transaction to create Tenant & Admin
    const result = await db.$transaction(async (tx) => {
      // Create Tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: workshopName.toUpperCase(),
          status: 'ACTIVE'
        }
      });

      // Create Workshop Profile
      await tx.workshopProfile.create({
        data: {
          workshopName,
          addressLine1,
          city: city || 'Unknown',
          mobile: identifier.includes('@') ? '' : identifier,
          email: identifier.includes('@') ? identifier : ''
        }
      });

      // Find admin role
      const adminRole = await tx.role.findUnique({
        where: { roleKey: 'admin' }
      });
      if (!adminRole) {
        throw new Error("Admin role not found in database. Contact system administrator.");
      }

      // Create User
      const hashedPin = await bcrypt.hash(String(pin), 10);
      const isEmail = identifier.includes('@');
      
      const newUser = await tx.user.create({
        data: {
          fullName,
          email: isEmail ? identifier : null,
          mobile: isEmail ? null : identifier,
          quickPinHash: hashedPin,
          tenantId: newTenant.id,
          isActive: true,
          roles: {
            create: {
              roleId: adminRole.id,
              isPrimary: true
            }
          }
        }
      });

      // Mark Invite as claimed
      await tx.tenantInvite.update({
        where: { id: invite.id },
        data: {
          isClaimed: true,
          claimedAt: new Date()
        }
      });

      return { tenant: newTenant, user: newUser };
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      tenantId: result.tenant.id
    });

  } catch (err: any) {
    console.error('Signup Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
