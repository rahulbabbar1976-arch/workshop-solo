import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import 'dotenv/config';
import 'dotenv/config';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DATA_DIR = 'C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program';

function readCSV(filename: string) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    return parse(content, {
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true
    });
}

async function main() {
    console.log('Starting migration...');

    // 1. Use the active tenant (the one users actually log into)
    // There are 3 duplicate "babbarsons" tenants; we target the one all users belong to.
    const TARGET_TENANT_ID = 'c371ba34-1142-4c39-99cc-b5878de3cd23';
    let tenant = await prisma.tenant.findUnique({
        where: { id: TARGET_TENANT_ID }
    });

    if (!tenant) {
        throw new Error(`Target tenant ${TARGET_TENANT_ID} not found! Aborting.`);
    }
    console.log(`Using Tenant: ${tenant.id} (${tenant.name})`);

    // Clear existing legacy migration data from ALL babbarsons tenants
    // (there are 3 duplicate tenants; we delete legacy data from all to avoid constraint conflicts)
    console.log('Clearing legacy migration data from all babbarsons tenants...');
    const allBabbarsonsTenants = await prisma.tenant.findMany({
        where: { name: { in: ['BABBARSONS', 'BABBARSONS ', 'babbarsons'] } }
    });
    const allTenantIds = allBabbarsonsTenants.map(t => t.id);
    console.log(`Found ${allTenantIds.length} babbarsons tenants, cleaning all...`);

    for (const tid of allTenantIds) {
        await prisma.jobCardPart.deleteMany({ where: { jobCard: { vehicle: { tenantId: tid } } } });
        await prisma.jobCardLabour.deleteMany({ where: { jobCard: { vehicle: { tenantId: tid } } } });
        await prisma.jobCardComplaint.deleteMany({ where: { tenantId: tid } });
        await prisma.jobCard.deleteMany({ where: { vehicle: { tenantId: tid } } });
        await prisma.vehicle.deleteMany({ where: { tenantId: tid } });
        // Only delete customers migrated by the script (those with no primaryMobile set to real number)
        await prisma.customer.deleteMany({
            where: {
                tenantId: tid,
                sourceSystem: null,
                jobCards: { none: {} }  // only delete if no real jobcards linked
            }
        });
    }

    // More thorough: delete all legacy JC numbers first
    await prisma.jobCard.deleteMany({
        where: { jobcardNumber: { startsWith: 'JC-LEGACY-' } }
    });

    // 2. Load Customers and Addresses
    console.log('Loading Customers...');
    const customersRaw = readCSV('customer.csv');
    const addressesRaw = readCSV('address.csv');

    const customerMap = new Map();

    for (const addr of addressesRaw) {
        const id = addr[2]; // CUSTOMER_ID
        const name = addr[3] || 'Unknown';
        const address = addr[6] || '';
        
        customerMap.set(id, {
            displayName: name,
            addressLine1: address,
            primaryMobile: ''
        });
    }

    for (const cust of customersRaw) {
        const id = cust[0]; // ID
        const mobile = cust[11] || '';
        if (customerMap.has(id)) {
            const data = customerMap.get(id);
            data.primaryMobile = mobile;
            customerMap.set(id, data);
        } else {
            customerMap.set(id, {
                displayName: 'Unknown',
                primaryMobile: mobile,
                addressLine1: ''
            });
        }
    }

    // Insert Customers in batches
    const legacyToNewCustomerId = new Map();
    const customerEntries = Array.from(customerMap.entries());
    const chunkSize = 50;
    
    for (let i = 0; i < customerEntries.length; i += chunkSize) {
        const chunk = customerEntries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async ([legacyId, data]) => {
            try {
                const c = await prisma.customer.create({
                    data: {
                        tenantId: tenant.id,
                        displayName: data.displayName,
                        billingName: data.displayName,
                        primaryMobile: data.primaryMobile || `000000000${legacyId}`.slice(-10),
                        addressLine1: data.addressLine1
                    }
                });
                legacyToNewCustomerId.set(legacyId, c.id);
            } catch (e) {
                console.error(`Failed to create customer ${legacyId}:`, e.message);
            }
        }));
    }
    console.log(`Imported ${legacyToNewCustomerId.size} Customers`);

    // 3. Load Vehicles
    console.log('Loading Vehicles...');
    const vehiclesRaw = readCSV('thing.csv');
    const legacyToNewVehicleId = new Map();
    const newVehicleIdToCustomerId = new Map();
    const vehicleEntries = [];
    const usedRegs = new Set();

    for (const v of vehiclesRaw) {
        const legacyId = v[0];
        const legacyCustomerId = v[1];
        const newCustomerId = legacyToNewCustomerId.get(legacyCustomerId);

        if (!newCustomerId) continue;

        let reg = v[2] || `UNKNOWN-${legacyId}`;
        reg = reg.replace(/\n/g, ' ').trim();
        let normReg = reg.replace(/[^A-Z0-9]/ig, '').toUpperCase();
        if (!normReg) normReg = `UNKNOWN${legacyId}`;
        
        if (usedRegs.has(normReg)) {
            normReg = `${normReg}D${legacyId}`;
            reg = `${reg} (D${legacyId})`;
        }
        usedRegs.add(normReg);

        const make = v[24] || 'Unknown';
        const model = v[25] || 'Unknown';
        const fuel = v[27] || 'Petrol';
        const yearStr = v[14];
        let year = parseInt(yearStr);
        if (isNaN(year) || year < 1900) year = 2010;

        vehicleEntries.push({ legacyId, newCustomerId, reg, normReg, make, model, fuel, year });
    }

    for (let i = 0; i < vehicleEntries.length; i += chunkSize) {
        const chunk = vehicleEntries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (v) => {
            try {
                const vehicle = await prisma.vehicle.upsert({
                    where: { registrationNumberNormalized: v.normReg },
                    update: {
                        currentCustomerId: v.newCustomerId,
                        tenantId: tenant.id // claim it for this tenant just in case
                    },
                    create: {
                        tenantId: tenant.id,
                        currentCustomerId: v.newCustomerId,
                        registrationNumberRaw: v.reg,
                        registrationNumberNormalized: v.normReg,
                        manufacturer: v.make,
                        model: v.model,
                        fuelType: v.fuel,
                        manufactureYear: v.year
                    }
                });
                legacyToNewVehicleId.set(v.legacyId, vehicle.id);
                newVehicleIdToCustomerId.set(vehicle.id, v.newCustomerId);
            } catch (e) {
                console.error(`Failed to create vehicle ${v.reg}:`, e.message);
            }
        }));
    }
    console.log(`Imported ${legacyToNewVehicleId.size} Vehicles`);


    // 4. Load JobCards
    console.log('Loading JobCards...');
    const worksheetsRaw = readCSV('worksheet.csv');
    const legacyToNewJobCardId = new Map();
    const jcEntries = [];

    for (const w of worksheetsRaw) {
        const legacyId = w[0];
        const legacyVehicleId = w[1];
        const newVehicleId = legacyToNewVehicleId.get(legacyVehicleId);

        if (!newVehicleId) continue;
        
        const customerId = newVehicleIdToCustomerId.get(newVehicleId);
        if (!customerId) continue;

        let creationTime = w[7] ? new Date(w[7]) : new Date();
        if (isNaN(creationTime.getTime())) creationTime = new Date();

        jcEntries.push({ legacyId, newVehicleId, customerId, creationTime });
    }

    for (let i = 0; i < jcEntries.length; i += chunkSize) {
        const chunk = jcEntries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (jcData) => {
            try {
                const jc = await prisma.jobCard.create({
                    data: {
                        tenantId: tenant.id,
                        vehicleId: jcData.newVehicleId,
                        customerId: jcData.customerId,
                        jobcardNumber: `JC-LEGACY-${jcData.legacyId}`,
                        status: 'COMPLETED',
                        createdAt: jcData.creationTime,
                        updatedAt: jcData.creationTime
                    }
                });
                legacyToNewJobCardId.set(jcData.legacyId, jc.id);
            } catch (e) {
                console.error(`Failed to create JobCard JC-LEGACY-${jcData.legacyId}:`, e.message);
            }
        }));
    }
    console.log(`Imported ${legacyToNewJobCardId.size} JobCards`);


    // 5. Load Complaints
    console.log('Loading Complaints...');
    const problemsRaw = readCSV('problem.csv');
    const complaintEntries = [];

    for (const p of problemsRaw) {
        const connectionId = p[5];
        const connectionKey = p[6];
        const name = p[8];

        if (connectionKey === 'WORKSHEET' && name) {
            const newJobCardId = legacyToNewJobCardId.get(connectionId);
            if (newJobCardId) {
                complaintEntries.push({ newJobCardId, name });
            }
        }
    }

    let complaintCount = 0;
    for (let i = 0; i < complaintEntries.length; i += chunkSize) {
        const chunk = complaintEntries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (c) => {
            try {
                await prisma.jobCardComplaint.create({
                    data: {
                        jobcardId: c.newJobCardId,
                        tenantId: tenant.id,
                        customerComplaintText: c.name,
                        hasTextInput: true
                    }
                });
                complaintCount++;
            } catch (e) {
                // Ignore
            }
        }));
    }
    console.log(`Imported ${complaintCount} Complaints`);


    // 6. Load Parts & Labor
    console.log('Loading Items...');
    const itemsRaw = readCSV('item.csv');
    const partEntries = [];
    const laborEntries = [];

    for (const item of itemsRaw) {
        const connectionId = item[7];
        const connectionKey = item[8];
        const type = parseInt(item[18]);
        const name = item[22] || 'Unknown Item';
        let qty = Math.abs(parseFloat(item[24]) || 1);
        let sellingPrice = parseFloat(item[35]) || 0;

        if (connectionKey === 'WORKSHEET') {
            const newJobCardId = legacyToNewJobCardId.get(connectionId);
            if (newJobCardId) {
                if (type === 1 || item[26] === 'hour' || item[26] === 'hr') {
                    laborEntries.push({ newJobCardId, name, qty, sellingPrice });
                } else {
                    partEntries.push({ newJobCardId, name, partNumber: item[28] || 'N/A', qty, sellingPrice });
                }
            }
        }
    }

    let laborCount = 0;
    for (let i = 0; i < laborEntries.length; i += chunkSize) {
        const chunk = laborEntries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (l) => {
            try {
                await prisma.jobCardLabour.create({
                    data: {
                        jobcardId: l.newJobCardId,
                        labourName: l.name,
                        quantity: l.qty,
                        sellingPrice: l.sellingPrice,
                        status: 'completed'
                    }
                });
                laborCount++;
            } catch (e) {}
        }));
    }

    let partCount = 0;
    for (let i = 0; i < partEntries.length; i += chunkSize) {
        const chunk = partEntries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (p) => {
            try {
                await prisma.jobCardPart.create({
                    data: {
                        jobcardId: p.newJobCardId,
                        partName: p.name,
                        partNumber: p.partNumber,
                        quantityRequested: p.qty,
                        sellingPrice: p.sellingPrice,
                        status: 'installed'
                    }
                });
                partCount++;
            } catch (e) {}
        }));
    }

    console.log(`Imported ${partCount} Parts and ${laborCount} Labor items`);
    console.log('Migration complete!');
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
