const fs = require('fs');
const file = 'prisma/schema.prisma';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('partsSnapshot')) {
  code = code.replace(
    /jobCardId String\?/g,
    `jobCardId String?\n  tenantId       String?\n  partsSnapshot  String?\n  laborSnapshot  String?\n  grandTotal     Float    @default(0)`
  );
  fs.writeFileSync(file, code);
  console.log('Schema patched!');
} else {
  console.log('Already patched!');
}
