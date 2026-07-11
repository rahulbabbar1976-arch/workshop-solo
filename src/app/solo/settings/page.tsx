"use client";

import { useState } from "react";
import { Download, Upload, Database, CheckCircle, AlertCircle } from "lucide-react";
import { exportTenantDataAction, restoreTenantDataAction, importLegacyCsvAction } from "@/app/actions/settingsActions";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [legacyFiles, setLegacyFiles] = useState<{
    customer: File | null;
    address: File | null;
    thing: File | null;
    worksheet: File | null;
  }>({
    customer: null,
    address: null,
    thing: null,
    worksheet: null,
  });

  const [restoreFile, setRestoreFile] = useState<File | null>(null);

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

  const handleLegacyImport = async () => {
    if (!legacyFiles.customer || !legacyFiles.address || !legacyFiles.thing || !legacyFiles.worksheet) {
      setMessage({ type: "error", text: "Please select all four legacy CSV files." });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const formData = new FormData();
      formData.append("customerFile", legacyFiles.customer);
      formData.append("addressFile", legacyFiles.address);
      formData.append("thingFile", legacyFiles.thing);
      formData.append("worksheetFile", legacyFiles.worksheet);

      await importLegacyCsvAction(formData);
      setMessage({ type: "success", text: "Legacy data imported successfully." });
      setLegacyFiles({ customer: null, address: null, thing: null, worksheet: null });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to import legacy data." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-32">
      <div className="bg-amber-400 px-5 pt-8 pb-4 shadow-sm relative z-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Data Management</h1>
      </div>
      
      <div className="p-5 space-y-6">
        
        {message && (
          <div className={`p-4 rounded-lg flex items-start shadow-sm border ${message.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />}
            <span className="font-medium text-sm">{message.text}</span>
          </div>
        )}

        {/* Section 1: Backup */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-teal-500 p-4">
            <h2 className="text-white font-bold flex items-center tracking-wide uppercase">
              <Download className="w-5 h-5 mr-2" /> Backup Current Data
            </h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-500 mb-4">Download a complete snapshot of your Customers, Vehicles, and Job Cards as a JSON file.</p>
            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-lg uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? "Processing..." : "Download Backup"}
            </button>
          </div>
        </div>

        {/* Section 2: Restore */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-teal-500 p-4">
            <h2 className="text-white font-bold flex items-center tracking-wide uppercase">
              <Upload className="w-5 h-5 mr-2" /> Restore Backup
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">Upload a previously downloaded JSON backup to merge into your current database.</p>
            
            <input 
              type="file" 
              accept=".json"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
            
            <button
              onClick={handleRestore}
              disabled={loading || !restoreFile}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-lg uppercase tracking-wider disabled:opacity-50 mt-2"
            >
              {loading ? "Processing..." : "Restore Data"}
            </button>
          </div>
        </div>

        {/* Section 3: Legacy Import */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-teal-500 p-4">
            <h2 className="text-white font-bold flex items-center tracking-wide uppercase">
              <Database className="w-5 h-5 mr-2" /> Legacy Data Import
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">Upload CSV files from Jobcard2 to integrate into your Solo account.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Customer.csv</label>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => setLegacyFiles({...legacyFiles, customer: e.target.files?.[0] || null})}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Address.csv</label>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => setLegacyFiles({...legacyFiles, address: e.target.files?.[0] || null})}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Thing.csv (Vehicles)</label>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => setLegacyFiles({...legacyFiles, thing: e.target.files?.[0] || null})}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Worksheet.csv (Job Cards)</label>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => setLegacyFiles({...legacyFiles, worksheet: e.target.files?.[0] || null})}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
            </div>
            
            <button
              onClick={handleLegacyImport}
              disabled={loading || !legacyFiles.customer || !legacyFiles.address || !legacyFiles.thing || !legacyFiles.worksheet}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-lg uppercase tracking-wider disabled:opacity-50 mt-4"
            >
              {loading ? "Processing..." : "Import Legacy Data"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
