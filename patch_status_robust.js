const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

const startStr = '<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status</h3>';
const endStr = '{/* WhatsApp Quick Actions */}';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = startStr + `
              <div className="relative mb-4">
                <select 
                  value={jobCard.status?.toLowerCase() || 'open'} 
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className={\`w-full appearance-none outline-none py-2 pl-4 pr-8 text-white rounded font-bold uppercase tracking-wider text-sm shadow-sm cursor-pointer transition-colors \${isLocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}\`}
                >
                  <option value="open" className="bg-white text-gray-900 uppercase">Open</option>
                  <option value="estimate_for_approval" className="bg-white text-gray-900 uppercase">Estimate for Approval</option>
                  <option value="awaiting_parts" className="bg-white text-gray-900 uppercase">Awaiting Parts</option>
                  <option value="completed" className="bg-white text-gray-900 uppercase">Completed</option>
                  <option value="ready_for_delivery" className="bg-white text-gray-900 uppercase">Ready for delivery</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
              
              `;
  
  code = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
  console.log('Successfully replaced!');
} else {
  console.log('Could not find start or end bounds');
}
