const fs = require('fs');

const file = 'src/app/solo/print/estimate/[id]/EstimatePrintClient.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const jobCard = estimate\.jobcard;/g, 'const jobCard = estimate.jobCard || estimate.jobcard;');

fs.writeFileSync(file, code);
console.log('Done!');
