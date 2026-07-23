const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const partsCount = await prisma.jobCardPart.count();
    const laborCount = await prisma.jobCardLabour.count();
    const legacyCount = await prisma.jobCard.count({ where: { legacyImportFlag: true } });
    const normalCount = await prisma.jobCard.count({ where: { legacyImportFlag: false } });

    console.log('Parts count:', partsCount);
    console.log('Labor count:', laborCount);
    console.log('Legacy job cards:', legacyCount);
    console.log('Normal job cards:', normalCount);

    if (legacyCount > 0) {
        const sampleLegacy = await prisma.jobCard.findFirst({
            where: { legacyImportFlag: true },
            include: { partLines: true, labourLines: true }
        });
        console.log('Sample Legacy Job Card:', sampleLegacy.jobcardNumber);
        console.log(' - Parts:', sampleLegacy.partLines.length);
        console.log(' - Labor:', sampleLegacy.labourLines.length);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
