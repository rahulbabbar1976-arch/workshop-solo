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
        const createData = batch.map((item: any) => ({
          partNumber: item.partNumber || `PART-${Math.floor(Math.random()*10000)}`,
          partName: item.partName || 'Unknown Part',
          description: item.description || undefined,
          brand: item.brand || undefined,
          category: item.category || 'General',
          sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : 0,
          purchasePrice: item.purchasePrice ? parseFloat(item.purchasePrice) : 0,
          currentStock: item.currentStock ? parseInt(item.currentStock) : 0,
          reorderLevel: item.reorderLevel ? parseInt(item.reorderLevel) : 5,
          hsnCode: item.hsnCode || undefined
        }));

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
