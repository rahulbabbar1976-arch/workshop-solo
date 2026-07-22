const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

// 1. WhatsApp Button
code = code.replace(
  '<WhatsAppButton phoneNumber={jobCard.customer?.primaryMobile || ""} message={`Hello ${jobCard.customer?.displayName}, your vehicle intake jobcard is ready: https://${typeof window !== \'undefined\' ? window.location.host : \'\'}/share/jobcard/${jobCard.id}`} />',
  `<WhatsAppButton 
                  phoneNumber={jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile}
                  message={\`Hello \${jobCard.currentCustomer?.displayName || jobCard.customer?.displayName}, your job card \${jobCard.jobcardNumber} is ready. View it here: \${window.location.origin}/p/j/\${jobCard.id}\`}
                  iconOnly
                  className="bg-gray-100 p-2 hover:bg-gray-200 rounded-full transition-colors w-10 h-10 flex items-center justify-center group"
                  iconClassName="text-gray-600 group-hover:text-green-600"
                />`
);

// 2. Document Icon
code = code.replace(
  `<a href={\`/share/jobcard/\${jobCard.id}\`} target="_blank" className="p-2 hover:bg-gray-800 rounded-full transition-colors text-white" title="Open Digital Copy">
              <FileText className="w-5 h-5" />
            </a>`,
  `<Link 
                  href={\`/solo/jobcards/\${jobCard.id}/print?docType=JOBCARD\`}
                  className="bg-gray-100 p-2 hover:bg-gray-200 rounded-full transition-colors w-10 h-10 flex items-center justify-center group hidden sm:flex"
                  title="View / Print Document"
                >
              <FileText className="w-5 h-5 text-gray-600 group-hover:text-teal-600" />
            </Link>`
);

// 3. Print Estimate link
code = code.replace(
  '<Link href={`/solo/print/estimate/${jobCard.id}`} className="block px-4 py-2 hover:bg-gray-100 flex items-center">Print Estimate</Link>',
  '<Link href={`/solo/jobcards/${jobCard.id}/print?docType=ESTIMATE`} className="block px-4 py-2 hover:bg-gray-100 flex items-center">Print Estimate</Link>'
);

// 4. Taxes logic
code = code.replace(
  'const discountPercentage = totalBeforeDiscount > 0 ? (totalDiscountAmount / totalBeforeDiscount) * 100 : 0;',
  `const discountPercentage = totalBeforeDiscount > 0 ? (totalDiscountAmount / totalBeforeDiscount) * 100 : 0;
  const taxesApplicable = taxSettings?.taxesApplicable !== false;
  const taxes = taxesApplicable ? totalBeforeDiscount * ((taxSettings?.intrastateCgstRate || 9) + (taxSettings?.intrastateSgstRate || 9)) / 100 : 0;`
);

// 5. Taxes UI top
const oldTaxesBlock = `<div className="flex justify-between items-center font-bold text-gray-800 text-lg mt-4 pt-4 border-t border-gray-200">
            <span>Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>`;
const newTaxesBlock = `{taxesApplicable && (
          <div className="flex justify-between items-center text-sm font-medium text-gray-700">
            <span>Taxes</span>
            <span>₹{taxes.toFixed(2)}</span>
          </div>
          )}
          <div className="flex justify-between items-center font-bold text-gray-800 text-lg mt-4 pt-4 border-t border-gray-200">
            <span>Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>`;
code = code.replace(oldTaxesBlock, newTaxesBlock);

// 6. Taxes UI sticky bottom
const oldTaxesBlock2 = `<div className="text-right">
            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Est. Total</p>`;
const newTaxesBlock2 = `{taxesApplicable && (
            <div className="text-center px-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Taxes</p>
              <p className="text-sm font-semibold text-gray-700">₹{taxes.toFixed(2)}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Est. Total</p>`;
code = code.replace(oldTaxesBlock2, newTaxesBlock2);

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log("Done patching UI.");
