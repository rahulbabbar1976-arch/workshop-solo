import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import db from './src/lib/db';

async function main() {
  const tenant = await db.tenant.findFirst({
    where: { name: { contains: 'BABBARSONS', mode: 'insensitive' } }
  });
  
  if (!tenant) {
    console.error('Tenant BABBARSONS not found');
    process.exit(1);
  }

  const parts = await db.partsMaster.findMany({
    where: { tenantId: tenant.id },
    select: {
      partName: true,
      category: true,
      hsnCode: true,
    }
  });

  // Group by category for easier reading
  const grouped = parts.reduce((acc, part) => {
    const cat = part.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ name: part.partName, hsn: part.hsnCode || 'None' });
    return acc;
  }, {} as Record<string, {name: string, hsn: string}[]>);

  let markdown = `# Categorized Parts Inventory Report\n\n`;
  markdown += `*Tenant: BABBARSONS*\n`;
  markdown += `*Total Parts: ${parts.length}*\n\n`;

  for (const [category, items] of Object.entries(grouped)) {
    markdown += `## ${category} (${items.length} items)\n\n`;
    markdown += `| Part Name | HSN Code |\n`;
    markdown += `|---|---|\n`;
    
    // Only show up to 50 items per category to keep the artifact reasonable
    const displayItems = items.slice(0, 50);
    for (const item of displayItems) {
      markdown += `| ${item.name} | ${item.hsn} |\n`;
    }
    
    if (items.length > 50) {
      markdown += `| *...and ${items.length - 50} more* | |\n`;
    }
    markdown += `\n`;
  }

  fs.writeFileSync('categorized_parts_report.md', markdown);
  console.log('Report generated: categorized_parts_report.md');
}

main().catch(console.error).finally(() => db.$disconnect());
