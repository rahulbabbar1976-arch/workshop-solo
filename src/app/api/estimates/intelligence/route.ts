import { NextResponse } from 'next/server';
import { suggestParts } from '@/lib/intelligence/parts-suggestions';
import { predictLabourHours } from '@/lib/intelligence/labour-prediction';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { vehicleMake, vehicleModel, complaint, jobCardId } = body;

    if (jobCardId && (!vehicleMake || !complaint)) {
      const jc = await prisma.jobCard.findUnique({
        where: { id: jobCardId },
        include: {
          vehicle: true,
          complaints: true,
        },
      });

      if (jc) {
        vehicleMake = vehicleMake || (jc.vehicle as any)?.manufacturer || (jc.vehicle as any)?.make || 'General';
        vehicleModel = vehicleModel || jc.vehicle?.model || 'Vehicle';
        if (!complaint) {
          complaint = jc.complaints.map(c => c.customerComplaintText || c.advisorObservationText || '').filter(Boolean).join('. ') || 'General Service & Inspection';
        }
      }
    }

    if (!vehicleMake || !vehicleModel || !complaint) {
      return NextResponse.json(
        { success: false, error: 'vehicleMake, vehicleModel, and complaint (or a valid jobCardId) are required.' },
        { status: 400 }
      );
    }

    const [parts, labour] = await Promise.all([
      suggestParts(vehicleMake, vehicleModel, complaint),
      predictLabourHours(vehicleMake, vehicleModel, complaint)
    ]);

    return NextResponse.json({
      success: true,
      data: { vehicleMake, vehicleModel, complaint, parts, labour }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
