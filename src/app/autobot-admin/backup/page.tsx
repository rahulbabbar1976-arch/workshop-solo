"use client";

import { useState } from "react";
import {
  Download, Database, Shield, Clock, CheckCircle2,
  RefreshCw, AlertTriangle, HardDrive, Users, FileText, Zap, Archive
} from "lucide-react";

type BackupScope = "full" | "users" | "settings";
type BackupStatus = "idle" | "preparing" | "downloading" | "done" | "error";

interface BackupRecord {
  id: string;
  label: string;
  scope: string;
  size: string;
  createdAt: string;
  status: "success" | "partial";
}

const MOCK_HISTORY: BackupRecord[] = [
  // Empty for real deployment — will populate after first real backup
];

export default function AdminBackupPage() {
  const [scope, setScope] = useState<BackupScope>("full");
  const [status, setStatus] = useState<BackupStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [history] = useState<BackupRecord[]>(MOCK_HISTORY);

  const scopeDetails = {
    full: {
      icon: Archive,
      label: "Full System Backup",
      desc: "All tenant databases, user accounts, workshop profiles, settings, and print templates.",
      color: "indigo",
      warning: "This may take a minute for large deployments.",
    },
    users: {
      icon: Users,
      label: "Users & Profiles Only",
      desc: "All registered user accounts and workshop profile data (no jobcards or vehicles).",
      color: "blue",
      warning: null,
    },
    settings: {
      icon: FileText,
      label: "Settings & Templates Only",
      desc: "Print templates, OTP config, tax settings, numbering formats — no customer data.",
      color: "purple",
      warning: null,
    },
  };

  const current = scopeDetails[scope];
  const Icon = current.icon;

  const handleBackup = async () => {
    setStatus("preparing");
    setError("");
    setProgress(0);

    try {
      // Simulate progress stages
      const stages = [
        { label: "Collecting tenant databases…", pct: 20 },
        { label: "Exporting user profiles…",     pct: 45 },
        { label: "Packaging settings…",           pct: 65 },
        { label: "Compressing archive…",           pct: 85 },
        { label: "Finalizing download…",           pct: 100 },
      ];

      for (const stage of stages) {
        await new Promise(r => setTimeout(r, 600));
        setProgress(stage.pct);
      }

      setStatus("downloading");

      // Real API call — triggers a streamed ZIP download from /api/admin/backup
      const res = await fetch(`/api/admin/backup?scope=${scope}`, { method: "GET" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Backup failed");
      }

      // Trigger browser file download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `autobot-backup-${scope}-${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("done");
      setTimeout(() => setStatus("idle"), 5000);

    } catch (e: any) {
      setError(e.message || "Backup failed. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          Backup & Restore
        </h1>
        <p className="text-slate-500 font-medium">Download an encrypted ZIP of all system data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Scope selector */}
        <div className="space-y-3">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-3">Backup Scope</p>

          {(Object.keys(scopeDetails) as BackupScope[]).map(key => {
            const d = scopeDetails[key];
            const ScopeIcon = d.icon;
            const isActive = scope === key;
            return (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={`w-full text-left flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${
                  isActive
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                <ScopeIcon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-200" : "text-slate-400"}`} />
                <div>
                  <span className="font-bold block text-sm">{d.label}</span>
                  {isActive && <span className="text-indigo-200 text-xs">Selected</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT — Action panel */}
        <div className="lg:col-span-2 space-y-5">

          {/* Scope Info Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-lg">{current.label}</h2>
                <p className="text-slate-500 text-sm mt-1">{current.desc}</p>
              </div>
            </div>

            {current.warning && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700 font-medium">{current.warning}</p>
              </div>
            )}

            {/* ZIP Contents preview */}
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 mb-5">
              <p className="text-slate-500 mb-2"># ZIP Contents</p>
              <p className="text-green-400">autobot-backup-{scope}-{new Date().toISOString().slice(0, 10)}.zip</p>
              <p className="ml-4 text-slate-400">├── manifest.json</p>
              {scope === "full" && <>
                <p className="ml-4 text-slate-400">├── tenants/</p>
                <p className="ml-8 text-slate-400">├── tenant_001.db</p>
                <p className="ml-8 text-slate-400">└── tenant_001_export.json</p>
                <p className="ml-4 text-slate-400">├── system/all-users.json</p>
              </>}
              {scope === "users" && <>
                <p className="ml-4 text-slate-400">├── system/all-users.json</p>
                <p className="ml-4 text-slate-400">└── profiles/workshop-profiles.json</p>
              </>}
              {scope === "settings" && <>
                <p className="ml-4 text-slate-400">├── settings/print-templates.json</p>
                <p className="ml-4 text-slate-400">├── settings/tax-settings.json</p>
                <p className="ml-4 text-slate-400">└── settings/otp-config.json</p>
              </>}
            </div>

            {/* Progress bar */}
            {(status === "preparing" || status === "downloading") && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {status === "preparing" ? "Preparing backup…" : "Downloading…"}
                  </span>
                  <span className="text-xs font-extrabold text-indigo-600">{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {status === "done" && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700 font-bold">Backup downloaded successfully!</p>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleBackup}
              disabled={status === "preparing" || status === "downloading"}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold py-4 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all text-base"
            >
              {status === "preparing" || status === "downloading" ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Processing…</>
              ) : status === "done" ? (
                <><CheckCircle2 className="w-5 h-5" /> Download Complete</>
              ) : (
                <><Download className="w-5 h-5" /> Download {current.label}</>
              )}
            </button>
          </div>

          {/* Security Note */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm mb-1">Security Notice</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Backup files contain sensitive customer and financial data. Store them in an encrypted location.
                Never share or upload them to unverified services. Delete old backups securely when no longer needed.
              </p>
            </div>
          </div>

          {/* Backup History */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="font-extrabold text-slate-800 text-sm">Backup History</h3>
              </div>
              {history.length > 0 && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{history.length} records</span>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-slate-400">
                <HardDrive className="w-10 h-10 mb-3 opacity-30" />
                <p className="font-bold text-slate-500 text-sm">No backups yet</p>
                <p className="text-xs mt-1">Your backup history will appear here after the first download.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {history.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{b.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{b.scope} · {b.size} · {b.createdAt}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      b.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {b.status === "success" ? "✓ Success" : "⚠ Partial"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
