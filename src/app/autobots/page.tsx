'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Building, User, Loader2 } from 'lucide-react';

export default function AutobotAdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '7777') {
      setIsAuthenticated(true);
      fetchTenants();
    } else {
      alert('Invalid Autobot PIN');
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/autobots/tenants');
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="glass-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <Shield size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>AUTOBOT SECURE ADMIN</h1>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Enter Autobot PIN (7777)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="form-control"
              style={{ marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.2em' }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Access Mainframe</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="glass-container" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield color="#10b981" /> AUTOBOT CENTRAL REGISTRY
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Managing all isolated tenant databases</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => router.push('/signup?type=enterprise')} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)' }}>
            <Building size={16} /> New Enterprise PWA
          </button>
          <button onClick={() => router.push('/signup?type=solo')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} /> New Solo Account
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spinner" size={32} /></div>
      ) : (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Tenant DB Name</th>
                <th style={{ padding: '1rem' }}>Primary Owner</th>
                <th style={{ padding: '1rem' }}>Contact</th>
                <th style={{ padding: '1rem' }}>Total Users</th>
                <th style={{ padding: '1rem' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{t.dbName}</td>
                  <td style={{ padding: '1rem' }}>{t.owner?.name || 'Unknown'}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t.owner?.email || t.owner?.mobile}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                      {t.users} users
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tenants found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
