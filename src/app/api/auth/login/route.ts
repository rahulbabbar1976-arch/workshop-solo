import { NextResponse } from 'next/server';
import { getPrismaForDb, encryptDbPath } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  return NextResponse.json({ success: true, message: "Authentication service is ready" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identity, password, pin, authMode } = body;

    if (!identity) {
      return NextResponse.json({ success: false, error: 'Mobile number or Email is required' }, { status: 400 });
    }

    // 1. Fetch User by Email or Mobile from Central Registry explicitly
    const centralDb = getPrismaForDb('dev.db');
    const user = await centralDb.user.findFirst({
      where: {
        OR: [
          { email: identity },
          { mobile: identity }
        ],
        isActive: true
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User account not found' }, { status: 404 });
    }

    // 2. Validate Credentials based on Mode
    if (authMode === 'pin') {
      if (!pin) {
        return NextResponse.json({ success: false, error: '4-digit Quick PIN is required' }, { status: 400 });
      }
      if (!user.quickPinHash) {
        return NextResponse.json({ success: false, error: 'User does not have a PIN setup' }, { status: 400 });
      }
      const isMatch = await bcrypt.compare(String(pin), user.quickPinHash);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Incorrect Quick PIN' }, { status: 401 });
      }
    } else {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
      }
      if (!user.passwordHash) {
         return NextResponse.json({ success: false, error: 'User does not have a password setup' }, { status: 400 });
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
      }
    }

    // 3. Extract Role Keys
    const roleKeys = user.roles.map(ur => ur.role.roleKey);
    const primaryRole = user.roles.find(ur => ur.isPrimary)?.role.roleKey || roleKeys[0] || 'mechanic';

    // 4. Update Last Login Time in Central Database
    await centralDb.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // If tenant DB is active, also update last login time in the tenant DB
    const dbFile = user.tenantDb || 'dev.db';
    if (dbFile !== 'dev.db') {
      try {
        const tenantDb = getPrismaForDb(dbFile);
        await tenantDb.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });
      } catch (e) {
        console.error('Failed to update login time in tenant database:', e);
      }
    }

    // 5. Construct Response Session
    const session = {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      roleKeys,
      primaryRole
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      session
    });

    // Set HTTP-only Cookie for security (optional reinforcement)
    response.cookies.set('workshop_user_role', primaryRole, {
      path: '/',
      httpOnly: false, // Accessible to client-side checks
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    response.cookies.set('workshop_user_id', user.id, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7
    });

    // Set Secure Encrypted tenant db path cookie
    const encryptedDb = encryptDbPath(dbFile);
    response.cookies.set('workshop_db_path', encryptedDb, {
      path: '/',
      httpOnly: true, // Hide from client scripts for safety
      maxAge: 60 * 60 * 24 * 7
    });

    return response;

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
