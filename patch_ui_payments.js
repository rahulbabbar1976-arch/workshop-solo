const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

// 1. isLocked
code = code.replace(
  'const isLocked = ["ready_for_delivery", "delivered", "closed", "ready"].includes(jobCard.status?.toLowerCase());',
  'const isLocked = ["ready_for_delivery", "delivered", "closed", "ready", "completed"].includes(jobCard.status?.toLowerCase());'
);

// 2. Center FABs
// For Parts, Labor, Pictures. Right now they are "fixed bottom-6 right-6"
code = code.split('fixed bottom-6 right-6').join('fixed bottom-6 left-1/2 -translate-x-1/2');

// 3. Add state for amountPaid
if (!code.includes('const [amountPaid, setAmountPaid] = useState<number>')) {
  code = code.replace(
    'const [isLockedByBackend, setIsLockedByBackend] = useState(false);',
    `const [isLockedByBackend, setIsLockedByBackend] = useState(false);\n  const [amountPaid, setAmountPaid] = useState<number>(jobCard.amountPaid || 0);\n  const [paymentAmountInput, setPaymentAmountInput] = useState<string>("");\n  const [isAddingPayment, setIsAddingPayment] = useState(false);`
  );
}

// 4. Update the handleSave to include amountPaid
// We need to inject amountPaid into handleUpdateStatus or any other global save, but usually jobcards save individually via specific updates.
// We'll create a handleAddPayment function
const handleAddPaymentFn = `
  const handleAddPayment = async () => {
    const val = parseFloat(paymentAmountInput);
    if (isNaN(val) || val <= 0) return alert("Enter a valid amount");
    const newAmount = amountPaid + val;
    try {
      const res = await fetch(\`/api/jobcards/\${jobCard.id}\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid: newAmount, editorId: user?.id })
      });
      if (res.ok) {
        setAmountPaid(newAmount);
        setPaymentAmountInput("");
        setIsAddingPayment(false);
      } else {
        alert("Failed to save payment");
      }
    } catch (e) {
      alert("Error saving payment");
    }
  };
`;

if (!code.includes('const handleAddPayment = async () => {')) {
  code = code.replace(
    'const handleAddDiscount = async () => {',
    `${handleAddPaymentFn}\n  const handleAddDiscount = async () => {`
  );
}

// 5. Update Financial block in details tab
const grandTotalStr = `
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                  <span className="font-bold text-gray-900">Grand Total</span>
                  <span className="font-bold text-lg text-gray-900">₹{grandTotal.toFixed(2)}</span>
                </div>
`;
const paymentBlockStr = `
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                  <span className="font-bold text-gray-900">Grand Total</span>
                  <span className="font-bold text-lg text-gray-900">₹{grandTotal.toFixed(2)}</span>
                </div>

                {/* Payments Section */}
                <div className="mt-4 bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700 text-sm">Payments Received</span>
                    <span className="font-bold text-teal-600">₹{amountPaid.toFixed(2)}</span>
                  </div>
                  
                  {amountPaid > 0 && (
                    <div className="flex justify-between items-center mb-3 pt-2 border-t border-gray-200">
                      <span className="font-bold text-gray-900">Remaining Balance</span>
                      <span className="font-bold text-lg text-red-500">₹{Math.max(0, grandTotal - amountPaid).toFixed(2)}</span>
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
                </div>
`;

if (code.includes(grandTotalStr)) {
  code = code.replace(grandTotalStr, paymentBlockStr);
}

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log('UI Patched successfully with Payments!');
