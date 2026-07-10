import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    return NextResponse.json({ success: true, suppliers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, contactPerson, mobile, email, address, gstin } = await request.json();
    if (!name || !mobile) {
      return NextResponse.json({ success: false, error: 'Supplier Name and Mobile number are required.' }, { status: 400 });
    }

    // Check if supplier already exists
    const existing = await prisma.supplier.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json({ success: false, error: `Supplier "${name}" already exists.` }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson,
        mobile,
        email,
        address,
        gstin,
        outstandingBalance: 0
      }
    });

    return NextResponse.json({ success: true, supplier });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, contactPerson, mobile, email, address, gstin } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Supplier ID is required.' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (contactPerson !== undefined) dataToUpdate.contactPerson = contactPerson;
    if (mobile !== undefined) dataToUpdate.mobile = mobile;
    if (email !== undefined) dataToUpdate.email = email;
    if (address !== undefined) dataToUpdate.address = address;
    if (gstin !== undefined) dataToUpdate.gstin = gstin;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, supplier });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
