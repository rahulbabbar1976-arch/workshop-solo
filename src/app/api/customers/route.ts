import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    let whereClause = {};
    if (q) {
      whereClause = {
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { primaryMobile: { contains: q } }
        ]
      };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { displayName: 'asc' },
      take: 10, // Limit results for autocomplete
      include: { vehicles: true }
    });
    return NextResponse.json({ success: true, customers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { displayName, primaryMobile, alternateMobile, email, taxId, addressLine1, addressLine2, city, state, postalCode, notes, customerType, driverName, driverMobile, isPriority } = body;

    if (!displayName) {
      return NextResponse.json({ success: false, error: 'Customer Name is required.' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        displayName,
        primaryMobile: primaryMobile || null,
        alternateMobile: alternateMobile || null,
        email: email || null,
        taxId: taxId || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        notes: notes || null,
        customerType: customerType || 'retail',
        driverName: driverName || null,
        driverMobile: driverMobile || null,
        isPriority: isPriority || false
      }
    });

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, displayName, primaryMobile, alternateMobile, email, taxId, addressLine1, addressLine2, city, state, postalCode, notes, customerType, isActive, driverName, driverMobile, isPriority } = body;
    const role = request.headers.get('x-user-role') || 'owner';
    const userId = request.headers.get('x-user-id') || 'unknown';

    if (!id) {
      return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
    }

    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
       return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (displayName !== undefined) dataToUpdate.displayName = displayName;
    if (alternateMobile !== undefined) dataToUpdate.alternateMobile = alternateMobile || null;
    if (email !== undefined) dataToUpdate.email = email || null;
    if (taxId !== undefined) dataToUpdate.taxId = taxId || null;
    if (notes !== undefined) dataToUpdate.notes = notes || null;
    if (customerType !== undefined) dataToUpdate.customerType = customerType || 'retail';
    if (isActive !== undefined) dataToUpdate.isActive = isActive;

    if (role === 'owner') {
      if (primaryMobile !== undefined) dataToUpdate.primaryMobile = primaryMobile || null;
      if (addressLine1 !== undefined) dataToUpdate.addressLine1 = addressLine1 || null;
      if (addressLine2 !== undefined) dataToUpdate.addressLine2 = addressLine2 || null;
      if (city !== undefined) dataToUpdate.city = city || null;
      if (state !== undefined) dataToUpdate.state = state || null;
      if (postalCode !== undefined) dataToUpdate.postalCode = postalCode || null;
      if (driverName !== undefined) dataToUpdate.driverName = driverName || null;
      if (driverMobile !== undefined) dataToUpdate.driverMobile = driverMobile || null;
      if (isPriority !== undefined) dataToUpdate.isPriority = isPriority;
    } else if (role === 'advisor') {
      // If advisor tries to update primaryMobile, just map it to alternateMobile if there's a difference
      if (primaryMobile && primaryMobile !== existingCustomer.primaryMobile && !dataToUpdate.alternateMobile) {
        dataToUpdate.alternateMobile = primaryMobile;
      }
    }

    const customer = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: dataToUpdate
      });

      await tx.auditLog.create({
        data: {
          userId,
          moduleName: 'customer',
          actionKey: 'update',
          entityType: 'customer',
          entityId: id,
          oldValuesJson: JSON.stringify(existingCustomer),
          newValuesJson: JSON.stringify(updated),
          actionNote: `Updated by ${role}`
        }
      });
      return updated;
    });

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
