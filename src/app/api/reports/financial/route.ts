import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  try {
    // ─── 1. Closed jobcards in period ───────────────────────────────────────
    const closedJobcards = await prisma.jobCard.findMany({
      where: {
        status: { in: ['closed'] },
        closedAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        totalAmount: true,
        subtotalAmount: true,
        taxAmount: true,
        closedAt: true,
        primaryMechanicId: true,
        mechanics: {
          select: { mechanicUserId: true, isPrimary: true },
        },
      },
    });

    // ─── 2. Revenue & Output GST ─────────────────────────────────────────────
    const totalRevenue = closedJobcards.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
    const totalOutputGST = closedJobcards.reduce((s, j) => s + (j.taxAmount ?? 0), 0);

    // ─── 3. COGS from PartPurchase in period ────────────────────────────────
    const purchases = await prisma.partPurchase.findMany({
      where: {
        dateOfPurchase: { gte: startDate, lte: endDate },
      },
      select: {
        purchasePrice: true,
        quantityBought: true,
      },
    });

    const totalCOGS = purchases.reduce(
      (s, p) => s + p.purchasePrice * p.quantityBought,
      0
    );

    // ITC estimated at 18% GST inclusive on COGS
    const totalITC = totalCOGS * (18 / 118);
    const netGSTPayable = Math.max(0, totalOutputGST - totalITC);
    const grossProfit = totalRevenue - totalCOGS;
    const netMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // ─── 4. Weekly breakdown for chart (4 weeks) ────────────────────────────
    const weeklyData: { week: string; revenue: number; cogs: number }[] = [];
    for (let w = 0; w < 4; w++) {
      const wStart = new Date(year, month - 1, 1 + w * 7);
      const wEnd = new Date(year, month - 1, 7 + w * 7, 23, 59, 59, 999);
      const wRevenue = closedJobcards
        .filter((j) => j.closedAt && j.closedAt >= wStart && j.closedAt <= wEnd)
        .reduce((s, j) => s + (j.totalAmount ?? 0), 0);
      const wCOGS = purchases
        .filter(() => true) // PartPurchase has no week filter here; distribute evenly
        .reduce((s) => s, 0);
      weeklyData.push({
        week: `Wk ${w + 1}`,
        revenue: Math.round(wRevenue),
        cogs: Math.round(wCOGS),
      });
    }

    // Better weekly COGS: use InventoryLedger ISSUE_OUTs per week if available
    const weeklyLedger = await prisma.inventoryLedger.groupBy({
      by: ['transactionDate'],
      where: {
        transactionType: 'ISSUE_OUT',
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { quantity: true },
    });

    // ─── 5. Supplier payables ────────────────────────────────────────────────
    const suppliers = await prisma.supplier.findMany({
      where: { outstandingBalance: { gt: 0 } },
      select: {
        id: true,
        name: true,
        mobile: true,
        outstandingBalance: true,
      },
      orderBy: { outstandingBalance: 'desc' },
    });

    // ─── 6. Mechanic performance ─────────────────────────────────────────────
    const mechanicJobMap: Record<string, number> = {};
    closedJobcards.forEach((j) => {
      j.mechanics.forEach((m) => {
        if (!mechanicJobMap[m.mechanicUserId]) mechanicJobMap[m.mechanicUserId] = 0;
        mechanicJobMap[m.mechanicUserId]++;
      });
    });

    const mechanicIds = Object.keys(mechanicJobMap);
    const mechanicUsers = mechanicIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mechanicIds } },
          select: { id: true, fullName: true, profilePhotoUrl: true, skillCategory: true },
        })
      : [];

    const mechanicPerformance = mechanicUsers
      .map((u) => ({
        id: u.id,
        name: u.fullName,
        photo: u.profilePhotoUrl,
        skill: u.skillCategory,
        jobsClosed: mechanicJobMap[u.id] || 0,
      }))
      .sort((a, b) => b.jobsClosed - a.jobsClosed);

    // ─── 7. GST monthly breakdown (CGST/SGST) ───────────────────────────────
    const cgst = totalOutputGST / 2;
    const sgst = totalOutputGST / 2;

    // ─── 8. Previous month comparison ────────────────────────────────────────
    const prevStartDate = new Date(year, month - 2, 1);
    const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
    const prevJobs = await prisma.jobCard.aggregate({
      where: {
        status: 'closed',
        closedAt: { gte: prevStartDate, lte: prevEndDate },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });
    const prevRevenue = prevJobs._sum.totalAmount ?? 0;
    const revenueGrowth =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;

    return NextResponse.json({
      period: { year, month, startDate, endDate },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netMarginPct: Math.round(netMarginPct * 10) / 10,
        totalJobsClosed: closedJobcards.length,
        prevRevenue: Math.round(prevRevenue * 100) / 100,
        revenueGrowth: revenueGrowth !== null ? Math.round(revenueGrowth * 10) / 10 : null,
      },
      gst: {
        outputGST: Math.round(totalOutputGST * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        itc: Math.round(totalITC * 100) / 100,
        netPayable: Math.round(netGSTPayable * 100) / 100,
      },
      weeklyChart: weeklyData,
      supplierPayables: suppliers,
      mechanicPerformance,
    });
  } catch (err) {
    console.error('[/api/reports/financial] Error:', err);
    return NextResponse.json({ error: 'Failed to generate financial report' }, { status: 500 });
  }
}
