// GET /api/integrations/zoho/status — returns current connection status
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const integration = await prisma.zohoIntegration.findFirst();
    if (!integration) {
      return NextResponse.json({ configured: false, connected: false });
    }
    return NextResponse.json({
      configured: !!(integration.clientId && integration.clientSecret && integration.orgId),
      connected: integration.isConnected,
      connectedEmail: integration.connectedEmail,
      hasClientId: !!integration.clientId,
    });
  } catch (err: any) {
    return NextResponse.json({ configured: false, connected: false });
  }
}

// POST /api/integrations/zoho/status — save credentials (clientId, clientSecret, orgId)
export async function POST(request: Request) {
  try {
    const { clientId, clientSecret, orgId } = await request.json();
    if (!clientId || !clientSecret || !orgId) {
      return NextResponse.json({ success: false, error: 'All fields required' }, { status: 400 });
    }

    const existing = await prisma.zohoIntegration.findFirst();
    if (existing) {
      await prisma.zohoIntegration.update({
        where: { id: existing.id },
        data: { clientId, clientSecret, orgId, isConnected: false },
      });
    } else {
      await prisma.zohoIntegration.create({
        data: { clientId, clientSecret, orgId },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
