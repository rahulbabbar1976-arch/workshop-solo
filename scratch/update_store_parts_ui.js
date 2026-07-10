const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/store/page.tsx');
let content = fs.readFileSync(pagePath, 'utf-8');

// Default inventoryView to details
content = content.replace(
  /const \[inventoryView, setInventoryView\] = useState<'search' \| 'details'>\('search'\);/,
  `const [inventoryView, setInventoryView] = useState<'search' | 'details'>('details');`
);

// We need to overwrite the 'details' view HTML.
// I will just use a regex to match from {inventoryView === 'details' && ( to the matching end brace.
// Let's do it carefully.
const regex = /\{inventoryView === 'details' && \(\s*<div className="glass-card" style=\{\{ padding: '1\.5rem', minHeight: '300px' \}\}>.*?(?=\{inventoryView === 'search' || \/\* ================= TAB 1)/s;
// The above regex might be fragile. Let's do a more precise replacement using string search.

const startIndex = content.indexOf(`{inventoryView === 'details' && (`);
const endIndex = content.indexOf(`{/* ================= TAB 1: ACTIVE REQUESTS BOARD ================= */}`);

if (startIndex !== -1 && endIndex !== -1) {
  const partsDbHtml = `
            {inventoryView === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', minHeight: '600px' }}>
                {/* Left Side: Master List */}
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    <Database size={18} /> Parts Database
                  </h4>
                  <div className="search-bar" style={{ width: '100%' }}>
                    <Search size={16} color="var(--text-secondary)" />
                    <input
                      type="text"
                      placeholder="Search name, code, brand..."
                      value={partSearchQuery}
                      onChange={(e) => setPartSearchQuery(e.target.value)}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                    {catalogParts
                      .filter(p => !partSearchQuery || 
                        p.partName.toLowerCase().includes(partSearchQuery.toLowerCase()) || 
                        (p.partNumber && p.partNumber.toLowerCase().includes(partSearchQuery.toLowerCase())) ||
                        (p.brand && p.brand.toLowerCase().includes(partSearchQuery.toLowerCase()))
                      )
                      .map(part => (
                      <div 
                        key={part.id} 
                        onClick={() => setSelectedInventoryPart(part)}
                        style={{ 
                          padding: '0.75rem', 
                          background: selectedInventoryPart?.id === part.id ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                          border: \`1px solid \${selectedInventoryPart?.id === part.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}\`,
                          borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: selectedInventoryPart?.id === part.id ? 'var(--primary)' : '#fff' }}>
                            {part.partName}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: part.stockQuantity > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {part.stockQuantity} qty
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          OEM: {part.partNumber || 'N/A'} | {part.brand || 'No Brand'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Details & Ledger */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  {!selectedInventoryPart ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                      <Box size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <p>Select a part from the list to view its stock ledger and details.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>
                          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{selectedInventoryPart.partName}</h2>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <span><strong>OEM:</strong> {selectedInventoryPart.partNumber || 'N/A'}</span>
                            <span><strong>Brand:</strong> {selectedInventoryPart.brand || 'N/A'}</span>
                            <span><strong>Category:</strong> {selectedInventoryPart.category || 'N/A'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#10b981' }}>{selectedInventoryPart.stockQuantity} in stock</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {selectedInventoryPart.rackNumber ? \`\${selectedInventoryPart.rackNumber} / \` : ''}
                            {selectedInventoryPart.binNumber || 'No Bin'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div>
                          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Car size={18} color="var(--primary)" /> Vehicle Compatibility
                          </h4>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Make:</span>
                              <span>{selectedInventoryPart.vehicleMake || <span style={{ color: '#f59e0b' }}>Unknown</span>}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>Model:</span>
                              <span>{selectedInventoryPart.vehicleModel || <span style={{ color: '#f59e0b' }}>Unknown</span>}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>Year:</span>
                              <span>{selectedInventoryPart.vehicleYear || <span style={{ color: '#f59e0b' }}>Unknown</span>}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <IndianRupee size={18} color="var(--primary)" /> Pricing Details
                          </h4>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Selling Price:</span>
                              <span style={{ fontWeight: 600 }}>₹{selectedInventoryPart.defaultSellingPrice}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>Tax Rate:</span>
                              <span>{selectedInventoryPart.defaultTaxRate ? \`\${selectedInventoryPart.defaultTaxRate}%\` : 'Standard'}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>Safety Stock:</span>
                              <span>{selectedInventoryPart.safetyStock || 0} units</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stock Ledger History */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <Box size={18} color="#f59e0b" /> Stock Ledger History
                        </h4>
                        <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Qty</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Running Stock</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(!selectedInventoryPart.inventoryLedgers || selectedInventoryPart.inventoryLedgers.length === 0) ? (
                                <tr>
                                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No ledger history for this part.
                                  </td>
                                </tr>
                              ) : (
                                selectedInventoryPart.inventoryLedgers.map((ledger: any) => (
                                  <tr key={ledger.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {new Date(ledger.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <span className={\`status-tag \${ledger.transactionType === 'PURCHASE_IN' ? 'status-approved' : ledger.transactionType === 'ISSUE_OUT' ? 'status-used' : 'status-ordered'}\`}>
                                        {ledger.transactionType === 'PURCHASE_IN' ? '📥 PURCHASE IN' : ledger.transactionType === 'ISSUE_OUT' ? '📤 ISSUE OUT' : '🔄 ADJUST'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: ledger.transactionType === 'PURCHASE_IN' ? '#10b981' : '#ef4444' }}>
                                      {ledger.transactionType === 'PURCHASE_IN' ? '+' : '-'}{ledger.quantity}
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                                      {ledger.runningStock}
                                    </td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {ledger.transactionType === 'PURCHASE_IN' && \`Supplier: \${ledger.supplierName || 'Unknown'} | Mode: \${ledger.paymentMode || 'N/A'}\`}
                                      {ledger.transactionType === 'ISSUE_OUT' && \`Vehicle: \${ledger.vehicleRegNo || 'Unknown'}\`}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
`;
  
  const newContent = content.substring(0, startIndex) + partsDbHtml + "\n\n      " + content.substring(endIndex);
  fs.writeFileSync(pagePath, newContent);
  console.log("Parts database UI updated successfully.");
} else {
  console.log("Could not find start or end index.");
}
