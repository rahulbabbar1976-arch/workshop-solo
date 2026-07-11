import { Server } from "lucide-react";

export default function InfrastructurePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
          <Server className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Infrastructure</h1>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
        Infrastructure overview module is coming soon.
      </div>
    </div>
  );
}
