import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const defaultLayoutConfig = JSON.stringify([
  { id: "HEADER", enabled: true },
  { id: "CUSTOMER_VEHICLE", enabled: true },
  { id: "TIMELINES", enabled: true },
  { id: "COMPLAINTS", enabled: true },
  { id: "INTAKE_PICTURES", enabled: true },
  { id: "LABOUR_TABLE", enabled: true },
  { id: "PARTS_TABLE", enabled: true },
  { id: "SIGNATURES", enabled: true }
]);

const defaultColumnsConfig = JSON.stringify({
  labour: ["description", "qty", "rate", "tax", "total"],
  parts: ["partName", "partNo", "brand", "qty", "rate", "tax", "total"]
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType') || 'JOBCARD';

    const profile = await prisma.workshopProfile.findFirst();
    
    if (!profile) {
      return NextResponse.json({ error: 'Workshop profile not found' }, { status: 404 });
    }

    let template = await prisma.documentTemplate.findUnique({
      where: {
        workshopProfileId_documentType: {
          workshopProfileId: profile.id,
          documentType
        }
      }
    });

    if (!template) {
      template = await prisma.documentTemplate.create({
        data: {
          workshopProfileId: profile.id,
          documentType,
          layoutConfig: defaultLayoutConfig,
          columnsConfig: defaultColumnsConfig
        }
      });
    }

    const printSettings = await prisma.printSettings.findFirst({
      where: { workshopProfileId: profile.id }
    });

    return NextResponse.json({ template, printSettings });
  } catch (error) {
    console.error('Error fetching print template:', error);
    return NextResponse.json({ error: 'Failed to fetch print template' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentType, fontFamily, baseFontSize, primaryColor, secondaryColor, showLogo, headerText, footerText, layoutConfig, columnsConfig } = body;

    const profile = await prisma.workshopProfile.findFirst();
    if (!profile) {
      return NextResponse.json({ error: 'Workshop profile not found' }, { status: 404 });
    }

    const template = await prisma.documentTemplate.upsert({
      where: {
        workshopProfileId_documentType: {
          workshopProfileId: profile.id,
          documentType
        }
      },
      update: {
        fontFamily,
        baseFontSize,
        primaryColor,
        secondaryColor,
        showLogo,
        headerText,
        footerText,
        layoutConfig: typeof layoutConfig === 'string' ? layoutConfig : JSON.stringify(layoutConfig),
        columnsConfig: typeof columnsConfig === 'string' ? columnsConfig : JSON.stringify(columnsConfig)
      },
      create: {
        workshopProfileId: profile.id,
        documentType,
        fontFamily,
        baseFontSize,
        primaryColor,
        secondaryColor,
        showLogo,
        headerText,
        footerText,
        layoutConfig: typeof layoutConfig === 'string' ? layoutConfig : JSON.stringify(layoutConfig || JSON.parse(defaultLayoutConfig)),
        columnsConfig: typeof columnsConfig === 'string' ? columnsConfig : JSON.stringify(columnsConfig || JSON.parse(defaultColumnsConfig))
      }
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error saving print template:', error);
    return NextResponse.json({ error: 'Failed to save print template' }, { status: 500 });
  }
}
