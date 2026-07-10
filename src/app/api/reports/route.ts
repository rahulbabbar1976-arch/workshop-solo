import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const jobcards = await prisma.jobCard.findMany({
      include: {
        partLines: true,
        labourLines: true,
        vehicle: true
      }
    });

    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalGrand = 0;
    let partsRevenue = 0;
    let laborRevenue = 0;

    let closedCount = 0;
    let totalCloseDurationHours = 0;
    let waitingForPartsCount = 0;

    const brandCounts: Record<string, number> = {};
    const brandRevenues: Record<string, number> = {};

    for (const jc of jobcards) {
      const isBilled = jc.status === 'closed' || jc.status === 'ready_for_delivery' || jc.status === 'ready_for_review';
      
      let jcSubtotal = 0;
      let jcParts = 0;
      let jcLabour = 0;

      for (const p of jc.partLines) {
        if (p.status !== 'rejected' && p.status !== 'cancelled') {
          const disc = p.discountType === 'percent' ? ((p.sellingPrice || 0) * (p.discountValue || 0) / 100) : (p.discountValue || 0);
          const price = (p.sellingPrice || 0) - disc;
          const qty = p.quantityRequested || 1;
          const lineTotal = price * qty;
          jcSubtotal += lineTotal;
          jcParts += lineTotal;
        }
      }

      for (const l of jc.labourLines) {
        if (l.status !== 'rejected') {
          const disc = l.discountType === 'percent' ? ((l.sellingPrice || 0) * (l.discountValue || 0) / 100) : (l.discountValue || 0);
          const price = (l.sellingPrice || 0) - disc;
          const qty = l.quantity || 1;
          const lineTotal = price * qty;
          jcSubtotal += lineTotal;
          jcLabour += lineTotal;
        }
      }

      if (isBilled) {
        totalSubtotal += jcSubtotal;
        partsRevenue += jcParts;
        laborRevenue += jcLabour;
        
        const discValue = jc.overallDiscountValue || 0;
        const jcDiscount = jc.overallDiscountType === 'percent' ? (jcSubtotal * discValue / 100) : discValue;
        totalDiscount += jcDiscount;

        const jcTax = jc.taxAmount || (Math.max(0, jcSubtotal - jcDiscount) * 0.18);
        totalTax += jcTax;
        
        totalGrand += jc.totalAmount || (Math.max(0, jcSubtotal - jcDiscount) + jcTax);
      }

      if (jc.status === 'closed' && jc.closedAt) {
        closedCount++;
        const durationMs = new Date(jc.closedAt).getTime() - new Date(jc.dateIn).getTime();
        totalCloseDurationHours += durationMs / (1000 * 60 * 60);
      }

      if (jc.status === 'waiting_for_parts') {
        waitingForPartsCount++;
      }

      if (jc.vehicle?.manufacturer) {
        const brand = jc.vehicle.manufacturer.trim().toUpperCase();
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        brandRevenues[brand] = (brandRevenues[brand] || 0) + (jc.totalAmount || jcSubtotal);
      }
    }

    const avgCloseDurationDays = closedCount > 0 ? ((totalCloseDurationHours / closedCount) / 24).toFixed(1) : 'N/A';
    
    const sortedBrands = Object.keys(brandCounts).map(brand => ({
      brand,
      count: brandCounts[brand],
      totalRevenue: brandRevenues[brand],
      avgTicketSize: brandCounts[brand] > 0 ? (brandRevenues[brand] / brandCounts[brand]) : 0
    })).sort((a, b) => b.count - a.count);

    const totalRevSum = partsRevenue + laborRevenue;
    const partsPct = totalRevSum > 0 ? Math.round((partsRevenue / totalRevSum) * 100) : 50;
    const laborPct = totalRevSum > 0 ? Math.round((laborRevenue / totalRevSum) * 100) : 50;

    const advisoryInsights: string[] = [];

    if (partsPct > 70) {
      advisoryInsights.push(`⚠️ **High Parts dependence detected**: Your revenue is heavily skewed towards parts sales (${partsPct}% parts vs ${laborPct}% labor). This means your workshop acts more as a parts swapper than a repair specialist. Action: Review diagnostic rates and increase labor pricing for complex technical jobs (electrical/AC diagnostics) to improve service margins.`);
    } else if (laborPct > 70) {
      advisoryInsights.push(`⚠️ **Under-monetized parts revenue**: Your labor makes up ${laborPct}% of ticket totals. While high labor margins are good, it suggests you are missing out on upselling parts and consumables (filters, oils, brake pads) during services. Action: Train service advisors to perform comprehensive vehicle checkups and recommend components that show wear.`);
    } else {
      advisoryInsights.push(`🟢 **Healthy Revenue Balance**: Your parts-to-labor ratio is balanced (${partsPct}% parts, ${laborPct}% labor). This is optimal for multibrand garages, showing active component replacements alongside solid labor billing.`);
    }

    if (waitingForPartsCount > 2) {
      advisoryInsights.push(`⚠️ **Parts supply bottleneck**: You currently have ${waitingForPartsCount} active job cards stalled in 'Waiting for Parts'. This delays delivery times and occupies workbays. Action: Restructure vendor linkages, establish secondary spares suppliers, or keep regular service consumables (spark plugs, filters, brake pads) in stock.`);
    } else {
      advisoryInsights.push(`🟢 **Optimal workflow pace**: Few job cards are currently stalled waiting for parts, indicating a smooth inventory and turnaround pace.`);
    }

    if (sortedBrands.length > 0) {
      const topBrand = sortedBrands[0];
      advisoryInsights.push(`📈 **Volume Leader Opportunity**: *${topBrand.brand}* is your highest volume brand with ${topBrand.count} vehicles. Action: Run a target marketing campaign or create custom package deals (e.g. specialized periodic service packages) for *${topBrand.brand}* owners to boost retention.`);

      const highMarginBrand = [...sortedBrands].sort((a, b) => b.avgTicketSize - a.avgTicketSize)[0];
      if (highMarginBrand && highMarginBrand.brand !== topBrand.brand && highMarginBrand.avgTicketSize > topBrand.avgTicketSize * 1.5) {
        advisoryInsights.push(`💎 **High-Margin Segment Focus**: *${highMarginBrand.brand}* has your highest average ticket size at ₹${Math.round(highMarginBrand.avgTicketSize).toLocaleString()}. Action: Introduce VIP diagnostic priority slots, premium detailing packages, and synthetic oil upgrades for *${highMarginBrand.brand}* clients to optimize profits.`);
      }
    }

    if (closedCount < 5) {
      advisoryInsights.push("💡 **Data Collection Phase**: You have a limited number of closed job cards in the system. Continue logging vehicles, parts, and labor check-offs to unlock deeper predictive operational analytics.");
    }

    return NextResponse.json({
      success: true,
      report: {
        financials: {
          subtotal: totalSubtotal,
          discount: totalDiscount,
          tax: totalTax,
          grandTotal: totalGrand,
          partsRevenue,
          laborRevenue,
          partsPct,
          laborPct
        },
        operations: {
          activeJobs: jobcards.filter(jc => jc.status !== 'closed').length,
          closedJobs: closedCount,
          avgDaysToClose: avgCloseDurationDays,
          waitingForParts: waitingForPartsCount
        },
        brands: sortedBrands.slice(0, 5),
        insights: advisoryInsights
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
