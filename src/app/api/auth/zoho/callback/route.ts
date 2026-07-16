import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/auth/zoho/callback?code=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://workshop-solo.vercel.app';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/solo/settings?tab=integrations&error=zoho_denied`);
  }

  try {
    const integration = await prisma.zohoIntegration.findFirst();
    if (!integration) {
      return NextResponse.redirect(`${appUrl}/solo/settings?tab=integrations&error=zoho_not_configured`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: integration.clientId,
        client_secret: integration.clientSecret,
        redirect_uri: `${appUrl}/api/auth/zoho/callback`,
        code,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('Zoho token exchange failed:', tokens);
      return NextResponse.redirect(`${appUrl}/solo/settings?tab=integrations&error=zoho_token_failed`);
    }

    // Get connected account info
    let connectedEmail = '';
    try {
      const userRes = await fetch('https://accounts.zoho.com/oauth/v2/userinfo', {
        headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` },
      });
      const userInfo = await userRes.json();
      connectedEmail = userInfo.email || userInfo.Display_Name || '';
    } catch (_) {}

    const expiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    await prisma.zohoIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || integration.refreshToken,
        tokenExpiry: expiry,
        isConnected: true,
        connectedEmail,
      },
    });

    return NextResponse.redirect(`${appUrl}/solo/settings/integration-wizard?success=zoho_connected`);
  } catch (err: any) {
    console.error('Zoho callback error:', err);
    return NextResponse.redirect(`${appUrl}/solo/settings?tab=integrations&error=zoho_error`);
  }
}
