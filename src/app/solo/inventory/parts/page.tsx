"use client";

import { useState, useEffect } from "react";
import { 
  Package, Plus, Search, Edit2, X, ArrowLeft, Trash2, Camera, 
  MoreVertical, FileText, Sparkles, MapPin, Layers, RefreshCw, BarChart2 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AIItem = {
  id: string;
  partName: string;
  partNumber: string;
  defaultSellingPrice: number;
  stockQuantity: number;
  hsnCode?: string;
  category?: string;
  defaultTaxRate?: number;
  rackNumber?: string;
  binNumber?: string;
};

const CATEGORIES = [
  "Filters",
  "Lubricants",
  "Air Conditioners",
  "Brakes",
  "Coolant",
  "Accessories",
  "Lights",
  "Body Panels",
  "Tyres",
  "Battery",
  "Sensors",
  "Electricals",
  "Fuel System",
  "Engine Parts",
  "Gearbox Parts",
  "Others"
];

export default function PartsMasterPage() {
  const router = useRouter();
  const [parts, setParts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // Dropdown options menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const [isInvoiceHistoryOpen, setIsInvoiceHistoryOpen] = useState(false);
  const [isAiReportOpen, setIsAiReportOpen] = useState(false);

  // Editing state
  const [editingPart, setEditingPart] = useState<any>(null);
  const [formData, setFormData] = useState({
    partName: "",
    partNumber: "",
    hsnCode: "",
    category: "Others",
    defaultSellingPrice: "",
    defaultTaxRate: "18",
    stockQuantity: "",
    rackNumber: "",
    binNumber: "",
  });

  // AI Report state
  const [aiReportContent, setAiReportContent] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchParts();
  }, [searchQuery]);

  const fetchParts = async () => {
    setIsLoading(true);
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
        hsnCode: part.hsnCode || "",
        category: part.category || "Others",
        defaultSellingPrice: part.defaultSellingPrice?.toString() || "",
        defaultTaxRate: part.defaultTaxRate?.toString() || "18",
        stockQuantity: part.stockQuantity?.toString() || "0",
        rackNumber: part.rackNumber || "",
        binNumber: part.binNumber || "",
      });
    } else {
      setEditingPart(null);
      setFormData({
        partName: "",
        partNumber: "",
        hsnCode: "",
        category: "Others",
        defaultSellingPrice: "",
        defaultTaxRate: "18",
        stockQuantity: "",
        rackNumber: "",
        binNumber: "",
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
        defaultTaxRate: formData.defaultTaxRate ? parseFloat(formData.defaultTaxRate) : null,
        stockQuantity: formData.stockQuantity ? parseFloat(formData.stockQuantity) : 0,
      };

      let res;
      if (editingPart) {
        res = await fetch(`/api/inventory/parts/${editingPart.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/inventory/parts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchParts();
      } else {
        alert(data.error || "Failed to save part");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving part");
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

  const handleQuickStockUpdate = async (id: string, newStock: number) => {
    try {
      const res = await fetch(`/api/inventory/parts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQuantity: newStock }),
      });
      const data = await res.json();
      if (data.success) {
        setParts(parts.map(p => p.id === id ? { ...p, stockQuantity: newStock } : p));
      } else {
        alert(data.error || "Failed to update stock");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateAIUsageReport = async () => {
    setIsGeneratingReport(true);
    setAiReportContent("");
    setIsAiReportOpen(true);

    try {
      // Load current key
      const profileRes = await fetch('/api/settings');
      const profile = await profileRes.json();
      const apiKey = profile?.geminiApiKey;

      if (!apiKey) {
        setAiReportContent("⚠️ Gemini API Key not configured. Please add your key in Owner Settings to use AI features.");
        setIsGeneratingReport(false);
        return;
      }

      // Build simplified catalog data for AI report analysis
      const partsData = parts.map(p => ({
        name: p.partName,
        stock: p.stockQuantity || 0,
        price: p.defaultSellingPrice || 0,
        category: p.category || "Others",
        purchasesCount: p.purchases?.length || 0
      }));

      const prompt = `You are an automotive workshop parts inventory manager.
Analyze the following inventory catalog dataset and write a brief, highly actionable manager's report.
Data: ${JSON.stringify(partsData)}

Please include:
1. **Critical Alerts:** Highlight any items that are low in stock (stock = 0 or < 2).
2. **High Volume Usage:** Identify which parts appear to have the highest purchase frequency or quantity (based on purchase counts or typical vehicle parts usage).
3. **Restocking Strategy:** Provide 2-3 specific recommendations on which categories or parts to order immediately and recommended quantities.

Format your response in clean, beautiful Markdown with professional bold headers. Do not output JSON, do not include raw code blocks. Keep it concise.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
        }
      );

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiReportContent(textResponse || "Failed to generate report. Please try again.");
    } catch (err: any) {
      setAiReportContent(`Failed to contact Gemini API: ${err.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Filter parts locally by Category tab
  const filteredParts = parts.filter(part => {
    if (selectedCategory === "All") return true;
    return part.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Compile all purchase logs for Uploaded Invoices modal
  const allPurchases = parts
    .flatMap(p => (p.purchases || []).map((pur: any) => ({ ...pur, partName: p.partName })))
    .sort((a, b) => new Date(b.dateOfPurchase).getTime() - new Date(a.dateOfPurchase).getTime());

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-outfit">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-150">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto relative">
          <div className="flex items-center space-x-3">
            <Link href="/solo/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-teal-600" /> Parts Manager
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleOpenModal()}
              className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 transition-colors shadow-sm"
              title="Add New Part"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Options Dropdown Menu */}
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-150 py-2 z-20 animate-in fade-in slide-in-from-top-2">
                    <Link 
                      href="/solo/inventory/parts/import"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Camera className="w-4 h-4 mr-3 text-teal-600" /> AI Bill Scanner
                    </Link>
                    <Link 
                      href="/solo/inventory/parts/bills"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FileText className="w-4 h-4 mr-3 text-teal-600" /> Uploaded Invoices
                    </Link>
                    <button 
                      onClick={() => { setIsMenuOpen(false); setIsQuickStockOpen(true); }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium text-left"
                    >
                      <RefreshCw className="w-4 h-4 mr-3 text-teal-600" /> Quick Stock Editor
                    </button>
                    <button 
                      onClick={() => { setIsMenuOpen(false); generateAIUsageReport(); }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium text-left"
                    >
                      <Sparkles className="w-4 h-4 mr-3 text-teal-600" /> AI Volume Usage Report
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search parts by name, number, make..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 font-medium text-gray-800 outline-none"
          />
        </div>

        {/* Action Buttons: Scanner & Invoices */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/solo/inventory/parts/import" 
            className="py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-sm hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center text-xs"
          >
            <Camera className="w-4 h-4 mr-2" /> AI Bill Scanner
          </Link>
          <Link 
            href="/solo/inventory/parts/bills" 
            className="py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center text-xs"
          >
            <FileText className="w-4 h-4 mr-2 text-teal-600" /> Scanned Invoices
          </Link>
        </div>

        {/* Categories Horizontal Scroll Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1" /> Core Family
          </label>
          <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${selectedCategory === "All" ? "bg-teal-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              All Parts
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${selectedCategory === cat ? "bg-teal-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Parts List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-10 font-medium flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal-600 mr-2" /> Loading parts inventory...
            </p>
          ) : filteredParts.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-150">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-bold">No parts found in {selectedCategory}</p>
              <p className="text-xs text-gray-400 mt-1">Try another category or add a new part record.</p>
            </div>
          ) : (
            filteredParts.map(part => (
              <div key={part.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-150 flex justify-between items-center group relative hover:border-teal-200 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-gray-800">{part.partName}</h3>
                    {part.category && (
                      <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {part.category}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
                    {part.partNumber && <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px]">#{part.partNumber}</span>}
                    {part.hsnCode && <span className="text-gray-400">HSN: {part.hsnCode}</span>}
                    <span className={`font-bold ${part.stockQuantity <= (part.safetyStock || 2) ? 'text-red-500' : 'text-gray-600'}`}>
                      Stock: {part.stockQuantity || 0}
                    </span>
                    {(part.rackNumber || part.binNumber) && (
                      <span className="text-teal-600 flex items-center text-[10px] font-bold">
                        <MapPin className="w-3 h-3 mr-0.5" />
                        {part.rackNumber ? `Rack ${part.rackNumber}` : ""}
                        {part.binNumber ? ` / Bin ${part.binNumber}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-teal-700 bg-teal-50/50 px-2 py-1 rounded text-sm">
                    ₹{part.defaultSellingPrice || "0"}
                  </span>
                  <button 
                    onClick={() => handleOpenModal(part)}
                    className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(part.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[500px] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Package className="w-5 h-5 mr-2 text-teal-600" />
                {editingPart ? "Edit Inventory Part" : "Add New Catalog Part"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-150 p-1.5 rounded-full transition-colors">
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
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                  placeholder="e.g. Front Brake Pads Bosch"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Part Number / SKU</label>
                  <input 
                    type="text" 
                    value={formData.partNumber}
                    onChange={e => setFormData({...formData, partNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                    placeholder="e.g. BP-7281"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Core Family (Category)</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">HSN Code</label>
                  <input 
                    type="text" 
                    value={formData.hsnCode}
                    onChange={e => setFormData({...formData, hsnCode: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                    placeholder="e.g. 8708"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">GST Rate (%)</label>
                  <select 
                    value={formData.defaultTaxRate}
                    onChange={e => setFormData({...formData, defaultTaxRate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                  >
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST (Luxury/Automotive)</option>
                    <option value="12">12% GST</option>
                    <option value="5">5% GST</option>
                    <option value="0">0% (Nil Rated)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-outfit">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Selling Price (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    value={formData.defaultSellingPrice}
                    onChange={e => setFormData({...formData, defaultSellingPrice: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Stock Quantity</label>
                  <input 
                    type="number" 
                    value={formData.stockQuantity}
                    onChange={e => setFormData({...formData, stockQuantity: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Location details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1 text-teal-600" /> Rack Number</label>
                  <input 
                    type="text" 
                    value={formData.rackNumber}
                    onChange={e => setFormData({...formData, rackNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                    placeholder="e.g. A-4"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1 text-teal-600" /> Bin Number</label>
                  <input 
                    type="text" 
                    value={formData.binNumber}
                    onChange={e => setFormData({...formData, binNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900 transition-all text-sm"
                    placeholder="e.g. 12"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleSave}
                disabled={isSaving || !formData.partName || !formData.defaultSellingPrice}
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-lg mt-4 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSaving ? "Saving..." : "Save Part Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Stock Editor Modal ── */}
      {isQuickStockOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[480px] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <RefreshCw className="w-5 h-5 mr-2 text-teal-600" /> Quick Stock Editor
              </h3>
              <button onClick={() => setIsQuickStockOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-150 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="space-y-3">
              {parts.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm">No parts in database to edit.</p>
              ) : (
                parts.map(part => (
                  <div key={part.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-bold text-gray-800 text-sm truncate max-w-xs">{part.partName}</span>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleQuickStockUpdate(part.id, Math.max(0, (part.stockQuantity || 0) - 1))}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2 py-1 rounded text-sm"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        value={part.stockQuantity || 0}
                        onChange={(e) => handleQuickStockUpdate(part.id, parseFloat(e.target.value) || 0)}
                        className="w-16 text-center border border-gray-300 rounded p-1 text-sm font-bold text-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button 
                        onClick={() => handleQuickStockUpdate(part.id, (part.stockQuantity || 0) + 1)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2 py-1 rounded text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Uploaded Invoices Modal ── */}
      {isInvoiceHistoryOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[500px] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-teal-600" /> Uploaded Purchase Invoices
              </h3>
              <button onClick={() => setIsInvoiceHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-150 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="space-y-4">
              {allPurchases.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No uploaded purchase invoice records found.</p>
                </div>
              ) : (
                allPurchases.map((purchase, index) => (
                  <div key={purchase.id || index} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-800">{purchase.partName}</span>
                      <span className="text-teal-700">₹{purchase.purchasePrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                      <span>Invoice: {purchase.invoiceNumber || "N/A"}</span>
                      <span>Qty: {purchase.quantityBought}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>Supplier: {purchase.supplierName || "Unknown"}</span>
                      <span>{new Date(purchase.dateOfPurchase).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI report modal ── */}
      {isAiReportOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[500px] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-teal-600 animate-pulse" />
                AI Parts Volume Usage Report
              </h3>
              <button onClick={() => setIsAiReportOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-150 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            {isGeneratingReport ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                <p className="text-sm font-bold text-gray-600 animate-pulse">Gemini AI is analyzing usage volumes...</p>
              </div>
            ) : (
              <div className="prose prose-sm prose-teal max-w-none text-gray-700 text-sm leading-relaxed overflow-y-auto max-h-[60vh] pr-2">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: aiReportContent
                      .replace(/\n/g, "<br />")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/### (.*?)/g, "<h4 class='font-bold text-teal-800 mt-3 text-base'>$1</h4>")
                      .replace(/## (.*?)/g, "<h3 class='font-bold text-teal-900 mt-4 text-lg border-b pb-1'>$1</h3>")
                      .replace(/# (.*?)/g, "<h2 class='font-black text-gray-900 mt-5 text-xl'>$1</h2>")
                      .replace(/- (.*?)/g, "<div class='pl-3 border-l-2 border-teal-500 my-1'>$1</div>")
                  }} 
                />
              </div>
            )}
            
            <div className="mt-6 border-t pt-4 flex justify-end">
              <button 
                onClick={() => setIsAiReportOpen(false)}
                className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg text-sm hover:bg-gray-800 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
