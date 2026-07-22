const fs = require('fs');

let code = fs.readFileSync('src/app/share/components/PublicShareClient.tsx', 'utf8');

code = code.replace(
  /{docType === 'estimate' \? 'ESTIMATE' : 'JOBCARD'}/g,
  `{docType === 'estimate' ? 'ESTIMATE' : (docType === 'intake' ? 'VEHICLE INTAKE' : 'JOBCARD')}`
);
code = code.replace(
  /{docType === 'estimate' \? \`Estimate #\${estimate.estimateNumber}\` : \`Jobcard #\${jobCard.jobcardNumber}\`}/g,
  `{docType === 'estimate' ? \\\`Estimate #\${estimate.estimateNumber}\\\` : (docType === 'intake' ? \\\`Intake #\${jobCard.jobcardNumber}\\\` : \\\`Jobcard #\${jobCard.jobcardNumber}\\\`)}`
);
code = code.replace(
  /\{docType === 'estimate' \? 'Estimate' : 'Jobcard'\}/g,
  `{docType === 'estimate' ? 'Estimate' : (docType === 'intake' ? 'Vehicle Intake' : 'Jobcard')}`
);

const laborSection = `{/* Labor Section */}`;
code = code.replace(laborSection, `{docType !== 'intake' && (\n<>\n${laborSection}`);

const footerSection = `{/* Footer Section */}`;
code = code.replace(footerSection, `</>\n)}\n${footerSection}`);

fs.writeFileSync('src/app/share/components/PublicShareClient.tsx', code);
console.log('Fixed public share titles');
