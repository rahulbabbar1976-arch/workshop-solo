import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: {
        lines: true,
        jobCard: {
          include: {
            customer: true,
            vehicle: true,
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    const mobile = estimate.customerMobile || estimate.jobCard?.customer?.primaryMobile || '';
    const cleanMobile = mobile.replace(/\D/g, '');
    const vehicleStr = estimate.jobCard?.vehicle ? `${(estimate.jobCard.vehicle as any).manufacturer || (estimate.jobCard.vehicle as any).make || ''} ${estimate.jobCard.vehicle.model || ''}`.trim() : 'Vehicle';
    const amountStr = Number(estimate.grandTotal || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    
    const messageText = `Hello ${estimate.customerName || estimate.jobCard?.customer?.displayName || 'Customer'},\n\nYour Repair Estimate #${estimate.estimateNumber} for ${vehicleStr} is ready.\nTotal Estimated Amount: ${amountStr}.\n\nPlease review and approve your estimate.\nThank you!`;
    const whatsappUrl = cleanMobile 
      ? `https://wa.me/${cleanMobile.startsWith('91') ? cleanMobile : '91' + cleanMobile}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    // Update status to SENT
    await prisma.estimate.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Estimate marked as sent via WhatsApp',
      whatsappUrl,
    });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}
