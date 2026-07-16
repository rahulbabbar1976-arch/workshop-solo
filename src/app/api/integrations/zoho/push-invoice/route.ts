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

// Fetch all taxes from Zoho Books and build a map: rate → { igstId, cgstId, sgstId, combinedId }
// Falls back to undefined if no matching tax found (Zoho will use item default)
async function fetchZohoTaxMap(token: string, orgId: string): Promise<Map<number, { igstId?: string; combinedId?: string }>> {
  const map = new Map<number, { igstId?: string; combinedId?: string }>();
  try {
    const res = await fetch(`${ZOHO_BOOKS_BASE}/taxes?organization_id=${orgId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await res.json();
    const taxes: any[] = data.taxes || [];

    // Log for debugging
    console.log('Zoho taxes available:', taxes.map((t: any) => `${t.tax_name}(${t.tax_percentage}%,${t.tax_type})`).join(', '));

    for (const tax of taxes) {
      const pct: number = tax.tax_percentage;
      const type: string = (tax.tax_type || '').toLowerCase();
      const id: string = tax.tax_id;

      if (!map.has(pct)) map.set(pct, {});
      const entry = map.get(pct)!;

      // IGST = inter-state
      if (type.includes('igst')) entry.igstId = id;
      // CGST+SGST combined group or single entry
      if (type.includes('cgst') || type.includes('sgst') || type === 'tax_group') {
        entry.combinedId = id;
      }
    }
  } catch (e) {
    console.error('Failed to fetch Zoho taxes:', e);
  }
  return map;
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

    // 6b. Fetch real tax IDs from Zoho Books
    const taxMap = await fetchZohoTaxMap(token, integration.orgId);

    // Helper: get tax_id for a given rate and state type
    // Returns the tax_id string or undefined (Zoho will skip tax if not set)
    function getTaxId(rate: number): string | undefined {
      const entry = taxMap.get(rate);
      if (!entry) return undefined;
      return isInterState ? entry.igstId : entry.combinedId;
    }

    // 7. Build line items from parts
    const partLineItems = (jobCard.partLines || []).map((part: any) => {
      const rate = part.sellingPrice || 0;
      const qty = part.quantityUsed || part.quantityDispatched || part.quantityRequested || 1;
      const taxRate = part.taxRate || 18;
      const taxId = getTaxId(taxRate);
      return {
        name: part.partName,
        hsn_or_sac: part.hsnCode || '',
        quantity: qty,
        rate,
        unit: 'nos',
        description: part.itemCode ? `Part No: ${part.itemCode}` : '',
        ...(taxId ? { tax_id: taxId } : {}),
      };
    });

    // 8. Build line items from labour
    const labourLineItems = (jobCard.labourLines || []).map((labour: any) => {
      const rate = labour.sellingPrice || 0;
      const qty = labour.quantity || 1;
      const taxRate = labour.taxRate || 18;
      const taxId = getTaxId(taxRate);
      return {
        name: labour.labourName,
        hsn_or_sac: labour.hsnCode || '9987',
        quantity: qty,
        rate,
        unit: 'hrs',
        description: '',
        ...(taxId ? { tax_id: taxId } : {}),
      };
    });

    const lineItems = [...partLineItems, ...labourLineItems];
    if (lineItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No parts or labour found on this job card' }, { status: 400 });
    }

    // 9. Build invoice payload
    const vehicleReg = jobCard.vehicle?.registrationNumberRaw || '';
    const gstTypeLabel = isInterState ? 'IGST (Inter-State)' : 'CGST+SGST (Intra-State)';

    // Bank payment details appended to notes
    const bankDetails = [
      '─────────────────────────────',
      'PAYMENT / BANK DETAILS',
      'Account Name  : BABBARSONS',
      'Account Number: 355701011020448',
      'Bank          : UNION BANK OF INDIA',
      'Branch        : Kailash Colony, New Delhi',
      'IFSC Code     : UBIN0535570',
      '─────────────────────────────',
    ].join('\n');

    const notesText = [
      `Job Card No : ${jobCard.jobcardNumber}`,
      `Vehicle No  : ${vehicleReg}`,
      `GST Type    : ${gstTypeLabel}`,
      '',
      bankDetails,
    ].join('\n');

    // Industry-standard automotive workshop T&C
    const defaultTerms = [
      '1. All vehicles are received at owner\'s risk. The workshop is not liable for loss or damage due to fire, theft, or unforeseen circumstances.',
      '2. Estimates are valid for 7 days from the date of issue. Work commences only after customer written/verbal approval.',
      '3. Parts once fitted cannot be returned. Warranty on parts is as per the manufacturer\'s policy.',
      '4. Labour warranty: 30 days from vehicle delivery, limited to the specific repair carried out.',
      '5. Vehicles not collected within 7 days of intimation will attract a parking/storage charge.',
      '6. Payment is due in full upon delivery of the vehicle. We accept Cash, UPI, and Bank Transfer.',
      '7. The workshop is not liable for any consequential, incidental, or indirect damage arising from the repair.',
      '8. GST as applicable under the GST Act will be levied on all parts and services.',
      '9. All disputes are subject to the exclusive jurisdiction of courts in New Delhi.',
      '10. Babbarsons reserves the right to retain the vehicle until full and final payment is received.',
    ].join('\n');

    const invoicePayload = {
      customer_id: contactId,
      // reference_number maps to "Order Number" in Zoho Books — set to vehicle registration
      reference_number: vehicleReg || jobCard.jobcardNumber,
      date: new Date().toISOString().split('T')[0],
      notes: notesText,
      terms: profile?.termsConditionsText || defaultTerms,
      place_of_supply: billingInfo.placeOfSupply || billingInfo.state || '',
      gst_treatment: billingInfo.gstin ? 'business_gst' : 'consumer',
      gst_no: billingInfo.gstin || '',
      is_inclusive_of_tax: false,
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
