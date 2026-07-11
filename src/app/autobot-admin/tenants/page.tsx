import { Users } from "lucide-react";

export default function TenantsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
          <Users className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Solo Tenants</h1>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
        Tenant management module is coming soon.
      </div>
    </div>
  );
}
