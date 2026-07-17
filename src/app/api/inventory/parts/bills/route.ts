import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const ZOHO_BOOKS_BASE = 'https://www.zohoapis.com/books/v3';

// Get valid access token
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

// Search or create Zoho Vendor
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

// Fetch tax map
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

export async function GET() {
  try {
    const bills = await prisma.supplierBill.findMany({
      include: {
        items: {
          include: {
            partMaster: true
          }
        }
      },
      orderBy: { billDate: 'desc' }
    });
    return NextResponse.json({ success: true, bills });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { billId } = await request.json();

    if (!billId) {
      return NextResponse.json({ success: false, error: 'billId required' }, { status: 400 });
    }

    const bill = await prisma.supplierBill.findUnique({
      where: { id: billId },
      include: {
        items: {
          include: {
            partMaster: true
          }
        }
      }
    });

    if (!bill) {
      return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
    }

    // Connect to Zoho Books
    const integration = await prisma.zohoIntegration.findFirst();
    if (!integration?.isConnected) {
      return NextResponse.json({ success: false, error: 'Zoho Books is not connected.' }, { status: 400 });
    }

    const token = await getValidToken(integration);
    const orgId = integration.orgId;

    // Get/Create Vendor
    const vendorId = await getOrCreateZohoVendor(token, orgId, bill.supplierName, bill.supplierGstin || '');
    if (!vendorId) {
      return NextResponse.json({ success: false, error: 'Failed to find/create vendor in Zoho' }, { status: 400 });
    }

    const taxMap = await fetchZohoTaxMap(token, orgId);

    const lineItems = bill.items.map(item => {
      const qty = item.quantityBought || 1;
      const price = item.purchasePrice || 0;
      const gst = item.partMaster?.defaultTaxRate || 18;
      const taxId = taxMap.get(gst) || '';

      return {
        name: item.partMaster?.partName || 'Spare Part',
        rate: price,
        quantity: qty,
        hsn_or_sac: item.partMaster?.hsnCode || '',
        product_type: 'goods',
        ...(taxId ? { tax_id: taxId } : {})
      };
    });

    const headers = {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    };

    // Create Bill in Zoho Books
    const billRes = await fetch(`${ZOHO_BOOKS_BASE}/bills?organization_id=${orgId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vendor_id: vendorId,
        bill_number: bill.billNumber,
        date: bill.billDate.toISOString().split('T')[0],
        line_items: lineItems
      })
    });

    const billData = await billRes.json();

    if (billData.code !== 0 || !billData.bill?.bill_id) {
      return NextResponse.json({ success: false, error: `Zoho Books rejected the bill: ${billData.message}` }, { status: 400 });
    }

    const zohoBillId = billData.bill.bill_id;

    // Record Payment in Zoho Books
    const paymentRes = await fetch(`${ZOHO_BOOKS_BASE}/billpayments?organization_id=${orgId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bill_id: zohoBillId,
        date: bill.billDate.toISOString().split('T')[0],
        payment_mode: bill.paymentMode,
        amount: bill.totalAmount,
        description: `Payment sync for bill ${bill.billNumber}`
      })
    });

    const paymentData = await paymentRes.json();

    // Update Local status
    const updatedBill = await prisma.supplierBill.update({
      where: { id: bill.id },
      data: {
        zohoSyncStatus: 'synced',
        zohoBillId: zohoBillId
      }
    });

    return NextResponse.json({ success: true, bill: updatedBill, paymentSynced: paymentData.code === 0 });

  } catch (err: any) {
    console.error('Zoho Bill Push error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
