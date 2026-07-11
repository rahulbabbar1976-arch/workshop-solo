import Link from "next/link";
import { Users, Server, Activity, ShieldAlert, Zap, Settings, MessageSquare, Database, Shield } from "lucide-react";

export default function AutobotAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-outfit">
      {/* Sidebar Desktop - Deep Dark Glassmorphism */}
      <aside className="w-72 bg-[#090e17] text-slate-300 hidden md:flex flex-col relative overflow-hidden border-r border-slate-800/60">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="p-8 relative z-10">
          <div className="flex items-center space-x-3 text-white font-extrabold text-2xl tracking-tight">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
               <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <span>AutoBot <span className="text-blue-400 font-medium">Core</span></span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4 relative z-10 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Main Menu</p>
          <Link href="/autobot-admin" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <Activity className="w-5 h-5" />
            <span className="font-bold tracking-wide">Command Center</span>
          </Link>
          <Link href="/autobot-admin/tenants" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <Users className="w-5 h-5" />
            <span className="font-bold tracking-wide">Solo Tenants</span>
          </Link>
          <Link href="/autobot-admin/infrastructure" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <Server className="w-5 h-5" />
            <span className="font-bold tracking-wide">Infrastructure</span>
          </Link>
          <Link href="/autobot-admin/backup" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <Database className="w-5 h-5" />
            <span className="font-bold tracking-wide">Backup & Restore</span>
          </Link>

          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 mt-6">Configuration</p>
          <Link href="/autobot-admin/settings/otp" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all group">
            <MessageSquare className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />
            <span className="font-bold tracking-wide">OTP Provider</span>
          </Link>
          <Link href="/autobot-admin/settings/security" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all group">
            <Shield className="w-5 h-5 group-hover:text-amber-400 transition-colors" />
            <span className="font-bold tracking-wide">Security</span>
          </Link>
          <Link href="/autobot-admin/settings" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <Settings className="w-5 h-5" />
            <span className="font-bold tracking-wide">General Settings</span>
          </Link>
        </nav>
        
        <div className="p-4 relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-md m-3 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 text-sm shrink-0">
              RB
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">Rahul Babbar</p>
              <p className="text-indigo-300 text-xs font-medium truncate">rahulbabbar@babbarsons.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#090e17] p-5 flex items-center text-white font-extrabold border-b border-slate-800 shadow-lg relative z-20">
          <ShieldAlert className="w-6 h-6 text-blue-500 mr-3" /> AutoBot Core
        </div>
        
        <div className="p-6 md:p-10 relative z-10">
           {children}
        </div>
      </main>
    </div>
  );
}
