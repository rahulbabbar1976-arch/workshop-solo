"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Settings, Check, FileText, Wrench, Package, MessageCircle, ChevronRight, PenLine, Percent, Contact } from "lucide-react";
import Link from "next/link";
import { useSaveContact } from "@/hooks/useSaveContact";

export default function SoloJobcardDetailPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const { saveContact } = useSaveContact();
  
  // Mock Data
  const job = {
    id: "JC-1005",
    vehicle: "MH01AB1234",
    make: "Hyundai i20",
    customer: "John Doe",
    mobile: "9876543210",
    status: "In Progress",
    complaint: "Engine making noise, oil change required",
    observations: "Brake pads look slightly worn out.",
    deliveryTime: "Tomorrow, 4:00 PM"
  };

  const [parts, setParts] = useState([
    { id: 1, name: "Engine Oil (Synthetic)", qty: 3.5, price: 650, discountType: "%", discountValue: 10 },
    { id: 2, name: "Oil Filter", qty: 1, price: 250, discountType: "₹", discountValue: 0 },
  ]);

  const [labor, setLabor] = useState([
    { id: 1, name: "General Service", price: 1500, discountType: "₹", discountValue: 200 },
  ]);

  // Calculate totals
  const getPartTotal = (p: any) => {
    let raw = p.qty * p.price;
    if (p.discountType === '%') return raw - (raw * (p.discountValue / 100));
    return raw - p.discountValue;
  };
  
  const getLaborTotal = (l: any) => {
    if (l.discountType === '%') return l.price - (l.price * (l.discountValue / 100));
    return l.price - l.discountValue;
  };

  const totalParts = parts.reduce((sum, p) => sum + getPartTotal(p), 0);
  const totalLabor = labor.reduce((sum, l) => sum + getLaborTotal(l), 0);
  const grandTotal = totalParts + totalLabor;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-36 font-[Outfit]">
      {/* Flat Teal Header */}
      <div className="bg-teal-500 text-white px-4 pt-6 pb-6 shadow-md relative">
        <div className="flex justify-between items-center mb-4">
          <Link href="/solo/jobcards" className="p-2 -ml-2 hover:bg-teal-600 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="bg-white/20 border border-white/40 px-3 py-1 rounded">
             <span className="text-xs font-bold uppercase tracking-wider">{job.id}</span>
          </div>
          <button className="p-2 hover:bg-teal-600 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-center mt-2">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">{job.vehicle}</h1>
          <p className="text-teal-100 font-semibold">{job.make}</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="inline-flex items-center bg-teal-600 px-4 py-2 rounded shadow-inner">
               <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center mr-3 font-bold text-white border border-teal-300">
                  {job.customer.charAt(0)}
               </div>
               <div className="text-left">
                  <p className="text-sm font-bold">{job.customer}</p>
                  <p className="text-xs text-teal-200 font-medium">+91 {job.mobile}</p>
               </div>
               <button 
                 onClick={() => saveContact({ name: job.customer, phone: job.mobile })}
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
              <p className="text-gray-800 font-semibold">{job.complaint}</p>
              
              {job.observations && (
                 <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Observations</h3>
                    <p className="text-gray-800 text-sm">{job.observations}</p>
                 </div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
              <div className="flex space-x-2">
                <span className="flex-1 text-center py-2 bg-amber-400 text-white rounded font-bold uppercase tracking-wider text-sm shadow-sm">In Progress</span>
                <span className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-teal-500 hover:text-white transition-colors cursor-pointer">Ready</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "parts" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {parts.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-md shadow-sm border-l-4 border-teal-500">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800">{p.name}</h4>
                  <div className="font-extrabold text-teal-600 text-lg">
                    ₹{getPartTotal(p).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                   <div className="text-xs font-bold text-gray-500">
                     {p.qty} unit(s) x ₹{p.price}
                   </div>
                   
                   {/* Discount Input Area */}
                   <div className="flex items-center space-x-2">
                      <select className="text-xs border border-gray-300 rounded p-1 bg-white focus:border-teal-500 font-bold" value={p.discountType} onChange={(e) => {
                         const newParts = [...parts];
                         newParts.find(x => x.id === p.id)!.discountType = e.target.value;
                         setParts(newParts);
                      }}>
                         <option value="₹">₹</option>
                         <option value="%">%</option>
                      </select>
                      <input 
                         type="number" 
                         className="w-16 text-xs border border-gray-300 rounded p-1 text-center font-bold" 
                         value={p.discountValue}
                         onChange={(e) => {
                           const newParts = [...parts];
                           newParts.find(x => x.id === p.id)!.discountValue = Number(e.target.value);
                           setParts(newParts);
                         }}
                      />
                   </div>
                </div>
              </div>
            ))}
            <button className="w-full py-4 mt-2 bg-white text-teal-600 border-2 border-dashed border-teal-300 rounded font-bold flex items-center justify-center hover:bg-teal-50 uppercase tracking-wider transition-all">
              <Plus className="w-5 h-5 mr-1.5" /> Add Part
            </button>
          </div>
        )}

        {activeTab === "labor" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {labor.map((l) => (
              <div key={l.id} className="bg-white p-4 rounded-md shadow-sm border-l-4 border-amber-400">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800">{l.name}</h4>
                  <div className="font-extrabold text-amber-600 text-lg">
                    ₹{getLaborTotal(l).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                   <div className="text-xs font-bold text-gray-500">
                     Base: ₹{l.price}
                   </div>
                   
                   {/* Discount Input Area */}
                   <div className="flex items-center space-x-2">
                      <select className="text-xs border border-gray-300 rounded p-1 bg-white focus:border-teal-500 font-bold" value={l.discountType} onChange={(e) => {
                         const newLabor = [...labor];
                         newLabor.find(x => x.id === l.id)!.discountType = e.target.value;
                         setLabor(newLabor);
                      }}>
                         <option value="₹">₹</option>
                         <option value="%">%</option>
                      </select>
                      <input 
                         type="number" 
                         className="w-16 text-xs border border-gray-300 rounded p-1 text-center font-bold" 
                         value={l.discountValue}
                         onChange={(e) => {
                           const newLabor = [...labor];
                           newLabor.find(x => x.id === l.id)!.discountValue = Number(e.target.value);
                           setLabor(newLabor);
                         }}
                      />
                   </div>
                </div>
              </div>
            ))}
            <button className="w-full py-4 mt-2 bg-white text-teal-600 border-2 border-dashed border-teal-300 rounded font-bold flex items-center justify-center hover:bg-teal-50 uppercase tracking-wider transition-all">
              <Plus className="w-5 h-5 mr-1.5" /> Add Labor Task
            </button>
          </div>
        )}
      </div>

      {/* Flat Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-lg z-40">
        <div className="flex justify-between items-end mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Est. Total</span>
          <span className="text-3xl font-extrabold text-teal-600">₹{grandTotal.toLocaleString()}</span>
        </div>
        <div className="flex space-x-2">
          <Link href={`/solo/jobcards/${job.id}/billing`} className="flex-1 py-3 bg-teal-500 text-white rounded font-bold text-center hover:bg-teal-600 uppercase tracking-wider text-sm flex items-center justify-center shadow-sm">
            Generate Bill <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
          <a href={`https://wa.me/91${job.mobile}?text=Hello ${job.customer}, your vehicle is currently being worked on. Estimated total is Rs ${grandTotal}.`} target="_blank" rel="noreferrer" className="px-4 py-3 bg-[#25D366] text-white rounded hover:bg-[#128C7E] flex items-center justify-center shadow-sm">
            <MessageCircle className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
