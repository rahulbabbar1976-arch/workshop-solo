"use client";

import { Suspense, useState, useEffect } from "react";
import { ArrowLeft, Check, CheckCircle, Link as LinkIcon, Unlink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function IntegrationWizardContent() {
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [status, setStatus] = useState({
    configured: false,
    connected: false,
    connectedEmail: '',
    hasClientId: false
  });
  
  const [creds, setCreds] = useState({
    clientId: '',
    clientSecret: '',
    orgId: ''
  });

  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    // Check URL params for oauth callback status
    const err = searchParams?.get('error');
    const success = searchParams?.get('success');
    if (err) setMessage({ text: `OAuth Error: ${err}`, type: 'error' });
    if (success) setMessage({ text: 'Zoho Books Connected Successfully!', type: 'success' });

    fetchStatus();
  }, [searchParams]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/zoho/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCreds = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/integrations/zoho/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Credentials saved! You can now connect.', type: 'success' });
        setStatus(prev => ({ ...prev, configured: true, hasClientId: true }));
      } else {
        setMessage({ text: data.error || 'Failed to save credentials', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await fetch('/api/auth/zoho/disconnect', { method: 'POST' });
      await fetchStatus();
      setMessage({ text: 'Disconnected successfully', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Failed to disconnect', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="content bg-gray-50 min-h-screen pb-32">
      <div className="bg-white px-5 pt-8 pb-4 shadow-sm relative z-10 flex items-center border-b border-gray-200">
        <Link href="/solo/settings" className="mr-3 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Zoho Books Integration</h1>
          <p className="text-gray-500 text-sm">Automate your invoicing</p>
        </div>
      </div>

      <div className="p-5 max-w-2xl mx-auto mt-4 space-y-6">
        
        {message.text && (
          <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {message.text}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${status.connected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Zoho Status</h2>
              <p className="text-sm text-gray-500">
                {status.connected ? `Connected as ${status.connectedEmail || 'authorized user'}` : 'Not connected'}
              </p>
            </div>
          </div>
          {status.connected && (
            <button 
              onClick={handleDisconnect}
              disabled={saving}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors flex items-center"
            >
              <Unlink className="w-4 h-4 mr-2" /> Disconnect
            </button>
          )}
        </div>

        {/* Step 1: Credentials */}
        {!status.connected && (
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">1. OAuth Credentials</h2>
              <p className="text-sm text-gray-500 mt-1">Get these from api-console.zoho.in (Server-based Application).</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Client ID</label>
                <input 
                  type="text" 
                  value={creds.clientId} 
                  onChange={e => setCreds(prev => ({...prev, clientId: e.target.value}))}
                  placeholder="1000.XXXX..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Client Secret</label>
                <input 
                  type="password" 
                  value={creds.clientSecret} 
                  onChange={e => setCreds(prev => ({...prev, clientSecret: e.target.value}))}
                  placeholder="Enter secret..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Organization ID</label>
                <input 
                  type="text" 
                  value={creds.orgId} 
                  onChange={e => setCreds(prev => ({...prev, orgId: e.target.value}))}
                  placeholder="e.g. 600012345"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm" 
                />
              </div>
            </div>

            <button 
              onClick={handleSaveCreds}
              disabled={!creds.clientId || !creds.clientSecret || !creds.orgId || saving}
              className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors mt-2 flex items-center justify-center"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              Save Credentials
            </button>
          </div>
        )}

        {/* Step 2: Connect */}
        {!status.connected && status.hasClientId && (
          <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm text-center py-8">
            <h2 className="text-lg font-bold text-orange-900 mb-2">2. Authorize Zoho</h2>
            <p className="text-sm text-orange-700 mb-6 max-w-md mx-auto">
              Click below to securely connect your Zoho account. You will be redirected to Zoho to approve the connection.
            </p>
            <a 
              href="/api/auth/zoho"
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
            >
              <LinkIcon className="w-5 h-5 mr-2" /> Connect Zoho Account
            </a>
          </div>
        )}

      </div>
    </div>
  );
}

export default function IntegrationWizardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <IntegrationWizardContent />
    </Suspense>
  );
}
