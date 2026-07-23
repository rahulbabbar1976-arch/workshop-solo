import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;

    if (!vehicleId) {
      return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });
    }

    // Find all job cards for this vehicle, ordered by date desc
    const jobCards = await prisma.jobCard.findMany({
      where: { vehicleId },
      orderBy: { createdAt: "desc" },
      include: {
        partLines: {
          orderBy: { createdAt: "desc" },
        },
        labourLines: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const partPricingMap: Record<string, { unitPrice: number; jobcardNumber: string; date: Date }> = {};
    const labourPricingMap: Record<string, { unitPrice: number; jobcardNumber: string; date: Date }> = {};

    jobCards.forEach((jc) => {
      jc.partLines.forEach((part) => {
        const key = (part.partName || "").toLowerCase().trim();
        if (key && !partPricingMap[key]) {
          partPricingMap[key] = {
            unitPrice: part.sellingPrice || 0,
            jobcardNumber: jc.jobcardNumber,
            date: jc.createdAt,
          };
        }
      });

      jc.labourLines.forEach((labour) => {
        const key = (labour.labourName || "").toLowerCase().trim();
        if (key && !labourPricingMap[key]) {
          labourPricingMap[key] = {
            unitPrice: labour.sellingPrice || 0,
            jobcardNumber: jc.jobcardNumber,
            date: jc.createdAt,
          };
        }
      });
    });

    return NextResponse.json({
      vehicleId,
      partsHistory: partPricingMap,
      labourHistory: labourPricingMap,
    });
  } catch (error: any) {
    console.error("Error fetching vehicle pricing history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch vehicle pricing history" },
      { status: 500 }
    );
  }
}
