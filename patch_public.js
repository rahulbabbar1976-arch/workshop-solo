const fs = require('fs');

let code = fs.readFileSync('src/app/share/components/PublicShareClient.tsx', 'utf8');

// 1. Add calculations at the top of the component (around line 100)
const insertCalcTarget = `  const isEnabled = (id: string) => {
    if (!Array.isArray(config)) return true;
    const item = config.find((c: any) => c.id === id);
    return item ? item.enabled : true;
  };`;

const calcs = `
  const totalParts = jobCard.partLines?.reduce((sum: number, p: any) => sum + (p.sellingPrice * p.quantity), 0) || 0;
  const totalLabor = jobCard.labourLines?.reduce((sum: number, l: any) => sum + (l.sellingPrice * (l.quantityRequested || l.quantity || 1)), 0) || 0;
  const grandTotal = totalParts + totalLabor;
`;

code = code.replace(insertCalcTarget, insertCalcTarget + calcs);

// 2. Add Tables before Footer Section
const insertTablesTarget = `{/* Footer Section */}`;

const tables = `
        {/* Labor Section */}
        {isEnabled('LABOUR') && jobCard.labourLines?.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Services / Labor</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600 font-medium">Service</th>
                    <th className="text-center py-2 text-gray-600 font-medium">Qty</th>
                    <th className="text-right py-2 text-gray-600 font-medium">Price</th>
                    <th className="text-right py-2 text-gray-600 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCard.labourLines.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{l.labourName}</td>
                      <td className="text-center py-2 text-gray-600">{l.quantityRequested || l.quantity || 1}</td>
                      <td className="text-right py-2 text-gray-600">₹{Number(l.sellingPrice || 0).toFixed(2)}</td>
                      <td className="text-right py-2 font-medium text-gray-800">₹{(Number(l.sellingPrice || 0) * Number(l.quantityRequested || l.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Parts Section */}
        {isEnabled('PARTS') && jobCard.partLines?.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Parts</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600 font-medium">Part</th>
                    <th className="text-center py-2 text-gray-600 font-medium">Qty</th>
                    <th className="text-right py-2 text-gray-600 font-medium">Price</th>
                    <th className="text-right py-2 text-gray-600 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCard.partLines.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{p.partName}</td>
                      <td className="text-center py-2 text-gray-600">{p.quantity || 1}</td>
                      <td className="text-right py-2 text-gray-600">₹{Number(p.sellingPrice || 0).toFixed(2)}</td>
                      <td className="text-right py-2 font-medium text-gray-800">₹{(Number(p.sellingPrice || 0) * Number(p.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {isEnabled('TOTALS') && (
          <div className="mb-8 flex justify-end">
            <div className="w-64">
              <div className="flex justify-between items-center py-2 text-sm text-gray-600">
                <span>Services Total</span>
                <span>₹{totalLabor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-gray-600">
                <span>Parts Total</span>
                <span>₹{totalParts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 text-lg font-bold text-gray-800 border-t-2 border-gray-800 mt-2">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        `;

code = code.replace(insertTablesTarget, tables + insertTablesTarget);

fs.writeFileSync('src/app/share/components/PublicShareClient.tsx', code);
console.log('Fixed public share layout');
