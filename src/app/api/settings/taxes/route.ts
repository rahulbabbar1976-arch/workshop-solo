import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Hardcoded profile ID since there's no auth in this solo instance
const PROFILE_ID = "default";

export async function GET() {
  try {
    let taxSettings = await prisma.taxSettings.findFirst({
      where: { workshopProfileId: PROFILE_ID }
    });

    if (!taxSettings) {
      taxSettings = await prisma.taxSettings.create({
        data: {
          workshopProfileId: PROFILE_ID,
          taxesApplicable: false,
          intrastateCgstRate: 9,
          intrastateSgstRate: 9,
          interstateIgstRate: 18,
          defaultTaxMode: "exclusive",
          defaultDiscountMode: "line_item"
        }
      });
    }

    return NextResponse.json({ success: true, taxSettings });
  } catch (error: any) {
    console.error("GET /api/settings/taxes error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    let taxSettings = await prisma.taxSettings.findFirst({
      where: { workshopProfileId: PROFILE_ID }
    });

    if (taxSettings) {
      taxSettings = await prisma.taxSettings.update({
        where: { id: taxSettings.id },
        data: {
          taxesApplicable: body.taxesApplicable,
          gstNumber: body.gstNumber,
          intrastateCgstRate: body.intrastateCgstRate,
          intrastateSgstRate: body.intrastateSgstRate,
          interstateIgstRate: body.interstateIgstRate,
          defaultTaxMode: body.defaultTaxMode,
          defaultDiscountMode: body.defaultDiscountMode,
        }
      });
    } else {
      taxSettings = await prisma.taxSettings.create({
        data: {
          workshopProfileId: PROFILE_ID,
          taxesApplicable: body.taxesApplicable ?? false,
          gstNumber: body.gstNumber,
          intrastateCgstRate: body.intrastateCgstRate ?? 9,
          intrastateSgstRate: body.intrastateSgstRate ?? 9,
          interstateIgstRate: body.interstateIgstRate ?? 18,
          defaultTaxMode: body.defaultTaxMode ?? "exclusive",
          defaultDiscountMode: body.defaultDiscountMode ?? "line_item"
        }
      });
    }

    return NextResponse.json({ success: true, taxSettings });
  } catch (error: any) {
    console.error("PUT /api/settings/taxes error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
