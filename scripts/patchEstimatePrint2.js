const fs = require('fs');

const file = 'src/app/solo/print/estimate/[id]/EstimatePrintClient.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const router = useRouter\(\);/g, 'const router = require("next/navigation").useRouter();\n  const jobCard = estimate.jobcard;');

// The first patch script missed these:
code = code.replace(/jobCard\.labourLines \|\| \[\]/g, 'activeLabor');
code = code.replace(/jobCard\.partLines \|\| \[\]/g, 'activeParts');

fs.writeFileSync(file, code);
console.log('Done!');
