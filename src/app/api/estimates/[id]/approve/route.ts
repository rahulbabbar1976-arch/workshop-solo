import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('workshop_user_id')?.value;
    const { approvalMethod = 'IN_PERSON', customerEmail = null } = await req.json();

    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: {
        lines: true,
        jobCard: true,
      },
    });

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    if (estimate.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Estimate already approved' },
        { status: 400 }
      );
    }

    // Update estimate status
    const updatedEstimate = await prisma.estimate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvalMethod,
        approvedCustomerEmail: customerEmail,
        isLockedForEditing: true,
        lockedAt: new Date(),
        lockedBy: userId,
      },
    });

    // Create approval audit log
    await prisma.estimateApproval.create({
      data: {
        estimateId: id,
        approvalStatus: 'APPROVED',
        approvedBy: userId,
        approvalMethod,
        customerEmail,
      },
    });

    // Auto-apply to JobCard (add items to parts/labor) if jobCard exists
    if (estimate.jobCardId) {
      const jobCard = estimate.jobCard;

      for (const item of estimate.lines) {
        if (item.itemType === 'PART') {
          await prisma.jobCardPart.create({
            data: {
              jobcardId: estimate.jobCardId,
              partName: item.name || '',
              partNumber: item.partNumber,
              brand: item.brand,
              quantityRequested: item.quantity,
              sellingPrice: item.unitPrice,
              taxRate: item.gstPercent,
              discountType: item.discountType,
              discountValue: item.discountValue,
              status: 'requested'
            },
          });
        }

        if (item.itemType === 'LABOR') {
          await prisma.jobCardLabour.create({
            data: {
              jobcardId: estimate.jobCardId,
              labourName: item.name || '',
              quantity: item.estimatedHours || 1,
              sellingPrice: item.unitPrice,
              taxRate: item.gstPercent,
              discountType: item.discountType,
              discountValue: item.discountValue,
              status: 'pending'
            },
          });
        }
      }

      // Create variance tracking
      const estimatedLabourHours = estimate.lines
        .filter((i) => i.itemType === 'LABOR')
        .reduce((sum, i) => sum + (i.estimatedHours || 1), 0);

      await prisma.estimateVariance.create({
        data: {
          estimateId: id,
          jobCardId: estimate.jobCardId,
          estimatedPartsCost: estimate.partsCost,
          estimatedLabourCost: estimate.labourCost,
          estimatedTotalCost: estimate.grandTotal,
          estimatedLabourHours: estimatedLabourHours,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          estimateId: id,
          status: 'APPROVED',
          appliedToJobCard: !!estimate.jobCardId,
          itemsApplied: {
            parts: estimate.lines.filter((i) => i.itemType === 'PART').length,
            labour: estimate.lines.filter((i) => i.itemType === 'LABOR').length,
          },
          message: 'Estimate approved and applied to JobCard',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Approve estimate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve estimate',
      },
      { status: 500 }
    );
  }
}
