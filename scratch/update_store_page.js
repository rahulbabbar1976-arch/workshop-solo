const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/store/page.tsx');
let content = fs.readFileSync(pagePath, 'utf-8');

// 1. Add scanPaymentMode state
if (!content.includes('const [scanPaymentMode')) {
  content = content.replace(
    /const \[scanDateOfPurchase, setScanDateOfPurchase\] = useState\(''\);/,
    `const [scanDateOfPurchase, setScanDateOfPurchase] = useState('');\n  const [scanPaymentMode, setScanPaymentMode] = useState('');`
  );
}

// 2. Add scanPaymentMode to commitScanToInventory body
content = content.replace(
  /dateOfPurchase: scanDateOfPurchase\s*\}\)/,
  `dateOfPurchase: scanDateOfPurchase,\n            paymentMode: scanPaymentMode\n          })`
);

// 3. Clear scanPaymentMode on success
content = content.replace(
  /setScanDateOfPurchase\(''\);/,
  `setScanDateOfPurchase('');\n          setScanPaymentMode('');`
);

// 4. Add Payment Mode field to the review form
const paymentModeHtml = `
                    <div className="form-group" style={{ flex: '1 1 150px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Payment Mode</label>
                      <select className="form-control" value={scanPaymentMode} onChange={e => setScanPaymentMode(e.target.value)} style={{ padding: '0.4rem 0.6rem' }}>
                        <option value="">Select Mode...</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Credit">Credit/Account</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>`;

if (!content.includes('setScanPaymentMode(e.target.value)')) {
  content = content.replace(
    /(<input type="date" className="form-control" value=\{scanDateOfPurchase\}.*?\/>\s*<\/div>)/,
    `$1${paymentModeHtml}`
  );
}

// 5. Update part headers in the scan review table to include Match / Vehicle info
content = content.replace(
  /<th style=\{\{ padding: '0\.75rem', textAlign: 'left', color: 'var\(--text-secondary\)' \}\}>Est\. Cost<\/th>/,
  `<th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Est. Cost</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Vehicle Compat</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Action</th>`
);

// 6. Update part rows in scan review table to include action toggle & vehicle inputs
const rowRegex = /<td style=\{\{ padding: '0\.75rem', borderBottom: '1px solid rgba\(255,255,255,0\.05\)' \}\}>\s*<div className="form-group" style=\{\{ margin: 0, display: 'flex', alignItems: 'center', background: 'rgba\(255,255,255,0\.03\)', borderRadius: '6px', border: '1px solid rgba\(255,255,255,0\.08\)', padding: '0 0\.5rem' \}\}>\s*<span style=\{\{ color: 'var\(--text-secondary\)' \}\}>₹<\/span>\s*<input type="number".*?onChange=\{e => \{.*?\}\}.*?\/>\s*<\/div>\s*<\/td>/s;

const newCols = `
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <input type="text" className="form-control" placeholder="Make" value={item.vehicleMake || ''} onChange={e => {
                              const newRes = [...scanResults];
                              newRes[idx].vehicleMake = e.target.value;
                              setScanResults(newRes);
                            }} style={{ padding: '0.2rem', fontSize: '0.75rem' }} />
                            <input type="text" className="form-control" placeholder="Model" value={item.vehicleModel || ''} onChange={e => {
                              const newRes = [...scanResults];
                              newRes[idx].vehicleModel = e.target.value;
                              setScanResults(newRes);
                            }} style={{ padding: '0.2rem', fontSize: '0.75rem' }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <select className="form-control" value={item.action || 'auto'} onChange={e => {
                            const newRes = [...scanResults];
                            newRes[idx].action = e.target.value;
                            setScanResults(newRes);
                          }} style={{ padding: '0.2rem', fontSize: '0.75rem' }}>
                            <option value="auto">Auto-Match</option>
                            <option value="create">Force Create New</option>
                          </select>
                        </td>`;

content = content.replace(rowRegex, `$&${newCols}`);

fs.writeFileSync(pagePath, content);
console.log('Updated store/page.tsx with scan modal improvements.');
