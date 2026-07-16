import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/auth/zoho — Initiates OAuth flow
export async function GET() {
  const integration = await (prisma as any).zohoIntegration.findFirst();
  if (!integration?.clientId) {
    return NextResponse.redirect(new URL('/solo/settings?error=zoho_not_configured', process.env.NEXT_PUBLIC_APP_URL || 'https://workshop-solo.vercel.app'));
  }

  const params = new URLSearchParams({
    scope: 'ZohoBooks.invoices.CREATE,ZohoBooks.invoices.READ,ZohoBooks.contacts.CREATE,ZohoBooks.contacts.READ,ZohoBooks.settings.READ',
    client_id: integration.clientId,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://workshop-solo.vercel.app'}/api/auth/zoho/callback`,
    access_type: 'offline',
  });

  const zohoAuthUrl = `https://accounts.zoho.in/oauth/v2/auth?${params.toString()}`;
  return NextResponse.redirect(zohoAuthUrl);
}
