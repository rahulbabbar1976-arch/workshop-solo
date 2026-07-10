import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: Retrieve first profile or initialize a default
export async function GET() {
  try {
    let profile = await prisma.workshopProfile.findFirst({
      include: {
        printSettings: true
      }
    });

    if (!profile) {
      // Create a default fallback profile
      profile = await prisma.workshopProfile.create({
        data: {
          workshopName: 'Autobots Multibrand Repair',
          brandName: 'Autobots',
          addressLine1: 'B-108, Phase-I',
          addressLine2: 'Okhla Industrial Area',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110020',
          country: 'IN',
          mobile: '+91-9876543210',
          email: 'info@autobots.co.in',
          salesTaxId: '07AAAAA1111A1Z1',
          incomeTaxId: 'AAAAA1111A',
          workshopTimings: '09:00 AM - 07:00 PM',
          invoiceFooterText: 'Thank you for choosing Autobots! Drive safe.',
          termsConditionsText: '1. All repairs carry a 30-day warranty. 2. Vehicle left at owner\'s risk.',
          printSettings: {
            create: {}
          }
        },
        include: {
          printSettings: true
        }
      });
    } else if (profile.printSettings.length === 0) {
      // Create print settings if missing
      await prisma.printSettings.create({
        data: {
          workshopProfileId: profile.id
        }
      });
      profile = await prisma.workshopProfile.findFirst({
        where: { id: profile.id },
        include: {
          printSettings: true
        }
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST/PUT: Update profile fields
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id,
      workshopName, 
      addressLine1, 
      addressLine2, 
      city, 
      state, 
      postalCode, 
      mobile, 
      email, 
      gstin, 
      pan,
      workshopTimings,
      invoiceFooterText,
      termsConditionsText,
      logoUrl,
      showCompanyName,
      showCompanyAddress,
      showCompanyContact,
      showCompanyGstin,
      showCompanyLogo,
      showGstRates,
      showCompanyDetails,
      geminiApiKey,
      printSettings
    } = body;

    if (!workshopName) {
      return NextResponse.json({ success: false, error: 'Company/Workshop Name is required' }, { status: 400 });
    }

    let profile = null;
    if (id) {
      profile = await prisma.workshopProfile.findUnique({ where: { id } });
    } else {
      profile = await prisma.workshopProfile.findFirst();
    }

    if (profile) {
      const updated = await prisma.workshopProfile.update({
        where: { id: profile.id },
        data: {
          workshopName,
          addressLine1: addressLine1 || '',
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          mobile: mobile || null,
          email: email || null,
          salesTaxId: gstin || null,
          incomeTaxId: pan || null,
          workshopTimings: workshopTimings || null,
          invoiceFooterText: invoiceFooterText || null,
          termsConditionsText: termsConditionsText || null,
          logoUrl: logoUrl !== undefined ? logoUrl : profile.logoUrl,
          showCompanyName: showCompanyName !== undefined ? showCompanyName : profile.showCompanyName,
          showCompanyAddress: showCompanyAddress !== undefined ? showCompanyAddress : profile.showCompanyAddress,
          showCompanyContact: showCompanyContact !== undefined ? showCompanyContact : profile.showCompanyContact,
          showCompanyTaxId: showCompanyGstin !== undefined ? showCompanyGstin : profile.showCompanyTaxId,
          showCompanyLogo: showCompanyLogo !== undefined ? showCompanyLogo : profile.showCompanyLogo,
          showGstRates: showGstRates !== undefined ? showGstRates : profile.showGstRates,
          showCompanyDetails: showCompanyDetails !== undefined ? showCompanyDetails : profile.showCompanyDetails,
          geminiApiKey: geminiApiKey !== undefined ? geminiApiKey : profile.geminiApiKey
        }
      });

      if (printSettings) {
        const existingSettings = await prisma.printSettings.findFirst({
          where: { workshopProfileId: profile.id }
        });
        if (existingSettings) {
          await prisma.printSettings.update({
            where: { id: existingSettings.id },
            data: {
              showTaxByDefault: printSettings.showTaxByDefault !== undefined ? printSettings.showTaxByDefault : existingSettings.showTaxByDefault,
              showDiscountByDefault: printSettings.showDiscountByDefault !== undefined ? printSettings.showDiscountByDefault : existingSettings.showDiscountByDefault,
              includeSignature: printSettings.includeSignature !== undefined ? printSettings.includeSignature : existingSettings.includeSignature,
              includeIntakePhotos: printSettings.includeIntakePhotos !== undefined ? printSettings.includeIntakePhotos : existingSettings.includeIntakePhotos,
              showPartsLabourSeparately: printSettings.showPartsLabourSeparately !== undefined ? printSettings.showPartsLabourSeparately : existingSettings.showPartsLabourSeparately,
              
              showCustomerDetails: printSettings.showCustomerDetails !== undefined ? printSettings.showCustomerDetails : existingSettings.showCustomerDetails,
              showVehicleDetails: printSettings.showVehicleDetails !== undefined ? printSettings.showVehicleDetails : existingSettings.showVehicleDetails,
              showLabourTable: printSettings.showLabourTable !== undefined ? printSettings.showLabourTable : existingSettings.showLabourTable,
              showPartsTable: printSettings.showPartsTable !== undefined ? printSettings.showPartsTable : existingSettings.showPartsTable,
              showSummary: printSettings.showSummary !== undefined ? printSettings.showSummary : existingSettings.showSummary,
              showSignatureSection: printSettings.showSignatureSection !== undefined ? printSettings.showSignatureSection : existingSettings.showSignatureSection,
              showTermsConditions: printSettings.showTermsConditions !== undefined ? printSettings.showTermsConditions : existingSettings.showTermsConditions,
              showLocusSigilli: printSettings.showLocusSigilli !== undefined ? printSettings.showLocusSigilli : existingSettings.showLocusSigilli,
              showDate: printSettings.showDate !== undefined ? printSettings.showDate : existingSettings.showDate,
              showStatus: printSettings.showStatus !== undefined ? printSettings.showStatus : existingSettings.showStatus,
              
              showColPartNo: printSettings.showColPartNo !== undefined ? printSettings.showColPartNo : existingSettings.showColPartNo,
              showColPartBrand: printSettings.showColPartBrand !== undefined ? printSettings.showColPartBrand : existingSettings.showColPartBrand,
              showColQty: printSettings.showColQty !== undefined ? printSettings.showColQty : existingSettings.showColQty,
              showColRate: printSettings.showColRate !== undefined ? printSettings.showColRate : existingSettings.showColRate,
              showColTaxRate: printSettings.showColTaxRate !== undefined ? printSettings.showColTaxRate : existingSettings.showColTaxRate,
              showColTotal: printSettings.showColTotal !== undefined ? printSettings.showColTotal : existingSettings.showColTotal,
              showColDiscount: printSettings.showColDiscount !== undefined ? printSettings.showColDiscount : existingSettings.showColDiscount,
              
              printTemplate: printSettings.printTemplate !== undefined ? printSettings.printTemplate : existingSettings.printTemplate,
              lineSpacing: printSettings.lineSpacing !== undefined ? parseInt(String(printSettings.lineSpacing)) : existingSettings.lineSpacing,
              defaultTerms: printSettings.defaultTerms !== undefined ? printSettings.defaultTerms : existingSettings.defaultTerms,
              contractorSignatureImage: printSettings.contractorSignatureImage !== undefined ? printSettings.contractorSignatureImage : existingSettings.contractorSignatureImage,
              showContractorSignature: printSettings.showContractorSignature !== undefined ? printSettings.showContractorSignature : existingSettings.showContractorSignature,
              showCustomerSignature: printSettings.showCustomerSignature !== undefined ? printSettings.showCustomerSignature : existingSettings.showCustomerSignature
            }
          });
        } else {
          await prisma.printSettings.create({
            data: {
              workshopProfileId: profile.id,
              ...printSettings,
              lineSpacing: printSettings.lineSpacing ? parseInt(String(printSettings.lineSpacing)) : 0
            }
          });
        }
      }

      const finalProfile = await prisma.workshopProfile.findUnique({
        where: { id: profile.id },
        include: { printSettings: true }
      });
      return NextResponse.json({ success: true, profile: finalProfile, message: 'Profile updated successfully' });
    } else {
      const created = await prisma.workshopProfile.create({
        data: {
          workshopName,
          addressLine1: addressLine1 || '',
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          mobile: mobile || null,
          email: email || null,
          salesTaxId: gstin || null,
          incomeTaxId: pan || null,
          workshopTimings: workshopTimings || null,
          invoiceFooterText: invoiceFooterText || null,
          termsConditionsText: termsConditionsText || null,
          logoUrl: logoUrl || null,
          showCompanyName: showCompanyName !== undefined ? showCompanyName : true,
          showCompanyAddress: showCompanyAddress !== undefined ? showCompanyAddress : true,
          showCompanyContact: showCompanyContact !== undefined ? showCompanyContact : true,
          showCompanyTaxId: showCompanyGstin !== undefined ? showCompanyGstin : true,
          showCompanyLogo: showCompanyLogo !== undefined ? showCompanyLogo : true,
          showGstRates: showGstRates !== undefined ? showGstRates : true,
          showCompanyDetails: showCompanyDetails !== undefined ? showCompanyDetails : true,
          printSettings: {
            create: printSettings ? {
              ...printSettings,
              lineSpacing: printSettings.lineSpacing ? parseInt(String(printSettings.lineSpacing)) : 0
            } : {}
          }
        },
        include: {
          printSettings: true
        }
      });
      return NextResponse.json({ success: true, profile: created, message: 'Profile created successfully' });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
