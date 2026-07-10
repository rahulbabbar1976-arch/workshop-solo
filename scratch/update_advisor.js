const fs = require('fs');
const pagePath = 'src/app/advisor/page.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

// 1. Add estimates state after currentAdvisorId
const estateState = `
  // Estimates
  const [estimates, setEstimates] = useState<any[]>([]);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estCustomerName, setEstCustomerName] = useState('');
  const [estCustomerMobile, setEstCustomerMobile] = useState('');
  const [estVehicleReg, setEstVehicleReg] = useState('');
  const [estVehicleMake, setEstVehicleMake] = useState('');
  const [estVehicleModel, setEstVehicleModel] = useState('');
  const [estNotes, setEstNotes] = useState('');
  const [estLines, setEstLines] = useState<any[]>([
    { lineType: 'labour', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }
  ]);
  const [isSavingEst, setIsSavingEst] = useState(false);
  const [estError, setEstError] = useState<string | null>(null);
  const [estSuccess, setEstSuccess] = useState<string | null>(null);

  const fetchEstimates = async () => {
    try {
      const res = await fetch('/api/estimates');
      const data = await res.json();
      if (data.success) setEstimates(data.estimates || []);
    } catch (e) { console.error(e); }
  };

  const createEstimate = async () => {
    if (!estCustomerName.trim()) { setEstError('Customer name is required'); return; }
    setIsSavingEst(true); setEstError(null);
    try {
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: estCustomerName,
          customerMobile: estCustomerMobile,
          vehicleRegNo: estVehicleReg,
          vehicleMake: estVehicleMake,
          vehicleModel: estVehicleModel,
          customerNotes: estNotes,
          advisorId: currentAdvisorId,
          lines: estLines.filter(l => l.name.trim())
        })
      });
      const data = await res.json();
      if (data.success) {
        setEstSuccess('Estimate ' + data.estimate.estimateNumber + ' created!');
        setShowEstimateModal(false);
        setEstCustomerName(''); setEstCustomerMobile(''); setEstVehicleReg('');
        setEstVehicleMake(''); setEstVehicleModel(''); setEstNotes('');
        setEstLines([{ lineType: 'labour', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
        fetchEstimates();
        setTimeout(() => setEstSuccess(null), 4000);
      } else {
        setEstError(data.error || 'Failed to create estimate');
      }
    } catch (e: any) {
      setEstError(e.message);
    } finally {
      setIsSavingEst(false);
    }
  };

  const shareEstimateWhatsApp = (est: any) => {
    const lines = est.lines || [];
    let msg = \`*ESTIMATE — \${est.estimateNumber}*\\n\`;
    msg += \`*BABBARSONS Workshop*\\n\\n\`;
    msg += \`Customer: \${est.customerName}\\n\`;
    if (est.vehicleRegNo) msg += \`Vehicle: \${est.vehicleRegNo} \${est.vehicleMake || ''} \${est.vehicleModel || ''}\\n\`;
    msg += \`\\n*Items:*\\n\`;
    lines.forEach((l: any, i: number) => {
      msg += \`\${i+1}. \${l.name} — \${l.quantity} x ₹\${l.unitPrice} = ₹\${l.lineTotal?.toFixed(2)}\\n\`;
    });
    msg += \`\\n*Subtotal: ₹\${est.subtotalAmount?.toFixed(2)}*\\n\`;
    msg += \`GST: ₹\${est.taxAmount?.toFixed(2)}\\n\`;
    msg += \`*Total: ₹\${est.totalAmount?.toFixed(2)}*\\n\\n\`;
    msg += \`Valid for \${est.validityDays} days. Please confirm to proceed.\\n\`;
    msg += \`— Autobots Workshop Intelligence\`;
    const phone = (est.customerMobile || '').replace(/\\D/g, '');
    const fullPhone = phone.startsWith('91') ? phone : (phone ? '91' + phone : '');
    const url = fullPhone
      ? \`https://api.whatsapp.com/send?phone=\${fullPhone}&text=\${encodeURIComponent(msg)}\`
      : \`https://api.whatsapp.com/send?text=\${encodeURIComponent(msg)}\`;
    window.open(url, '_blank');
  };

  const convertEstimateToJob = async (estId: string) => {
    if (!confirm('Convert this estimate to a live job card?')) return;
    try {
      const res = await fetch('/api/estimates/' + estId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ ' + data.message);
        fetchEstimates();
      } else {
        alert('Error: ' + (data.error || 'Failed to convert'));
      }
    } catch (e: any) {
      alert('Network error: ' + e.message);
    }
  };
`;

content = content.replace(
  "const [currentAdvisorId, setCurrentAdvisorId] = useState('');",
  "const [currentAdvisorId, setCurrentAdvisorId] = useState('');" + estateState
);

// 2. Add fetchEstimates call in the existing useEffect that loads data
// Find where other fetches happen on page load
content = content.replace(
  'fetchMyReservations();',
  'fetchMyReservations();\n      fetchEstimates();'
);

// 3. Find the end of the return JSX and inject the Estimates button + modal
// Insert before the closing main tag
const estimatesUI = `
      {/* ESTIMATES BUTTON */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
        <button
          onClick={() => setShowEstimateModal(true)}
          style={{ padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none', borderRadius: '50px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          📋 New Estimate
        </button>
      </div>

      {/* ESTIMATES LIST */}
      {estimates.length > 0 && (
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 Recent Estimates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {estimates.map((est: any) => (
              <div key={est.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{est.estimateNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{est.customerName} · {est.vehicleRegNo || 'No Reg'} · ₹{est.totalAmount?.toFixed(0)}</div>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: est.status === 'converted' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: est.status === 'converted' ? '#10b981' : '#6366f1', fontWeight: 600 }}>
                    {est.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => shareEstimateWhatsApp(est)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}>
                    📱 WhatsApp
                  </button>
                  {est.status !== 'converted' && (
                    <button onClick={() => convertEstimateToJob(est.id)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1', color: '#6366f1', borderRadius: '6px', cursor: 'pointer' }}>
                      ➡️ Convert
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {estSuccess && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 9999, background: 'rgba(16,185,129,0.9)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          ✅ {estSuccess}
        </div>
      )}

      {/* ESTIMATE CREATION MODAL */}
      {showEstimateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#6366f1' }}>📋 Create New Estimate</h2>
              <button onClick={() => setShowEstimateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            {estError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>{estError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Customer Name *</label>
                <input className="form-control" value={estCustomerName} onChange={e => setEstCustomerName(e.target.value)} placeholder="e.g. Babbar Singh" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Mobile (for WhatsApp)</label>
                <input className="form-control" value={estCustomerMobile} onChange={e => setEstCustomerMobile(e.target.value)} placeholder="e.g. 9876543210" inputMode="tel" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Vehicle Reg No</label>
                <input className="form-control" value={estVehicleReg} onChange={e => setEstVehicleReg(e.target.value.toUpperCase())} placeholder="e.g. DL 01 AB 1234" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Make / Model</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-control" value={estVehicleMake} onChange={e => setEstVehicleMake(e.target.value)} placeholder="Make" style={{ fontSize: '0.9rem' }} />
                  <input className="form-control" value={estVehicleModel} onChange={e => setEstVehicleModel(e.target.value)} placeholder="Model" style={{ fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Customer Notes</label>
                <textarea className="form-control" value={estNotes} onChange={e => setEstNotes(e.target.value)} placeholder="Complaint description or special instructions..." rows={2} style={{ fontSize: '0.9rem', resize: 'vertical' }} />
              </div>
            </div>

            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Items (Parts &amp; Labour)</h4>
            {estLines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 70px 90px 60px 32px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <select className="form-control" value={line.lineType} onChange={e => { const l=[...estLines]; l[i].lineType=e.target.value; setEstLines(l); }} style={{ fontSize: '0.75rem', padding: '0.4rem' }}>
                  <option value="labour">Labour</option>
                  <option value="part">Part</option>
                </select>
                <input className="form-control" value={line.name} onChange={e => { const l=[...estLines]; l[i].name=e.target.value; setEstLines(l); }} placeholder="Description..." style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                <input type="number" className="form-control" value={line.quantity} onChange={e => { const l=[...estLines]; l[i].quantity=parseFloat(e.target.value)||1; setEstLines(l); }} placeholder="Qty" style={{ fontSize: '0.85rem', padding: '0.4rem', textAlign: 'center' }} min="1" />
                <input type="number" className="form-control" value={line.unitPrice} onChange={e => { const l=[...estLines]; l[i].unitPrice=parseFloat(e.target.value)||0; setEstLines(l); }} placeholder="₹ Price" style={{ fontSize: '0.85rem', padding: '0.4rem' }} min="0" />
                <input type="number" className="form-control" value={line.taxRate} onChange={e => { const l=[...estLines]; l[i].taxRate=parseFloat(e.target.value)||18; setEstLines(l); }} placeholder="GST%" style={{ fontSize: '0.75rem', padding: '0.4rem' }} />
                <button onClick={() => setEstLines(estLines.filter((_, j) => j !== i))} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>✕</button>
              </div>
            ))}
            
            {/* Totals preview */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.85rem', display: 'flex', gap: '1.5rem', justifyContent: 'flex-end' }}>
              {(() => {
                let subtotal = 0, tax = 0;
                estLines.forEach(l => {
                  const base = (l.unitPrice || 0) * (l.quantity || 1);
                  const t = base * (l.taxRate || 18) / 100;
                  subtotal += base; tax += t;
                });
                return <>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal: <strong style={{ color: '#fff' }}>₹{subtotal.toFixed(0)}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>GST: <strong style={{ color: '#f59e0b' }}>₹{tax.toFixed(0)}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Total: <strong style={{ color: '#10b981', fontSize: '1rem' }}>₹{(subtotal+tax).toFixed(0)}</strong></span>
                </>;
              })()}
            </div>

            <button onClick={() => setEstLines([...estLines, { lineType: 'part', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }])} style={{ marginTop: '0.75rem', width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
              + Add Line Item
            </button>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEstimateModal(false)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>Cancel</button>
              <button onClick={createEstimate} disabled={isSavingEst} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isSavingEst ? '⏳ Saving...' : '✅ Create Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}`;

// Insert before closing </main> tag
const closingMain = '</main>\n  );\n}';
if (content.includes(closingMain)) {
  content = content.replace(closingMain, estimatesUI + '\n\n    </main>\n  );\n}');
  console.log('Estimates UI injected into advisor page.');
} else {
  // Try alternative
  const lastReturn = content.lastIndexOf('</main>');
  if (lastReturn !== -1) {
    content = content.substring(0, lastReturn) + estimatesUI + '\n\n    </main>' + content.substring(lastReturn + 7);
    console.log('Estimates UI injected via lastIndexOf.');
  } else {
    console.log('Could not find closing main tag!');
  }
}

fs.writeFileSync(pagePath, content);
console.log('Advisor page update complete.');
