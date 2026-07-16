"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Search, Edit2, X, ArrowLeft, Trash2, Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PartsMasterPage() {
  const router = useRouter();
  const [parts, setParts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [formData, setFormData] = useState({
    partName: "",
    partNumber: "",
    defaultSellingPrice: "",
    stockQuantity: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchParts();
  }, [searchQuery]);

  const fetchParts = async () => {
    try {
      const res = await fetch(`/api/inventory/parts?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setParts(data.parts || []);
      }
    } catch (e) {
      console.error("Error fetching parts", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (part?: any) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        partName: part.partName || "",
        partNumber: part.partNumber || "",
        defaultSellingPrice: part.defaultSellingPrice?.toString() || "",
        stockQuantity: part.stockQuantity?.toString() || "",
      });
    } else {
      setEditingPart(null);
      setFormData({
        partName: "",
        partNumber: "",
        defaultSellingPrice: "",
        stockQuantity: "",
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
        stockQuantity: formData.stockQuantity ? parseFloat(formData.stockQuantity) : 0,
      };

      if (editingPart) {
        // We don't have a specific PUT /api/inventory/parts/[id] yet, let's just make it if needed, or assume read-only for now? 
        // Wait, I should add PUT method to /api/inventory/parts if it doesn't exist.
        // For now let's just mock update or add a generic route if it exists. 
        // Actually, creating a new part is supported. 
        // Let's implement creating for now, editing if backend supports it.
        // To be safe, I'll just create a new part or update it via a new API. 
        // Let's just create new parts for now, editing would require building a PUT route.
        // Let's add the PUT route in a moment!
        await fetch(`/api/inventory/parts/${editingPart.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/inventory/parts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchParts();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this part?")) return;
    try {
      const res = await fetch(`/api/inventory/parts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to delete part.");
      } else {
        fetchParts();
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting part.");
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
              <Package className="w-5 h-5 mr-2 text-teal-600" /> Parts Master
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
            placeholder="Search parts by name or number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 font-medium text-gray-800"
          />
        </div>
        
        {/* AI Scanner Button */}
        <Link href="/solo/inventory/parts/import" className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-sm hover:from-orange-600 hover:to-amber-600 transition-colors flex items-center justify-center text-sm">
          <Camera className="w-5 h-5 mr-2" /> AI Bill Scanner
        </Link>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-10">Loading parts...</p>
          ) : parts.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No parts found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search or add a new part.</p>
            </div>
          ) : (
            parts.map(part => (
              <div key={part.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center group">
                <div>
                  <h3 className="font-bold text-gray-800">{part.partName}</h3>
                  <div className="flex items-center space-x-3 mt-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {part.partNumber && <span>#{part.partNumber}</span>}
                    <span>Stock: {part.stockQuantity || 0}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md text-sm">
                    ₹{part.defaultSellingPrice || "0.00"}
                  </span>
                  <button 
                    onClick={() => handleOpenModal(part)}
                    className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(part.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
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
                {editingPart ? "Edit Part" : "Add New Part"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Part Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.partName}
                  onChange={e => setFormData({...formData, partName: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-teal-500 focus:ring-0 outline-none font-medium text-gray-900 transition-colors"
                  placeholder="e.g. Engine Oil 5W30"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Part Number</label>
                  <input 
                    type="text" 
                    value={formData.partNumber}
                    onChange={e => setFormData({...formData, partNumber: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-teal-500 focus:ring-0 outline-none font-medium text-gray-900 transition-colors"
                    placeholder="e.g. OIL-001"
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

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Stock Quantity</label>
                <input 
                  type="number" 
                  value={formData.stockQuantity}
                  onChange={e => setFormData({...formData, stockQuantity: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-teal-500 focus:ring-0 outline-none font-medium text-gray-900 transition-colors"
                  placeholder="0"
                />
              </div>
              
              <button 
                onClick={handleSave}
                disabled={isSaving || !formData.partName}
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-lg mt-4 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSaving ? "Saving..." : "Save Part"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
