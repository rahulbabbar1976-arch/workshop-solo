import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM format, defaults to current
  
  try {
    // Build date range
    let startDate: Date, endDate: Date;
    if (month) {
      const [year, m] = month.split('-').map(Number);
      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // === Parallel queries for speed ===
    const [
      allJobs,
      closedThisMonth,
      closedToday,
      closedThisWeek,
      purchasesThisMonth,
      openJobs,
      lowStockParts,
      recentLedger,
      suppliers,
    ] = await Promise.all([
      // All non-draft jobs for funnel
      prisma.jobCard.findMany({
        where: { status: { not: 'draft' } },
        select: { id: true, status: true, totalAmount: true, subtotalAmount: true, taxAmount: true, closedAt: true, createdAt: true, primaryMechanicId: true, customerId: true }
      }),
      // Closed this month
      prisma.jobCard.findMany({
        where: { status: 'closed', closedAt: { gte: startDate, lte: endDate } },
        include: { partLines: true, labourLines: true, snapshot: true }
      }),
      // Closed today
      prisma.jobCard.findMany({
        where: { status: 'closed', closedAt: { gte: todayStart, lte: todayEnd } },
        select: { totalAmount: true }
      }),
      // Closed this week
      prisma.jobCard.findMany({
        where: { status: 'closed', closedAt: { gte: weekStart } },
        select: { totalAmount: true }
      }),
      // Parts purchases this month
      prisma.partPurchase.findMany({
        where: { dateOfPurchase: { gte: startDate, lte: endDate } },
        select: { purchasePrice: true, quantityBought: true, paymentMode: true, supplierName: true }
      }),
      // Open jobs (for alerts)
      prisma.jobCard.findMany({
        where: { status: { in: ['open', 'in_progress', 'waiting_for_parts', 'ready_for_review', 'ready_for_delivery'] } },
        include: { snapshot: true, partLines: true }
      }),
      // Low stock parts
      prisma.partsMaster.findMany({
        where: { isActive: true },
        select: { id: true, partName: true, stockQuantity: true, safetyStock: true, category: true }
      }),
      // Recent inventory ledger
      prisma.inventoryLedger.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { partMaster: { select: { partName: true, defaultSellingPrice: true } } }
      }),
      // Supplier balances
      prisma.supplier.findMany({
        select: { id: true, name: true, outstandingBalance: true },
        orderBy: { outstandingBalance: 'desc' },
        take: 5
      })
    ]);

    // === Revenue KPIs ===
    const revenueToday = closedToday.reduce((s, j) => s + (j.totalAmount || 0), 0);
    const revenueWeek = closedThisWeek.reduce((s, j) => s + (j.totalAmount || 0), 0);
    const revenueMonth = closedThisMonth.reduce((s, j) => s + (j.totalAmount || 0), 0);

    // === GST Breakdown (from closed jobs) ===
    let totalGSTCollected = 0;
    let cgstCollected = 0;
    let sgstCollected = 0;
    closedThisMonth.forEach(job => {
      const tax = job.taxAmount || 0;
      totalGSTCollected += tax;
      cgstCollected += tax / 2;
      sgstCollected += tax / 2;
    });

    // Input credit from purchases (assuming 18% GST on parts purchased)
    const totalPurchaseCost = purchasesThisMonth.reduce((s, p) => s + (p.purchasePrice * p.quantityBought), 0);
    const inputGSTCredit = totalPurchaseCost * 0.18 / 1.18; // Extract GST from inclusive price
    const netGSTPayable = Math.max(0, totalGSTCollected - inputGSTCredit);

    // === Parts Cost from Ledger (COGS) ===
    const issueledger = recentLedger.filter(l => l.transactionType === 'ISSUE_OUT' && l.createdAt >= startDate && l.createdAt <= endDate);
    const estimatedCOGS = issueledger.reduce((s, l) => {
      const approxCost = (l.partMaster.defaultSellingPrice || 0) * 0.6 * l.quantity; // ~60% of selling is cost estimate
      return s + approxCost;
    }, 0);

    const grossProfit = revenueMonth - estimatedCOGS;
    const grossMarginPct = revenueMonth > 0 ? (grossProfit / revenueMonth) * 100 : 0;

    // === Job Flow Funnel ===
    const statusCounts: Record<string, number> = {};
    allJobs.forEach(j => {
      statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
    });

    // === Mechanic Performance ===
    const mechanicMap: Record<string, { jobs: number; revenue: number; id: string }> = {};
    closedThisMonth.forEach(job => {
      if (job.primaryMechanicId) {
        const id = job.primaryMechanicId;
        if (!mechanicMap[id]) mechanicMap[id] = { jobs: 0, revenue: 0, id };
        mechanicMap[id].jobs++;
        mechanicMap[id].revenue += job.totalAmount || 0;
      }
    });
    const mechanicPerf = Object.values(mechanicMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Fetch mechanic names
    const mechanicIds = mechanicPerf.map(m => m.id);
    const mechanics = mechanicIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: mechanicIds } },
      select: { id: true, fullName: true }
    }) : [];
    const mechanicNames: Record<string, string> = {};
    mechanics.forEach(m => { mechanicNames[m.id] = m.fullName; });

    // === Top Customers ===
    const customerRevMap: Record<string, { name: string; revenue: number }> = {};
    closedThisMonth.forEach(job => {
      const snap = job.snapshot;
      if (snap) {
        if (!customerRevMap[job.customerId]) customerRevMap[job.customerId] = { name: snap.customerName, revenue: 0 };
        customerRevMap[job.customerId].revenue += job.totalAmount || 0;
      }
    });
    const topCustomers = Object.values(customerRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // === Top Parts Consumed ===
    const partsMap: Record<string, { name: string; qty: number }> = {};
    issueledger.forEach(l => {
      const name = l.partMaster.partName;
      if (!partsMap[name]) partsMap[name] = { name, qty: 0 };
      partsMap[name].qty += l.quantity;
    });
    const topParts = Object.values(partsMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // === Alerts ===
    const lowStock = lowStockParts.filter(p => (p.stockQuantity || 0) <= (p.safetyStock || 2));

    // Vehicles with upcoming service/insurance/PUC in 30 days
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const vehicleAlerts = await prisma.vehicle.findMany({
      where: {
        OR: [
          { insuranceExpiryDate: { lte: thirtyDaysOut } },
          { emissionInspectionExpiryDate: { lte: thirtyDaysOut } },
          { nextServiceDate: { lte: thirtyDaysOut } }
        ]
      },
      include: { currentCustomer: { select: { displayName: true, primaryMobile: true } } },
      take: 10
    });

    // Unpaid invoices older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const unpaidJobs = openJobs.filter(j => j.createdAt < sevenDaysAgo && j.partLines.length > 0);

    // Monthly revenue trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date();
      mStart.setDate(1);
      mStart.setMonth(mStart.getMonth() - i);
      mStart.setHours(0, 0, 0, 0);
      const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0, 23, 59, 59);
      const monthJobs = allJobs.filter(j => j.closedAt && j.closedAt >= mStart && j.closedAt <= mEnd && j.status === 'closed');
      const rev = monthJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
      monthlyTrend.push({
        month: mStart.toLocaleString('default', { month: 'short' }),
        revenue: Math.round(rev),
        jobs: monthJobs.length
      });
    }

    // === Active Jobs & Budget Risks ===
    let activeJobsCount = 0;
    let marginRiskCount = 0;
    const marginRiskJobs: any[] = [];
    
    openJobs.forEach(job => {
      activeJobsCount++;
      
      // @ts-ignore
      const totalPartsSale = job.partLines.reduce((acc, p) => acc + ((p.sellingPrice || 0) * (p.quantityUsed || p.quantityRequested)), 0);
      // @ts-ignore
      const totalDiscount = job.overallDiscountValue || 0;
      
      let riskReason = null;
      if (job.subtotalAmount && job.subtotalAmount > 0) {
        if (totalPartsSale / job.subtotalAmount > 0.8) {
          riskReason = 'High parts ratio (Low Labour Margin)';
        }
        
        // @ts-ignore
        const discountRatio = job.overallDiscountType === 'percent' 
          ? totalDiscount 
          : (totalDiscount / job.subtotalAmount) * 100;
          
        if (discountRatio > 15) {
          riskReason = 'High Discount (>15%)';
        }
      }
      
      if (riskReason) {
        marginRiskCount++;
        marginRiskJobs.push({
          id: job.id,
          // @ts-ignore
          jobcardNumber: job.jobcardNumber,
          totalAmount: job.totalAmount,
          riskReason
        });
      }
    });

    return NextResponse.json({
      success: true,
      kpis: {
        revenueToday: Math.round(revenueToday),
        revenueWeek: Math.round(revenueWeek),
        revenueMonth: Math.round(revenueMonth),
        grossProfit: Math.round(grossProfit),
        grossMarginPct: Math.round(grossMarginPct),
        totalJobsMonth: closedThisMonth.length,
        totalPurchaseCost: Math.round(totalPurchaseCost),
        cgstCollected: Math.round(cgstCollected),
        sgstCollected: Math.round(sgstCollected),
        totalGSTCollected: Math.round(totalGSTCollected),
        inputGSTCredit: Math.round(inputGSTCredit),
        netGSTPayable: Math.round(netGSTPayable),
        totalSupplierOutstanding: suppliers.reduce((s, sup) => s + sup.outstandingBalance, 0),
        activeJobsCount,
        marginRiskCount
      },
      marginRiskJobs: marginRiskJobs.slice(0, 10),
      funnel: statusCounts,
      monthlyTrend,
      mechanicPerf: mechanicPerf.map(m => ({ ...m, name: mechanicNames[m.id] || 'Unknown', revenue: Math.round(m.revenue) })),
      topCustomers,
      topParts,
      lowStock,
      vehicleAlerts: vehicleAlerts.slice(0, 5),
      unpaidJobsCount: unpaidJobs.length,
      suppliers: suppliers.map(s => ({ ...s, outstandingBalance: Math.round(s.outstandingBalance) }))
    });

  } catch (err: any) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
