import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const jobcards = await prisma.jobCard.findMany({
      orderBy: { dateIn: 'desc' },
      include: {
        customer: true,
        vehicle: true,
        snapshot: true,
        mechanics: {
          include: {
            // Include user details if needed
          }
        }
      }
    });

    return NextResponse.json({ success: true, jobcards });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      vehicleId,
      intakeOdometer,
      fuelLevel,
      expectedDeliveryAt,
      externalNotes,
      internalNotes,
      signatureUrl,
      photoUrls, // Array of strings (URLs)
      complaintIcons, // Array of icon keys e.g. ["service", "ac"]
      complaintText,
      advisorObservation,
      assignedMechanicId
    } = body;

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'Vehicle ID is required' }, { status: 400 });
    }

    // Fallback: the frontend may pass complaint text as externalNotes
    const finalComplaintText = complaintText || externalNotes;

    // 1. Fetch Vehicle & Customer
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { currentCustomer: true }
    });

    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    // Update current vehicle odometer reading
    if (intakeOdometer) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentOdometer: parseInt(intakeOdometer, 10) }
      });
    }

    // 2. Generate Job Card Number (continuation from last CSV import)
    const year = new Date().getFullYear();
    const allJobcards = await prisma.jobCard.findMany({
      select: { jobcardNumber: true }
    });
    let maxNum = 0;
    for (const jc of allJobcards) {
      const match = jc.jobcardNumber.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    const seqStr = String(nextNum).padStart(4, '0');
    const jobcardNumber = `JC-${year}-${seqStr}`;

    // 3. Create Job Card
    const jobCard = await prisma.jobCard.create({
      data: {
        jobcardNumber,
        customerId: vehicle.currentCustomerId,
        vehicleId: vehicle.id,
        status: 'open',
        dateIn: new Date(),
        intakeOdometer: parseInt(intakeOdometer, 10) || null,
        fuelLevel: fuelLevel || null,
        expectedDeliveryAt: expectedDeliveryAt || null,
        externalNotes: externalNotes || null,
        internalNotes: internalNotes || null,
        customerSignatureRequired: true,
        intakePhotosRequired: true,
        legacyImportFlag: false,
        readOnlyFlag: false,
        paymentStatus: 'unpaid'
      }
    });

    // 4. Create Job Card Snapshot (Audit-proof)
    await prisma.jobCardSnapshot.create({
      data: {
        jobcardId: jobCard.id,
        customerName: vehicle.currentCustomer.displayName,
        customerMobile: vehicle.currentCustomer.primaryMobile,
        customerAddress: vehicle.currentCustomer.addressLine1,
        customerTaxId: vehicle.currentCustomer.taxId,
        vehicleRegistrationNumber: vehicle.registrationNumberRaw,
        vehicleManufacturer: vehicle.manufacturer,
        vehicleModel: vehicle.model,
        vehicleColor: vehicle.color,
        vehicleVin: vehicle.vin,
        intakeOdometerSnapshot: parseInt(intakeOdometer, 10) || null
      }
    });

    // 5. Create Complaint Records
    if (finalComplaintText || advisorObservation || (complaintIcons && complaintIcons.length > 0)) {
      const complaint = await prisma.jobCardComplaint.create({
        data: {
          jobcardId: jobCard.id,
          customerComplaintText: finalComplaintText || null,
          advisorObservationText: advisorObservation || null,
          hasIconInput: complaintIcons && complaintIcons.length > 0,
          hasTextInput: !!finalComplaintText,
          hasPhotoInput: photoUrls && photoUrls.length > 0
        }
      });

      // Link complaint icons
      if (complaintIcons && complaintIcons.length > 0) {
        // Find seeded icons
        const iconMasters = await prisma.complaintIconMaster.findMany({
          where: { iconKey: { in: complaintIcons } }
        });
        
        for (const icon of iconMasters) {
          await prisma.jobCardComplaintIcon.create({
            data: {
              jobcardComplaintId: complaint.id,
              complaintIconId: icon.id
            }
          });

          // Pre-fill initial Labor or Tasks based on selected complaint icons
          // E.g. Tapping AC pre-fills an AC diagnostics task
          await prisma.jobCardLabour.create({
            data: {
              jobcardId: jobCard.id,
              labourName: `Inspection & Diagnostics for ${icon.displayName}`,
              status: 'pending',
              quantity: 1,
              sellingPrice: 0 // Free inspection by default, manager can edit
            }
          });
        }
      }
    }

    // 6. Save Signature and Intake Media (Photos/Videos)
    if (signatureUrl) {
      await prisma.jobCardMedia.create({
        data: {
          jobcardId: jobCard.id,
          mediaType: 'signature',
          phase: 'intake',
          fileUrl: signatureUrl
        }
      });
    }

    if (photoUrls && photoUrls.length > 0) {
      for (const url of photoUrls) {
        await prisma.jobCardMedia.create({
          data: {
            jobcardId: jobCard.id,
            mediaType: 'intake_photo',
            phase: 'intake',
            fileUrl: url
          }
        });
      }
    }

    // 7. Assign Mechanic if provided
    if (assignedMechanicId) {
      await prisma.jobCardMechanic.create({
        data: {
          jobcardId: jobCard.id,
          mechanicUserId: assignedMechanicId,
          isPrimary: true
        }
      });
      
      // Update primary mechanic reference on the header
      await prisma.jobCard.update({
        where: { id: jobCard.id },
        data: { primaryMechanicId: assignedMechanicId }
      });
    }

    return NextResponse.json({
      success: true,
      jobcardId: jobCard.id,
      jobcardNumber: jobCard.jobcardNumber
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
