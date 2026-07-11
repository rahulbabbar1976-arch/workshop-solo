"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, MessageCircle, FileText, Download, Receipt, Settings2, ShieldCheck, Car } from "lucide-react";
import Link from "next/link";

export default function SoloBillingPage() {
  const router = useRouter();
  const [billType, setBillType] = useState<"estimate" | "invoice">("invoice");
  const [taxScheme, setTaxScheme] = useState<"composition" | "gst">("composition");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Mock Data
  const job = {
    id: "JC-1005",
    vehicle: "MH01AB1234",
    make: "Hyundai i20",
    customer: "John Doe",
    mobile: "9876543210",
  };

  const [parts, setParts] = useState([
    { id: 1, name: "Engine Oil (Synthetic)", hsn: "2710", price: 2100 },
    { id: 2, name: "Oil Filter", hsn: "8421", price: 250 },
  ]);

  const laborTotal = 1300; // Mock labor total
  const partsTotal = parts.reduce((s, p) => s + p.price, 0);
  const subTotal = partsTotal + laborTotal;
  
  // Tax logic based on scheme
  const taxAmount = taxScheme === "gst" ? subTotal * 0.18 : 0; 
  const grandTotal = subTotal + taxAmount;

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCompleted(true);
    }, 1500);
  };

  const whatsappMessage = `Hello ${job.customer}, your ${billType === 'estimate' ? 'Estimate' : 'Final Invoice'} for vehicle ${job.vehicle} is ready. Total amount is Rs ${grandTotal.toLocaleString()}. Click here to view: https://workshop.com/v/${job.id}`;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-24 font-outfit">
      {/* Flat Teal Header */}
      <div className="bg-teal-500 text-white px-4 py-4 shadow-md flex items-center sticky top-0 z-30">
        {!completed && (
          <Link href={`/solo/jobcards/${job.id}`} className="mr-3 p-2 -ml-2 hover:bg-teal-600 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        )}
        <h1 className="text-lg font-bold uppercase tracking-wider">Finalize & Bill</h1>
      </div>

      <div className="flex-1 px-4 py-6 max-w-md w-full mx-auto">
        {!completed ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {/* Tax Settings Toggle */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4">
               <div className="flex items-center space-x-2 mb-4">
                  <Settings2 className="w-5 h-5 text-teal-600" />
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Tax & Compliance Setup</h2>
               </div>
               
               <div className="flex bg-gray-100 p-1 rounded">
                 <button 
                   onClick={() => setTaxScheme("composition")}
                   className={`flex-1 py-2 text-xs font-bold rounded uppercase tracking-wider transition-all ${taxScheme === "composition" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                 >
                   Composition (No GST)
                 </button>
                 <button 
                   onClick={() => setTaxScheme("gst")}
                   className={`flex-1 py-2 text-xs font-bold rounded uppercase tracking-wider transition-all ${taxScheme === "gst" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                 >
                   Regular GST (18%)
                 </button>
               </div>
            </div>

            {/* HSN Verification for GST */}
            {taxScheme === "gst" && (
              <div className="bg-white rounded-md shadow-sm border-l-4 border-amber-400 p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Verify HSN Codes</h3>
                <div className="space-y-3">
                  {parts.map((p, idx) => (
                    <div key={p.id} className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                      <div className="flex items-center">
                        <span className="text-[10px] text-gray-400 font-bold mr-2 uppercase">HSN:</span>
                        <input 
                          type="text" 
                          className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded focus:border-teal-500 text-xs font-bold text-center" 
                          value={p.hsn}
                          onChange={(e) => {
                            const newParts = [...parts];
                            newParts[idx].hsn = e.target.value;
                            setParts(newParts);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flat Summary Card */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-5">
              <div className="flex items-center space-x-2 mb-4">
                <Receipt className="w-5 h-5 text-teal-600" />
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Summary</h2>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Parts Total</span>
                  <span className="text-gray-900 font-bold">₹{partsTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Labor Total</span>
                  <span className="text-gray-900 font-bold">₹{laborTotal.toLocaleString()}</span>
                </div>
                
                {taxScheme === "gst" && (
                  <div className="flex justify-between text-gray-500 font-medium pt-2 border-t border-dashed border-gray-200">
                    <span>GST (18%)</span>
                    <span>₹{taxAmount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-gray-800 pt-3 mt-2 flex justify-between items-end">
                  <span className="font-extrabold text-gray-800 uppercase">Grand Total</span>
                  <span className="font-extrabold text-2xl text-teal-600 tracking-tight">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
               <button
                 onClick={() => { setBillType("estimate"); handleGenerate(); }}
                 disabled={loading}
                 className="w-full py-4 rounded font-bold text-teal-700 bg-white border-2 border-teal-500 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center uppercase tracking-wider"
               >
                 {loading && billType === "estimate" ? "Generating..." : "Save as Proforma / Estimate"}
               </button>

               <button
                 onClick={() => { setBillType("invoice"); handleGenerate(); }}
                 disabled={loading}
                 className="w-full py-4 rounded font-bold text-white bg-amber-400 hover:bg-amber-500 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center uppercase tracking-wider"
               >
                 {loading && billType === "invoice" ? "Generating..." : "Generate Final Invoice"}
               </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 animate-in zoom-in-95 duration-500 pt-8">
            <div className="mx-auto w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-md">
               <ShieldCheck className="w-10 h-10 text-teal-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight uppercase mb-1">
                {billType === 'invoice' ? 'Invoice Generated' : 'Estimate Generated'}
              </h2>
              <p className="text-gray-500 font-medium text-sm">
                Document <span className="font-bold text-gray-800">{billType === 'invoice' ? 'INV-1020' : 'EST-054'}</span> ready for {job.customer}.
              </p>
            </div>

            {billType === "invoice" && (
               <div className="bg-teal-50 p-4 rounded-md border border-teal-100 flex items-start text-left">
                  <Car className="w-5 h-5 text-teal-600 mr-3 shrink-0 mt-0.5" />
                  <div>
                     <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wide">Vehicle DB Updated</h4>
                     <p className="text-xs text-teal-600 font-medium mt-1">Vehicle {job.vehicle} next service marked for 10,000 km or 6 months based on recent oil change.</p>
                  </div>
               </div>
            )}

            <div className="space-y-3 pt-4">
              <a 
                href={`https://wa.me/91${job.mobile}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex justify-center items-center py-4 rounded bg-[#25D366] text-white font-bold uppercase tracking-wider hover:bg-[#128C7E] shadow-sm transition-colors active:scale-[0.98]"
              >
                <MessageCircle className="w-5 h-5 mr-2" /> Share on WhatsApp
              </a>
              <button
                className="w-full flex justify-center items-center py-4 rounded bg-white text-gray-700 border-2 border-gray-200 font-bold uppercase tracking-wider hover:bg-gray-50 shadow-sm transition-colors active:scale-[0.98]"
              >
                <Download className="w-5 h-5 mr-2" /> Download PDF
              </button>
            </div>

            {billType === 'invoice' && (
              <div className="pt-6">
                <button
                  onClick={() => router.push("/solo/dashboard")}
                  className="w-full flex justify-center items-center py-4 rounded bg-amber-400 text-white font-bold uppercase tracking-wider hover:bg-amber-500 shadow-sm transition-colors active:scale-[0.98]"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
