const fs = require('fs');
const lines = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8').split('\n');

const partsIdx = lines.findIndex((l, i) => i > 700 && l.includes('activeTab === "parts" && ('));
console.log('--- PARTS TAB ---');
if (partsIdx > -1) console.log(lines.slice(Math.max(0, partsIdx - 5), partsIdx + 30).join('\n'));

const laborIdx = lines.findIndex((l, i) => i > 700 && l.includes('activeTab === "labor" && ('));
console.log('--- LABOR TAB ---');
if (laborIdx > -1) console.log(lines.slice(Math.max(0, laborIdx - 5), laborIdx + 30).join('\n'));

const picsIdx = lines.findIndex((l, i) => i > 700 && l.includes('activeTab === "pictures" && ('));
console.log('--- PICTURES TAB ---');
if (picsIdx > -1) console.log(lines.slice(Math.max(0, picsIdx - 5), picsIdx + 30).join('\n'));
