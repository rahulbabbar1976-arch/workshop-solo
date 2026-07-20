const fs = require('fs');

const file = 'src/app/solo/print/estimate/[id]/EstimatePrintClient.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace component name
code = code.replace(/export function PrintLayoutClient.*?\)/, 'export function EstimatePrintClient({ estimate, workshopProfile }: { estimate: any, workshopProfile?: any })');

// Add jobCard variable
code = code.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const jobCard = estimate.jobcard;');

// Remove parts/labor derived from jobCard and replace with estimate
code = code.replace(/const activeParts =.*?isDeleted\);/s, `const activeParts = typeof estimate.partsSnapshot === 'string' ? JSON.parse(estimate.partsSnapshot) : (estimate.partsSnapshot || []);\n  const activeLabor = typeof estimate.laborSnapshot === 'string' ? JSON.parse(estimate.laborSnapshot) : (estimate.laborSnapshot || []);`);

// Update Date to Estimate Date
code = code.replace(/{formatDate\(jobCard.createdAt\)}/, '{formatDate(estimate.createdAt)}');
code = code.replace(/Invoice #.*?jobCard\.invoiceNumber/, 'Estimate #{estimate.estimateNumber');
code = code.replace(/>Invoice #.*?{jobCard.invoiceNumber}/, '>Estimate #</span>\n                    <span className="font-bold text-gray-900">{estimate.estimateNumber}');
code = code.replace(/Jobcard \#.*?{jobCard.jobcardNumber}/, 'Jobcard #</span>\n                    <span className="font-bold text-gray-900">{jobCard.jobcardNumber}');

// Replace "Invoice" or "Intake" with "Estimate"
code = code.replace(/{invoiceType === 'invoice' \? "Tax Invoice" : "Job Card Intake"}/g, '"Estimate"');
code = code.replace(/<title>.*?<\/title>/, '<title>Estimate - {estimate.estimateNumber}</title>');

// Hide Date of Completed if any
code = code.replace(/{jobCard.completedAt/, '{false');

// Remove complaints/images/km if needed, or leave them (user said "copy only customer details vehicle number, parts and labor, do not copy KM milage, battery details, images, problems, date of creations and date of completed")
// Oh, the user wanted these excluded from CLONED jobcards, but for Estimate, maybe they are excluded too?
// "if a copy of estimate is desired create a icon for estimate on selected jobcard which will give printout verison of estimate with customer details, vehicle details, details of parts and labor, total with discount and without discounts."
// So no complaints, no KM, no images!
// I'll strip them out.

code = code.replace(/\{jobCard.complaints && jobCard.complaints.length > 0 && \(.*?\}\)/s, '');
code = code.replace(/KM: \{jobCard.intakeOdometer\}/, 'KM: -');

// Fix signature blocks
code = code.replace(/Customer Signature/g, 'Customer Signature / Approval');
code = code.replace(/Authorized Signatory/g, 'Authorized Signatory');

fs.writeFileSync(file, code);
console.log('Done!');
