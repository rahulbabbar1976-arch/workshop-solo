import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { predictAndSaveHsn } from '@/lib/hsn-predictor';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const jobcard = await prisma.jobCard.findUnique({
      where: { id },
      include: {
        customer: true,
        billingCustomer: true,
        vehicle: true,
        snapshot: true,
        mechanics: true,
        complaints: {
          include: {
            icons: true
          }
        },
        labourLines: true,
        partLines: true,
        media: true
      }
    });

    if (!jobcard) {
      return NextResponse.json({ success: false, error: 'Job Card not found' }, { status: 404 });
    }

    // Fetch list of available mechanics for assignment
    const mechanicRole = await prisma.role.findUnique({
      where: { roleKey: 'mechanic' }
    });

    let mechanicsList: any[] = [];
    if (mechanicRole) {
      mechanicsList = await prisma.user.findMany({
        where: {
          roles: {
            some: { roleId: mechanicRole.id }
          },
          isActive: true
        },
        select: {
          id: true,
          fullName: true,
          skillCategory: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      jobcard,
      availableMechanics: mechanicsList
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      status,
      primaryMechanicId,
      overallDiscountType,
      overallDiscountValue,
      paymentStatus,
      externalNotes,
      internalNotes,
      intakeOdometer,
      fuelLevel,
      overrideReadOnly,
      
      // Billing
      billingCustomerId,
      invoiceNumber,
      invoiceDate,
      
      // Customer & Vehicle detail edits
      customerName,
      customerMobile,
      customerDriverName,
      customerDriverMobile,
      customerIsPriority,
      customerAddress,
      customerTaxId,
      vehicleManufacturer,
      vehicleModel,
      vehicleColor,
      vehicleVin,
      vehicleEngineNumber,
      vehicleFuelType,
      batteryMake,
      batterySerialNumber,
      batteryInstallationDate,
      batteryWarrantyMonths,
      nextServiceOdometer,
      nextServiceDate,
      insurancePolicyNumber,
      insurerName,
      insuranceExpiryDate,
      pucNumber,
      nextPucDate,
      
      // Lines updates
      parts,  // Array of part line items (new, updated, or deleted)
      labour, // Array of labour line items (new, updated, or deleted)
      media,  // New media uploads
      editorId, // The user ID making the edit
      isOwner = false // Owner flag
    } = body;

    // Check if jobcard exists and is read-only
    const existing = await prisma.jobCard.findUnique({ 
      where: { id },
      include: {
        customer: true,
        billingCustomer: true,
        vehicle: true,
        snapshot: true,
        mechanics: true,
        complaints: true,
        labourLines: true,
        partLines: true
      }
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Job Card not found' }, { status: 404 });
    }
    if (existing.readOnlyFlag && status !== 'open' && !overrideReadOnly) {
      return NextResponse.json({ success: false, error: 'Historical legacy job cards are read-only' }, { status: 400 });
    }

    // 0. Pre-fetch HSN codes for parts and labor before starting the transaction
    const partMasterIds = (parts || []).map((p: any) => p.partMasterId).filter(Boolean);
    const labourMasterIds = (labour || []).map((l: any) => l.labourMasterId).filter(Boolean);

    const partsHsnMap = new Map<string, string>();
    if (partMasterIds.length > 0) {
      const pmList = await prisma.partsMaster.findMany({
        where: { id: { in: partMasterIds } },
        select: { id: true, hsnCode: true }
      });
      pmList.forEach(pm => {
        if (pm.hsnCode) partsHsnMap.set(pm.id, pm.hsnCode);
      });
    }

    const labourHsnMap = new Map<string, string>();
    if (labourMasterIds.length > 0) {
      const lmList = await prisma.labourMaster.findMany({
        where: { id: { in: labourMasterIds } },
        select: { id: true, hsnCode: true }
      });
      lmList.forEach(lm => {
        if (lm.hsnCode) labourHsnMap.set(lm.id, lm.hsnCode);
      });
    }

    // 0.5 Run AI Prediction for items that are missing HSN codes
    if (parts && Array.isArray(parts)) {
      for (const p of parts) {
        if (p.isDeleted) continue;
        const hasHsn = p.hsnCode || (p.partMasterId ? partsHsnMap.get(p.partMasterId) : null);
        if (!hasHsn && p.partName) {
          try {
            console.log(`AI predicting HSN for part: "${p.partName}"`);
            const prediction = await predictAndSaveHsn(p.partName, false, p.partMasterId);
            if (p.partMasterId) {
              partsHsnMap.set(p.partMasterId, prediction.hsnCode);
            } else {
              p.hsnCode = prediction.hsnCode; // save on the line directly if no master record
            }
          } catch (aiErr) {
            console.error('Failed to predict HSN for part:', aiErr);
          }
        }
      }
    }

    if (labour && Array.isArray(labour)) {
      for (const l of labour) {
        if (l.isDeleted) continue;
        const hasHsn = l.hsnCode || (l.labourMasterId ? labourHsnMap.get(l.labourMasterId) : null);
        if (!hasHsn && l.labourName) {
          try {
            console.log(`AI predicting SAC for labor: "${l.labourName}"`);
            const prediction = await predictAndSaveHsn(l.labourName, true, l.labourMasterId);
            if (l.labourMasterId) {
              labourHsnMap.set(l.labourMasterId, prediction.hsnCode);
            } else {
              l.hsnCode = prediction.hsnCode; // save on the line directly if no master record
            }
          } catch (aiErr) {
            console.error('Failed to predict SAC for labor:', aiErr);
          }
        }
      }
    }

    // 1. Transactional Update
    const result = await prisma.$transaction(async (tx) => {
      
      // Update Job Card Header
      const updatedHeader = await tx.jobCard.update({
        where: { id },
        data: {
          status: status || existing.status,
          primaryMechanicId: primaryMechanicId !== undefined ? primaryMechanicId : existing.primaryMechanicId,
          overallDiscountType: overallDiscountType !== undefined ? overallDiscountType : existing.overallDiscountType,
          overallDiscountValue: overallDiscountValue !== undefined ? parseFloat(overallDiscountValue) || 0 : existing.overallDiscountValue,
          paymentStatus: paymentStatus || existing.paymentStatus,
          externalNotes: externalNotes !== undefined ? externalNotes : existing.externalNotes,
          internalNotes: internalNotes !== undefined ? internalNotes : existing.internalNotes,
          intakeOdometer: intakeOdometer !== undefined ? parseInt(intakeOdometer, 10) || null : existing.intakeOdometer,
          fuelLevel: fuelLevel !== undefined ? fuelLevel : existing.fuelLevel,
          billingCustomerId: billingCustomerId !== undefined ? billingCustomerId : existing.billingCustomerId,
          invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : existing.invoiceNumber,
          invoiceDate: invoiceDate !== undefined ? (invoiceDate ? new Date(invoiceDate) : null) : existing.invoiceDate,
          closedAt: status === 'closed' ? new Date() : (status === 'open' ? null : existing.closedAt)
        }
      });

      // Update JobCardSnapshot
      const snapshotUpdateData: any = {};
      if (customerName !== undefined) snapshotUpdateData.customerName = customerName;
      if (customerMobile !== undefined) snapshotUpdateData.customerMobile = customerMobile;
      if (customerDriverName !== undefined) snapshotUpdateData.customerDriverName = customerDriverName;
      if (customerDriverMobile !== undefined) snapshotUpdateData.customerDriverMobile = customerDriverMobile;
      if (customerIsPriority !== undefined) snapshotUpdateData.customerIsPriority = customerIsPriority;
      if (customerAddress !== undefined) snapshotUpdateData.customerAddress = customerAddress;
      if (customerTaxId !== undefined) snapshotUpdateData.customerTaxId = customerTaxId;
      if (vehicleManufacturer !== undefined) snapshotUpdateData.vehicleManufacturer = vehicleManufacturer;
      if (vehicleModel !== undefined) snapshotUpdateData.vehicleModel = vehicleModel;
      if (vehicleColor !== undefined) snapshotUpdateData.vehicleColor = vehicleColor;
      if (vehicleVin !== undefined) snapshotUpdateData.vehicleVin = vehicleVin;
      if (intakeOdometer !== undefined) snapshotUpdateData.intakeOdometerSnapshot = parseInt(intakeOdometer, 10) || null;

      if (Object.keys(snapshotUpdateData).length > 0) {
        await tx.jobCardSnapshot.upsert({
          where: { jobcardId: id },
          update: snapshotUpdateData,
          create: {
            jobcardId: id,
            customerName: customerName || 'Walk-in Customer',
            customerMobile: customerMobile || null,
            customerDriverName: customerDriverName || null,
            customerDriverMobile: customerDriverMobile || null,
            customerIsPriority: customerIsPriority || false,
            customerAddress: customerAddress || null,
            customerTaxId: customerTaxId || null,
            vehicleRegistrationNumber: 'UNKNOWN',
            vehicleManufacturer: vehicleManufacturer || null,
            vehicleModel: vehicleModel || null,
            vehicleColor: vehicleColor || null,
            vehicleVin: vehicleVin || null,
            intakeOdometerSnapshot: parseInt(intakeOdometer, 10) || null
          }
        });
      }

      // Update Customer & Vehicle Masters
      const customerUpdateData: any = {};
      if (isOwner) {
        if (customerAddress !== undefined) customerUpdateData.addressLine1 = customerAddress;
        if (customerTaxId !== undefined) customerUpdateData.taxId = customerTaxId;
        if (customerIsPriority !== undefined) customerUpdateData.isPriority = customerIsPriority;
        if (customerDriverName !== undefined) customerUpdateData.driverName = customerDriverName;
        if (customerDriverMobile !== undefined) customerUpdateData.driverMobile = customerDriverMobile;
      }
      if (customerName !== undefined) customerUpdateData.displayName = customerName;
      
      if (customerMobile !== undefined) {
        const cleanMobile = customerMobile.replace(/\D/g, '');
        const newFormatted = cleanMobile ? (cleanMobile.length === 10 ? `+91${cleanMobile}` : customerMobile) : null;
        
        if (isOwner) {
          customerUpdateData.primaryMobile = newFormatted;
        } else if (newFormatted && newFormatted !== existing.customer.primaryMobile) {
          // Advisor flow: only push to alternateMobile
          customerUpdateData.alternateMobile = newFormatted;
        }
      }

      if (Object.keys(customerUpdateData).length > 0) {
        await tx.customer.update({
          where: { id: updatedHeader.customerId },
          data: customerUpdateData
        });
      }

      const vehicleUpdateData: any = {};
      if (vehicleManufacturer !== undefined) vehicleUpdateData.manufacturer = vehicleManufacturer;
      if (vehicleModel !== undefined) vehicleUpdateData.model = vehicleModel;
      if (vehicleColor !== undefined) vehicleUpdateData.color = vehicleColor;
      if (vehicleVin !== undefined) vehicleUpdateData.vin = vehicleVin;
      if (vehicleEngineNumber !== undefined) vehicleUpdateData.engineNumber = vehicleEngineNumber;
      if (vehicleFuelType !== undefined) vehicleUpdateData.fuelType = vehicleFuelType;
      if (intakeOdometer !== undefined) vehicleUpdateData.currentOdometer = parseInt(intakeOdometer, 10) || null;
      if (batteryMake !== undefined) vehicleUpdateData.batteryMake = batteryMake;
      if (batterySerialNumber !== undefined) vehicleUpdateData.batterySerialNumber = batterySerialNumber;
      if (batteryInstallationDate !== undefined) vehicleUpdateData.batteryInstallationDate = batteryInstallationDate ? new Date(batteryInstallationDate) : null;
      if (batteryWarrantyMonths !== undefined) vehicleUpdateData.batteryWarrantyMonths = batteryWarrantyMonths ? parseInt(batteryWarrantyMonths, 10) || null : null;
      if (nextServiceOdometer !== undefined) vehicleUpdateData.nextServiceOdometer = nextServiceOdometer ? parseInt(nextServiceOdometer, 10) || null : null;
      if (nextServiceDate !== undefined) vehicleUpdateData.nextServiceDate = nextServiceDate ? new Date(nextServiceDate) : null;
      if (insurancePolicyNumber !== undefined) vehicleUpdateData.insurancePolicyNumber = insurancePolicyNumber;
      if (insurerName !== undefined) vehicleUpdateData.insurerName = insurerName;
      if (insuranceExpiryDate !== undefined) vehicleUpdateData.insuranceExpiryDate = insuranceExpiryDate ? new Date(insuranceExpiryDate) : null;
      if (pucNumber !== undefined) vehicleUpdateData.emissionInspectionNumber = pucNumber;
      if (nextPucDate !== undefined) vehicleUpdateData.emissionInspectionExpiryDate = nextPucDate ? new Date(nextPucDate) : null;

      if (Object.keys(vehicleUpdateData).length > 0) {
        await tx.vehicle.update({
          where: { id: updatedHeader.vehicleId },
          data: vehicleUpdateData
        });
      }

      // Update Mechanics Assignment
      if (primaryMechanicId) {
        await tx.jobCardMechanic.deleteMany({ where: { jobcardId: id } });
        await tx.jobCardMechanic.create({
          data: {
            jobcardId: id,
            mechanicUserId: primaryMechanicId,
            isPrimary: true
          }
        });
      }

      // Process Part Lines
      if (parts && Array.isArray(parts)) {
        for (const p of parts) {
          if (p.isDeleted && p.id) {
            await tx.jobCardPart.delete({ where: { id: p.id } });
          } else if (p.id) {
            // Update existing part line
            const existingPart = await tx.jobCardPart.findUnique({ where: { id: p.id } });
            
            let finalHsn = p.hsnCode;
            if (finalHsn === undefined && p.partMasterId) {
              finalHsn = partsHsnMap.get(p.partMasterId) || undefined;
            }

            await tx.jobCardPart.update({
              where: { id: p.id },
              data: {
                partMasterId: p.partMasterId,
                partName: p.partName,
                quantityRequested: p.quantityRequested !== undefined ? parseFloat(p.quantityRequested) : undefined,
                status: p.status, // requested, approved, in_stock, ordered, used, etc.
                mechanicNote: p.mechanicNote,
                sellingPrice: p.sellingPrice !== undefined ? parseFloat(p.sellingPrice) : undefined,
                taxRate: p.taxRate !== undefined ? parseFloat(p.taxRate) : undefined,
                hsnCode: finalHsn !== undefined ? finalHsn : undefined,
                discountType: p.discountType,
                discountValue: p.discountValue !== undefined ? parseFloat(p.discountValue) : undefined,
                approvedByUserId: p.status === 'approved' || p.status === 'in_stock' ? p.approvedByUserId : undefined
              }
            });

            // If transitioning to 'used' or 'issued' and it wasn't before, deduct stock
            if (
              existingPart &&
              existingPart.partMasterId &&
              (p.status === 'used' || p.status === 'issued') &&
              existingPart.status !== 'used' && 
              existingPart.status !== 'issued'
            ) {
              const qtyDeducted = parseFloat(p.quantityRequested) || existingPart.quantityRequested;
              const updatedMaster = await tx.partsMaster.update({
                where: { id: existingPart.partMasterId },
                data: { stockQuantity: { decrement: qtyDeducted } }
              });
              
              await tx.inventoryLedger.create({
                data: {
                  partMasterId: existingPart.partMasterId,
                  transactionType: 'ISSUE_OUT',
                  quantity: qtyDeducted,
                  runningStock: updatedMaster.stockQuantity || 0,
                  vehicleRegNo: existing.vehicle?.registrationNumberRaw || null,
                  jobcardId: id
                }
              });
            }
          } else {
            // Create new part line
            let finalHsn = p.hsnCode;
            if (!finalHsn && p.partMasterId) {
              finalHsn = partsHsnMap.get(p.partMasterId) || null;
            }

            const newPart = await tx.jobCardPart.create({
              data: {
                jobcardId: id,
                partMasterId: p.partMasterId || null,
                partName: p.partName,
                partNumber: p.partNumber || null,
                brand: p.brand || null,
                quantityRequested: parseFloat(p.quantityRequested) || 1,
                status: p.status || 'requested',
                mechanicNote: p.mechanicNote || null,
                sellingPrice: p.sellingPrice !== undefined ? parseFloat(p.sellingPrice) : null,
                taxRate: p.taxRate !== undefined ? parseFloat(p.taxRate) : 18.00,
                hsnCode: finalHsn || null
              }
            });

            if (
              newPart.partMasterId && 
              (newPart.status === 'used' || newPart.status === 'issued')
            ) {
              const updatedMaster = await tx.partsMaster.update({
                where: { id: newPart.partMasterId },
                data: { stockQuantity: { decrement: newPart.quantityRequested } }
              });
              
              await tx.inventoryLedger.create({
                data: {
                  partMasterId: newPart.partMasterId,
                  transactionType: 'ISSUE_OUT',
                  quantity: newPart.quantityRequested,
                  runningStock: updatedMaster.stockQuantity || 0,
                  vehicleRegNo: existing.vehicle?.registrationNumberRaw || null,
                  jobcardId: id
                }
              });
            }

            // Store attached media if AI scanned photo provided
            if (p.mediaUrl) {
              await tx.jobCardMedia.create({
                data: {
                  jobcardId: id,
                  partId: newPart.id,
                  mediaType: 'work_photo',
                  phase: 'work',
                  fileUrl: p.mediaUrl,
                  fileName: 'AI_Part_Scan',
                  capturedByUserId: updatedHeader.primaryMechanicId || null
                }
              });
            }
          }
        }
      }

      // Process Labour Lines
      if (labour && Array.isArray(labour)) {
        for (const l of labour) {
          if (l.isDeleted && l.id) {
            await tx.jobCardLabour.delete({ where: { id: l.id } });
          } else if (l.id) {
            // Update existing labour line
            let finalHsn = l.hsnCode;
            if (finalHsn === undefined && l.labourMasterId) {
              finalHsn = labourHsnMap.get(l.labourMasterId) || undefined;
            }

            await tx.jobCardLabour.update({
              where: { id: l.id },
              data: {
                labourMasterId: l.labourMasterId,
                labourName: l.labourName,
                status: l.status, // pending, in_progress, completed, approved
                mechanicNote: l.mechanicNote,
                sellingPrice: l.sellingPrice !== undefined ? parseFloat(l.sellingPrice) : undefined,
                taxRate: l.taxRate !== undefined ? parseFloat(l.taxRate) : undefined,
                hsnCode: finalHsn !== undefined ? finalHsn : undefined,
                quantity: l.quantity !== undefined ? parseFloat(l.quantity) : undefined
              }
            });
          } else {
            // Create new labour line
            let finalHsn = l.hsnCode;
            if (!finalHsn && l.labourMasterId) {
              finalHsn = labourHsnMap.get(l.labourMasterId) || '9987';
            }

            await tx.jobCardLabour.create({
              data: {
                jobcardId: id,
                labourMasterId: l.labourMasterId || null,
                labourName: l.labourName,
                status: l.status || 'pending',
                mechanicNote: l.mechanicNote || null,
                sellingPrice: l.sellingPrice !== undefined ? parseFloat(l.sellingPrice) : 0,
                taxRate: l.taxRate !== undefined ? parseFloat(l.taxRate) : 18.00,
                hsnCode: finalHsn || '9987',
                quantity: parseFloat(l.quantity) || 1
              }
            });
          }
        }
      }

      // Process New Media Uploads
      if (media && Array.isArray(media)) {
        for (const m of media) {
          await tx.jobCardMedia.create({
            data: {
              jobcardId: id,
              mediaType: m.mediaType,
              phase: m.phase,
              fileUrl: m.fileUrl,
              fileName: m.fileName || null,
              captureLabel: m.captureLabel || null
            }
          });
        }
      }

      // Recalculate Job Card totals based on approved parts and labor
      const activeParts = await tx.jobCardPart.findMany({ where: { jobcardId: id } });
      const activeLabour = await tx.jobCardLabour.findMany({ where: { jobcardId: id } });

      let subtotal = 0;
      let totalTax = 0;

      // Part calculations (only sum up parts that are approved, in_stock, ordered, or used - skip requested/rejected)
      activeParts.forEach(p => {
        if (p.status !== 'requested' && p.status !== 'rejected' && p.status !== 'cancelled') {
          const price = p.sellingPrice || 0;
          const qty = p.quantityRequested || 1;
          const disc = p.discountType === 'percent' ? (price * (p.discountValue || 0) / 100) : (p.discountValue || 0);
          const lineTotal = (price - disc) * qty;
          subtotal += lineTotal;
          totalTax += lineTotal * ((p.taxRate || 18.00) / 100);
        }
      });

      // Labour calculations (sum up labor that is in_progress, completed, or approved)
      activeLabour.forEach(l => {
        const price = l.sellingPrice || 0;
        const qty = l.quantity || 1;
        const disc = l.discountType === 'percent' ? (price * (l.discountValue || 0) / 100) : (l.discountValue || 0);
        const lineTotal = (price - disc) * qty;
        subtotal += lineTotal;
        totalTax += lineTotal * ((l.taxRate || 18.00) / 100);
      });

      // Apply overall discount if applicable
      let overallDiscount = 0;
      if (updatedHeader.overallDiscountType === 'percent') {
        overallDiscount = subtotal * (updatedHeader.overallDiscountValue || 0) / 100;
      } else if (updatedHeader.overallDiscountType === 'amount') {
        overallDiscount = updatedHeader.overallDiscountValue || 0;
      }
      
      const discountedSubtotal = Math.max(0, subtotal - overallDiscount);
      // Re-scale tax proportionally if discount was overall
      const taxRatio = subtotal > 0 ? (discountedSubtotal / subtotal) : 0;
      const finalTax = totalTax * taxRatio;
      const total = discountedSubtotal + finalTax;

      // Update calculations in the DB
      const finalHeader = await tx.jobCard.update({
        where: { id },
        data: {
          subtotalAmount: subtotal,
          taxAmount: finalTax,
          totalAmount: total
        }
      });

      // Fetch the fully updated state to record the audit log
      const updatedJobCardState = await tx.jobCard.findUnique({
        where: { id },
        include: {
          customer: true,
          vehicle: true,
          snapshot: true,
          mechanics: true,
          complaints: true,
          labourLines: true,
          partLines: true
        }
      });

      // Create Audit Log
      await tx.jobCardAuditLog.create({
        data: {
          jobcardId: id,
          userId: editorId || null,
          actionType: 'EDIT_JOBCARD',
          previousState: JSON.stringify(existing),
          newState: JSON.stringify(updatedJobCardState)
        }
      });

      return updatedJobCardState;
    });

    return NextResponse.json({ success: true, jobcard: result });

  } catch (err: any) {
    console.error('Update failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const jobcard = await prisma.jobCard.findUnique({
      where: { id }
    });

    if (!jobcard) {
      return NextResponse.json({ success: false, error: 'Job Card not found' }, { status: 404 });
    }

    await prisma.jobCard.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Job Card deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
