"use client";

import { Users, Database, Activity, Search, ShieldAlert, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function AutobotAdminDashboardPage() {
  // Real data will be fetched from the database via API
  const stats = {
    totalTenants: 0,
    activeToday: 0,
    totalJobsProcessed: 0,
    storageUsed: "0 MB",
  };

  const recentTenants: { id: string; name: string; owner: string; city: string; jobs: number; status: string }[] = [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Command Center</h1>
          <p className="text-slate-500 font-medium">Global overview of all Solo Enterprise Tenants.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/autobot-admin/settings/otp" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm flex items-center gap-2">
            OTP Settings
          </Link>
          <Link href="/autobot-admin/backup" className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2">
            System Backup
          </Link>
        </div>
      </div>
      
      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3 mr-1" /> +12%
            </span>
          </div>
          <h3 className="text-4xl font-extrabold text-slate-900 mb-1">{stats.totalTenants}</h3>
          <p className="text-sm text-slate-500 font-bold">Total Solo Tenants</p>
        </div>
        
        <div className="bg-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-extrabold text-slate-900 mb-1">{stats.activeToday}</h3>
          <p className="text-sm text-slate-500 font-bold">Active Today</p>
        </div>

        <div className="bg-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-extrabold text-slate-900 mb-1">{stats.totalJobsProcessed.toLocaleString()}</h3>
          <p className="text-sm text-slate-500 font-bold">Global Jobs Processed</p>
        </div>

        <div className="bg-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
              <Database className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-extrabold text-slate-900 mb-1">{stats.storageUsed}</h3>
          <p className="text-sm text-slate-500 font-bold">Total Storage Used</p>
        </div>
      </div>

      {/* Tenants List */}
      <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tenant Fleet Activity</h2>
          <div className="relative w-full sm:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
              placeholder="Search by ID, Name or Location..."
            />
          </div>
        </div>
        
            <div className="overflow-x-auto">
              {recentTenants.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Database className="w-12 h-12 mb-4 opacity-30" />
                  <p className="font-bold text-slate-500">No tenants registered yet</p>
                  <p className="text-sm mt-1">Tenant accounts will appear here once users register.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-white">
                    <tr>
                      <th scope="col" className="px-8 py-5 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Tenant Identifier</th>
                      <th scope="col" className="px-8 py-5 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Operator / Region</th>
                      <th scope="col" className="px-8 py-5 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Total Volume</th>
                      <th scope="col" className="px-8 py-5 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Network Status</th>
                      <th scope="col" className="px-8 py-5 text-right text-xs font-extrabold text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {recentTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="font-extrabold text-slate-900 text-base">{tenant.name}</div>
                          <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{tenant.id}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-800">{tenant.owner}</div>
                          <div className="text-sm font-medium text-slate-500 mt-0.5">{tenant.city}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm font-extrabold text-slate-900">
                          {tenant.jobs} <span className="text-xs font-bold text-slate-400 ml-1">Jobs</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`px-4 py-1.5 inline-flex text-xs font-extrabold rounded-xl border ${
                            tenant.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            tenant.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 self-center ${
                              tenant.status === 'Active' ? 'bg-emerald-500' : 
                              tenant.status === 'New' ? 'bg-blue-500' : 
                              'bg-slate-400'
                            }`}></span>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-800 flex items-center justify-end w-full font-bold group-hover:translate-x-1 transition-transform">
                            Inspect Node <ArrowRight className="w-4 h-4 ml-1" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
      </div>
    </div>
  );
}
