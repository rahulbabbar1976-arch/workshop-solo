import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const packages = await prisma.servicePackage.findMany({
      where: { isActive: true },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages);
  } catch (error: any) {
    console.error("Error fetching service packages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch service packages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { packageName, packageCode, description, category, basePrice, items } = body;

    if (!packageName) {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 });
    }

    const createdPackage = await prisma.servicePackage.create({
      data: {
        packageName,
        packageCode,
        description,
        category,
        basePrice: basePrice ? parseFloat(basePrice) : null,
        items: {
          create: (items || []).map((item: any) => ({
            itemType: item.itemType || "PART",
            partMasterId: item.partMasterId || null,
            labourMasterId: item.labourMasterId || null,
            itemDescription: item.itemDescription,
            quantity: item.quantity ? parseFloat(item.quantity) : 1,
            defaultUnitPrice: item.defaultUnitPrice ? parseFloat(item.defaultUnitPrice) : 0,
            gstRate: item.gstRate ? parseFloat(item.gstRate) : 18,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(createdPackage, { status: 201 });
  } catch (error: any) {
    console.error("Error creating service package:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create service package" },
      { status: 500 }
    );
  }
}
