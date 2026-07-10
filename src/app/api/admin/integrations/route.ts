import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const configs = await db.integrationConfig.findMany();
    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Integrations GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { integrationType, isActive, apiKey, apiSecret, organizationId, webhookSecret, additionalConfig } = body;

    if (!integrationType) {
      return NextResponse.json({ error: 'integrationType is required' }, { status: 400 });
    }

    const config = await db.integrationConfig.upsert({
      where: { integrationType },
      update: {
        isActive,
        apiKey,
        apiSecret,
        organizationId,
        webhookSecret,
        additionalConfig: additionalConfig ? JSON.stringify(additionalConfig) : null
      },
      create: {
        integrationType,
        isActive,
        apiKey,
        apiSecret,
        organizationId,
        webhookSecret,
        additionalConfig: additionalConfig ? JSON.stringify(additionalConfig) : null
      }
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Integrations POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
