const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

// 1. Status Dropdown
const targetStatus = `<div className="flex space-x-2">
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

const replacementStatus = `<div className="relative mb-4">
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

if (code.includes(targetStatus)) {
  code = code.replace(targetStatus, replacementStatus);
  console.log('Status updated');
} else {
  console.log('Target status block not found');
}

// 2. Payments Block
const searchTarget = '              {/* WhatsApp Quick Actions */}';
const paymentBlock = `              {/* Payments Section */}
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mt-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payments Received</span>
                  <span className="font-bold text-teal-600">₹{amountPaid.toFixed(2)}</span>
                </div>
                {amountPaid > 0 && (
                  <div className="flex justify-between items-center mb-3 pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Remaining Balance</span>
                    <span className="font-bold text-red-500">₹{Math.max(0, grandTotal - amountPaid).toFixed(2)}</span>
                  </div>
                )}
                {!isLocked && (
                  <>
                    {isAddingPayment ? (
                      <div className="flex mt-2 space-x-2">
                        <input 
                          type="number" 
                          className="flex-1 p-2 border rounded-md text-sm" 
                          placeholder="Amount..." 
                          value={paymentAmountInput} 
                          onChange={(e) => setPaymentAmountInput(e.target.value)} 
                        />
                        <button onClick={handleAddPayment} className="px-3 py-2 bg-teal-600 text-white text-sm rounded-md font-bold hover:bg-teal-700">Save</button>
                        <button onClick={() => setIsAddingPayment(false)} className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md font-bold hover:bg-gray-300">Cancel</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsAddingPayment(true)}
                        className="w-full py-2 mt-1 border border-dashed border-teal-500 text-teal-600 rounded text-sm font-semibold hover:bg-teal-50 transition-colors"
                      >
                        + Record Payment
                      </button>
                    )}
                  </>
                )}
              </div>\n\n`;

if (code.includes(searchTarget) && !code.includes('Payments Received')) {
  code = code.replace(searchTarget, paymentBlock + searchTarget);
  console.log('Payment section inserted');
} else {
  console.log('Payment target not found or already inserted');
}

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log('Done');
