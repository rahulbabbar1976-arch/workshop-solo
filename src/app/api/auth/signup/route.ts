import { NextResponse } from 'next/server';
import { getPrismaForDb } from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, mobile, email, password, quickPin, workshopName, accountType } = body;

    // 1. Basic validation
    if (!fullName || !email || !password || !quickPin) {
      return NextResponse.json({ success: false, error: 'Full name, email, password, and quick PIN are required.' }, { status: 400 });
    }

    let finalWorkshopName = workshopName;
    if (accountType === 'solo') {
      finalWorkshopName = `${fullName}'s Solo Workspace`;
    } else if (!finalWorkshopName) {
      return NextResponse.json({ success: false, error: 'Workshop Name is required for Enterprise accounts.' }, { status: 400 });
    }

    if (String(quickPin).length !== 4 || !/^\d+$/.test(String(quickPin))) {
      return NextResponse.json({ success: false, error: 'Quick PIN must be a 4-digit number.' }, { status: 400 });
    }

    const centralDb = getPrismaForDb('dev.db');

    // 2. Check if email or mobile already registered in central database
    const existingUser = await centralDb.user.findFirst({
      where: {
        OR: [
          { email },
          ...(mobile ? [{ mobile }] : [])
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User with this email or mobile number already exists.' }, { status: 400 });
    }

    // 3. Create a unique tenant database from the clean template
    const tenantId = crypto.randomUUID();
    const tenantDbName = `dev_tenant_${tenantId}.db`;
    const rootDir = process.cwd();
    const templatePath = path.join(rootDir, 'template.db');
    const tenantDbPath = path.join(rootDir, tenantDbName);

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ success: false, error: 'System configuration error: template database is missing.' }, { status: 500 });
    }

    fs.copyFileSync(templatePath, tenantDbPath);

    // Connect to newly created tenant database
    const tenantDb = getPrismaForDb(tenantDbName);

    // 4. Provision default configurations inside the new database
    const profile = await tenantDb.workshopProfile.create({
      data: {
        workshopName: finalWorkshopName,
        addressLine1: 'Update Address Line 1',
        addressLine2: 'Update Address Line 2',
        city: 'Update City',
        state: 'Update State',
        postalCode: '000000',
        country: 'IN',
        mobile: mobile || null,
        email: email
      }
    });

    await tenantDb.taxSettings.create({
      data: {
        workshopProfileId: profile.id,
        defaultTaxMode: 'exclusive',
        intrastateCgstRate: 9.00,
        intrastateSgstRate: 9.00,
        interstateIgstRate: 18.00,
        defaultDiscountMode: 'line_item'
      }
    });

    await tenantDb.numberingSettings.create({
      data: {
        workshopProfileId: profile.id,
        estimateNumberFormat: 'EST-{YYYY}-{####}',
        jobcardNumberFormat: 'JC-{YYYY}-{####}',
        partsOrderNumberFormat: 'PO-{YYYY}-{####}'
      }
    });

    await tenantDb.printSettings.create({
      data: {
        workshopProfileId: profile.id,
        showTaxByDefault: true,
        showDiscountByDefault: true,
        includeSignature: true,
        includeIntakePhotos: true,
        showPartsLabourSeparately: true
      }
    });

    await tenantDb.workflowSettings.create({
      data: {
        mandatoryOdometer: true,
        mandatorySignature: true,
        mandatoryPhotos: true,
        minimumIntakePhotoCount: 4,
        managerApprovalBeforePrint: false,
        lockAfterClose: true,
        allowReopenClosedJob: true,
        duplicateVehicleAction: 'warn',
        duplicateCustomerAction: 'warn',
        importedJobsReadOnly: true
      }
    });

    // 5. Query primary roles in both DBs
    const tenantAccountsRole = await tenantDb.role.findUnique({
      where: { roleKey: 'accounts' }
    });

    const centralAccountsRole = await centralDb.role.findUnique({
      where: { roleKey: 'accounts' }
    });

    if (!tenantAccountsRole || !centralAccountsRole) {
      return NextResponse.json({ success: false, error: 'Database roles not initialized. Please re-seed database.' }, { status: 500 });
    }

    // 6. Create Owner User inside both databases with identical ID
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const quickPinHash = hashPassword(String(quickPin));

    // Create in tenant database
    await tenantDb.user.create({
      data: {
        id: userId,
        fullName,
        mobile: mobile || null,
        email: email,
        passwordHash,
        quickPinHash,
        isActive: true,
        roles: {
          create: {
            roleId: tenantAccountsRole.id,
            isPrimary: true
          }
        }
      }
    });

    // Create in central registry database
    await centralDb.user.create({
      data: {
        id: userId,
        fullName,
        mobile: mobile || null,
        email: email,
        passwordHash,
        quickPinHash,
        isActive: true,
        tenantDb: tenantDbName,
        roles: {
          create: {
            roleId: centralAccountsRole.id,
            isPrimary: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Workshop PWA account successfully created.'
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
