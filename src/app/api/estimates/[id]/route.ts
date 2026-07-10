import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: { lines: true }
    });
    if (!estimate) return NextResponse.json({ success: false, error: 'Estimate not found' }, { status: 404 });
    return NextResponse.json({ success: true, estimate });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { action, status, lines, customerNotes, internalNotes, validityDays } = body;

    const existing = await prisma.estimate.findUnique({ where: { id }, include: { lines: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // ===== Convert to Jobcard =====
    if (action === 'convert') {
      if (existing.status === 'converted') {
        return NextResponse.json({ success: false, error: 'Already converted' }, { status: 400 });
      }

      // Create a new jobcard from the estimate
      // We need a customer and vehicle to create a jobcard
      if (!existing.customerId || !existing.vehicleId) {
        return NextResponse.json({ success: false, error: 'Estimate must have a linked customer and vehicle to convert' }, { status: 400 });
      }

      // Generate jobcard number
      const jobCount = await prisma.jobCard.count();
      const year = new Date().getFullYear();
      const jobcardNumber = `JC-${year}-${String(jobCount + 1).padStart(4, '0')}`;

      const newJob = await prisma.$transaction(async (tx) => {
        const jobcard = await tx.jobCard.create({
          data: {
            jobcardNumber,
            customerId: existing.customerId!,
            vehicleId: existing.vehicleId!,
            advisorId: existing.advisorId || null,
            status: 'open',
            externalNotes: existing.customerNotes || null,
            internalNotes: existing.internalNotes || null,
            subtotalAmount: existing.subtotalAmount,
            taxAmount: existing.taxAmount,
            totalAmount: existing.totalAmount
          }
        });

        // Copy snapshot
        const customer = await tx.customer.findUnique({ where: { id: existing.customerId! } });
        const vehicle = await tx.vehicle.findUnique({ where: { id: existing.vehicleId! } });
        if (customer && vehicle) {
          await tx.jobCardSnapshot.create({
            data: {
              jobcardId: jobcard.id,
              customerName: existing.customerName,
              customerMobile: existing.customerMobile || null,
              vehicleRegistrationNumber: existing.vehicleRegNo || vehicle.registrationNumberRaw,
              vehicleManufacturer: existing.vehicleMake || vehicle.manufacturer || null,
              vehicleModel: existing.vehicleModel || vehicle.model || null
            }
          });
        }

        // Copy estimate lines as jobcard lines
        for (const line of existing.lines) {
          if (line.lineType === 'part') {
            await tx.jobCardPart.create({
              data: {
                jobcardId: jobcard.id,
                partName: line.name,
                partNumber: line.partNumber || null,
                brand: line.brand || null,
                quantityRequested: line.quantity,
                sellingPrice: line.unitPrice,
                taxRate: line.taxRate,
                status: 'approved'
              }
            });
          } else {
            await tx.jobCardLabour.create({
              data: {
                jobcardId: jobcard.id,
                labourName: line.name,
                sellingPrice: line.unitPrice,
                taxRate: line.taxRate,
                quantity: line.quantity,
                status: 'pending'
              }
            });
          }
        }

        // Mark estimate as converted
        await tx.estimate.update({
          where: { id },
          data: { status: 'converted', convertedJobId: jobcard.id }
        });

        return jobcard;
      });

      return NextResponse.json({ success: true, jobcard: newJob, message: `Converted to Job Card ${newJob.jobcardNumber}` });
    }

    // ===== Update Status / Details =====
    const updated = await prisma.estimate.update({
      where: { id },
      data: {
        status: status || existing.status,
        customerNotes: customerNotes !== undefined ? customerNotes : existing.customerNotes,
        internalNotes: internalNotes !== undefined ? internalNotes : existing.internalNotes,
        validityDays: validityDays || existing.validityDays
      },
      include: { lines: true }
    });

    return NextResponse.json({ success: true, estimate: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.estimate.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Estimate deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
