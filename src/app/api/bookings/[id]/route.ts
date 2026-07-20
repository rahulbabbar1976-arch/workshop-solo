import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        pickupEmployee: true,
        dropEmployee: true
      }
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerAddress,
      vehicleManufacturer,
      vehicleModel,
      vehicleRegNo,
      scheduledDate,
      pickupEmployeeId,
      dropEmployeeId,
      notes,
      status
    } = body;

    const dataToUpdate: any = {};
    if (customerName !== undefined) dataToUpdate.customerName = customerName;
    if (customerPhone !== undefined) dataToUpdate.customerPhone = customerPhone;
    if (customerAddress !== undefined) dataToUpdate.customerAddress = customerAddress;
    if (vehicleManufacturer !== undefined) dataToUpdate.vehicleManufacturer = vehicleManufacturer;
    if (vehicleModel !== undefined) dataToUpdate.vehicleModel = vehicleModel;
    if (vehicleRegNo !== undefined) dataToUpdate.vehicleRegNo = vehicleRegNo;
    if (scheduledDate !== undefined) dataToUpdate.scheduledDate = new Date(scheduledDate);
    if (pickupEmployeeId !== undefined) dataToUpdate.pickupEmployeeId = pickupEmployeeId;
    if (dropEmployeeId !== undefined) dataToUpdate.dropEmployeeId = dropEmployeeId;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (status !== undefined) dataToUpdate.status = status;

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.booking.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
