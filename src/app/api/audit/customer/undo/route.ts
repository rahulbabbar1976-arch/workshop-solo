import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { logId } = await request.json();
    if (!logId) return NextResponse.json({ success: false, error: 'Missing log ID' }, { status: 400 });

    const log = await prisma.auditLog.findUnique({
      where: { id: logId }
    });

    if (!log || !log.oldValuesJson || log.entityType !== 'customer') {
      return NextResponse.json({ success: false, error: 'Audit log or previous state not found for this customer' }, { status: 404 });
    }

    const prevState = JSON.parse(log.oldValuesJson);

    await prisma.$transaction(async (tx) => {
      // Revert Customer details
      await tx.customer.update({
        where: { id: log.entityId },
        data: {
          displayName: prevState.displayName,
          primaryMobile: prevState.primaryMobile,
          alternateMobile: prevState.alternateMobile,
          driverName: prevState.driverName,
          driverMobile: prevState.driverMobile,
          email: prevState.email,
          taxId: prevState.taxId,
          addressLine1: prevState.addressLine1,
          addressLine2: prevState.addressLine2,
          city: prevState.city,
          state: prevState.state,
          postalCode: prevState.postalCode,
          notes: prevState.notes,
          customerType: prevState.customerType,
          isActive: prevState.isActive,
          isPriority: prevState.isPriority
        }
      });

      // Mark log as undone by appending to actionNote (since we don't have an actionType on the generic AuditLog)
      await tx.auditLog.update({
        where: { id: logId },
        data: {
          actionNote: log.actionNote ? `${log.actionNote} [UNDONE]` : '[UNDONE]'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
