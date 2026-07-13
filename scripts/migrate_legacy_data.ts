import { prisma } from '../src/lib/db';
import * as xlsx from 'xlsx';

function excelDateToJSDate(serial: number) {
  if (!serial || isNaN(serial)) return null;
  // Excel dates are number of days since Jan 1 1900
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info;
}

async function main() {
  console.log("Starting Migration...");

  // 1. Get BABBARSONS tenant
  let tenant = await prisma.user.findFirst({
    where: { fullName: { contains: "Babbarsons", mode: "insensitive" } }
  });
  
  let tenantId = tenant?.tenantId;
  if (!tenantId) {
    tenant = await prisma.user.findFirst();
    if (tenant) {
        tenantId = tenant.tenantId;
    } else {
        console.error("No tenant found!");
        return;
    }
  }
  
  console.log("Using Tenant ID:", tenantId);

  // 2. Read Partners.xls
  console.log("Reading Partners.xls...");
  const partnersWb = xlsx.readFile('C:\\Users\\rahul\\OneDrive\\Desktop\\Partners.xls');
  const partnersData = xlsx.utils.sheet_to_json(partnersWb.Sheets[partnersWb.SheetNames[0]], { header: 1 }) as any[][];
  
  // Find start row (skip titles)
  let partnerStart = 0;
  for (let i = 0; i < partnersData.length; i++) {
    if (partnersData[i][0] === 'Id') {
      partnerStart = i + 1;
      break;
    }
  }

  const customerMap = new Map();
  for (let i = partnerStart; i < partnersData.length; i++) {
    const row = partnersData[i];
    if (!row || !row[0]) continue;
    
    const id = row[0];
    const name = row[2] || "Unknown";
    const address = row[3] || "";
    const phone = row[9] || "";
    const mobile = row[14] || phone;
    const driverName = row[16] || "";

    const customer = await prisma.customer.upsert({
      where: { id: `legacy-cust-${id}` },
      update: {
        displayName: name,
        primaryMobile: String(mobile),
        addressLine1: address,
        driverName: driverName,
      },
      create: {
        id: `legacy-cust-${id}`,
        tenantId,
        displayName: name,
        primaryMobile: String(mobile),
        addressLine1: address,
        driverName: driverName,
        sourceSystem: 'jobcard2',
        sourceRecordId: String(id)
      }
    });
    
    customerMap.set(id, customer.id);
  }
  console.log(`Migrated ${customerMap.size} Customers.`);

  // 3. Read Auto object table.xls
  console.log("Reading Auto object table.xls...");
  const autoWb = xlsx.readFile('C:\\Users\\rahul\\OneDrive\\Desktop\\Auto object table.xls');
  const autoData = xlsx.utils.sheet_to_json(autoWb.Sheets[autoWb.SheetNames[0]], { header: 1 }) as any[][];

  let autoStart = 0;
  for (let i = 0; i < autoData.length; i++) {
    if (autoData[i][0] === 'Id') {
      autoStart = i + 1;
      break;
    }
  }

  let vehicleCount = 0;
  for (let i = autoStart; i < autoData.length; i++) {
    const row = autoData[i];
    if (!row || !row[0]) continue;

    const id = row[0];
    const lpn = row[2] ? String(row[2]) : `UNKNOWN-${id}`;
    const make = row[3] || "";
    const model = row[4] || "";
    const vin = row[7] || "";
    const year = row[9] ? parseInt(row[9]) : null;
    const color = row[10] || "";
    const batteryDetails = row[11] || "";
    const nextServiceDate = excelDateToJSDate(parseFloat(row[12]));
    const nextOilChangeDate = excelDateToJSDate(parseFloat(row[14]));
    const nextOilChangeDist = row[15] ? parseInt(row[15]) : null;
    const customerIdRaw = row[18];
    const notes = row[29] || "";

    let customerId = customerMap.get(customerIdRaw);
    if (!customerId) {
        // Find by name if possible, or create unknown
        const fallback = await prisma.customer.upsert({
            where: { id: 'legacy-cust-unknown' },
            update: {},
            create: {
                id: 'legacy-cust-unknown',
                tenantId,
                displayName: 'Unknown Legacy Owner',
                sourceSystem: 'jobcard2'
            }
        });
        customerId = fallback.id;
    }

    const normalizedLpn = lpn.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (!normalizedLpn) continue;

    await prisma.vehicle.upsert({
      where: { registrationNumberNormalized: normalizedLpn },
      update: {
        manufacturer: make,
        model: model,
        vin: vin,
        manufactureYear: year,
        color: color,
        batteryMake: batteryDetails,
        nextServiceDate: nextServiceDate,
        nextOilChangeDate: nextOilChangeDate,
        nextOilChangeDistance: nextOilChangeDist,
        currentCustomerId: customerId,
        notes: notes
      },
      create: {
        tenantId,
        registrationNumberRaw: lpn,
        registrationNumberNormalized: normalizedLpn,
        manufacturer: make,
        model: model,
        vin: vin,
        manufactureYear: year,
        color: color,
        batteryMake: batteryDetails,
        nextServiceDate: nextServiceDate,
        nextOilChangeDate: nextOilChangeDate,
        nextOilChangeDistance: nextOilChangeDist,
        currentCustomerId: customerId,
        notes: notes,
        sourceSystem: 'jobcard2',
        sourceRecordId: String(id)
      }
    });

    vehicleCount++;
  }
  console.log(`Migrated ${vehicleCount} Vehicles.`);

  console.log("Migration Complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
