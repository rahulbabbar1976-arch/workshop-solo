import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/auth/zoho/disconnect
export async function POST() {
  try {
    const integration = await prisma.zohoIntegration.findFirst();
    if (integration) {
      await prisma.zohoIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          isConnected: false,
          connectedEmail: null,
        },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
