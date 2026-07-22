const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

const target = `<div className="flex space-x-2">
                <span className={\`flex-1 text-center py-2 text-white rounded font-bold uppercase tracking-wider text-sm shadow-sm \${isLocked ? 'bg-emerald-500' : 'bg-amber-400'}\`}>
                  {displayStatus}
                </span>
                {isLocked ? (
                  <button 
                    onClick={() => handleUpdateStatus("open")}
                    className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-orange-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Mark Open
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateStatus("ready_for_delivery")}
                    className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-gray-900 hover:text-white transition-colors cursor-pointer"
                  >
                    Mark Ready
                  </button>
                )}
              </div>`;

const replacement = `<div className="relative">
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
              </div>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log('Patched status dropdown');
