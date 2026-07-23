import "dotenv/config";
import { prisma } from "../src/lib/db";

async function updateBabbarsons() {
  const profile = await prisma.workshopProfile.findFirst();

  const data = {
    workshopName: "BABBARSONS",
    brandName: "BABBARSONS",
    logoUrl: "/uploads/babbarsons_logo.png",
    addressLine1: "6, Ajit Arcade, Kailash Colony",
    addressLine2: "The Complete Car Care Center",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110048",
    country: "IN",
    mobile: "+91-7982960183",
    invoiceFooterText:
      "Thank you for choosing BABBARSONS — The Complete Car Care Center. Drive safe!",
    termsConditionsText:
      "1. All repairs carry a 30-day warranty on labour. 2. Parts warranty as per manufacturer. 3. Vehicle left at owner's risk after 3 days of completion notice.",
  };

  if (profile) {
    const updated = await prisma.workshopProfile.update({
      where: { id: profile.id },
      data,
    });
    console.log("✅ Updated WorkshopProfile:", updated.id);
    console.log("   workshopName:", updated.workshopName);
    console.log("   addressLine1:", updated.addressLine1);
    console.log("   mobile:", updated.mobile);
  } else {
    const created = await prisma.workshopProfile.create({ data });
    console.log("✅ Created WorkshopProfile:", created.id);
  }
}

updateBabbarsons()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
