"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TaxSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [taxesApplicable, setTaxesApplicable] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [cgst, setCgst] = useState<number>(9);
  const [sgst, setSgst] = useState<number>(9);
  const [igst, setIgst] = useState<number>(18);

  useEffect(() => {
    fetch('/api/settings/taxes')
      .then(res => res.json())
      .then(data => {
        if (data.taxSettings) {
          setTaxesApplicable(data.taxSettings.taxesApplicable || false);
          setGstNumber(data.taxSettings.gstNumber || "");
          setCgst(data.taxSettings.intrastateCgstRate || 9);
          setSgst(data.taxSettings.intrastateSgstRate || 9);
          setIgst(data.taxSettings.interstateIgstRate || 18);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg("");
    try {
      const res = await fetch('/api/settings/taxes', {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxesApplicable,
          gstNumber,
          intrastateCgstRate: cgst,
          intrastateSgstRate: sgst,
          interstateIgstRate: igst,
        })
      });
      if (res.ok) {
        setSuccessMsg("Tax settings saved successfully.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save tax settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/solo/settings" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tax Settings</h1>
          <p className="text-gray-500 text-sm">Configure how taxes are calculated on jobcards.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center mb-6">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={taxesApplicable}
              onChange={(e) => setTaxesApplicable(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="font-semibold text-gray-800">Taxes are applicable for my business</span>
          </label>
          <p className="text-sm text-gray-500 mt-2 pl-8">
            If disabled, no taxes will be shown or calculated on the jobcard and estimates. These details are NOT sent to accounting software; the accounting software will self-determine if taxes are applicable based on its own settings.
          </p>
        </div>

        {taxesApplicable && (
          <div className="space-y-6 border-t border-gray-100 pt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number (Optional)</label>
              <input 
                type="text" 
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full max-w-md p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="e.g. 29AAAAA0000A1Z5"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">CGST Rate (%)</label>
                <input 
                  type="number" 
                  value={cgst}
                  onChange={(e) => setCgst(parseFloat(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">SGST Rate (%)</label>
                <input 
                  type="number" 
                  value={sgst}
                  onChange={(e) => setSgst(parseFloat(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">IGST Rate (%)</label>
                <input 
                  type="number" 
                  value={igst}
                  onChange={(e) => setIgst(parseFloat(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
