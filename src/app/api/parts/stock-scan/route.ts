import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parts, invoiceNumber, supplierName, dateOfPurchase, paymentMode } = body;

    if (!parts || !Array.isArray(parts)) {
      return NextResponse.json({ success: false, error: 'Invalid parts payload' }, { status: 400 });
    }

    let updatedCount = 0;
    let createdCount = 0;

    for (const item of parts) {
      const name = (item.partName || '').trim();
      const partNum = (item.partNumber || '').trim();
      const brand = (item.brand || '').trim();
      const qty = parseFloat(item.quantity) || 0;
      const unitCost = parseFloat(item.estimatedCost) || 0;
      const rack = (item.rackNumber || '').trim();
      const bin = (item.binNumber || '').trim();
      
      const vehicleMake = (item.vehicleMake || '').trim() || null;
      const vehicleModel = (item.vehicleModel || '').trim() || null;
      const vehicleYear = (item.vehicleYear || '').trim() || null;
      
      const action = item.action || 'auto'; // 'create', 'update', 'auto'
      const providedPartId = item.matchedPartId;

      if (!name) continue;

      let targetPartId = '';
      let currentStock = 0;

      // Determine if we are updating an existing part
      let existingPart = null;
      if (action === 'update' && providedPartId) {
        existingPart = await prisma.partsMaster.findUnique({ where: { id: providedPartId } });
      } else if (action === 'auto') {
        if (partNum) {
          existingPart = await prisma.partsMaster.findFirst({
            where: { partNumber: partNum, isActive: true }
          });
        }
        if (!existingPart) {
          existingPart = await prisma.partsMaster.findFirst({
            where: { partName: { equals: name }, isActive: true }
          });
        }
      }

      if (existingPart && action !== 'create') {
        // Update existing part
        currentStock = existingPart.stockQuantity || 0;
        await prisma.partsMaster.update({
          where: { id: existingPart.id },
          data: {
            stockQuantity: currentStock + qty,
            rackNumber: rack || existingPart.rackNumber,
            binNumber: bin || existingPart.binNumber,
            lastUsedAt: new Date(),
            defaultSellingPrice: existingPart.defaultSellingPrice || Math.round(unitCost * 1.4),
            vehicleMake: existingPart.vehicleMake || vehicleMake,
            vehicleModel: existingPart.vehicleModel || vehicleModel,
            vehicleYear: existingPart.vehicleYear || vehicleYear
          }
        });
        targetPartId = existingPart.id;
        updatedCount++;
      } else {
        // Create new part in catalog
        let category = 'Other';
        const nameLower = name.toLowerCase();
        if (nameLower.includes('filter')) category = 'Filters';
        else if (nameLower.includes('oil') || nameLower.includes('lubricant') || nameLower.includes('fluid') || nameLower.includes('coolant')) category = 'Lubricants';
        else if (nameLower.includes('battery') || nameLower.includes('cell')) category = 'Batteries';
        else if (nameLower.includes('brake') || nameLower.includes('pad') || nameLower.includes('disc')) category = 'Brakes';
        else if (nameLower.includes('shock') || nameLower.includes('suspension')) category = 'Suspension';
        else if (nameLower.includes('bulb') || nameLower.includes('sensor') || nameLower.includes('spark') || nameLower.includes('plug')) category = 'Electricals';
        else if (nameLower.includes('wiper') || nameLower.includes('mat') || nameLower.includes('accessories')) category = 'Accessories';

        const newPart = await prisma.partsMaster.create({
          data: {
            partName: name,
            partNumber: partNum || null,
            brand: brand || 'Premium',
            stockQuantity: qty,
            defaultSellingPrice: Math.round(unitCost * 1.4) || 200,
            category,
            safetyStock: 2,
            rackNumber: rack || null,
            binNumber: bin || null,
            vehicleMake,
            vehicleModel,
            vehicleYear,
            isActive: true
          }
        });
        targetPartId = newPart.id;
        currentStock = 0;
        createdCount++;
      }

      if (qty > 0) {
        // Log to PartPurchase
        await prisma.partPurchase.create({
          data: {
            partMasterId: targetPartId,
            dateOfPurchase: dateOfPurchase ? new Date(dateOfPurchase) : new Date(),
            invoiceNumber: invoiceNumber || null,
            supplierName: supplierName || null,
            purchasePrice: unitCost,
            quantityBought: qty,
            paymentMode: paymentMode || null
          }
        });

        // Log strictly to InventoryLedger
        await prisma.inventoryLedger.create({
          data: {
            partMasterId: targetPartId,
            transactionType: 'PURCHASE_IN',
            quantity: qty,
            runningStock: currentStock + qty,
            supplierName: supplierName || null,
            paymentMode: paymentMode || null,
            transactionDate: dateOfPurchase ? new Date(dateOfPurchase) : new Date()
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      createdCount,
      message: `Successfully processed intake. Updated ${updatedCount} and created ${createdCount} parts.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
