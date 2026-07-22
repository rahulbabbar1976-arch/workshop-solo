const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

code = code.replace('iconOnly', 'label={""}');
code = code.replace('iconClassName="text-gray-600 group-hover:text-green-600"', '');

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log("Done fixing props.");
