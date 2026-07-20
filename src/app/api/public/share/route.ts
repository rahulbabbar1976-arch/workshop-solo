import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { docType, id, pin } = await request.json();

    if (!docType || !id || !pin) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    let jobCardId = id;
    let estimate = null;

    if (docType === 'estimate') {
      estimate = await prisma.estimate.findUnique({
        where: { id }
      });
      if (!estimate) return NextResponse.json({ success: false, error: 'Estimate not found' }, { status: 404 });
      jobCardId = estimate.jobCardId;
    }

    const jobCard = await prisma.jobCard.findUnique({
      where: { id: jobCardId },
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

    if (!jobCard) {
      return NextResponse.json({ success: false, error: 'Jobcard not found' }, { status: 404 });
    }

    // Verify PIN
    const mobile = jobCard.customer?.primaryMobile || jobCard.customer?.alternateMobile || '';
    let correctPin = '0000';
    const cleanMobile = mobile.replace(/\D/g, ''); // strip out +91 etc
    if (cleanMobile.length >= 4) {
      correctPin = cleanMobile.slice(-4);
    }

    if (pin !== correctPin) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }

    const settings = await prisma.documentTemplate.findFirst({
      where: { documentType: docType === 'estimate' ? 'ESTIMATE' : 'JOBCARD' }
    });

    return NextResponse.json({
      success: true,
      jobCard,
      estimate,
      printSettings: settings
    });

  } catch (error: any) {
    console.error('Public share API error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
