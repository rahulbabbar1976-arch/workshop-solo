import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || null;

    const bookings = await prisma.booking.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { scheduledDate: 'asc' },
      include: {
        customer: true,
        vehicle: true,
        pickupEmployee: true,
        dropEmployee: true
      }
    });

    return NextResponse.json({ success: true, bookings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      vehicleId,
      vehicleManufacturer,
      vehicleModel,
      vehicleRegNo,
      scheduledDate,
      pickupEmployeeId,
      dropEmployeeId,
      notes,
      complaints,
      observations,
      tenantId
    } = body;

    if (!customerName || !scheduledDate) {
      return NextResponse.json({ success: false, error: 'Customer name and scheduled date are required' }, { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: customerId || null,
        customerName,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        vehicleId: vehicleId || null,
        vehicleManufacturer: vehicleManufacturer || null,
        vehicleModel: vehicleModel || null,
        vehicleRegNo: vehicleRegNo || null,
        scheduledDate: new Date(scheduledDate),
        pickupEmployeeId: pickupEmployeeId || null,
        dropEmployeeId: dropEmployeeId || null,
        notes: notes || null,
        complaints: complaints || null,
        observations: observations || null,
        tenantId: tenantId || null,
        status: 'Pending'
      }
    });

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
