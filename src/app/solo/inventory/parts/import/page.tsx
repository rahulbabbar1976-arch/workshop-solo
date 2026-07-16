"use client";

import { useState, useRef } from "react";
import { ArrowLeft, UploadCloud, Camera, Loader2, Save, Trash2, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useImageCompressor } from "@/hooks/useImageCompressor";

type AIItem = {
  id: string; // temporary for UI
  partName: string;
  partNumber: string;
  quantity: number;
  purchasePrice: number;
  gstRate: number;
  hsnCode: string;
  sellingPrice: number;
};

export default function AIImportPage() {
  const router = useRouter();
  const { compressInBrowser, isCompressing } = useImageCompressor();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [items, setItems] = useState<AIItem[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setItems([]);

    try {
      // 1. Compress Image
      const compressed = await compressInBrowser(file);
      setImagePreview(compressed.dataUrl);

      // 2. Scan with AI
      setIsScanning(true);
      const res = await fetch("/api/inventory/parts/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: compressed.dataUrl,
          mimeType: "image/jpeg"
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Add unique IDs and calculate default selling price based on markup
      const parsedItems = (data.items || []).map((it: any) => {
        const cost = parseFloat(it.purchasePrice) || 0;
        const defaultSell = cost + (cost * markupPercent / 100);
        return {
          id: Math.random().toString(36).substr(2, 9),
          partName: it.partName || "",
          partNumber: it.partNumber || "",
          quantity: parseFloat(it.quantity) || 1,
          purchasePrice: cost,
          gstRate: parseFloat(it.gstRate) || 18,
          hsnCode: it.hsnCode || "",
          sellingPrice: Math.round(defaultSell)
        };
      });

      setItems(parsedItems);
    } catch (err: any) {
      setError(err.message || "Failed to scan image");
    } finally {
      setIsScanning(false);
    }
  };

  const applyGlobalMarkup = (markup: number) => {
    setMarkupPercent(markup);
    setItems(items.map(it => {
      const defaultSell = it.purchasePrice + (it.purchasePrice * markup / 100);
      return { ...it, sellingPrice: Math.round(defaultSell) };
    }));
  };

  const updateItem = (id: string, field: keyof AIItem, value: any) => {
    setItems(items.map(it => {
      if (it.id === id) {
        return { ...it, [field]: value };
      }
      return it;
    }));
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/inventory/parts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          supplierName,
          billNumber
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      alert(`Successfully saved ${data.count} items to inventory!`);
      router.push("/solo/inventory");
    } catch (err: any) {
      alert(err.message || "Failed to save to database");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="content bg-gray-50 min-h-screen pb-32">
      <div className="bg-white px-5 pt-8 pb-4 shadow-sm relative z-10 flex items-center border-b border-gray-200">
        <Link href="/solo/inventory" className="mr-3 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Bill Scanner</h1>
          <p className="text-gray-500 text-sm">Upload invoice to auto-fill inventory</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm shadow-sm">
            {error}
          </div>
        )}

        {!imagePreview && !isScanning && items.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mt-8 animate-in fade-in zoom-in-95">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-orange-100 text-orange-600 rounded-full">
                <UploadCloud className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Upload Purchase Bill</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
              Take a photo or upload an image of the supplier invoice. Gemini AI will extract the parts automatically.
            </p>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-sm hover:bg-gray-800 transition-colors flex items-center justify-center"
              >
                <Camera className="w-5 h-5 mr-2" /> Select Image / Take Photo
              </button>
            </div>
          </div>
        )}

        {(isCompressing || isScanning) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center mt-8">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900">
              {isCompressing ? "Compressing Image..." : "Analyzing with Gemini AI..."}
            </h2>
            <p className="text-sm text-gray-500 mt-2">Extracting line items and tax codes. Please wait.</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Supplier Name</label>
                  <input 
                    type="text" 
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Bill / Invoice No</label>
                  <input 
                    type="text" 
                    value={billNumber}
                    onChange={e => setBillNumber(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> Extracted Items ({items.length})
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 font-bold">Markup:</span>
                  <input 
                    type="number" 
                    value={markupPercent}
                    onChange={e => applyGlobalMarkup(parseFloat(e.target.value) || 0)}
                    className="w-16 p-1 text-center border border-gray-300 rounded text-sm font-bold text-orange-600"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 px-4 pb-4">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-t">
                    <tr>
                      <th className="px-2 py-3 font-bold">Part Name</th>
                      <th className="px-2 py-3 font-bold">HSN Code</th>
                      <th className="px-2 py-3 font-bold w-20">Qty</th>
                      <th className="px-2 py-3 font-bold w-24">Buy Price</th>
                      <th className="px-2 py-3 font-bold w-24">Sell Price</th>
                      <th className="px-2 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-2 py-2">
                          <input 
                            value={it.partName} 
                            onChange={e => updateItem(it.id, 'partName', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none font-medium text-gray-800"
                          />
                          <input 
                            value={it.partNumber} 
                            onChange={e => updateItem(it.id, 'partNumber', e.target.value)}
                            className="w-full bg-transparent text-xs text-gray-400 mt-1 outline-none"
                            placeholder="Part No (Opt)"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input 
                            value={it.hsnCode} 
                            onChange={e => updateItem(it.id, 'hsnCode', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none font-mono text-gray-600"
                            placeholder="HSN"
                          />
                          <div className="text-xs text-gray-400 mt-1">GST: {it.gstRate}%</div>
                        </td>
                        <td className="px-2 py-2">
                          <input 
                            type="number"
                            value={it.quantity} 
                            onChange={e => updateItem(it.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full p-1 border border-gray-200 rounded outline-none text-center"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input 
                            type="number"
                            value={it.purchasePrice} 
                            onChange={e => updateItem(it.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                            className="w-full p-1 border border-gray-200 rounded outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input 
                            type="number"
                            value={it.sellingPrice} 
                            onChange={e => updateItem(it.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            className="w-full p-1 border border-orange-200 bg-orange-50 text-orange-700 font-bold rounded outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button 
                            onClick={() => setItems(items.filter(i => i.id !== it.id))}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors flex items-center justify-center text-lg"
            >
              {isSaving ? "Saving Inventory..." : <><Save className="w-5 h-5 mr-2" /> Save {items.length} Items to Inventory</>}
            </button>
            <button 
              onClick={() => {
                setItems([]);
                setImagePreview(null);
              }}
              className="w-full py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors"
            >
              Cancel & Scan Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple icon component missing from lucide import
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
