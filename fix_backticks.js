const fs = require('fs');
let code = fs.readFileSync('src/app/share/components/PublicShareClient.tsx', 'utf8');
code = code.split('\\`').join('`');
fs.writeFileSync('src/app/share/components/PublicShareClient.tsx', code);
console.log('Fixed backticks');
