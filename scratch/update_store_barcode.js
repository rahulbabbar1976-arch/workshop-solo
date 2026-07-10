const fs = require('fs');
const pagePath = 'src/app/store/page.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

const scannerState = `
  // Barcode Scanner State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
`;

if (!content.includes('showBarcodeScanner')) {
  content = content.replace(
    "const [partSearchQuery, setPartSearchQuery] = useState('');",
    scannerState + "\n  const [partSearchQuery, setPartSearchQuery] = useState('');"
  );
}

const scannerUI = `
      {/* Barcode Scanner Modal (Desktop/Mobile compatibility) */}
      {showBarcodeScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
            <h3 style={{ margin: 0, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📷 Scan Part Barcode</h3>
            <button onClick={() => setShowBarcodeScanner(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video 
              id="barcode-video-store"
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              ref={(ref) => {
                if (ref && !ref.srcObject) {
                  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    .then(stream => {
                      ref.srcObject = stream;
                      if ('BarcodeDetector' in window) {
                        const detector = new (window as any).BarcodeDetector();
                        const interval = setInterval(async () => {
                          if (!ref.srcObject) { clearInterval(interval); return; }
                          try {
                            const barcodes = await detector.detect(ref);
                            if (barcodes.length > 0) {
                               clearInterval(interval);
                               const code = barcodes[0].rawValue;
                               alert('Scanned Part Code: ' + code);
                               setPartSearchQuery(code); // Pre-fill search
                               setShowBarcodeScanner(false);
                            }
                          } catch (e) {}
                        }, 500);
                      } else {
                        alert('Barcode Scanner not supported in this browser. Please enter manually.');
                        setShowBarcodeScanner(false);
                      }
                    })
                    .catch(e => {
                      alert('Camera access error');
                      setShowBarcodeScanner(false);
                    });
                }
              }}
            />
            
            {/* Viewfinder overlay */}
            <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
               <div style={{ width: '70%', height: '30%', border: '2px solid #0ea5e9', borderRadius: '12px', boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)' }}></div>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes('Barcode Scanner Modal')) {
  const closingMain = '</main>\n  );\n}';
  if (content.includes(closingMain)) {
    content = content.replace(closingMain, scannerUI + '\n    ' + closingMain);
  } else {
    const lastReturn = content.lastIndexOf('</main>');
    if (lastReturn !== -1) {
      content = content.substring(0, lastReturn) + scannerUI + '\n    </main>' + content.substring(lastReturn + 7);
    }
  }
}

// Add scan button next to the search input in the inventory tab
const searchBarDiv = `<input 
                type="text" 
                className="form-control" 
                placeholder="Search part name or number..." 
                value={partSearchQuery}
                onChange={(e) => setPartSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
              />`;

const searchBarWithScanner = `<div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search part name or number..." 
                  value={partSearchQuery}
                  onChange={(e) => setPartSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <button onClick={() => setShowBarcodeScanner(true)} className="btn btn-secondary" style={{ padding: '0.75rem', borderColor: '#0ea5e9', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📷
              </button>
            </div>`;

// The old search bar structure in StoreManagerPage:
const oldSearchBarDiv = `            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search part name or number..." 
                value={partSearchQuery}
                onChange={(e) => setPartSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>`;

if (content.includes(oldSearchBarDiv)) {
  content = content.replace(oldSearchBarDiv, searchBarWithScanner);
  console.log('Injected barcode scanner button into Store search bar');
} else {
  console.log('Could not find store search bar to inject scan button');
}

fs.writeFileSync(pagePath, content);
console.log('Store page barcode scan updated.');
