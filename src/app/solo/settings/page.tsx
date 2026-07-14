"use client";

import { useState } from "react";
import { Download, Upload, CheckCircle, AlertCircle, Trash2, Printer } from "lucide-react";
import { exportTenantDataAction, restoreTenantDataAction } from "@/app/actions/settingsActions";
import { factoryResetAction } from "./actions";
import PrintSettingsForm from "./PrintSettingsForm";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showFactoryReset, setShowFactoryReset] = useState(false);
  const [password, setPassword] = useState("");

  const handleExport = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const dataStr = await exportTenantDataAction();
      
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workshop_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: "success", text: "Backup downloaded successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to export data." });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setMessage({ type: "error", text: "Please select a backup file to restore." });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const formData = new FormData();
      formData.append("backupFile", restoreFile);

      await restoreTenantDataAction(formData);
      setMessage({ type: "success", text: "Data restored successfully." });
      setRestoreFile(null);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to restore data." });
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setMessage({ type: "error", text: "Password is required for Factory Reset." });
      return;
    }
    const confirmDelete = window.confirm("WARNING: This will permanently delete ALL jobcards, vehicles, and customers. Proceed?");
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setMessage(null);
      await factoryResetAction(password);
      setMessage({ type: "success", text: "Factory Reset complete. All pre-existing data has been wiped." });
      setShowFactoryReset(false);
      setPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to factory reset." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="section-title">Data Backup & Restore</div>
      
      <div className="space-y-6 mt-4">
        {message && (
          <div className={`p-4 rounded-lg flex items-start shadow-sm border ${message.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />}
            <span className="font-medium text-sm">{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-lg flex items-center">
                <Download className="w-5 h-5 mr-2 text-teal-600" /> Export Backup
              </h2>
              <p className="text-sm text-gray-500 mt-1">Download a secure JSON copy of your workshop data.</p>
            </div>
          </div>
          <div className="p-5 bg-gray-50">
            <button
              onClick={handleExport}
              disabled={loading}
              className="primary-btn outline flex justify-center items-center m-0"
            >
              {loading ? "Processing..." : "Download JSON Backup"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-lg flex items-center">
                <Upload className="w-5 h-5 mr-2 text-orange-500" /> Restore Backup
              </h2>
              <p className="text-sm text-gray-500 mt-1">Upload a JSON backup to merge into your account.</p>
            </div>
          </div>
          <div className="p-5 bg-gray-50 flex flex-col gap-3">
            <input 
              type="file" 
              accept=".json"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
            />
            <button
              onClick={handleRestore}
              disabled={loading || !restoreFile}
              className="primary-btn amber m-0"
            >
              {loading ? "Processing..." : "Restore Data"}
            </button>
          </div>
        </div>

        <PrintSettingsForm />

        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="p-5 border-b border-red-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-red-600 text-lg flex items-center">
                <Trash2 className="w-5 h-5 mr-2" /> Factory Reset
              </h2>
              <p className="text-sm text-gray-500 mt-1">Permanently wipe all customers, vehicles, and job cards.</p>
            </div>
          </div>
          <div className="p-5 bg-red-50">
            {!showFactoryReset ? (
              <button
                onClick={() => setShowFactoryReset(true)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg tracking-wide transition-colors"
              >
                Initiate Factory Reset
              </button>
            ) : (
              <form onSubmit={handleFactoryReset} className="space-y-3">
                <p className="text-red-800 text-sm font-medium">Please enter your login password to confirm data deletion.</p>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password" 
                  required
                  className="w-full p-3 rounded-lg border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg tracking-wide">
                    {loading ? "Wiping..." : "Confirm Wipe"}
                  </button>
                  <button type="button" onClick={() => setShowFactoryReset(false)} className="px-4 py-3 bg-white text-gray-600 border border-gray-300 font-bold rounded-lg">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
