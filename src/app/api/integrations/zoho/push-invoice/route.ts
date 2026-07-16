import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const ZOHO_BOOKS_BASE = 'https://www.zohoapis.com/books/v3';

// Get a valid access token, refreshing if expired
async function getValidToken(integration: any): Promise<string> {
  const now = new Date();
  const expiry = integration.tokenExpiry ? new Date(integration.tokenExpiry) : null;
  const isExpired = !expiry || expiry <= new Date(now.getTime() + 60000); // 1 min buffer

  if (!isExpired && integration.accessToken) {
    return integration.accessToken;
  }

  // Refresh the token
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
  if (!data.access_token) throw new Error('Failed to refresh Zoho token: ' + JSON.stringify(data));

  const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
  await prisma.zohoIntegration.update({
    where: { id: integration.id },
    data: { accessToken: data.access_token, tokenExpiry: newExpiry },
  });

  return data.access_token;
}

// Fetch or create contact in Zoho
async function getOrCreateZohoContact(token: string, orgId: string, billingInfo: any): Promise<string> {
  const headers = {
    Authorization: `Zoho-oauthtoken ${token}`,
    'Content-Type': 'application/json',
  };

  // Search by name first
  const searchRes = await fetch(
    `${ZOHO_BOOKS_BASE}/contacts?organization_id=${orgId}&search_text=${encodeURIComponent(billingInfo.name)}&contact_type=customer`,
    { headers }
  );
  const searchData = await searchRes.json();
  const existing = searchData.contacts?.[0];
  if (existing) return existing.contact_id;

  // Create new contact
  const createRes = await fetch(`${ZOHO_BOOKS_BASE}/contacts?organization_id=${orgId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contact_name: billingInfo.name,
      contact_type: 'customer',
      gst_no: billingInfo.gstin || '',
      place_of_contact: billingInfo.state || '',
      billing_address: {
        address: billingInfo.address || '',
        state: billingInfo.state || '',
        country: 'India',
      },
    }),
  });
  const createData = await createRes.json();
  if (!createData.contact?.contact_id) throw new Error('Failed to create Zoho contact: ' + JSON.stringify(createData));
  return createData.contact.contact_id;
}

// Determine GST type: if workshop state === billing state → CGST+SGST, else → IGST
function getGstType(workshopState: string, billingState: string): 'intra' | 'inter' {
  const normalize = (s: string) => s?.toLowerCase().trim().replace(/\s+/g, '');
  return normalize(workshopState) === normalize(billingState) ? 'intra' : 'inter';
}

// POST /api/integrations/zoho/push-invoice
export async function POST(request: Request) {
  try {
    const { jobCardId } = await request.json();

    if (!jobCardId) {
      return NextResponse.json({ success: false, error: 'jobCardId required' }, { status: 400 });
    }

    // 1. Get Zoho integration
    const integration = await prisma.zohoIntegration.findFirst();
    if (!integration?.isConnected) {
      return NextResponse.json({ success: false, error: 'Zoho is not connected. Go to Settings → Integrations.' }, { status: 403 });
    }

    // 2. Fetch job card with all details
    const jobCard = await prisma.jobCard.findUnique({
      where: { id: jobCardId },
      include: {
        vehicle: true,
        customer: true,
        billingCustomer: true,
        partLines: true,
        labourLines: true,
      },
    });

    if (!jobCard) return NextResponse.json({ success: false, error: 'Job card not found' }, { status: 404 });

    const billingCustomer = jobCard.billingCustomer || jobCard.customer;
    const billingInfo = {
       name: billingCustomer.displayName,
       gstin: billingCustomer.taxId || '',
       address: [billingCustomer.addressLine1, billingCustomer.addressLine2].filter(Boolean).join(', '),
       state: billingCustomer.state || '',
       placeOfSupply: jobCard.placeOfSupplyState || billingCustomer.state || ''
    };

    // 3. Get workshop profile for state (to determine IGST vs CGST+SGST)
    const profile = await prisma.workshopProfile.findFirst();
    const workshopState = profile?.state || '';

    // 4. Get valid access token
    const token = await getValidToken(integration);

    // 5. Get or create Zoho contact
    const contactId = await getOrCreateZohoContact(token, integration.orgId, billingInfo);

    // 6. Determine GST type
    const gstType = getGstType(workshopState, billingInfo.state || '');
    const isInterState = gstType === 'inter';

    // 7. Build line items from parts
    const partLineItems = (jobCard.partLines || []).map((part: any) => {
      const rate = part.sellingPrice || 0;
      const qty = part.quantityUsed || part.quantityDispatched || part.quantityRequested || 1;
      const gstRate = part.taxRate || 18;

      return {
        name: part.partName,
        hsn_or_sac: part.hsnCode || '',
        quantity: qty,
        rate,
        discount: part.discountValue || 0,
        item_total: rate * qty,
        ...(isInterState
          ? { tax_type: 'igst', tax_percentage: gstRate }
          : { tax_type: 'cgst_sgst', tax_percentage: gstRate / 2 }), // split for display
        tax_name: isInterState ? `IGST ${gstRate}%` : `GST ${gstRate}%`,
        tags: [],
        unit: 'nos',
        description: part.itemCode ? `Part No: ${part.itemCode}` : '',
      };
    });

    // 8. Build line items from labour
    const labourLineItems = (jobCard.labourLines || []).map((labour: any) => {
      const rate = labour.sellingPrice || 0;
      const qty = labour.quantity || 1;
      const gstRate = labour.taxRate || 18;

      return {
        name: labour.labourName,
        hsn_or_sac: labour.hsnCode || '9987', // 9987 = vehicle repair SAC
        quantity: qty,
        rate,
        discount: labour.discountValue || 0,
        item_total: rate * qty,
        ...(isInterState
          ? { tax_type: 'igst', tax_percentage: gstRate }
          : { tax_type: 'cgst_sgst', tax_percentage: gstRate / 2 }),
        tax_name: isInterState ? `IGST ${gstRate}%` : `GST ${gstRate}%`,
        unit: 'hrs',
        description: '',
      };
    });

    const lineItems = [...partLineItems, ...labourLineItems];
    if (lineItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No parts or labour found on this job card' }, { status: 400 });
    }

    // 9. Build invoice payload
    const vehicleNote = `Vehicle: ${jobCard.vehicle?.registrationNumberRaw || ''}`;
    const invoicePayload = {
      customer_id: contactId,
      reference_number: jobCard.jobcardNumber,
      date: new Date().toISOString().split('T')[0],
      notes: vehicleNote,
      terms: profile?.termsConditionsText || '',
      place_of_supply: billingInfo.placeOfSupply || billingInfo.state || '',
      gst_treatment: billingInfo.gstin ? 'business_gst' : 'consumer',
      gst_no: billingInfo.gstin || '',
      line_items: lineItems,
    };

    // 10. Create invoice in Zoho
    const invoiceRes = await fetch(`${ZOHO_BOOKS_BASE}/invoices?organization_id=${integration.orgId}`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    const invoiceData = await invoiceRes.json();

    if (invoiceData.code !== 0 || !invoiceData.invoice) {
      console.error('Zoho invoice creation failed:', invoiceData);
      return NextResponse.json({
        success: false,
        error: `Zoho rejected the invoice: ${invoiceData.message || JSON.stringify(invoiceData)}`,
      }, { status: 500 });
    }

    const zohoInvoice = invoiceData.invoice;

    // 11. Save Zoho invoice details back to job card
    await prisma.jobCard.update({
      where: { id: jobCardId },
      data: {
        zohoSyncStatus: 'synced',
        zohoInvoiceId: zohoInvoice.invoice_id,
        zohoInvoiceNumber: zohoInvoice.invoice_number,
        zohoInvoiceUrl: `https://books.zoho.com/app/${integration.orgId}#/invoices/${zohoInvoice.invoice_id}`,
      },
    });

    return NextResponse.json({
      success: true,
      invoiceId: zohoInvoice.invoice_id,
      invoiceNumber: zohoInvoice.invoice_number,
      invoiceUrl: `https://books.zoho.com/app/${integration.orgId}#/invoices/${zohoInvoice.invoice_id}`,
    });

  } catch (err: any) {
    console.error('Zoho push error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
