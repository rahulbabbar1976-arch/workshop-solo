'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdvisorEditJobcard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentAdvisorId, setCurrentAdvisorId] = useState('');

  // Editing States
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [odometer, setOdometer] = useState<number | string>('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [complaints, setComplaints] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Parts & Labour States
  const [parts, setParts] = useState<any[]>([]);
  const [labour, setLabour] = useState<any[]>([]);

  // Catalogs
  const [partCatalog, setPartCatalog] = useState<any[]>([]);
  const [labourCatalog, setLabourCatalog] = useState<any[]>([]);
  
  // Modals for adding
  const [showPartModal, setShowPartModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);

  useEffect(() => {
    const profileId = localStorage.getItem('activeProfileId');
    if (!profileId) {
      router.push('/login');
      return;
    }
    setCurrentAdvisorId(profileId);

    const fetchData = async () => {
      try {
        // Fetch Catalogs
        const [pRes, lRes] = await Promise.all([
          fetch('/api/masters/parts'),
          fetch('/api/masters/labour')
        ]);
        const pData = await pRes.json();
        const lData = await lRes.json();
        if (pData.success) setPartCatalog(pData.parts);
        if (lData.success) setLabourCatalog(lData.labour);

        // Fetch Jobcard
        const jcRes = await fetch(`/api/jobcards/${id}`);
        const jcData = await jcRes.json();
        if (jcData.success) {
          const jc = jcData.jobcard;
          
          if (jc.serviceAdvisorId !== profileId) {
            alert("You do not have permission to edit this jobcard.");
            router.push('/advisor');
            return;
          }
          if (jc.status !== 'open') {
            alert("Only open jobcards can be edited.");
            router.push('/advisor');
            return;
          }

          // Populate States
          setCustomerName(jc.snapshot?.customerName || jc.customer?.displayName || '');
          setCustomerMobile(jc.snapshot?.customerMobile || jc.customer?.primaryMobile || '');
          setDriverName(jc.customer?.driverName || '');
          setDriverMobile(jc.customer?.driverMobile || '');
          setOdometer(jc.intakeOdometer || '');
          setFuelLevel(jc.fuelLevel || '');
          setComplaints(jc.externalNotes || '');
          setInternalNotes(jc.internalNotes || '');

          setParts(jc.partLines || []);
          setLabour(jc.labourLines || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleAddPart = (masterPart: any) => {
    setParts([...parts, {
      partMasterId: masterPart.id,
      partName: masterPart.partName,
      partNumber: masterPart.partNumber,
      brand: masterPart.brand,
      quantityRequested: 1,
      sellingPrice: masterPart.sellingPrice,
      taxRate: masterPart.taxRate,
      status: 'requested',
      isNew: true
    }]);
    setShowPartModal(false);
  };

  const handleAddLabour = (masterLabour: any) => {
    setLabour([...labour, {
      labourMasterId: masterLabour.id,
      labourName: masterLabour.labourName,
      quantity: 1,
      sellingPrice: masterLabour.sellingPrice,
      taxRate: masterLabour.taxRate,
      status: 'pending',
      isNew: true
    }]);
    setShowLabourModal(false);
  };

  const removePart = (index: number) => {
    const updated = [...parts];
    if (updated[index].id) {
      updated[index].isDeleted = true; // Mark for deletion on backend
    } else {
      updated.splice(index, 1); // Not saved yet, just remove
    }
    setParts(updated);
  };

  const removeLabour = (index: number) => {
    const updated = [...labour];
    if (updated[index].id) {
      updated[index].isDeleted = true; // Mark for deletion on backend
    } else {
      updated.splice(index, 1); // Not saved yet, just remove
    }
    setLabour(updated);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editorId: currentAdvisorId,
          customerName,
          customerMobile,
          driverName,
          driverMobile,
          intakeOdometer: odometer,
          fuelLevel,
          externalNotes: complaints,
          internalNotes,
          parts,
          labour
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Jobcard updated successfully!");
        router.push('/advisor');
      } else {
        alert("Failed to update: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Jobcard Data...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link href="/advisor" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span>← Back to Dashboard</span>
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Edit Jobcard</h1>
          </div>
          <button 
            className="btn btn-primary"
            onClick={saveChanges}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Customer Details */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Customer Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Customer Name</label>
                <input className="input-field" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Customer Mobile</label>
                <input className="input-field" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Driver Name</label>
                <input className="input-field" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. Raju" />
              </div>
              <div className="form-group">
                <label>Driver Mobile</label>
                <input className="input-field" value={driverMobile} onChange={e => setDriverMobile(e.target.value)} placeholder="e.g. 9876543210" />
              </div>
            </div>
          </div>

          {/* Section 2: Intake Details */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Intake Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Odometer</label>
                <input type="number" className="input-field" value={odometer} onChange={e => setOdometer(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Fuel Level</label>
                <input className="input-field" value={fuelLevel} onChange={e => setFuelLevel(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Complaints (External Notes)</label>
              <textarea className="input-field" rows={3} value={complaints} onChange={e => setComplaints(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Internal Advisor Notes</label>
              <textarea className="input-field" rows={2} value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
            </div>
          </div>

          {/* Section 3: Labour Lines */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Labour Details</h2>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setShowLabourModal(true)}>+ Add Labour</button>
            </div>
            {labour.filter(l => !l.isDeleted).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No labour lines added.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Labour</th>
                    <th style={{ padding: '0.5rem', width: '100px' }}>Price</th>
                    <th style={{ padding: '0.5rem', width: '100px' }}>Status</th>
                    <th style={{ padding: '0.5rem', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {labour.map((l, i) => !l.isDeleted && (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem' }}>{l.labourName}</td>
                      <td style={{ padding: '0.5rem' }}>₹{l.sellingPrice}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <select className="input-field" style={{ padding: '0.25rem' }} value={l.status} onChange={e => {
                          const updated = [...labour];
                          updated[i].status = e.target.value;
                          setLabour(updated);
                        }}>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button onClick={() => removeLabour(i)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 4: Parts Lines */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Part Details</h2>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setShowPartModal(true)}>+ Add Part</button>
            </div>
            {parts.filter(p => !p.isDeleted).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No parts added.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Part</th>
                    <th style={{ padding: '0.5rem', width: '80px' }}>Qty</th>
                    <th style={{ padding: '0.5rem', width: '100px' }}>Price</th>
                    <th style={{ padding: '0.5rem', width: '100px' }}>Status</th>
                    <th style={{ padding: '0.5rem', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => !p.isDeleted && (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem' }}>{p.partName} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.partNumber}</span></td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="number" className="input-field" style={{ padding: '0.25rem', width: '60px' }} value={p.quantityRequested} onChange={e => {
                          const updated = [...parts];
                          updated[i].quantityRequested = e.target.value;
                          setParts(updated);
                        }} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>₹{p.sellingPrice}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <select className="input-field" style={{ padding: '0.25rem' }} value={p.status} onChange={e => {
                          const updated = [...parts];
                          updated[i].status = e.target.value;
                          setParts(updated);
                        }}>
                          <option value="requested">Requested</option>
                          <option value="approved">Approved</option>
                          <option value="ordered">Ordered</option>
                          <option value="in_stock">In Stock</option>
                          <option value="used">Used</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button onClick={() => removePart(i)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

      {/* Part Catalog Modal */}
      {showPartModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '600px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Select Part from Catalog</h3>
              <button onClick={() => setShowPartModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {partCatalog.length === 0 ? <p>No parts found in catalog.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {partCatalog.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{p.partName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.partNumber} | ₹{p.sellingPrice}</div>
                      </div>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleAddPart(p)}>Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Labour Catalog Modal */}
      {showLabourModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '600px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Select Labour from Catalog</h3>
              <button onClick={() => setShowLabourModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {labourCatalog.length === 0 ? <p>No labour found in catalog.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {labourCatalog.map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{l.labourName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>₹{l.sellingPrice}</div>
                      </div>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleAddLabour(l)}>Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
