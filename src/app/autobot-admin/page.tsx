"use client";

import { useEffect, useState } from "react";
import { Users, Database, ShieldAlert, TrendingUp, Search, ArrowRight, KeyRound, Plus, X } from "lucide-react";
import Link from "next/link";

export default function AutobotAdminDashboardPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInvite, setNewInvite] = useState("");
  const [addingInvite, setAddingInvite] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, iRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/admin/whitelist')
      ]);
      const tData = await tRes.json();
      const iData = await iRes.json();
      if (tData.success) setTenants(tData.tenants);
      if (iData.success) setInvites(iData.invites);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvite) return;
    setAddingInvite(true);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: newInvite })
      });
      if (res.ok) {
        setNewInvite("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingInvite(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Command Center</h1>
          <p className="text-slate-500 font-medium">Global overview of all Solo Enterprise Tenants.</p>
        </div>
      </div>
      
      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-extrabold text-slate-900 mb-1">{tenants.length}</h3>
          <p className="text-sm text-slate-500 font-bold">Total Tenants</p>
        </div>
        
        <div className="bg-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-extrabold text-slate-900 mb-1">{invites.length}</h3>
          <p className="text-sm text-slate-500 font-bold">Whitelist Invites</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Whitelist Manager */}
        <div className="lg:col-span-1 bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 bg-slate-50/50">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Access Whitelist</h2>
            <p className="text-sm text-slate-500 mt-1">Pre-authorize emails/mobiles for signup</p>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <form onSubmit={handleAddInvite} className="flex gap-2 mb-6">
              <input 
                type="text" 
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                placeholder="Email or Mobile"
                value={newInvite}
                onChange={e => setNewInvite(e.target.value.trim())}
              />
              <button 
                type="submit" 
                disabled={addingInvite || !newInvite}
                className="bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>
            
            <div className="space-y-3">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800">{inv.identifier}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {inv.isClaimed ? <span className="text-emerald-600 font-semibold">Claimed</span> : <span className="text-amber-500 font-semibold">Pending</span>}
                      {' • '} {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {invites.length === 0 && !loading && (
                <div className="text-center py-10 text-slate-400 font-medium">No invites found</div>
              )}
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-slate-50/50">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tenant Fleet</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center text-slate-400">Loading...</div>
            ) : tenants.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Database className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-bold text-slate-500">No tenants registered yet</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Workspace Name</th>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Stats</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900">{tenant.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{tenant.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-extrabold rounded-lg ${tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {tenant._count?.users || 0} Users • {tenant._count?.customers || 0} Customers
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
