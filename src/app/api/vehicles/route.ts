import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meta = searchParams.get('meta');
  
  if (meta === 'true') {
    try {
      const allVehicles = await prisma.vehicle.findMany({
        select: {
          manufacturer: true,
          model: true
        },
        where: {
          isActive: true
        }
      });
      
      const manufacturersSet = new Set<string>();
      const modelsMap: { [make: string]: Set<string> } = {};
      
      allVehicles.forEach(v => {
        if (v.manufacturer) {
          const make = v.manufacturer.trim();
          manufacturersSet.add(make);
          if (v.model) {
            const mdl = v.model.trim();
            if (!modelsMap[make]) {
              modelsMap[make] = new Set<string>();
            }
            modelsMap[make].add(mdl);
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        manufacturers: Array.from(manufacturersSet).sort(),
        models: Object.keys(modelsMap).reduce((acc, make) => {
          acc[make] = Array.from(modelsMap[make]).sort();
          return acc;
        }, {} as { [make: string]: string[] })
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  const q = searchParams.get('q') || '';
  
  if (!q) {
    try {
      const vehicles = await prisma.vehicle.findMany({
        orderBy: { registrationNumberNormalized: 'asc' },
        include: { currentCustomer: true }
      });
      return NextResponse.json({ success: true, vehicles });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // Normalize query registration plate
  const normalizedQuery = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Extract last 4 characters and check if they are digits (fallback for typos in prefix or OCR misreads)
  const last4 = normalizedQuery.slice(-4);
  const isLast4Digits = /^\d{4}$/.test(last4);

  try {
    const searchConditions: any[] = [
      { registrationNumberNormalized: { contains: normalizedQuery } },
      { registrationNumberRaw: { contains: q } }
    ];

    if (isLast4Digits) {
      searchConditions.push({ registrationNumberNormalized: { contains: last4 } });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        OR: searchConditions
      },
      include: {
        currentCustomer: true,
        jobCards: {
          orderBy: { dateIn: 'desc' },
          take: 3,
          include: {
            partLines: true,
            labourLines: true
          }
        }
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      found: vehicles.length > 0,
      vehicles: vehicles.map(vehicle => ({
        id: vehicle.id,
        registrationNumberRaw: vehicle.registrationNumberRaw,
        registrationNumberNormalized: vehicle.registrationNumberNormalized,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        color: vehicle.color,
        fuelType: vehicle.fuelType,
        vin: vehicle.vin,
        engineNumber: vehicle.engineNumber,
        currentOdometer: vehicle.currentOdometer,
        batteryMake: vehicle.batteryMake,
        batterySerialNumber: vehicle.batterySerialNumber,
        batteryInstallationDate: vehicle.batteryInstallationDate,
        batteryWarrantyMonths: vehicle.batteryWarrantyMonths,
        nextServiceOdometer: vehicle.nextServiceOdometer,
        nextServiceDate: vehicle.nextServiceDate,
        insurancePolicyNumber: vehicle.insurancePolicyNumber,
        insurerName: vehicle.insurerName,
        insuranceExpiryDate: vehicle.insuranceExpiryDate,
        pucNumber: vehicle.emissionInspectionNumber,
        nextPucDate: vehicle.emissionInspectionExpiryDate,
        notes: vehicle.notes,
        currentCustomer: vehicle.currentCustomer,
        history: vehicle.jobCards.map(jc => ({
          id: jc.id,
          jobcardNumber: jc.jobcardNumber,
          dateIn: jc.dateIn,
          status: jc.status,
          odometer: jc.intakeOdometer,
          parts: jc.partLines.map(p => p.partName),
          labour: jc.labourLines.map(l => l.labourName)
        }))
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      registrationNumberRaw,
      manufacturer,
      model,
      color,
      fuelType,
      vin,
      engineNumber,
      currentOdometer,
      customerName,
      customerMobile,
      customerDriverName,
      customerDriverMobile,
      customerIsPriority,
      customerAddress,
      customerTaxId,
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
      isOwner = false
    } = body;

    if (!registrationNumberRaw) {
      return NextResponse.json({ success: false, error: 'Registration number is required' }, { status: 400 });
    }

    const registrationNumberNormalized = registrationNumberRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Find or Create/Update Customer
    let customer = null;
    const cleanMobile = customerMobile ? customerMobile.replace(/\D/g, '') : '';
    const inputName = (customerName || '').trim().toLowerCase();
    
    if (cleanMobile && cleanMobile.length === 10) {
      const potentialCustomers = await prisma.customer.findMany({
        where: {
          OR: [
            { primaryMobile: `+91${cleanMobile}` },
            { primaryMobile: cleanMobile }
          ],
          isActive: true
        }
      });

      if (potentialCustomers.length > 0) {
        // Find a customer with the exact same name (case-insensitive)
        customer = potentialCustomers.find(c => c.displayName.trim().toLowerCase() === inputName) || null;
      }
    }

    if (customer) {
      // Update existing customer details (don't overwrite name as it already matches)
      const customerUpdateData: any = {
        driverName: customerDriverName !== undefined ? customerDriverName : customer.driverName,
        driverMobile: customerDriverMobile !== undefined ? customerDriverMobile : customer.driverMobile,
      };

      if (isOwner) {
        // Only owner can update core contact/address info
        customerUpdateData.addressLine1 = customerAddress !== undefined ? customerAddress : customer.addressLine1;
        customerUpdateData.taxId = customerTaxId !== undefined ? customerTaxId : customer.taxId;
        customerUpdateData.isPriority = customerIsPriority !== undefined ? customerIsPriority : customer.isPriority;
      } else {
        // Advisor flow: If mobile is changed, map to alternateMobile instead of replacing primary
        if (cleanMobile && `+91${cleanMobile}` !== customer.primaryMobile && cleanMobile !== customer.primaryMobile) {
          customerUpdateData.alternateMobile = `+91${cleanMobile}`;
        }
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: customerUpdateData
      });
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          displayName: customerName || 'Walk-in Customer',
          primaryMobile: cleanMobile ? `+91${cleanMobile}` : null,
          driverName: customerDriverName || null,
          driverMobile: customerDriverMobile || null,
          isPriority: customerIsPriority || false,
          addressLine1: customerAddress || null,
          taxId: customerTaxId || null,
          customerType: 'retail'
        }
      });
    }

    const customerId = customer.id;

    // 2. Check if Vehicle already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { registrationNumberNormalized }
    });

    let vehicle = null;
    let isNewOwnership = false;

    if (existingVehicle) {
      // Update existing vehicle
      vehicle = await prisma.vehicle.update({
        where: { id: existingVehicle.id },
        data: {
          registrationNumberRaw,
          manufacturer: manufacturer !== undefined ? manufacturer : existingVehicle.manufacturer,
          model: model !== undefined ? model : existingVehicle.model,
          color: color !== undefined ? color : existingVehicle.color,
          fuelType: fuelType !== undefined ? fuelType : existingVehicle.fuelType,
          vin: vin !== undefined ? vin : existingVehicle.vin,
          engineNumber: engineNumber !== undefined ? engineNumber : existingVehicle.engineNumber,
          currentOdometer: currentOdometer ? parseInt(currentOdometer, 10) : existingVehicle.currentOdometer,
          batteryMake: batteryMake !== undefined ? batteryMake : existingVehicle.batteryMake,
          batterySerialNumber: batterySerialNumber !== undefined ? batterySerialNumber : existingVehicle.batterySerialNumber,
          batteryInstallationDate: batteryInstallationDate !== undefined ? (batteryInstallationDate ? new Date(batteryInstallationDate) : null) : existingVehicle.batteryInstallationDate,
          batteryWarrantyMonths: batteryWarrantyMonths !== undefined ? (batteryWarrantyMonths ? parseInt(batteryWarrantyMonths, 10) : null) : existingVehicle.batteryWarrantyMonths,
          nextServiceOdometer: nextServiceOdometer !== undefined ? (nextServiceOdometer ? parseInt(nextServiceOdometer, 10) : null) : existingVehicle.nextServiceOdometer,
          nextServiceDate: nextServiceDate !== undefined ? (nextServiceDate ? new Date(nextServiceDate) : null) : existingVehicle.nextServiceDate,
          insurancePolicyNumber: insurancePolicyNumber !== undefined ? insurancePolicyNumber : existingVehicle.insurancePolicyNumber,
          insurerName: insurerName !== undefined ? insurerName : existingVehicle.insurerName,
          insuranceExpiryDate: insuranceExpiryDate !== undefined ? (insuranceExpiryDate ? new Date(insuranceExpiryDate) : null) : existingVehicle.insuranceExpiryDate,
          emissionInspectionNumber: pucNumber !== undefined ? pucNumber : existingVehicle.emissionInspectionNumber,
          emissionInspectionExpiryDate: nextPucDate !== undefined ? (nextPucDate ? new Date(nextPucDate) : null) : existingVehicle.emissionInspectionExpiryDate,
          ...(isOwner ? { currentCustomerId: customerId } : {}) // Update owner linkage ONLY if isOwner
        }
      });

      if (isOwner && existingVehicle.currentCustomerId !== customerId) {
        isNewOwnership = true;
      }
    } else {
      // Create new vehicle
      vehicle = await prisma.vehicle.create({
        data: {
          registrationNumberRaw,
          registrationNumberNormalized,
          manufacturer,
          model,
          color,
          fuelType,
          vin,
          engineNumber,
          currentOdometer: parseInt(currentOdometer, 10) || null,
          batteryMake: batteryMake || null,
          batterySerialNumber: batterySerialNumber || null,
          batteryInstallationDate: batteryInstallationDate ? new Date(batteryInstallationDate) : null,
          batteryWarrantyMonths: batteryWarrantyMonths ? parseInt(batteryWarrantyMonths, 10) || null : null,
          nextServiceOdometer: nextServiceOdometer ? parseInt(nextServiceOdometer, 10) || null : null,
          nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
          insurancePolicyNumber: insurancePolicyNumber || null,
          insurerName: insurerName || null,
          insuranceExpiryDate: insuranceExpiryDate ? new Date(insuranceExpiryDate) : null,
          emissionInspectionNumber: pucNumber || null,
          emissionInspectionExpiryDate: nextPucDate ? new Date(nextPucDate) : null,
          currentCustomerId: customerId,
          sourceSystem: 'advisor_manual'
        }
      });
      isNewOwnership = true;
    }

    // 3. Add to ownership history if changed or new
    if (isNewOwnership) {
      await prisma.vehicleOwnershipHistory.create({
        data: {
          vehicleId: vehicle.id,
          customerId,
          fromDate: new Date(),
          transferNotes: 'Ownership linked/updated via front desk intake'
        }
      });
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        ...vehicle,
        currentCustomer: customer
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      registrationNumberRaw,
      manufacturer,
      model,
      color,
      fuelType,
      vin,
      engineNumber,
      currentOdometer,
      insurerName,
      insurancePolicyNumber,
      insuranceExpiryDate,
      pucNumber,
      nextPucDate,
      currentCustomerId
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Vehicle ID is required' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (registrationNumberRaw !== undefined) {
      dataToUpdate.registrationNumberRaw = registrationNumberRaw;
      dataToUpdate.registrationNumberNormalized = registrationNumberRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    if (manufacturer !== undefined) dataToUpdate.manufacturer = manufacturer;
    if (model !== undefined) dataToUpdate.model = model;
    if (color !== undefined) dataToUpdate.color = color;
    if (fuelType !== undefined) dataToUpdate.fuelType = fuelType;
    if (vin !== undefined) dataToUpdate.vin = vin;
    if (engineNumber !== undefined) dataToUpdate.engineNumber = engineNumber;
    if (currentOdometer !== undefined) dataToUpdate.currentOdometer = currentOdometer ? parseInt(currentOdometer, 10) : null;
    if (insurerName !== undefined) dataToUpdate.insurerName = insurerName;
    if (insurancePolicyNumber !== undefined) dataToUpdate.insurancePolicyNumber = insurancePolicyNumber;
    if (insuranceExpiryDate !== undefined) dataToUpdate.insuranceExpiryDate = insuranceExpiryDate ? new Date(insuranceExpiryDate) : null;
    if (pucNumber !== undefined) dataToUpdate.emissionInspectionNumber = pucNumber;
    if (nextPucDate !== undefined) dataToUpdate.emissionInspectionExpiryDate = nextPucDate ? new Date(nextPucDate) : null;
    if (currentCustomerId !== undefined) dataToUpdate.currentCustomerId = currentCustomerId;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: dataToUpdate,
      include: { currentCustomer: true }
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
