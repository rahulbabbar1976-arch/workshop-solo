"use client";

import { useState } from "react";
import { ArrowLeft, Check, Server, FileJson, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function IntegrationWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [software, setSoftware] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [orgId, setOrgId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Mock payload for preview
  const mockPayload = {
    customer_name: "John Doe (Billing Name)",
    gst_no: "27ABCDE1234F1Z5",
    line_items: [
      { name: "Engine Oil", hsn_code: "2710", quantity: 1, rate: 1500 },
      { name: "General Service", sac_code: "9987", quantity: 1, rate: 2000 }
    ],
    total: 3500
  };

  const handleFinish = async () => {
    setIsSaving(true);
    // Mock save delay
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
    router.push("/solo/settings");
  };

  return (
    <div className="content bg-gray-50 min-h-screen pb-32">
      <div className="bg-white px-5 pt-8 pb-4 shadow-sm relative z-10 flex items-center border-b border-gray-200">
        <Link href="/solo/settings" className="mr-3 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Integration Setup</h1>
          <p className="text-gray-500 text-sm">Step {step} of 3</p>
        </div>
      </div>

      <div className="p-5 max-w-2xl mx-auto mt-4">
        
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Select Accounting Software</h2>
              <p className="text-sm text-gray-500 mt-1">Which software does this tenant use for invoicing?</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['Zoho Books', 'Tally Prime', 'QuickBooks', 'Custom API'].map((sw) => (
                <div 
                  key={sw}
                  onClick={() => setSoftware(sw)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${software === sw ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">{sw}</span>
                    {software === sw && <CheckCircle2 className="text-orange-500 w-5 h-5" />}
                  </div>
                </div>
              ))}
            </div>

            <button 
              disabled={!software}
              onClick={() => setStep(2)}
              className="w-full py-3 mt-8 bg-gray-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
            >
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Configure {software}</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your API credentials or webhooks.</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">API Key / Token</label>
                <input 
                  type="password" 
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="Enter API Key"
                />
              </div>
              
              {software === 'Zoho Books' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Organization ID</label>
                  <input 
                    type="text" 
                    value={orgId} 
                    onChange={e => setOrgId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                    placeholder="e.g. 600012345"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-8">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button 
                disabled={!apiKey}
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
              >
                Preview Mapping
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Data Mapping Preview</h2>
              <p className="text-sm text-gray-500 mt-1">Here is how a Job Card will be pushed to {software}. HSN codes will be strictly enforced if required by your software.</p>
            </div>

            <div className="bg-gray-900 p-5 rounded-xl shadow-inner overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-8 bg-gray-800 border-b border-gray-700 flex items-center px-4">
                <FileJson className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-xs text-gray-400 font-mono">invoice_payload_preview.json</span>
              </div>
              <pre className="text-green-400 font-mono text-sm mt-6 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(mockPayload, null, 2)}
              </pre>
            </div>

            <div className="flex space-x-3 mt-8">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button 
                onClick={handleFinish}
                disabled={isSaving}
                className="flex-1 py-3 flex justify-center items-center bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
              >
                {isSaving ? "Saving..." : <><Check className="w-5 h-5 mr-2" /> Finalize Setup</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
