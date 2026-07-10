const fs = require('fs');
const pagePath = 'src/app/mechanic/page.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

// Add AI State
const aiStateBlock = `
  // AI Tools State
  const [showAiDiagnostic, setShowAiDiagnostic] = useState(false);
  const [diagnosticImage, setDiagnosticImage] = useState<string | null>(null);
  const [diagnosticContext, setDiagnosticContext] = useState('');
  const [isAnalyzingDiagnostic, setIsAnalyzingDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  const [showBatteryScanner, setShowBatteryScanner] = useState(false);
  const [isAnalyzingBattery, setIsAnalyzingBattery] = useState(false);
  const [batteryResult, setBatteryResult] = useState<any>(null);

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  const handleDiagnosticUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setDiagnosticImage(ev.target?.result as string);
        setShowAiDiagnostic(true);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const analyzeDiagnostic = async () => {
    if (!diagnosticImage) return;
    setIsAnalyzingDiagnostic(true);
    setDiagnosticResult(null);
    try {
      const res = await fetch('/api/vision/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: diagnosticImage, context: diagnosticContext })
      });
      const data = await res.json();
      if (data.success) {
        setDiagnosticResult(data.analysis);
      } else {
        alert('Analysis failed: ' + data.error);
      }
    } catch (e) {
      alert('Error connecting to AI');
    } finally {
      setIsAnalyzingDiagnostic(false);
    }
  };

  const handleBatteryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setShowBatteryScanner(true);
        setIsAnalyzingBattery(true);
        try {
          const res = await fetch('/api/vision/battery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: ev.target?.result })
          });
          const data = await res.json();
          if (data.success) {
            setBatteryResult(data.batteryData);
          } else {
            alert('Failed to scan battery: ' + data.error);
            setShowBatteryScanner(false);
          }
        } catch (err) {
          alert('Error scanning battery');
          setShowBatteryScanner(false);
        } finally {
          setIsAnalyzingBattery(false);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
`;

if (!content.includes('showAiDiagnostic')) {
  // Insert state near other states
  content = content.replace(
    '  const [isTranscribing, setIsTranscribing] = useState(false);',
    '  const [isTranscribing, setIsTranscribing] = useState(false);\n' + aiStateBlock
  );
  console.log('Added AI state variables.');
}

// Add AI Action Buttons to Job Card Details View
const aiActionButtons = `
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderColor: '#8b5cf6', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🧠 AI Diagnostic Scan
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleDiagnosticUpload} />
                </label>
                <label className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderColor: '#10b981', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔋 Scan Battery Label
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleBatteryUpload} />
                </label>
                <button onClick={() => setShowBarcodeScanner(true)} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderColor: '#0ea5e9', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📷 Scan Part Barcode
                </button>
              </div>
`;

// Find where to insert the buttons (right after active job header/info)
const jobDetailHeaderEnd = `{activeJob.jobcardNumber} | 👤 {activeJob.snapshot?.customerName || 'Customer'}
                </div>
              </div>
              <button onClick={() => setActiveJob(null)} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                <ArrowLeft size={18} />
              </button>
            </div>`;

if (content.includes(jobDetailHeaderEnd)) {
  content = content.replace(jobDetailHeaderEnd, jobDetailHeaderEnd + '\n' + aiActionButtons);
  console.log('Added AI action buttons.');
} else {
    // try a more generic replacement
    const altJobDetailHeaderEnd = `<ArrowLeft size={18} />\n              </button>\n            </div>`;
    if (content.includes(altJobDetailHeaderEnd)) {
         content = content.replace(altJobDetailHeaderEnd, altJobDetailHeaderEnd + '\n' + aiActionButtons);
         console.log('Added AI action buttons via generic replacement.');
    } else {
        console.log('Could not find place to insert AI action buttons.');
    }
}


// Add Modals at the end of the file
const aiModals = `
      {/* AI Diagnostic Modal */}
      {showAiDiagnostic && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #8b5cf6', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🧠 AI Diagnostic Analysis</h3>
            
            {diagnosticImage && (
              <img src={diagnosticImage} alt="Diagnostic Scan" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
            
            <textarea 
              className="form-control" 
              placeholder="Add symptoms or context (optional)..." 
              value={diagnosticContext}
              onChange={e => setDiagnosticContext(e.target.value)}
              rows={2}
              style={{ marginBottom: '1rem' }}
            />

            {!diagnosticResult && (
              <button onClick={analyzeDiagnostic} disabled={isAnalyzingDiagnostic} className="btn btn-primary" style={{ width: '100%', background: '#8b5cf6', borderColor: '#8b5cf6', color: 'white', padding: '0.75rem' }}>
                {isAnalyzingDiagnostic ? 'Analyzing Image...' : 'Run AI Analysis'}
              </button>
            )}

            {diagnosticResult && (
              <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '0.5rem' }}>AI Recommendations:</div>
                {diagnosticResult}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => { setShowAiDiagnostic(false); setDiagnosticImage(null); setDiagnosticResult(null); }} className="btn btn-secondary" style={{ flex: 1 }}>Close</button>
              {diagnosticResult && (
                <button onClick={() => {
                   setMechanicNote(prev => prev + '\\n\\nAI Diagnostic Note:\\n' + diagnosticResult);
                   setShowAiDiagnostic(false);
                }} className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>Attach to Note</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Battery Scanner Modal */}
      {showBatteryScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #10b981', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🔋 Battery AI Vision</h3>
            
            {isAnalyzingBattery ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ borderTopColor: '#10b981', marginBottom: '1rem' }}></div>
                <p>Extracting Battery Specifications...</p>
              </div>
            ) : batteryResult ? (
              <div>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Brand & Model</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{batteryResult.brand || 'Unknown'} {batteryResult.model || ''}</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CCA</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.cca || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Capacity</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.ah || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Voltage</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.voltage || '12V'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Chemistry</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.chemistry || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setShowBatteryScanner(false)} className="btn btn-secondary" style={{ flex: 1 }}>Discard</button>
                  <button onClick={() => {
                    const note = \`New Battery Installed:\\nBrand: \${batteryResult.brand}\\nModel: \${batteryResult.model}\\nCCA: \${batteryResult.cca}\\nCapacity: \${batteryResult.ah}\\nVoltage: \${batteryResult.voltage}\\nChemistry: \${batteryResult.chemistry}\`;
                    setMechanicNote(prev => prev ? prev + '\\n\\n' + note : note);
                    setShowBatteryScanner(false);
                  }} className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>Update Vehicle</button>
                </div>
              </div>
            ) : (
               <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>Analysis Failed.</div>
            )}
          </div>
        </div>
      )}

      {/* Barcode Scanner Placeholder (Desktop/Mobile compatibility) */}
      {showBarcodeScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #0ea5e9', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>📷 Scan Barcode</h3>
            <div style={{ height: '200px', background: '#000', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #0ea5e9', color: '#0ea5e9' }}>
               [Camera Viewfinder]<br/>
               <span style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>*Requires secure context (HTTPS) for live camera feed*</span>
            </div>
            <button onClick={() => setShowBarcodeScanner(false)} className="btn btn-secondary" style={{ width: '100%' }}>Close Scanner</button>
          </div>
        </div>
      )}
`;

if (!content.includes('AI Diagnostic Modal')) {
    const closingMain = '</main>\n  );\n}';
    if (content.includes(closingMain)) {
        content = content.replace(closingMain, aiModals + '\n    ' + closingMain);
        console.log('Added AI Modals.');
    } else {
        const lastReturn = content.lastIndexOf('</main>');
        if (lastReturn !== -1) {
            content = content.substring(0, lastReturn) + aiModals + '\n    </main>' + content.substring(lastReturn + 7);
            console.log('Added AI Modals via lastIndexOf.');
        } else {
            console.log('Could not find closing main tag for modals.');
        }
    }
}

fs.writeFileSync(pagePath, content);
console.log('Mechanic AI updates applied.');
