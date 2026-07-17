import prisma from '../../lib/db';

const ZOHO_BOOKS_BASE = 'https://www.zohoapis.com/books/v3';

async function getValidToken(integration: any): Promise<string> {
  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: integration.clientId,
      client_secret: integration.clientSecret,
      refresh_token: integration.refreshToken,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to refresh token: ' + JSON.stringify(data));
  return data.access_token;
}

async function getOrCreateZohoVendor(token: string, orgId: string, name: string, gstin: string): Promise<string> {
  const headers = { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' };
  const cleanName = name.toLowerCase().trim();

  try {
    const res = await fetch(`${ZOHO_BOOKS_BASE}/contacts?organization_id=${orgId}&search_text=${encodeURIComponent(name)}&contact_type=vendor`, { headers });
    const searchData = await res.json();
    const contacts: any[] = searchData.contacts || [];
    const existing = contacts.find((c: any) => c.contact_name?.toLowerCase().trim() === cleanName);
    if (existing) return existing.contact_id;
  } catch (e) {}

  const createRes = await fetch(`${ZOHO_BOOKS_BASE}/contacts?organization_id=${orgId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contact_name: name,
      contact_type: 'vendor',
      company_name: name,
      gst_no: gstin || '',
      place_of_contact: gstin ? gstin.substring(0, 2) : '',
    }),
  });
  const createData = await createRes.json();

  if (createData.code === 3026) {
    const listRes = await fetch(`${ZOHO_BOOKS_BASE}/contacts?organization_id=${orgId}&contact_type=vendor&per_page=200`, { headers });
    const listData = await listRes.json();
    const contacts: any[] = listData.contacts || [];
    const existing = contacts.find((c: any) => c.contact_name?.toLowerCase().trim() === cleanName);
    if (existing) return existing.contact_id;
  }
  return createData.contact?.contact_id || '';
}

async function fetchZohoTaxMap(token: string, orgId: string): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const res = await fetch(`${ZOHO_BOOKS_BASE}/taxes?organization_id=${orgId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await res.json();
    const taxes: any[] = data.taxes || [];
    for (const tax of taxes) {
      const pct: number = tax.tax_percentage;
      const type: string = (tax.tax_type || '').toLowerCase();
      if (type === 'tax_group' || type.includes('igst') || type.includes('cgst')) {
        map.set(pct, tax.tax_id);
      }
    }
  } catch (e) {}
  return map;
}

async function main() {
  console.log('--- STARTING BULK SYNC OF RECENT LOCAL PURCHASES TO ZOHO BOOKS ---');

  const integration = await prisma.zohoIntegration.findFirst();
  if (!integration?.isConnected) {
    console.error('Zoho Books is not connected.');
    return;
  }

  const token = await getValidToken(integration);
  const orgId = integration.orgId;
  const taxMap = await fetchZohoTaxMap(token, orgId);

  const purchases = await prisma.partPurchase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      partMaster: true
    }
  });

  if (purchases.length === 0) {
    console.log('No recent local purchases found in the last 7 days.');
    return;
  }

  // Group purchases by invoice number
  const billsGrouped = new Map<string, any[]>();
  purchases.forEach(p => {
    const invNo = p.invoiceNumber || `BILL-UNASSIGNED-${p.dateOfPurchase.getTime()}`;
    if (!billsGrouped.has(invNo)) {
      billsGrouped.set(invNo, []);
    }
    billsGrouped.get(invNo)!.push(p);
  });

  console.log(`Found ${billsGrouped.size} distinct bills to sync.`);

  for (const [billNumber, items] of billsGrouped.entries()) {
    console.log(`\nSyncing Bill: ${billNumber} containing ${items.length} items...`);

    const sample = items[0];
    const supplierName = sample.supplierName || 'General Supplier';
    const supplierGstin = sample.supplierContact || '';
    const paymentMode = sample.paymentMode || 'Cash';
    const billDate = sample.dateOfPurchase.toISOString().split('T')[0];

    try {
      const vendorId = await getOrCreateZohoVendor(token, orgId, supplierName, supplierGstin);
      if (!vendorId) {
        console.error(`Could not resolve vendor for supplier ${supplierName}`);
        continue;
      }

      let billTotal = 0;
      const lineItems = items.map(it => {
        const qty = it.quantityBought || 1;
        const price = it.purchasePrice || 0;
        const gst = it.partMaster?.defaultTaxRate || 18;
        const taxId = taxMap.get(gst) || '';
        billTotal += qty * price * (1 + gst / 100);

        return {
          name: it.partMaster?.partName || 'Spare Part',
          rate: price,
          quantity: qty,
          hsn_or_sac: it.partMaster?.hsnCode || '',
          product_type: 'goods',
          ...(taxId ? { tax_id: taxId } : {})
        };
      });

      // Create Zoho Bill
      const headers = { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' };
      const billRes = await fetch(`${ZOHO_BOOKS_BASE}/bills?organization_id=${orgId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vendor_id: vendorId,
          bill_number: billNumber,
          date: billDate,
          line_items: lineItems
        })
      });

      const billData = await billRes.json();

      if (billData.code === 0 && billData.bill?.bill_id) {
        const billId = billData.bill.bill_id;
        console.log(`Success: Created Zoho Bill ID ${billId}`);

        // Record payment
        const paymentRes = await fetch(`${ZOHO_BOOKS_BASE}/billpayments?organization_id=${orgId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bill_id: billId,
            date: billDate,
            payment_mode: paymentMode,
            amount: billTotal,
            description: `Historical sync for bill ${billNumber}`
          })
        });

        const paymentData = await paymentRes.json();
        if (paymentData.code === 0) {
          console.log(`Success: Recorded payment of ${billTotal} for Zoho Bill ${billId}`);
        } else {
          console.warn(`Warning: Could not record payment for Zoho Bill: ${paymentData.message}`);
        }
      } else {
        console.error(`Failed to create Zoho Bill: ${billData.message}`);
      }
    } catch (err: any) {
      console.error(`Error processing bill ${billNumber}:`, err.message);
    }
  }

  console.log('\n--- SYNC COMPLETED ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
