"use client";

import { useState } from "react";
import { ArrowLeft, Settings, Wrench, Package, PenLine, Contact } from "lucide-react";
import Link from "next/link";
import { useSaveContact } from "@/hooks/useSaveContact";

export function JobCardDetailClient({ jobCard }: { jobCard: any }) {
  const [activeTab, setActiveTab] = useState("details");
  const { saveContact } = useSaveContact();
  
  const customerName = jobCard.currentCustomer?.displayName || jobCard.customer?.displayName || "Unknown Customer";
  const mobile = jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile || "No Contact";
  
  const vehicleName = jobCard.vehicle?.registrationNumberRaw || jobCard.vehicle?.registrationNumberNormalized || "Unknown Vehicle";
  const makeModel = `${jobCard.vehicle?.manufacturer || ""} ${jobCard.vehicle?.model || ""}`.trim() || "Unknown Make/Model";

  const parts = jobCard.partLines || [];
  const labor = jobCard.labourLines || [];
  const complaints = jobCard.complaints || [];

  const getPartTotal = (p: any) => {
    return (p.quantityRequested || 0) * (p.sellingPrice || 0);
  };
  
  const getLaborTotal = (l: any) => {
    return (l.quantity || 0) * (l.sellingPrice || 0);
  };

  const totalParts = parts.reduce((sum: number, p: any) => sum + getPartTotal(p), 0);
  const totalLabor = labor.reduce((sum: number, l: any) => sum + getLaborTotal(l), 0);
  const grandTotal = totalParts + totalLabor;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-36 font-outfit">
      {/* Flat Teal Header */}
      <div className="bg-teal-500 text-white px-4 pt-6 pb-6 shadow-md relative">
        <div className="flex justify-between items-center mb-4">
          <Link href="/solo/jobcards" className="p-2 -ml-2 hover:bg-teal-600 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="bg-white/20 border border-white/40 px-3 py-1 rounded">
             <span className="text-xs font-bold uppercase tracking-wider">{jobCard.jobcardNumber}</span>
          </div>
          <Link href={`/solo/jobcards/${jobCard.id}/print`} className="p-2 hover:bg-teal-600 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="text-center mt-2">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">{vehicleName}</h1>
          <p className="text-teal-100 font-semibold">{makeModel}</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="inline-flex items-center bg-teal-600 px-4 py-2 rounded shadow-inner">
               <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center mr-3 font-bold text-white border border-teal-300">
                  {customerName.charAt(0).toUpperCase()}
               </div>
               <div className="text-left">
                  <p className="text-sm font-bold">{customerName}</p>
                  <p className="text-xs text-teal-200 font-medium">+91 {mobile}</p>
               </div>
               <button 
                 onClick={() => saveContact({ name: customerName, phone: mobile })}
                 className="ml-4 p-1.5 bg-teal-500 hover:bg-teal-400 rounded-md transition-colors"
                 title="Save to Contacts"
               >
                 <Contact className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Flat Action Tabs */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-40">
        <div className="flex">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-all ${
              activeTab === "details" ? "text-teal-600 border-b-4 border-teal-500 bg-teal-50" : "text-gray-500"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("parts")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center ${
              activeTab === "parts" ? "text-teal-600 border-b-4 border-teal-500 bg-teal-50" : "text-gray-500"
            }`}
          >
            <Package className="w-4 h-4 mr-1.5" /> Parts
          </button>
          <button
            onClick={() => setActiveTab("labor")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center ${
              activeTab === "labor" ? "text-teal-600 border-b-4 border-teal-500 bg-teal-50" : "text-gray-500"
            }`}
          >
            <Wrench className="w-4 h-4 mr-1.5" /> Labor
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pt-4 pb-4">
        {activeTab === "details" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Complaint</h3>
                 <button className="text-teal-500"><PenLine className="w-4 h-4" /></button>
              </div>
              
              {complaints.length > 0 ? (
                <ul className="list-disc pl-5">
                    {complaints.map((c: any) => (
                        <li key={c.id} className="text-gray-800 font-semibold">{c.customerComplaintText}</li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No complaints recorded</p>
              )}
              
              {jobCard.internalNotes && (
                 <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Observations / Notes</h3>
                    <p className="text-gray-800 text-sm">{jobCard.internalNotes}</p>
                 </div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
              <div className="flex space-x-2">
                <span className="flex-1 text-center py-2 bg-amber-400 text-white rounded font-bold uppercase tracking-wider text-sm shadow-sm">{jobCard.status}</span>
                <span className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-teal-500 hover:text-white transition-colors cursor-pointer">Mark Ready</span>
              </div>
            </div>

            {/* Vehicle Extra Info Panel */}
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Vehicle Extended Details</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700">
                 <div className="font-medium text-gray-500">Color</div>
                 <div>{jobCard.vehicle?.color || "-"}</div>
                 <div className="font-medium text-gray-500">Year</div>
                 <div>{jobCard.vehicle?.manufactureYear || "-"}</div>
                 <div className="font-medium text-gray-500">Odometer</div>
                 <div>{jobCard.vehicle?.currentOdometer ? `${jobCard.vehicle.currentOdometer} KM` : "-"}</div>
                 <div className="font-medium text-gray-500">Battery</div>
                 <div className="text-xs">{jobCard.vehicle?.batteryDetails || "-"}</div>
                 <div className="font-medium text-gray-500">Next Service</div>
                 <div>{jobCard.vehicle?.nextServiceDate ? new Date(jobCard.vehicle.nextServiceDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Next Oil Change</div>
                 <div>{jobCard.vehicle?.nextOilChangeDate ? new Date(jobCard.vehicle.nextOilChangeDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Next PUC</div>
                 <div>{jobCard.vehicle?.emissionInspectionExpiryDate ? new Date(jobCard.vehicle.emissionInspectionExpiryDate).toLocaleDateString() : "-"}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "parts" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {parts.length === 0 && <div className="text-center py-8 text-gray-500">No parts added</div>}
            {parts.map((p: any) => (
              <div key={p.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{p.partName}</h4>
                  <p className="text-xs text-gray-500 mt-1">Qty: {p.quantityRequested} × ₹{p.sellingPrice?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{getPartTotal(p).toFixed(2)}</p>
                </div>
              </div>
            ))}
            <button className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-teal-600 font-bold hover:bg-teal-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
              Add Part
            </button>
          </div>
        )}

        {activeTab === "labor" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {labor.length === 0 && <div className="text-center py-8 text-gray-500">No labor added</div>}
            {labor.map((l: any) => (
              <div key={l.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{l.labourName}</h4>
                  <p className="text-xs text-gray-500 mt-1">Qty: {l.quantity} × ₹{l.sellingPrice?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{getLaborTotal(l).toFixed(2)}</p>
                </div>
              </div>
            ))}
            <button className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-teal-600 font-bold hover:bg-teal-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
              Add Labor
            </button>
          </div>
        )}
      </div>

      {/* Sticky Bottom Total Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 md:hidden z-50">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Est. Total</p>
            <p className="text-2xl font-black text-teal-600">₹{grandTotal.toFixed(2)}</p>
          </div>
          <button className="bg-gray-900 text-white px-6 py-3 rounded font-bold shadow-md hover:bg-gray-800 transition-colors">
            Pay Now
          </button>
        </div>
      </div>
    </div>
  );
}
