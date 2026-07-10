'use client';

import React, { useState, useEffect } from 'react';

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'zoho' | 'tally' | 'busy'>('tally');
  const [zohoConfig, setZohoConfig] = useState<any>({ isActive: false, apiKey: '', organizationId: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/integrations');
      const data = await res.json();
      const zoho = data.find((d: any) => d.integrationType === 'zoho_books');
      if (zoho) setZohoConfig(zoho);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveZoho = async () => {
    setIsLoading(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationType: 'zoho_books',
          isActive: zohoConfig.isActive,
          apiKey: zohoConfig.apiKey,
          organizationId: zohoConfig.organizationId
        })
      });
      if (res.ok) setSaveMessage('Zoho settings saved successfully!');
      else setSaveMessage('Failed to save Zoho settings.');
    } catch (e) {
      setSaveMessage('Error saving settings.');
    }
    setIsLoading(false);
  };

  const downloadExport = (system: string, type: string) => {
    window.open(`/api/admin/integrations/export?system=${system}&type=${type}&days=30`, '_blank');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Accounting Integrations</h1>
      <p className="text-gray-600 mb-8">Connect your workshop data to your accounting software.</p>

      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('tally')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'tally' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tally ERP / Prime
        </button>
        <button 
          onClick={() => setActiveTab('busy')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'busy' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Busy Accounting
        </button>
        <button 
          onClick={() => setActiveTab('zoho')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'zoho' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Zoho Books (Cloud)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {activeTab === 'tally' && (
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold text-xl mr-4">T</div>
              <div>
                <h2 className="text-xl font-semibold">Tally Export</h2>
                <p className="text-gray-600 mt-1">Export your customers (ledgers) and invoices (sales vouchers) in Tally XML format. You can import these directly into Tally via Import Data {">"} Vouchers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors">
                <h3 className="font-semibold text-lg mb-2">Export Ledgers (Customers)</h3>
                <p className="text-sm text-gray-500 mb-6">Download all customers created in the last 30 days as a Tally XML Master file.</p>
                <button onClick={() => downloadExport('tally', 'ledgers')} className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded-md">
                  Download Ledgers.xml
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors">
                <h3 className="font-semibold text-lg mb-2">Export Vouchers (Invoices)</h3>
                <p className="text-sm text-gray-500 mb-6">Download all closed job cards from the last 30 days as a Tally XML Voucher file.</p>
                <button onClick={() => downloadExport('tally', 'vouchers')} className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow-sm">
                  Download Vouchers.xml
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'busy' && (
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-bold text-xl mr-4">B</div>
              <div>
                <h2 className="text-xl font-semibold">Busy Export</h2>
                <p className="text-gray-600 mt-1">Export your data in CSV format compatible with Busy Accounting Software's bulk import tools.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="border border-gray-200 rounded-lg p-6 hover:border-red-300 transition-colors">
                <h3 className="font-semibold text-lg mb-2">Export Accounts</h3>
                <p className="text-sm text-gray-500 mb-6">Download all customers as a CSV file mapped to Busy's account import template.</p>
                <button onClick={() => downloadExport('busy', 'ledgers')} className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded-md">
                  Download Accounts.csv
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 hover:border-red-300 transition-colors">
                <h3 className="font-semibold text-lg mb-2">Export Sales Vouchers</h3>
                <p className="text-sm text-gray-500 mb-6">Download closed job cards as a CSV file mapped to Busy's sales voucher import template.</p>
                <button onClick={() => downloadExport('busy', 'vouchers')} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md shadow-sm">
                  Download Vouchers.csv
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'zoho' && (
          <div className="space-y-6">
            <div className="flex items-start mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xl mr-4">Z</div>
              <div>
                <h2 className="text-xl font-semibold">Zoho Books API Sync</h2>
                <p className="text-gray-600 mt-1">Configure direct API synchronization to push invoices to Zoho Books automatically when job cards are closed.</p>
              </div>
            </div>

            <div className="space-y-4 max-w-xl">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="zohoActive" 
                  checked={zohoConfig.isActive}
                  onChange={(e) => setZohoConfig({...zohoConfig, isActive: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="zohoActive" className="ml-2 block text-sm text-gray-900 font-medium">
                  Enable Zoho Books Synchronization
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
                <input 
                  type="text" 
                  value={zohoConfig.organizationId || ''}
                  onChange={(e) => setZohoConfig({...zohoConfig, organizationId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 600012345"
                />
                <p className="text-xs text-gray-500 mt-1">Found in your Zoho Books dashboard URL or settings.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key / Access Token</label>
                <input 
                  type="password" 
                  value={zohoConfig.apiKey || ''}
                  onChange={(e) => setZohoConfig({...zohoConfig, apiKey: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Paste your token here"
                />
              </div>

              <div className="pt-4 flex items-center space-x-4">
                <button 
                  onClick={handleSaveZoho}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
                {saveMessage && <span className="text-sm font-medium text-gray-600">{saveMessage}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
