'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building,
  User, 
  Lock, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Key,
  Shield,
  ArrowLeft
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  
  const [accountType, setAccountType] = useState<'enterprise' | 'solo'>('enterprise');
  const [workshopName, setWorkshopName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Pin validation
    if (pin.length !== 4) {
      setErrorMessage('Quick PIN must be exactly 4 digits.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        workshopName: accountType === 'enterprise' ? workshopName : undefined,
        fullName,
        email,
        mobile: mobile || undefined,
        password,
        quickPin: pin,
        accountType
      };

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`${accountType === 'solo' ? 'Solo Account' : 'Workshop PWA'} created successfully! Redirecting to login...`);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setErrorMessage(data.error || 'Registration failed. Please check details.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="glass-container" style={{ minHeight: '95vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      
      {/* Back to Login Link */}
      <div style={{ width: '100%', maxWidth: '460px', alignSelf: 'center', marginBottom: '1rem' }}>
        <button 
          onClick={() => router.push('/')}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, padding: 0
          }}
        >
          <ArrowLeft size={16} /> Back to Login
        </button>
      </div>

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
          <span className="brand-title">AUTOBOTS</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 600 }}>
          REGISTER NEW WORKSHOP PWAS
        </p>
      </div>

      {/* Main Glass Signup Card */}
      <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '2rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        
        {/* Toggle Account Type */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.25rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            type="button"
            onClick={() => { setAccountType('enterprise'); setErrorMessage(null); }}
            style={{ 
              flex: 1, padding: '0.5rem 0.25rem', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
              background: accountType === 'enterprise' ? 'var(--primary)' : 'transparent',
              color: accountType === 'enterprise' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
            }}
          >
            <Building size={14} /> Workshop PWA
          </button>
          <button 
            type="button"
            onClick={() => { setAccountType('solo'); setErrorMessage(null); }}
            style={{ 
              flex: 1, padding: '0.5rem 0.25rem', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
              background: accountType === 'solo' ? 'var(--primary)' : 'transparent',
              color: accountType === 'solo' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
            }}
          >
            <User size={14} /> Solo Account
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          {accountType === 'enterprise' 
            ? 'Create a fresh workshop partition. The registered email will become the primary Owner.'
            : 'Get a personal solo workspace tailored for independent mechanics and freelancers.'}
        </p>

        {errorMessage && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* Workshop Name */}
          {accountType === 'enterprise' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Workshop / Business Name
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text"
                  required={accountType === 'enterprise'}
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                  placeholder="e.g. Apex Performance Tuning"
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Owner Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="text"
                required
                className="form-control"
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email Address (Username)
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="email"
                required
                className="form-control"
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                placeholder="e.g. john@apex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mobile Number (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="tel"
                className="form-control"
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="password"
                required
                minLength={6}
                className="form-control"
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* 4-Digit Quick PIN */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              4-Digit Quick PIN (for fast login)
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="text"
                required
                maxLength={4}
                pattern="\d*"
                inputMode="numeric"
                className="form-control"
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', letterSpacing: '0.25em' }}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={16} /> Provisioning PWA...
              </>
            ) : (
              'Create PWA Account'
            )}
          </button>
        </form>

      </div>

      {/* Cloud Security Indicator */}
      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
        <Shield size={14} color="#10b981" />
        <span>Secure Isolation • Individual Tenant DB Partition</span>
      </div>

    </main>
  );
}
