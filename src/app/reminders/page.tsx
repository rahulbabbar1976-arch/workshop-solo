'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Send, 
  ShieldAlert, 
  Calendar, 
  Car, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function RemindersPage() {
  const router = useRouter();

  useEffect(() => {
    const sessionStr = localStorage.getItem('workshop_session');
    if (!sessionStr) {
      router.push('/');
      return;
    }
    try {
      const session = JSON.parse(sessionStr);
      if (!session || !['admin', 'manager', 'advisor'].includes(session.primaryRole)) {
        router.push('/');
      }
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('workshop_session');
    document.cookie = "workshop_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "workshop_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push('/');
  };
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'insurance' | 'puc' | 'service'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'expired' | 'upcoming'>('all');

  const fetchReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reminders');
      const data = await res.json();
      if (data.success) {
        setReminders(data.reminders || []);
      } else {
        setError(data.error || 'Failed to fetch reminders');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const filteredReminders = reminders.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (r.registrationNumber || '').toLowerCase().includes(q) || 
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.vehicleName || '').toLowerCase().includes(q);

    const matchesType = filterType === 'all' || r.type === filterType;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <main className="glass-container">
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <a href="/" onClick={handleLogout} style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={24} /></a>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={28} style={{ color: 'var(--accent-red)' }} />
            Customer Alerts &amp; Reminders
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Track expiring Insurance, PUC certificates, and scheduled services (within 30 days). Send WhatsApp alerts directly.
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by vehicle, plate number, or owner name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={fetchReminders} 
            disabled={loading}
            style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}
          >
            <RefreshCw size={16} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
          
          {/* Filter Type */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginRight: '0.5rem', fontWeight: 600 }}>Type:</span>
            {[
              { key: 'all', label: 'All Types' },
              { key: 'insurance', label: 'Insurance' },
              { key: 'puc', label: 'PUC Certificate' },
              { key: 'service', label: 'Scheduled Service' }
            ].map(t => (
              <button
                key={t.key}
                type="button"
                className={`btn ${filterType === t.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterType(t.key as any)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filter Status */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginRight: '0.5rem', fontWeight: 600 }}>Status:</span>
            {[
              { key: 'all', label: 'All Status' },
              { key: 'expired', label: '🔴 Overdue / Expired' },
              { key: 'upcoming', label: '🟡 Upcoming' }
            ].map(s => (
              <button
                key={s.key}
                type="button"
                className={`btn ${filterStatus === s.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterStatus(s.key as any)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Notifications Grid List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--primary)', fontWeight: 600 }}>
          <Loader2 className="spinner" style={{ animation: 'spin 1.5s linear infinite', marginRight: '0.5rem', display: 'inline-block' }} size={32} />
          <p style={{ marginTop: '1rem' }}>Analyzing vehicle databases and computing expiry metrics...</p>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={20} /> {error}
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--accent-green)', marginBottom: '1rem', display: 'inline-block' }} />
          <h3>All Clear!</h3>
          <p style={{ marginTop: '0.5rem' }}>No pending alerts. All vehicle insurance policies, PUC certificates, and scheduled services are valid and active.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredReminders.map(rem => {
            const isExpired = rem.status === 'expired';
            const daysLeft = rem.daysLeft;
            const daysLabel = isExpired ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`;

            return (
              <div 
                key={rem.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1rem',
                  borderLeft: `4px solid ${
                    isExpired ? 'var(--accent-red)' : (daysLeft <= 10 ? 'var(--accent-yellow)' : 'var(--primary)')
                  }`
                }}
              >
                {/* Expiry Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className={`role-badge ${
                    rem.type === 'insurance' ? 'role-advisor' : 
                    rem.type === 'puc' ? 'role-mechanic' : 'role-admin'
                  }`} style={{ fontSize: '0.65rem' }}>
                    {rem.type}
                  </span>
                  
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: isExpired ? 'var(--accent-red)' : (daysLeft <= 10 ? 'var(--accent-yellow)' : 'var(--accent-green)') 
                  }}>
                    {isExpired ? '🔴 EXPIRED' : '🟡 UPCOMING'} ({daysLabel})
                  </span>
                </div>

                {/* Vehicle & Customer details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  
                  {/* Vehicle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Car size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{rem.registrationNumber}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({rem.vehicleName})</span>
                  </div>

                  {/* Customer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="var(--secondary)" />
                    <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{rem.customerName}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({rem.customerMobile})</span>
                  </div>

                  {/* Due Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={16} />
                    <span>Due Date: <strong>{new Date(rem.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></span>
                  </div>
                </div>

                {/* WhatsApp Sending Action */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
                  {rem.whatsappUrl ? (
                    <a 
                      href={rem.whatsappUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}
                    >
                      <Send size={14} /> Send WhatsApp Reminder
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Mobile number unavailable
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </main>
  );
}
