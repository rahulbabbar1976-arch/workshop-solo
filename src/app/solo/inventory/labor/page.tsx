"use client";

import { useState, useEffect } from "react";
import { Wrench, Plus, Search, Edit2, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LaborMasterPage() {
  const router = useRouter();
  const [laborList, setLaborList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<any>(null);
  const [formData, setFormData] = useState({
    labourName: "",
    labourCode: "",
    defaultSellingPrice: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLabor();
  }, [searchQuery]);

  const fetchLabor = async () => {
    try {
      const res = await fetch(`/api/labour?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setLaborList(data.labour || []);
      }
    } catch (e) {
      console.error("Error fetching labor", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (labor?: any) => {
    if (labor) {
      setEditingLabor(labor);
      setFormData({
        labourName: labor.labourName || "",
        labourCode: labor.labourCode || "",
        defaultSellingPrice: labor.defaultSellingPrice?.toString() || "",
      });
    } else {
      setEditingLabor(null);
      setFormData({
        labourName: "",
        labourCode: "",
        defaultSellingPrice: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        defaultSellingPrice: formData.defaultSellingPrice ? parseFloat(formData.defaultSellingPrice) : null,
      };

      if (editingLabor) {
        await fetch(`/api/labour/${editingLabor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/labour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchLabor();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-outfit">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <div className="flex items-center space-x-3">
            <Link href="/solo/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <Wrench className="w-5 h-5 mr-2 text-teal-600" /> Labor Master
            </h1>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search labor tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 font-medium text-gray-800"
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-10">Loading labor tasks...</p>
          ) : laborList.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No labor tasks found</p>
              <p className="text-xs text-gray-400 mt-1">Add your first labor task to build your catalog.</p>
            </div>
          ) : (
            laborList.map(labor => (
              <div key={labor.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center group">
                <div>
                  <h3 className="font-bold text-gray-800">{labor.labourName}</h3>
                  <div className="flex items-center space-x-3 mt-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {labor.labourCode && <span>Code: {labor.labourCode}</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md text-sm">
                    ₹{labor.defaultSellingPrice || "0.00"}
                  </span>
                  <button 
                    onClick={() => handleOpenModal(labor)}
                    className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[450px] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                {editingLabor ? "Edit Labor Task" : "Add New Labor Task"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Labor Description <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.labourName}
                  onChange={e => setFormData({...formData, labourName: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-teal-500 focus:ring-0 outline-none font-medium text-gray-900 transition-colors"
                  placeholder="e.g. General Service"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Labor Code</label>
                  <input 
                    type="text" 
                    value={formData.labourCode}
                    onChange={e => setFormData({...formData, labourCode: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-teal-500 focus:ring-0 outline-none font-medium text-gray-900 transition-colors"
                    placeholder="e.g. LAB-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={formData.defaultSellingPrice}
                    onChange={e => setFormData({...formData, defaultSellingPrice: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-teal-500 focus:ring-0 outline-none font-medium text-gray-900 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleSave}
                disabled={isSaving || !formData.labourName}
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-lg mt-4 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSaving ? "Saving..." : "Save Labor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
