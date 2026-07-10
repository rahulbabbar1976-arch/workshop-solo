const fs = require('fs');
const pagePath = 'src/app/advisor/page.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

// 1. Add estPhotos state
if (!content.includes('estPhotos')) {
  content = content.replace(
    "const [estLines, setEstLines] = useState<any[]>([",
    "const [estPhotos, setEstPhotos] = useState<string[]>([]);\n  const [estLines, setEstLines] = useState<any[]>(["
  );

  // 2. Add photos to body of POST /api/estimates
  content = content.replace(
    "lines: estLines.filter(l => l.name.trim())",
    "lines: estLines.filter(l => l.name.trim()),\n          photos: estPhotos"
  );

  // 3. Reset photos on success
  content = content.replace(
    "setEstLines([{ lineType: 'labour', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);",
    "setEstLines([{ lineType: 'labour', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);\n        setEstPhotos([]);"
  );
  
  // 4. Add UI for photos upload in the modal
  const photosUI = `
            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference Photos</h4>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {estPhotos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={photo} alt="reference" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                    <button onClick={() => setEstPhotos(estPhotos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✕</button>
                  </div>
                ))}
                <label style={{ width: '80px', height: '80px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.7rem', background: 'rgba(255,255,255,0.02)' }}>
                  <Camera size={20} style={{ marginBottom: '0.2rem' }} />
                  <span>Add Photo</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.success) {
                          setEstPhotos([...estPhotos, data.url]);
                        } else {
                          alert('Upload failed');
                        }
                      } catch (err) { alert('Upload error'); }
                    }
                  }} />
                </label>
              </div>
            </div>`;

  content = content.replace(
    "<h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Items (Parts &amp; Labour)</h4>",
    photosUI + "\n            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Items (Parts &amp; Labour)</h4>"
  );
  
  fs.writeFileSync(pagePath, content);
  console.log('Advisor photos injected');
} else {
  console.log('estPhotos already present');
}
