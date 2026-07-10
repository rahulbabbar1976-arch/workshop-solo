const fs = require('fs');
const pagePath = 'src/app/mechanic/page.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

const barcodeScannerUI = `
      {/* Barcode Scanner Modal (Desktop/Mobile compatibility) */}
      {showBarcodeScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
            <h3 style={{ margin: 0, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📷 Scan Part Barcode</h3>
            <button onClick={() => setShowBarcodeScanner(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video 
              id="barcode-video"
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
                               // handle barcode
                               const code = barcodes[0].rawValue;
                               alert('Scanned Part Code: ' + code);
                               setNewPartName(code);
                               setPartLogType('requested');
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
      )}`;

const oldBarcodePlaceholder = `{/* Barcode Scanner Placeholder (Desktop/Mobile compatibility) */}
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
      )}`;

if (content.includes(oldBarcodePlaceholder)) {
    content = content.replace(oldBarcodePlaceholder, barcodeScannerUI);
    fs.writeFileSync(pagePath, content);
    console.log('Updated barcode scanner in mechanic page');
} else {
    console.log('Could not find placeholder to replace.');
}
