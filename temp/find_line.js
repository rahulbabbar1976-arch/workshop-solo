const fs = require('fs');
const lines = fs.readFileSync('src/app/owner/page.tsx', 'utf8').split('\n');
const index = lines.findIndex(l => l.includes('Database &amp; Data Management') || l.includes('Database & Data Management'));
console.log('Line index:', index);
