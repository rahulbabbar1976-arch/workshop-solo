import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const ZOHO_BOOKS_BASE = 'https://www.zohoapis.com/books/v3';

async function getValidToken(integration: any): Promise<string> {
  const now = new Date();
  const expiry = integration.tokenExpiry ? new Date(integration.tokenExpiry) : null;
  const isExpired = !expiry || expiry <= new Date(now.getTime() + 60000);

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
  if (!data.access_token) throw new Error('Failed to refresh Zoho token');

  const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
  await prisma.zohoIntegration.update({
    where: { id: integration.id },
    data: { accessToken: data.access_token, tokenExpiry: newExpiry },
  });

  return data.access_token;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json({ success: true, contacts: [] });
    }

    const integration = await prisma.zohoIntegration.findFirst();
    if (!integration?.isConnected) {
      return NextResponse.json({ success: false, error: 'Zoho not connected' }, { status: 400 });
    }

    const token = await getValidToken(integration);
    const headers = { Authorization: `Zoho-oauthtoken ${token}` };

    const isGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(query.trim());
    let url = `${ZOHO_BOOKS_BASE}/contacts?organization_id=${integration.orgId}`;

    if (isGstin) {
      // Query by GSTIN directly if it matches India GSTIN pattern
      url += `&gst_no=${encodeURIComponent(query.trim().toUpperCase())}`;
    } else {
      url += `&search_text=${encodeURIComponent(query.trim())}`;
    }

    const res = await fetch(url, { headers });
    const data = await res.json();

    if (data.code !== 0) {
      return NextResponse.json({ success: false, error: data.message }, { status: 400 });
    }

    const contacts = (data.contacts || []).map((c: any) => ({
      zohoContactId: c.contact_id,
      name: c.contact_name,
      companyName: c.company_name,
      gstin: c.gst_no || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.billing_address?.address || '',
      state: c.billing_address?.state || '',
      city: c.billing_address?.city || '',
      zip: c.billing_address?.zip || '',
    }));

    return NextResponse.json({ success: true, contacts });
  } catch (err: any) {
    console.error('Zoho contact search error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
