import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, supplierName, notes, lines } = body;

    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. If we are updating lines, we'll replace existing lines
      if (lines && Array.isArray(lines)) {
        // Delete old lines
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: id }
        });

        let total = 0;
        for (const line of lines) {
          const qty = parseFloat(line.quantity) || 1;
          const cost = parseFloat(line.estimatedUnitCost) || 0;
          const lineTotal = qty * cost;
          total += lineTotal;

          await tx.purchaseOrderLine.create({
            data: {
              purchaseOrderId: id,
              partMasterId: line.partMasterId || null,
              partName: line.partName,
              partNumber: line.partNumber || null,
              brand: line.brand || null,
              category: line.category || 'Other',
              quantity: qty,
              estimatedUnitCost: cost,
              totalCost: lineTotal
            }
          });
        }

        // Update total amount
        await tx.purchaseOrder.update({
          where: { id },
          data: { totalAmount: total }
        });
      }

      // 2. Update Header details
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: status || existingOrder.status,
          supplierName: supplierName !== undefined ? supplierName : existingOrder.supplierName,
          notes: notes !== undefined ? notes : existingOrder.notes
        },
        include: { lines: true }
      });

      // 3. Inventory Adjustment & Supplier Account Ledger Credit: If transitioning to 'received' status
      if (status === 'received' && existingOrder.status !== 'received') {
        // Adjust Supplier ledger balance
        const sName = updatedPo.supplierName || 'General Vendor';
        const supplier = await tx.supplier.findFirst({
          where: { name: sName }
        });
        if (supplier) {
          await tx.supplier.update({
            where: { id: supplier.id },
            data: {
              outstandingBalance: {
                increment: updatedPo.totalAmount
              }
            }
          });
          await tx.supplierTransaction.create({
            data: {
              supplierId: supplier.id,
              type: 'purchase',
              referenceId: updatedPo.id,
              amount: updatedPo.totalAmount,
              notes: `Purchase: Received PO #${updatedPo.poNumber}`
            }
          });
        }

        for (const line of updatedPo.lines) {
          if (line.partMasterId) {
            await tx.partsMaster.update({
              where: { id: line.partMasterId },
              data: {
                stockQuantity: { increment: line.quantity },
                lastUsedAt: new Date()
              }
            });
          } else {
            // Find by exact name match
            const match = await tx.partsMaster.findFirst({
              where: { partName: line.partName }
            });
            if (match) {
              await tx.partsMaster.update({
                where: { id: match.id },
                data: {
                  stockQuantity: { increment: line.quantity },
                  lastUsedAt: new Date()
                }
              });
            }
          }
        }
      }

      return updatedPo;
    });

    return NextResponse.json({ success: true, order: updated });

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
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    if (existing.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'Only draft Purchase Orders can be deleted.' }, { status: 400 });
    }

    await prisma.purchaseOrder.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Purchase Order deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
