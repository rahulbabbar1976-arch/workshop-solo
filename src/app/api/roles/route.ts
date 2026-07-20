import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { roleName: 'asc' }
    });

    return NextResponse.json({ success: true, roles });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      roleName,
      description,
      canCreateJobCard,
      canEditJobCard,
      canViewPartPrices,
      canViewLaborPrices,
      canChangeJobCardStatus
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Role ID is required' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (roleName !== undefined) dataToUpdate.roleName = roleName;
    if (description !== undefined) dataToUpdate.description = description;
    if (canCreateJobCard !== undefined) dataToUpdate.canCreateJobCard = canCreateJobCard;
    if (canEditJobCard !== undefined) dataToUpdate.canEditJobCard = canEditJobCard;
    if (canViewPartPrices !== undefined) dataToUpdate.canViewPartPrices = canViewPartPrices;
    if (canViewLaborPrices !== undefined) dataToUpdate.canViewLaborPrices = canViewLaborPrices;
    if (canChangeJobCardStatus !== undefined) dataToUpdate.canChangeJobCardStatus = canChangeJobCardStatus;

    const role = await prisma.role.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
