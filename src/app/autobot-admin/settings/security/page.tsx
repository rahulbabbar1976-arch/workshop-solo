import { Shield } from "lucide-react";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Security Settings</h1>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
        Security controls and audit logs are coming soon.
      </div>
    </div>
  );
}
