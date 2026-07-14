"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Printer, Wrench, Package, PenLine, Contact, Camera, Plus, X, UploadCloud, Loader2, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSaveContact } from "@/hooks/useSaveContact";
import { useRouter } from "next/navigation";

export function JobCardDetailClient({ jobCard: initialJobCard }: { jobCard: any }) {
  const router = useRouter();
  const [jobCard, setJobCard] = useState(initialJobCard);
  const [activeTab, setActiveTab] = useState("details");
  const { saveContact } = useSaveContact();

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null);
  
  const [newPartName, setNewPartName] = useState("");
  const [newPartQty, setNewPartQty] = useState(1);
  const [newPartPrice, setNewPartPrice] = useState("");
  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [showPartResults, setShowPartResults] = useState(false);

  const [newLaborName, setNewLaborName] = useState("");
  const [newLaborQty, setNewLaborQty] = useState(1);
  const [newLaborPrice, setNewLaborPrice] = useState("");
  const [laborSearchResults, setLaborSearchResults] = useState<any[]>([]);
  const [showLaborResults, setShowLaborResults] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePartNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewPartName(val);
    if (!val) {
      setPartSearchResults([]);
      setShowPartResults(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/parts?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setPartSearchResults(data.parts || []);
        setShowPartResults(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPart = (part: any) => {
    setNewPartName(part.partName);
    setNewPartPrice(part.defaultSellingPrice?.toString() || "");
    setShowPartResults(false);
  };

  const handleSavePart = async () => {
    if (!newPartName || !newPartPrice) return;
    setIsSaving(true);
    try {
      let masterId = partSearchResults.find(p => p.partName.toLowerCase() === newPartName.toLowerCase())?.id;
      
      if (!masterId) {
        const createRes = await fetch('/api/inventory/parts', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partName: newPartName, defaultSellingPrice: parseFloat(newPartPrice) })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          masterId = createData.part?.id;
        }
      }

      let updatedParts = [...(jobCard.partLines || [])];
      
      if (editingPartId) {
        updatedParts = updatedParts.map(p => 
          p.id === editingPartId 
            ? { ...p, partMasterId: masterId || p.partMasterId, partName: newPartName, quantityRequested: newPartQty, sellingPrice: parseFloat(newPartPrice) } 
            : p
        );
      } else {
        updatedParts.push({
          partMasterId: masterId || null,
          partName: newPartName,
          quantityRequested: newPartQty,
          sellingPrice: parseFloat(newPartPrice),
          status: "requested"
        });
      }

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts: updatedParts
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state instead of router.refresh() to ensure immediate UI update
        if (data.jobcard) {
          setJobCard(data.jobcard);
        } else {
          router.refresh();
        }
        setIsPartModalOpen(false);
        setEditingPartId(null);
        setNewPartName("");
        setNewPartQty(1);
        setNewPartPrice("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save part");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaborNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewLaborName(val);
    if (!val) {
      setLaborSearchResults([]);
      setShowLaborResults(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/labour?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setLaborSearchResults(data.labour || []);
        setShowLaborResults(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectLabor = (labor: any) => {
    setNewLaborName(labor.labourName);
    setNewLaborPrice(labor.defaultSellingPrice?.toString() || "");
    setShowLaborResults(false);
  };

  const handleSaveLabor = async () => {
    if (!newLaborName || !newLaborPrice) return;
    setIsSaving(true);
    try {
      let masterId = laborSearchResults.find(l => l.labourName.toLowerCase() === newLaborName.toLowerCase())?.id;
      
      if (!masterId) {
        const createRes = await fetch('/api/labour', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labourName: newLaborName, defaultSellingPrice: parseFloat(newLaborPrice) })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          masterId = createData.labour?.id;
        }
      }

      let updatedLabor = [...(jobCard.labourLines || [])];
      
      if (editingLaborId) {
        updatedLabor = updatedLabor.map(l => 
          l.id === editingLaborId 
            ? { ...l, labourMasterId: masterId || l.labourMasterId, labourName: newLaborName, quantity: newLaborQty, sellingPrice: parseFloat(newLaborPrice) } 
            : l
        );
      } else {
        updatedLabor.push({
          labourMasterId: masterId || null,
          labourName: newLaborName,
          quantity: newLaborQty,
          sellingPrice: parseFloat(newLaborPrice),
          status: "pending"
        });
      }

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labour: updatedLabor
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.jobcard) {
          setJobCard(data.jobcard);
        } else {
          router.refresh();
        }
        setIsLaborModalOpen(false);
        setEditingLaborId(null);
        setNewLaborName("");
        setNewLaborQty(1);
        setNewLaborPrice("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save labor");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.jobcard) setJobCard(data.jobcard);
        else router.refresh();
      } else {
        alert("Failed to update status");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (uploadRes.ok) {
        const { fileUrl, fileName, mimeType, fileSizeBytes } = await uploadRes.json();
        
        const newMedia = {
          mediaType: "work_photo",
          fileUrl: fileUrl,
          fileName: fileName,
          mimeType: mimeType,
          fileSizeBytes: fileSizeBytes
        };

        const res = await fetch(`/api/jobcards/${jobCard.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media: [newMedia]
          })
        });

        if (res.ok) {
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditPart = (p: any) => {
    setEditingPartId(p.id);
    setNewPartName(p.partName);
    setNewPartQty(p.quantityRequested || 1);
    setNewPartPrice(p.sellingPrice?.toString() || "");
    setIsPartModalOpen(true);
  };

  const handleDeletePart = async (pId: string) => {
    if (!confirm("Are you sure you want to remove this part?")) return;
    try {
      const partsArr = jobCard.partLines || [];
      const updatedParts = partsArr.map((p: any) => p.id === pId ? { ...p, isDeleted: true } : p);
      
      // Optimistic update
      const previousJobCard = jobCard;
      setJobCard({ ...jobCard, partLines: updatedParts });

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: updatedParts })
      });
      if (res.ok) {
        const data = await res.json();
        if(data.jobcard) setJobCard(data.jobcard);
        else router.refresh();
      } else {
        setJobCard(previousJobCard);
        const data = await res.json();
        alert(data.error || "Failed to remove part");
      }
    } catch (e) { console.error(e); }
  };

  const handleEditLabor = (l: any) => {
    setEditingLaborId(l.id);
    setNewLaborName(l.labourName);
    setNewLaborQty(l.quantity || 1);
    setNewLaborPrice(l.sellingPrice?.toString() || "");
    setIsLaborModalOpen(true);
  };

  const handleDeleteLabor = async (lId: string) => {
    if (!confirm("Are you sure you want to remove this labor charge?")) return;
    try {
      const laborArr = jobCard.labourLines || [];
      const updatedLabor = laborArr.map((l: any) => l.id === lId ? { ...l, isDeleted: true } : l);

      // Optimistic update
      const previousJobCard = jobCard;
      setJobCard({ ...jobCard, labourLines: updatedLabor });

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labour: updatedLabor })
      });
      if (res.ok) {
        const data = await res.json();
        if(data.jobcard) setJobCard(data.jobcard);
        else router.refresh();
      } else {
        setJobCard(previousJobCard);
        const data = await res.json();
        alert(data.error || "Failed to remove labor charge");
      }
    } catch (e) { console.error(e); }
  };

  
  const customerName = jobCard.currentCustomer?.displayName || jobCard.customer?.displayName || "Unknown Customer";
  const mobile = jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile || "No Contact";
  
  const vehicleName = jobCard.vehicle?.registrationNumberRaw || jobCard.vehicle?.registrationNumberNormalized || "Unknown Vehicle";
  const makeModel = `${jobCard.vehicle?.manufacturer || ""} ${jobCard.vehicle?.model || ""}`.trim() || "Unknown Make/Model";

  const parts = (jobCard.partLines || []).filter((p: any) => !p.isDeleted);
  const labor = (jobCard.labourLines || []).filter((l: any) => !l.isDeleted);
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

  const isLocked = ["ready_for_delivery", "delivered", "closed", "ready"].includes(jobCard.status?.toLowerCase());
  
  const displayStatus = jobCard.status === "waiting_for_estimate" || jobCard.status === "open" ? "OPEN JOBCARD" : jobCard.status?.replace(/_/g, ' ') || "OPEN";

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-36 font-outfit">
      {/* Flat Teal Header */}
      <div className="bg-gray-900 text-white px-4 pt-6 pb-6 shadow-md relative">
        <div className="flex justify-between items-center mb-4">
          <Link href="/solo/jobcards" className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="bg-white/20 border border-white/40 px-3 py-1 rounded">
             <span className="text-xs font-bold uppercase tracking-wider">{jobCard.jobcardNumber}</span>
          </div>
          <Link href={`/solo/jobcards/${jobCard.id}/print`} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <Printer className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="text-center mt-2">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">{vehicleName}</h1>
          <p className="text-gray-400 font-semibold">{makeModel}</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="inline-flex items-center bg-gray-800 px-4 py-2 rounded shadow-inner">
               <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-3 font-bold text-white border border-orange-300">
                  {customerName.charAt(0).toUpperCase()}
               </div>
               <div className="text-left">
                  <p className="text-sm font-bold">{customerName}</p>
                  <p className="text-xs text-gray-400 font-medium">+91 {mobile}</p>
               </div>
               <button 
                 onClick={() => saveContact({ name: customerName, phone: mobile })}
                 className="ml-4 p-1.5 bg-gray-900 hover:bg-gray-700 rounded-md transition-colors"
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
        <div className="flex overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
              activeTab === "details" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("parts")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center whitespace-nowrap ${
              activeTab === "parts" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            <Package className="w-4 h-4 mr-1.5" /> Parts
          </button>
          <button
            onClick={() => setActiveTab("labor")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center whitespace-nowrap ${
              activeTab === "labor" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            <Wrench className="w-4 h-4 mr-1.5" /> Labor
          </button>
          <button
            onClick={() => setActiveTab("pictures")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center whitespace-nowrap ${
              activeTab === "pictures" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            <Camera className="w-4 h-4 mr-1.5" /> Pictures
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
                 <button className="text-orange-500"><PenLine className="w-4 h-4" /></button>
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
                <span className={`flex-1 text-center py-2 text-white rounded font-bold uppercase tracking-wider text-sm shadow-sm ${isLocked ? 'bg-emerald-500' : 'bg-amber-400'}`}>
                  {displayStatus}
                </span>
                {isLocked ? (
                  <button 
                    onClick={() => handleUpdateStatus("open")}
                    className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-orange-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Mark Open
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateStatus("ready_for_delivery")}
                    className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-gray-900 hover:text-white transition-colors cursor-pointer"
                  >
                    Mark Ready
                  </button>
                )}
              </div>
            </div>

            {/* Customer Details Panel */}
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Customer Details</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700">
                 <div className="font-medium text-gray-500">Address</div>
                 <div>{jobCard.currentCustomer?.address || jobCard.customer?.address || "-"}</div>
                 <div className="font-medium text-gray-500">Driver Name</div>
                 <div>{jobCard.currentCustomer?.driverName || jobCard.customer?.driverName || "-"}</div>
                 <div className="font-medium text-gray-500">Driver Mobile</div>
                 <div>{jobCard.currentCustomer?.driverMobile || jobCard.customer?.driverMobile || "-"}</div>
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
                 <div>{jobCard.intakeOdometer ? `${jobCard.intakeOdometer} KM` : (jobCard.vehicle?.currentOdometer ? `${jobCard.vehicle.currentOdometer} KM` : "-")}</div>
                 <div className="font-medium text-gray-500">Battery</div>
                 <div className="text-xs">{jobCard.vehicle?.batteryDetails || "-"}</div>
                 <div className="font-medium text-gray-500">Next Service Date</div>
                 <div>{jobCard.vehicle?.nextServiceDate ? new Date(jobCard.vehicle.nextServiceDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Next Oil Change (KM)</div>
                 <div>{jobCard.vehicle?.nextOilChangeDistance ? `${jobCard.vehicle.nextOilChangeDistance} KM` : "-"}</div>
                 <div className="font-medium text-gray-500">Next Oil Change Date</div>
                 <div>{jobCard.vehicle?.nextOilChangeDate ? new Date(jobCard.vehicle.nextOilChangeDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Next PUC Date</div>
                 <div>{jobCard.vehicle?.emissionInspectionExpiryDate ? new Date(jobCard.vehicle.emissionInspectionExpiryDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Insurance Details</div>
                 <div>{jobCard.vehicle?.insuranceDetails || "-"}</div>
                 <div className="font-medium text-gray-500">Fuel Qty</div>
                 <div>{jobCard.fuelLevel || "-"}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "parts" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {parts.length === 0 && <div className="text-center py-8 text-gray-500">No parts added</div>}
            {parts.map((p: any) => (
              <div key={p.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 flex justify-between items-center group">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-gray-800 text-sm">{p.partName}</h4>
                  <p className="text-xs text-gray-500 mt-1">Qty: {p.quantityRequested} × ₹{p.sellingPrice?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-gray-900 mb-2">₹{getPartTotal(p).toFixed(2)}</p>
                  {!isLocked && (
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditPart(p)} className="p-1.5 text-gray-400 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => handleDeletePart(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingPartId(null);
                  setNewPartName("");
                  setNewPartQty(1);
                  setNewPartPrice("");
                  setIsPartModalOpen(true);
                }}
                className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
                Add Part
              </button>
            )}
          </div>
        )}

        {activeTab === "labor" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {labor.length === 0 && <div className="text-center py-8 text-gray-500">No labor added</div>}
            {labor.map((l: any) => (
              <div key={l.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 flex justify-between items-center group">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-gray-800 text-sm">{l.labourName}</h4>
                  <p className="text-xs text-gray-500 mt-1">Qty: {l.quantity} × ₹{l.sellingPrice?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-gray-900 mb-2">₹{getLaborTotal(l).toFixed(2)}</p>
                  {!isLocked && (
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditLabor(l)} className="p-1.5 text-gray-400 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => handleDeleteLabor(l.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingLaborId(null);
                  setNewLaborName("");
                  setNewLaborQty(1);
                  setNewLaborPrice("");
                  setIsLaborModalOpen(true);
                }}
                className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
                Add Labor
              </button>
            )}
          </div>
        )}

        {activeTab === "pictures" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-6 bg-white border-2 border-dashed border-orange-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex flex-col items-center justify-center text-sm uppercase tracking-wide mb-4">
              {isUploading ? (
                <Loader2 className="w-8 h-8 mb-2 animate-spin" />
              ) : (
                <Camera className="w-8 h-8 mb-2" />
              )}
              {isUploading ? "Uploading..." : "Take / Upload Photo"}
            </button>

            <div className="grid grid-cols-2 gap-3">
              {(jobCard.media || []).map((m: any) => (
                <div key={m.id} className="bg-white p-2 rounded-md shadow-sm border border-gray-200">
                  <img src={m.fileUrl} alt="Jobcard Media" className="w-full h-32 object-cover rounded" />
                </div>
              ))}
            </div>
            {(!jobCard.media || jobCard.media.length === 0) && !isUploading && (
              <div className="text-center py-8 text-gray-500">No pictures added</div>
            )}
          </div>
        )}
      </div>

      {/* Parts Modal */}
      {isPartModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center"><Package className="w-5 h-5 mr-2 text-orange-500"/> Add Part</h3>
              <button onClick={() => setIsPartModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Part Name</label>
                <input 
                  type="text" 
                  value={newPartName}
                  onChange={handlePartNameChange}
                  className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  placeholder="e.g. Engine Oil"
                />
                {showPartResults && partSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {partSearchResults.map(p => (
                      <div 
                        key={p.id} 
                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-800"
                        onClick={() => handleSelectPart(p)}
                      >
                        <div className="font-bold">{p.partName}</div>
                        <div className="text-xs text-gray-500">₹{p.defaultSellingPrice || "0.00"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={newPartQty}
                    onChange={e => setNewPartQty(parseFloat(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={newPartPrice}
                    onChange={e => setNewPartPrice(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button 
                onClick={handleSavePart}
                disabled={isSaving || !newPartName || !newPartPrice}
                className="w-full bg-gray-800 text-white font-bold py-3.5 rounded-md mt-2 hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Part"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labor Modal */}
      {isLaborModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center"><Wrench className="w-5 h-5 mr-2 text-orange-500"/> Add Labor</h3>
              <button onClick={() => setIsLaborModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Labor Description</label>
                <input 
                  type="text" 
                  value={newLaborName}
                  onChange={handleLaborNameChange}
                  className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  placeholder="e.g. General Service"
                />
                {showLaborResults && laborSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {laborSearchResults.map(l => (
                      <div 
                        key={l.id} 
                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-800"
                        onClick={() => handleSelectLabor(l)}
                      >
                        <div className="font-bold">{l.labourName}</div>
                        <div className="text-xs text-gray-500">₹{l.defaultSellingPrice || "0.00"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={newLaborQty}
                    onChange={e => setNewLaborQty(parseFloat(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={newLaborPrice}
                    onChange={e => setNewLaborPrice(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button 
                onClick={handleSaveLabor}
                disabled={isSaving || !newLaborName || !newLaborPrice}
                className="w-full bg-gray-800 text-white font-bold py-3.5 rounded-md mt-2 hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Labor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Total Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 md:hidden z-30">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Est. Total</p>
            <p className="text-2xl font-black text-orange-500">₹{grandTotal.toFixed(2)}</p>
          </div>
          <Link href={`/solo/jobcards/${jobCard.id}/billing`} className="bg-gray-900 text-white px-6 py-3 rounded font-bold shadow-md hover:bg-gray-800 transition-colors">
            Pay Now
          </Link>
        </div>
      </div>
    </div>
  );
}
