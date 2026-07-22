const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

// Add showWaDropdown state
code = code.replace(
  'const [showPrintDropdown, setShowPrintDropdown] = useState(false);',
  'const [showPrintDropdown, setShowPrintDropdown] = useState(false);\n  const [showWaDropdown, setShowWaDropdown] = useState(false);'
);

// Replace WhatsAppButton
const oldWa = `<WhatsAppButton 
                  phoneNumber={jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile}
                  message={\`Hello \${jobCard.currentCustomer?.displayName || jobCard.customer?.displayName}, your job card \${jobCard.jobcardNumber} is ready. View it here: \${window.location.origin}/share/jobcard/\${jobCard.id}\`}
                  label={""}
                  className="bg-gray-100 p-2 hover:bg-gray-200 rounded-full transition-colors w-10 h-10 flex items-center justify-center group"
                  
                />`;

const newWa = `<div className="relative">
              <button onClick={() => setShowWaDropdown(!showWaDropdown)} className="bg-gray-100 p-2 hover:bg-gray-200 rounded-full transition-colors w-10 h-10 flex items-center justify-center">
                {/* SVG for WhatsApp, or just a general Share icon. Since we don't have WhatsApp icon imported here directly other than WhatsAppButton, let's use the WhatsAppButton but block its default action? No, let's use a generic share icon or just text. Actually, let's just render the SVG path. */}
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </button>
              {showWaDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl z-50 text-gray-800 py-1 font-bold text-sm border border-gray-200">
                  <a href={\`https://wa.me/\${(jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile)?.replace(/\\D/g, '')}?text=\${encodeURIComponent(\`Hello \${jobCard.currentCustomer?.displayName || jobCard.customer?.displayName}, your vehicle intake details for job card \${jobCard.jobcardNumber} are recorded. View it here: \${window.location.origin}/share/intake/\${jobCard.id}\`)}\`} target="_blank" className="block px-4 py-2 hover:bg-gray-100 flex items-center" onClick={() => setShowWaDropdown(false)}>WhatsApp Intake</a>
                  
                  <a href={\`https://wa.me/\${(jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile)?.replace(/\\D/g, '')}?text=\${encodeURIComponent(\`Hello \${jobCard.currentCustomer?.displayName || jobCard.customer?.displayName}, your job card \${jobCard.jobcardNumber} is ready. View it here: \${window.location.origin}/share/jobcard/\${jobCard.id}\`)}\`} target="_blank" className="block px-4 py-2 hover:bg-gray-100 flex items-center" onClick={() => setShowWaDropdown(false)}>WhatsApp Jobcard</a>

                  <a href={\`https://wa.me/\${(jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile)?.replace(/\\D/g, '')}?text=\${encodeURIComponent(\`Hello \${jobCard.currentCustomer?.displayName || jobCard.customer?.displayName}, here is your estimate for job card \${jobCard.jobcardNumber}. View it here: \${window.location.origin}/share/estimate/\${jobCard.id}\`)}\`} target="_blank" className="block px-4 py-2 hover:bg-gray-100 flex items-center" onClick={() => setShowWaDropdown(false)}>WhatsApp Estimate</a>
                </div>
              )}
            </div>`;

code = code.replace(oldWa, newWa);

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log('Fixed JobCardDetailClient whatsapp dropdown');
