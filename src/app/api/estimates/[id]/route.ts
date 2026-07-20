import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('workshop_user_id')?.value;
    
    let tenantId = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      tenantId = user?.tenantId || null;
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: { jobCard: true }
    });

    if (!estimate || (tenantId && estimate.jobCard?.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    await prisma.estimate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete estimate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
