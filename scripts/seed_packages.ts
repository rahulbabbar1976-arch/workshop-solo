import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Seeding default Service Packages...");

  const count = await prisma.servicePackage.count();
  if (count > 0) {
    console.log("Service Packages already exist. Skipping seed.");
    return;
  }

  const packages = [
    {
      packageName: "Periodic Minor Service",
      packageCode: "PKG-MINOR",
      category: "Periodic Maintenance",
      description: "Includes Engine Oil replacement, Oil Filter replacement, and 20-point General Inspection.",
      items: {
        create: [
          { itemType: "PART", itemDescription: "Synthetic Engine Oil 5W30 (4L)", quantity: 1, defaultUnitPrice: 2200, gstRate: 18 },
          { itemType: "PART", itemDescription: "Engine Oil Filter", quantity: 1, defaultUnitPrice: 350, gstRate: 18 },
          { itemType: "LABOUR", itemDescription: "General Service & Inspection Labor", quantity: 1, defaultUnitPrice: 1200, gstRate: 18 },
        ],
      },
    },
    {
      packageName: "Periodic Major Service",
      packageCode: "PKG-MAJOR",
      category: "Periodic Maintenance",
      description: "Includes Engine Oil, Oil Filter, Air Filter, Cabin Filter, Spark Plugs, and Complete Checkup.",
      items: {
        create: [
          { itemType: "PART", itemDescription: "Synthetic Engine Oil 5W30 (4L)", quantity: 1, defaultUnitPrice: 2200, gstRate: 18 },
          { itemType: "PART", itemDescription: "Engine Oil Filter", quantity: 1, defaultUnitPrice: 350, gstRate: 18 },
          { itemType: "PART", itemDescription: "Air Filter Element", quantity: 1, defaultUnitPrice: 450, gstRate: 18 },
          { itemType: "PART", itemDescription: "AC Cabin Filter", quantity: 1, defaultUnitPrice: 550, gstRate: 18 },
          { itemType: "LABOUR", itemDescription: "Major Service Labor", quantity: 1, defaultUnitPrice: 2200, gstRate: 18 },
        ],
      },
    },
    {
      packageName: "AC Health Check & Gas Top-up",
      packageCode: "PKG-AC",
      category: "AC Service",
      description: "AC System leak testing, Filter cleaning, and R134a refrigerant gas top-up.",
      items: {
        create: [
          { itemType: "PART", itemDescription: "R134a Refrigerant Gas (450g)", quantity: 1, defaultUnitPrice: 850, gstRate: 18 },
          { itemType: "LABOUR", itemDescription: "AC Diagnostics & Cleaning Labor", quantity: 1, defaultUnitPrice: 950, gstRate: 18 },
        ],
      },
    },
    {
      packageName: "Brake System Overhaul",
      packageCode: "PKG-BRAKE",
      category: "Brake Care",
      description: "Front & Rear Brake pad cleaning, rotor inspection, and Brake Fluid flush.",
      items: {
        create: [
          { itemType: "PART", itemDescription: "DOT4 Brake Fluid (500ml)", quantity: 1, defaultUnitPrice: 350, gstRate: 18 },
          { itemType: "LABOUR", itemDescription: "Brake Cleaning & Bleeding Labor", quantity: 1, defaultUnitPrice: 1100, gstRate: 18 },
        ],
      },
    },
  ];

  for (const pkg of packages) {
    await prisma.servicePackage.create({ data: pkg });
  }

  console.log("Successfully seeded 4 default Service Packages!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
