import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entityType, data } = body;

    if (!entityType || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Batch process to avoid hitting limits
    const batchSize = 100;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      if (entityType === 'customers') {
        const createData = batch.map((item: any) => ({
          displayName: item.displayName || 'Unknown Customer',
          customerCode: item.customerCode || undefined,
          primaryMobile: item.primaryMobile || undefined,
          secondaryMobile: item.secondaryMobile || undefined,
          email: item.email || undefined,
          addressLine1: item.addressLine1 || undefined,
          addressLine2: item.addressLine2 || undefined,
          city: item.city || undefined,
          state: item.state || undefined,
          pincode: item.pincode || undefined,
          taxId: item.taxId || undefined,
        }));

        try {
          const result = await db.customer.createMany({
            data: createData
          });
          successCount += result.count;
          failedCount += (batch.length - result.count);
        } catch (e: any) {
          failedCount += batch.length;
          errors.push(e.message);
        }
      } else if (entityType === 'vehicles') {
        // Vehicles are a bit trickier because they need a customerId ideally.
        // If they provided customerMobile, we could try to look it up.
        // For simple import, we might just create the vehicle without customer if not found.
        for (const item of batch) {
          try {
            let customerId: string | undefined = undefined;
            if (item.customerMobile) {
              const customer = await db.customer.findFirst({
                where: { primaryMobile: item.customerMobile }
              });
              if (customer) customerId = customer.id;
            }

            if (!item.registrationNumber) {
              throw new Error('Registration number is required');
            }
            if (!customerId) {
              throw new Error('Valid customer is required');
            }

            await db.vehicle.create({
              data: {
                registrationNumberRaw: item.registrationNumber,
                registrationNumberNormalized: item.registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                manufacturer: item.make || '',
                model: item.model || '',
                variant: item.variant || undefined,
                manufactureYear: item.year ? parseInt(item.year) : undefined,
                vin: item.vin || undefined,
                engineNumber: item.engineNumber || undefined,
                fuelType: item.fuelType || undefined,
                currentCustomerId: customerId
              }
            });
            successCount++;
          } catch (e: any) {
            failedCount++;
            if (errors.length < 20) errors.push(`Vehicle ${item.registrationNumber}: ${e.message}`);
          }
        }
      } else if (entityType === 'parts') {
        const categoryMap = [
          { keywords: ['filter'], family: 'Filters', hsn: '8421' },
          { keywords: ['coolant'], family: 'Coolant', hsn: '3820' },
          { keywords: ['oil', 'lubricant', 'grease', 'fluid'], family: 'Lubricants', hsn: '2710' },
          { keywords: ['pad', 'shoe', 'rotor', 'caliper', 'brake', 'brk'], family: 'Brakes', hsn: '8708' },
          { keywords: ['battery'], family: 'Batteries', hsn: '8507' },
          { keywords: ['tire', 'tyre'], family: 'Tires', hsn: '4011' },
          { keywords: ['bulb', 'light', 'lamp', 'led'], family: 'Lights', hsn: '8512' },
          { keywords: ['spark plug', 'plug', 'coil'], family: 'Ignition', hsn: '8511' },
          { keywords: ['shock', 'strut', 'suspension', 'arm', 'bush'], family: 'Suspension', hsn: '8708' },
          { keywords: ['belt', 'pulley', 'timing'], family: 'Belts & Drives', hsn: '4010' },
          { keywords: ['wiper', 'blade'], family: 'Wipers', hsn: '8512' },
          { keywords: ['bearing', 'hub'], family: 'Bearings', hsn: '8482' },
          { keywords: ['sensor', 'oxygen', 'o2', 'mass air', 'maf'], family: 'Sensors', hsn: '9031' },
          { keywords: ['switch', 'relay', 'fuse'], family: 'Electricals', hsn: '8536' },
          { keywords: ['ac', 'a/c', 'air conditioner', 'compressor', 'condenser'], family: 'Air Conditioners', hsn: '8415' },
          { keywords: ['fuel'], family: 'Fuel System', hsn: '8708' },
          { keywords: ['engine'], family: 'Engine', hsn: '8409' },
          { keywords: ['mat', 'cover', 'perfume', 'accessory', 'polish'], family: 'Accessories', hsn: '8708' }
        ];

        const getCategoryAndHsn = (name: string, desc: string, providedCategory?: string, providedHsn?: string) => {
          if (providedCategory && providedCategory !== 'General' && providedHsn) {
            return { category: providedCategory, hsnCode: providedHsn };
          }
          const textToSearch = `${name || ''} ${desc || ''}`.toLowerCase();
          for (const mapping of categoryMap) {
            if (mapping.keywords.some(kw => textToSearch.includes(kw))) {
              return {
                category: providedCategory && providedCategory !== 'General' ? providedCategory : mapping.family,
                hsnCode: providedHsn || mapping.hsn
              };
            }
          }
          return { category: providedCategory || 'General', hsnCode: providedHsn };
        };

        const createData = batch.map((item: any) => {
          const autoData = getCategoryAndHsn(item.partName, item.description, item.category, item.hsnCode);
          return {
            partNumber: item.partNumber || `PART-${Math.floor(Math.random()*10000)}`,
            partName: item.partName || 'Unknown Part',
            description: item.description || undefined,
            brand: item.brand || undefined,
            category: autoData.category,
            sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : 0,
            purchasePrice: item.purchasePrice ? parseFloat(item.purchasePrice) : 0,
            currentStock: item.currentStock ? parseInt(item.currentStock) : 0,
            reorderLevel: item.reorderLevel ? parseInt(item.reorderLevel) : 5,
            hsnCode: autoData.hsnCode || undefined
          };
        });

        try {
          const result = await db.partsMaster.createMany({
            data: createData
          });
          successCount += result.count;
          failedCount += (batch.length - result.count);
        } catch (e: any) {
          failedCount += batch.length;
          errors.push(e.message);
        }
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.slice(0, 50) // limit errors array
    });
  } catch (error: any) {
    console.error('Migration Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
