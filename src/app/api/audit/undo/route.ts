import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { logId } = await request.json();
    if (!logId) return NextResponse.json({ success: false, error: 'Missing log ID' }, { status: 400 });

    const log = await prisma.jobCardAuditLog.findUnique({
      where: { id: logId }
    });

    if (!log || !log.previousState) {
      return NextResponse.json({ success: false, error: 'Audit log or previous state not found' }, { status: 404 });
    }

    const prevState = JSON.parse(log.previousState);

    await prisma.$transaction(async (tx) => {
      // Revert JobCard details
      await tx.jobCard.update({
        where: { id: log.jobcardId },
        data: {
          externalNotes: prevState.externalNotes,
          internalNotes: prevState.internalNotes,
          intakeOdometer: prevState.intakeOdometer,
          fuelLevel: prevState.fuelLevel
        }
      });

      // Revert Snapshot details
      if (prevState.snapshot) {
        await tx.jobCardSnapshot.update({
          where: { jobcardId: log.jobcardId },
          data: {
            customerName: prevState.snapshot.customerName,
            customerMobile: prevState.snapshot.customerMobile
          }
        });
      }

      // Revert Customer details
      if (prevState.customer) {
        await tx.customer.update({
          where: { id: prevState.customerId },
          data: {
            displayName: prevState.customer.displayName,
            primaryMobile: prevState.customer.primaryMobile,
            driverName: prevState.customer.driverName,
            driverMobile: prevState.customer.driverMobile
          }
        });
      }
    });

    // Mark log as undone (optional)
    await prisma.jobCardAuditLog.update({
      where: { id: logId },
      data: {
        actionType: 'UNDONE_EDIT'
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
