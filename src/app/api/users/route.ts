import { NextResponse } from 'next/server';
import prisma, { getPrismaForDb, decryptDbPath } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    const roles = await prisma.role.findMany({
      orderBy: { roleName: 'asc' }
    });

    return NextResponse.json({ success: true, users, roles });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      mobile,
      email,
      password,
      quickPin,
      skillCategory,
      roleKeys, // Array of role keys e.g. ["mechanic", "advisor"]
      team,
      username,
      address,
      joiningDate,
      isAppAccessEnabled
    } = body;

    if (!fullName) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }

    if (!roleKeys || roleKeys.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one role is required' }, { status: 400 });
    }

    const passwordHash = password ? hashPassword(password) : hashPassword('password123');
    const quickPinHash = quickPin ? hashPassword(String(quickPin)) : hashPassword('1234');

    // 1. Create User in active database (which is resolved dynamically by prisma Proxy)
    const user = await prisma.user.create({
      data: {
        fullName,
        mobile: mobile || null,
        email: email || null,
        passwordHash,
        quickPinHash,
        skillCategory: skillCategory || null,
        team: team || null,
        isActive: true,
        username: username || null,
        address: address || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        isAppAccessEnabled: isAppAccessEnabled !== undefined ? isAppAccessEnabled : true
      }
    });

    // 2. Link Roles in active database
    const roles = await prisma.role.findMany({
      where: { roleKey: { in: roleKeys } }
    });

    for (let i = 0; i < roles.length; i++) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: roles[i].id,
          isPrimary: i === 0
        }
      });
    }

    // 3. Synchronize to central registry database if we are in a tenant workshop
    try {
      const cookieStore = await cookies();
      const dbCookie = cookieStore.get('workshop_db_path');
      if (dbCookie?.value) {
        const currentDbPath = decryptDbPath(dbCookie.value);
        if (currentDbPath !== 'dev.db') {
          const centralDb = getPrismaForDb('dev.db');

          // Create matching user in central registry
          await centralDb.user.create({
            data: {
              id: user.id, // Match the ID
              fullName,
              mobile: mobile || null,
              email: email || null,
              passwordHash,
              quickPinHash,
              skillCategory: skillCategory || null,
              team: team || null,
              isActive: true,
              username: username || null,
              address: address || null,
              joiningDate: joiningDate ? new Date(joiningDate) : null,
              isAppAccessEnabled: isAppAccessEnabled !== undefined ? isAppAccessEnabled : true,
              tenantDb: currentDbPath
            }
          });

          // Link matching roles in central registry
          const centralRoles = await centralDb.role.findMany({
            where: { roleKey: { in: roleKeys } }
          });

          for (let i = 0; i < centralRoles.length; i++) {
            await centralDb.userRole.create({
              data: {
                userId: user.id,
                roleId: centralRoles[i].id,
                isPrimary: i === 0
              }
            });
          }
        }
      }
    } catch (syncError) {
      console.error('Error synchronizing user creation to central registry:', syncError);
    }

    return NextResponse.json({ success: true, user });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      fullName,
      mobile,
      email,
      password,
      quickPin,
      skillCategory,
      roleKeys,
      team,
      isActive,
      username,
      address,
      joiningDate,
      isAppAccessEnabled
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (mobile !== undefined) dataToUpdate.mobile = mobile || null;
    if (email !== undefined) dataToUpdate.email = email || null;
    if (skillCategory !== undefined) dataToUpdate.skillCategory = skillCategory || null;
    if (team !== undefined) dataToUpdate.team = team || null;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (username !== undefined) dataToUpdate.username = username || null;
    if (address !== undefined) dataToUpdate.address = address || null;
    if (joiningDate !== undefined) dataToUpdate.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (isAppAccessEnabled !== undefined) dataToUpdate.isAppAccessEnabled = isAppAccessEnabled;

    if (password) {
      dataToUpdate.passwordHash = hashPassword(password);
    }
    if (quickPin) {
      dataToUpdate.quickPinHash = hashPassword(String(quickPin));
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: dataToUpdate
      });

      if (roleKeys && roleKeys.length > 0) {
        // Delete existing roles
        await tx.userRole.deleteMany({
          where: { userId: id }
        });

        // Link new roles
        const roles = await tx.role.findMany({
          where: { roleKey: { in: roleKeys } }
        });

        for (let i = 0; i < roles.length; i++) {
          await tx.userRole.create({
            data: {
              userId: id,
              roleId: roles[i].id,
              isPrimary: i === 0
            }
          });
        }
      }

      return user;
    });

    // Synchronize updates to central registry database if we are in a tenant workshop
    try {
      const cookieStore = await cookies();
      const dbCookie = cookieStore.get('workshop_db_path');
      if (dbCookie?.value) {
        const currentDbPath = decryptDbPath(dbCookie.value);
        if (currentDbPath !== 'dev.db') {
          const centralDb = getPrismaForDb('dev.db');

          const centralData: any = {};
          if (fullName !== undefined) centralData.fullName = fullName;
          if (mobile !== undefined) centralData.mobile = mobile || null;
          if (email !== undefined) centralData.email = email || null;
          if (skillCategory !== undefined) centralData.skillCategory = skillCategory || null;
          if (team !== undefined) centralData.team = team || null;
          if (isActive !== undefined) centralData.isActive = isActive;
          if (username !== undefined) centralData.username = username || null;
          if (address !== undefined) centralData.address = address || null;
          if (joiningDate !== undefined) centralData.joiningDate = joiningDate ? new Date(joiningDate) : null;
          if (isAppAccessEnabled !== undefined) centralData.isAppAccessEnabled = isAppAccessEnabled;

          if (password) {
            centralData.passwordHash = hashPassword(password);
          }
          if (quickPin) {
            centralData.quickPinHash = hashPassword(String(quickPin));
          }

          await centralDb.$transaction(async (tx) => {
            // Update central user record
            await tx.user.update({
              where: { id },
              data: centralData
            });

            if (roleKeys && roleKeys.length > 0) {
              // Delete central roles
              await tx.userRole.deleteMany({
                where: { userId: id }
              });

              // Link central roles
              const centralRoles = await tx.role.findMany({
                where: { roleKey: { in: roleKeys } }
              });

              for (let i = 0; i < centralRoles.length; i++) {
                await tx.userRole.create({
                  data: {
                    userId: id,
                    roleId: centralRoles[i].id,
                    isPrimary: i === 0
                  }
                });
              }
            }
          });
        }
      }
    } catch (syncError) {
      console.error('Error synchronizing user update to central registry:', syncError);
    }

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
