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

// Search or create Zoho Vendor contact
async function getOrCreateZohoVendor(token: string, orgId: string, name: string, gstin: string): Promise<string> {
  const headers = {
    Authorization: `Zoho-oauthtoken ${token}`,
    'Content-Type': 'application/json',
  };

  const cleanName = name.toLowerCase().trim();

  // 1. Search for existing vendor by name
  try {
    const res = await fetch(
      `${ZOHO_BOOKS_BASE}/contacts?organization_id=${orgId}&search_text=${encodeURIComponent(name)}&contact_type=vendor`,
      { headers }
    );
    const searchData = await res.json();
    const contacts: any[] = searchData.contacts || [];
    const existing = contacts.find((c: any) => c.contact_name?.toLowerCase().trim() === cleanName);
    if (existing) return existing.contact_id;
  } catch (e) {
    console.error('Zoho vendor search failed:', e);
  }

  // 2. If not found, create new vendor
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
    // Duplicate name
    const listRes = await fetch(`${ZOHO_BOOKS_BASE}/contacts?organization_id=${orgId}&contact_type=vendor&per_page=200`, { headers });
    const listData = await listRes.json();
    const contacts: any[] = listData.contacts || [];
    const existing = contacts.find((c: any) => c.contact_name?.toLowerCase().trim() === cleanName);
    if (existing) return existing.contact_id;
  }

  if (!createData.contact?.contact_id) {
    throw new Error(`Failed to create Zoho vendor: ${createData.message || JSON.stringify(createData)}`);
  }
  return createData.contact.contact_id;
}

// Fetch tax map from Zoho
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
      // Combined CGST/SGST group or standard IGST
      if (type === 'tax_group' || type.includes('igst') || type.includes('cgst')) {
        map.set(pct, tax.tax_id);
      }
    }
  } catch (e) {
    console.error('Failed to fetch Zoho taxes for billing:', e);
  }
  return map;
}

export async function POST(request: Request) {
  try {
    const { items, supplierName, billNumber, supplierGstin, paymentMode } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items provided' }, { status: 400 });
    }

    const sName = supplierName || 'General Supplier';
    const sGstin = supplierGstin || '';
    const pMode = paymentMode || 'Cash';
    const bNumber = billNumber || `BILL-${Date.now()}`;

    // Calculate total bill amount locally (including GST)
    let localBillTotal = 0;
    for (const item of items) {
      const qty = parseFloat(item.quantity) || 1;
      const price = parseFloat(item.purchasePrice) || 0;
      const gst = parseFloat(item.gstRate) || 18;
      localBillTotal += qty * price * (1 + gst / 100);
    }

    // 1. Save locally inside transactional update
    const result = await prisma.$transaction(async (tx) => {
      // Create parent SupplierBill
      const bill = await tx.supplierBill.create({
        data: {
          billNumber: bNumber,
          supplierName: sName,
          supplierGstin: sGstin || null,
          totalAmount: localBillTotal,
          paymentMode: pMode,
          zohoSyncStatus: 'pending'
        }
      });

      const createdMasters = [];

      for (const item of items) {
        // Find or create PartMaster
        let master = await tx.partsMaster.findFirst({
          where: { partName: item.partName }
        });

        if (master) {
          master = await tx.partsMaster.update({
            where: { id: master.id },
            data: {
              stockQuantity: (master.stockQuantity || 0) + (parseFloat(item.quantity) || 0),
              defaultSellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : master.defaultSellingPrice,
              hsnCode: item.hsnCode || master.hsnCode,
              defaultTaxRate: item.gstRate ? parseFloat(item.gstRate) : master.defaultTaxRate,
            }
          });
        } else {
          master = await tx.partsMaster.create({
            data: {
              partName: item.partName,
              partNumber: item.partNumber || null,
              hsnCode: item.hsnCode || null,
              defaultTaxRate: item.gstRate ? parseFloat(item.gstRate) : null,
              defaultSellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : null,
              stockQuantity: parseFloat(item.quantity) || 0,
            }
          });
        }
        createdMasters.push(master);

        // Record Inventory Ledger entry
        if (parseFloat(item.quantity) > 0) {
          await tx.inventoryLedger.create({
            data: {
              partMasterId: master.id,
              transactionType: 'PURCHASE_IN',
              quantity: parseFloat(item.quantity),
              runningStock: master.stockQuantity || 0,
              supplierName: sName,
              paymentMode: pMode
            }
          });

          // Record PartPurchase transaction linked to SupplierBill
          const purchase = await tx.partPurchase.create({
            data: {
              partMasterId: master.id,
              dateOfPurchase: new Date(),
              invoiceNumber: bNumber,
              supplierName: sName,
              supplierContact: sGstin || null,
              purchasePrice: parseFloat(item.purchasePrice) || 0,
              quantityBought: parseFloat(item.quantity) || 0,
              paymentMode: pMode,
              supplierBillId: bill.id
            }
          });
          
          if (item.serialNumbers && Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0) {
            const serialData = item.serialNumbers.map((sn: string) => ({
              serialNumber: sn,
              partMasterId: master.id,
              purchaseDate: new Date(),
              purchaseInvoiceNumber: bNumber,
              status: 'AVAILABLE'
            }));
            await tx.partSerialNumber.createMany({
              data: serialData
            });
          }
        }
      }

      return { count: createdMasters.length, billId: bill.id };
    });

    // 2. Upload to Zoho Books (if connected)
    let zohoSync = false;
    try {
      const integration = await prisma.zohoIntegration.findFirst();
      if (integration?.isConnected) {
        console.log('Uploading purchase bill to Zoho Books...');
        const token = await getValidToken(integration);
        const orgId = integration.orgId;

        // Get/Create Vendor
        const vendorId = await getOrCreateZohoVendor(token, orgId, sName, sGstin);

        // Fetch Tax Rates Map
        const taxMap = await fetchZohoTaxMap(token, orgId);

        // Calculate total bill amount
        let billTotal = 0;

        // Build Zoho Bill Line Items
        const lineItems = items.map((item: any) => {
          const qty = parseFloat(item.quantity) || 1;
          const price = parseFloat(item.purchasePrice) || 0;
          const gst = parseFloat(item.gstRate) || 18;
          const taxId = taxMap.get(gst) || '';
          billTotal += qty * price * (1 + gst / 100);

          return {
            name: item.partName,
            rate: price,
            quantity: qty,
            hsn_or_sac: item.hsnCode || '',
            product_type: 'goods',
            ...(taxId ? { tax_id: taxId } : {})
          };
        });

        // Create Zoho Bill
        const headers = {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
        };

        const billRes = await fetch(`${ZOHO_BOOKS_BASE}/bills?organization_id=${orgId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            vendor_id: vendorId,
            bill_number: bNumber,
            date: new Date().toISOString().split('T')[0],
            line_items: lineItems
          })
        });

        const billData = await billRes.json();

        if (billData.code === 0 && billData.bill?.bill_id) {
          const billId = billData.bill.bill_id;
          console.log(`Zoho Bill created: ${billId}`);

          // Record Zoho payment on this bill
          const paymentRes = await fetch(`${ZOHO_BOOKS_BASE}/billpayments?organization_id=${orgId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              bill_id: billId,
              date: new Date().toISOString().split('T')[0],
              payment_mode: pMode,
              amount: billTotal,
              description: `Payment recorded via local app for bill ${bNumber}`
            })
          });
          const paymentData = await paymentRes.json();
          
          // Update local SupplierBill record
          await prisma.supplierBill.update({
            where: { id: result.billId },
            data: {
              zohoSyncStatus: 'synced',
              zohoBillId: billId
            }
          });

          zohoSync = true;
        } else {
          console.error(`Zoho Bill creation failed: ${billData.message}`);
          await prisma.supplierBill.update({
            where: { id: result.billId },
            data: { zohoSyncStatus: 'failed' }
          });
        }
      }
    } catch (zohoErr) {
      console.error('Zoho Books bill upload error:', zohoErr);
    }

    return NextResponse.json({ success: true, count: result.count, zohoSync });
  } catch (err: any) {
    console.error('Bulk Import Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
