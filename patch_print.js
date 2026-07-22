const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/print/PrintLayoutClient.tsx', 'utf8');

const servicesSection = `{/* Services */}`;
code = code.replace(servicesSection, `{docType !== 'INTAKE' && (\n<>\n${servicesSection}`);

const footerSection = `{/* User Custom Footer */}`;
code = code.replace(footerSection, `</>\n)}\n${footerSection}`);

fs.writeFileSync('src/app/solo/jobcards/[id]/print/PrintLayoutClient.tsx', code);
console.log('Fixed internal print layout for INTAKE');
