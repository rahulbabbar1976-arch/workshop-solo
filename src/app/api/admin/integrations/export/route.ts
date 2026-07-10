import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateTallyLedgerXml, generateTallyVoucherXml, TallyLedger, TallyVoucher } from '@/lib/integrations/tally';
import { generateBusyLedgerCsv, generateBusyVoucherCsv } from '@/lib/integrations/busy';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const system = searchParams.get('system'); // 'tally' or 'busy'
    const type = searchParams.get('type'); // 'ledgers' or 'vouchers'
    
    // Default to last 30 days if not provided
    const days = parseInt(searchParams.get('days') || '30');
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    if (!system || !type) {
      return NextResponse.json({ error: 'system and type are required' }, { status: 400 });
    }

    if (type === 'ledgers') {
      const customers = await db.customer.findMany({
        where: { createdAt: { gte: sinceDate } }
      });

      if (system === 'tally') {
        const ledgers: TallyLedger[] = customers.map(c => ({
          name: c.displayName + (c.customerCode ? ` (${c.customerCode})` : ''),
          group: 'Sundry Debtors',
          mobile: c.primaryMobile || undefined,
          address: c.addressLine1 || undefined,
          state: c.state || undefined,
          gstin: c.taxId || undefined
        }));
        const xml = generateTallyLedgerXml(ledgers);
        return new NextResponse(xml, {
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="tally_ledgers_${new Date().getTime()}.xml"`
          }
        });
      } else if (system === 'busy') {
        const csv = generateBusyLedgerCsv(customers);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="busy_ledgers_${new Date().getTime()}.csv"`
          }
        });
      }
    } else if (type === 'vouchers') {
      // Fetch closed JobCards
      const jobCards = await db.jobCard.findMany({
        where: {
          status: 'closed',
          closedAt: { gte: sinceDate }
        },
        include: {
          customer: true,
          partLines: true,
          labourLines: true
        }
      });

      if (system === 'tally') {
        const vouchers: TallyVoucher[] = jobCards.map(jc => {
          const dateStr = jc.closedAt ? jc.closedAt.toISOString().split('T')[0].replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
          
          return {
            voucherType: 'Sales',
            date: dateStr,
            voucherNumber: jc.jobcardNumber,
            partyLedgerName: jc.customer.displayName + (jc.customer.customerCode ? ` (${jc.customer.customerCode})` : ''),
            ledgerEntries: [
              {
                ledgerName: jc.customer.displayName + (jc.customer.customerCode ? ` (${jc.customer.customerCode})` : ''),
                amount: -(jc.totalAmount || 0), // Debit (negative in Tally XML for Sales party)
                isDeemedPositive: 'Yes'
              },
              {
                ledgerName: 'Sales Account',
                amount: (jc.subtotalAmount || 0), // Credit
                isDeemedPositive: 'No'
              },
              {
                ledgerName: 'Output Tax',
                amount: (jc.taxAmount || 0), // Credit
                isDeemedPositive: 'No'
              }
            ]
          };
        });
        
        const xml = generateTallyVoucherXml(vouchers);
        return new NextResponse(xml, {
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="tally_vouchers_${new Date().getTime()}.xml"`
          }
        });
      } else if (system === 'busy') {
        // Transform for Busy
        const busyVouchers = jobCards.map(jc => {
          const items = [];
          for (const p of jc.partLines) {
            items.push({
              name: p.partName,
              quantity: p.quantityUsed || p.quantityRequested,
              unit: 'PCS',
              price: p.sellingPrice || 0,
              amount: (p.quantityUsed || p.quantityRequested) * (p.sellingPrice || 0),
              taxAmount: 0 // Simplification, need actual tax calculation per line
            });
          }
          for (const l of jc.labourLines) {
            items.push({
              name: l.labourName,
              quantity: l.quantity,
              unit: 'JOB',
              price: l.sellingPrice || 0,
              amount: l.quantity * (l.sellingPrice || 0),
              taxAmount: 0
            });
          }

          const dateStr = jc.closedAt ? jc.closedAt.toISOString().split('T')[0].split('-').reverse().join('-') : new Date().toISOString().split('T')[0].split('-').reverse().join('-');

          return {
            voucherNo: jc.jobcardNumber,
            date: dateStr,
            partyName: jc.customer.displayName + (jc.customer.customerCode ? ` (${jc.customer.customerCode})` : ''),
            items: items,
            totalAmount: jc.totalAmount || 0,
            taxAmount: jc.taxAmount || 0
          };
        });

        const csv = generateBusyVoucherCsv(busyVouchers);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="busy_vouchers_${new Date().getTime()}.csv"`
          }
        });
      }
    }

    return NextResponse.json({ error: 'Invalid type or system' }, { status: 400 });
  } catch (error: any) {
    console.error('Integrations Export Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
