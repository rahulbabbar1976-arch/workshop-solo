"use client";

import React, { useState, useRef } from "react";
import { ArrowLeft, UploadCloud, Camera, Loader2, Save, Trash2, Sparkles, ScanText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useImageCompressor } from "@/hooks/useImageCompressor";

type AIItem = {
  id: string;
  partName: string;
  partNumber: string;
  quantity: number;
  purchasePrice: number;
  gstRate: number;
  hsnCode: string;
  sellingPrice: number;
  serialNumbers?: string[];
};

function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function AIImportPage() {
  const router = useRouter();
  const { compressInBrowser, isCompressing } = useImageCompressor();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMethod, setScanMethod] = useState<string>("");
  const [items, setItems] = useState<AIItem[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(30);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Run Tesseract OCR on the image in the browser (completely free, no API key needed)
  const runTesseractOCR = async (dataUrl: string): Promise<string> => {
    setScanMethod("ocr");
    // @ts-ignore
    const tesseractMod = await import("tesseract.js");
    const Tesseract = tesseractMod.default || tesseractMod;
    const { data } = await Tesseract.recognize(dataUrl, "eng", {
      logger: () => {},
    });
    return data.text || "";
  };

  const processItems = (rawItems: any[]): AIItem[] => {
    return rawItems.map((it: any) => {
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
        sellingPrice: Math.round(defaultSell),
        serialNumbers: Array.isArray(it.serialNumbers) ? it.serialNumbers : [],
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setInfoMsg(null);
    setItems([]);
    setSupplierName("");
    setSupplierGstin("");
    setBillNumber("");
    setPaymentMode("Cash");
    setScanMethod("");

    try {
      // Step 1: Compress Image aggressively to get around ~100kb limit
      // using smaller dimensions and lower quality
      const compressed = await compressInBrowser(file, 800, 800, 0.6);
      setImagePreview(compressed.dataUrl);

      // Step 2: First try Gemini AI
      setIsScanning(true);
      setScanMethod("gemini");

      const res = await fetch("/api/inventory/parts/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: compressed.dataUrl,
          mimeType: "image/jpeg",
        }),
      });

      const data = await res.json();

      if (data.success && data.scanData) {
        // Gemini worked!
        setScanMethod(data.method || "gemini");
        setSupplierName(data.scanData.supplierName || "");
        setSupplierGstin(data.scanData.supplierGstin || "");
        setBillNumber(data.scanData.billNumber || "");
        setPaymentMode(data.scanData.paymentMode || "Cash");
        setItems(processItems(data.scanData.items || []));
        return;
      }

      // Step 3: Gemini failed or unavailable → fallback to Tesseract OCR
      if (data.fallbackToOCR || !data.success) {
        setInfoMsg("ℹ️ AI scan unavailable. Using free OCR scanner (accuracy may vary — please review items).");
        setScanMethod("ocr");

        const ocrText = await runTesseractOCR(compressed.dataUrl);

        if (!ocrText.trim()) {
          throw new Error("OCR could not read any text from the image. Please try a clearer photo.");
        }

        // Send OCR text to server for parsing
        const ocrRes = await fetch("/api/inventory/parts/ai-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ocrText }),
        });

        const ocrData = await ocrRes.json();
        if (ocrData.success && ocrData.scanData) {
          setSupplierName(ocrData.scanData.supplierName || "");
          setSupplierGstin(ocrData.scanData.supplierGstin || "");
          setBillNumber(ocrData.scanData.billNumber || "");
          setPaymentMode(ocrData.scanData.paymentMode || "Cash");
          setItems(processItems(ocrData.scanData.items || []));
        } else {
          throw new Error("Could not extract items from the invoice. Please check the image quality and try again.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to scan image");
    } finally {
      setIsScanning(false);
    }
  };

  const applyGlobalMarkup = (markup: number) => {
    setMarkupPercent(markup);
    setItems(items.map((it) => {
      const defaultSell = it.purchasePrice + (it.purchasePrice * markup / 100);
      return { ...it, sellingPrice: Math.round(defaultSell) };
    }));
  };

  const updateItem = (id: string, field: keyof AIItem, value: any) => {
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/inventory/parts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, supplierName, billNumber, supplierGstin, paymentMode }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert(`Successfully saved ${data.count} items to inventory! ${data.zohoSync ? 'Also uploaded to Zoho Books!' : ''}`);
      router.push("/solo/inventory/parts");
    } catch (err: any) {
      alert(err.message || "Failed to save to database");
    } finally {
      setIsSaving(false);
    }
  };

  const getScanLabel = () => {
    if (isCompressing) return "Compressing Image...";
    if (scanMethod === "ocr") return "Running Free OCR Scanner...";
    return "Analyzing with Gemini AI...";
  };

  const getMethodBadge = () => {
    if (scanMethod.includes("gemini")) return { icon: <Sparkles className="w-3 h-3 mr-1" />, label: "Gemini AI", color: "bg-blue-100 text-blue-700" };
    if (scanMethod === "ocr") return { icon: <ScanText className="w-3 h-3 mr-1" />, label: "OCR Scanner", color: "bg-purple-100 text-purple-700" };
    return null;
  };

  const badge = getMethodBadge();

  return (
    <div className="content bg-gray-50 min-h-screen pb-32">
      <div className="bg-white px-5 pt-8 pb-4 shadow-sm relative z-10 flex items-center border-b border-gray-200">
        <Link href="/solo/inventory/parts" className="mr-3 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bill Scanner</h1>
          <p className="text-gray-500 text-sm">AI-powered or free OCR invoice scanning</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm shadow-sm">
            {error}
          </div>
        )}

        {infoMsg && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-blue-700 text-sm shadow-sm">
            {infoMsg}
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
            <p className="text-sm text-gray-500 mb-2 max-w-xs mx-auto">
              Take a photo or upload an image of the supplier invoice. Parts will be extracted automatically.
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 mb-8">
              <span className="flex items-center"><Sparkles className="w-3 h-3 mr-1 text-blue-500" /> Gemini AI (if configured)</span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center"><ScanText className="w-3 h-3 mr-1 text-purple-500" /> Free OCR fallback</span>
            </div>
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
            <h2 className="text-lg font-bold text-gray-900">{getScanLabel()}</h2>
            <p className="text-sm text-gray-500 mt-2">Extracting line items and tax codes. Please wait.</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Invoice & Supplier Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Supplier Name</label>
                  <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder="e.g. Bosch Car Parts" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Supplier GSTIN</label>
                  <input type="text" value={supplierGstin} onChange={(e) => setSupplierGstin(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder="e.g. 07AAAAA1111A1Z1" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Bill / Invoice No</label>
                  <input type="text" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder="e.g. INV-10293" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Payment Mode</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-sm">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit">Credit</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> Extracted Items ({items.length})
                  {badge && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center ${badge.color}`}>
                      {badge.icon}{badge.label}
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 font-bold">Markup:</span>
                  <input type="number" value={markupPercent} onChange={(e) => applyGlobalMarkup(parseFloat(e.target.value) || 0)} className="w-16 p-1 text-center border border-gray-300 rounded text-sm font-bold text-orange-600" />
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
                      <React.Fragment key={it.id}>
                        <tr className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-2 py-2">
                          <input value={it.partName} onChange={(e) => updateItem(it.id, "partName", e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none font-medium text-gray-800" />
                          <input value={it.partNumber} onChange={(e) => updateItem(it.id, "partNumber", e.target.value)} className="w-full bg-transparent text-xs text-gray-400 mt-1 outline-none" placeholder="Part No (Opt)" />
                        </td>
                        <td className="px-2 py-2">
                          <input value={it.hsnCode} onChange={(e) => updateItem(it.id, "hsnCode", e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none font-mono text-gray-600" placeholder="HSN" />
                          <div className="text-xs text-gray-400 mt-1">GST: {it.gstRate}%</div>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.quantity} onChange={(e) => updateItem(it.id, "quantity", parseFloat(e.target.value) || 0)} className="w-full p-1 border border-gray-200 rounded outline-none text-center" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.purchasePrice} onChange={(e) => updateItem(it.id, "purchasePrice", parseFloat(e.target.value) || 0)} className="w-full p-1 border border-gray-200 rounded outline-none" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.sellingPrice} onChange={(e) => updateItem(it.id, "sellingPrice", parseFloat(e.target.value) || 0)} className="w-full p-1 border border-orange-200 bg-orange-50 text-orange-700 font-bold rounded outline-none" />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => setItems(items.filter((i) => i.id !== it.id))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {it.serialNumbers !== undefined && (
                        <tr key={`${it.id}-sn`} className="border-b bg-gray-50/50">
                          <td colSpan={6} className="px-2 pb-3 pt-1">
                            <div className="flex flex-col space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Serial Numbers (Optional)</label>
                              <input 
                                value={it.serialNumbers.join(", ")} 
                                onChange={(e) => updateItem(it.id, "serialNumbers", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
                                placeholder="Comma separated serial numbers"
                                className="w-full text-sm p-1.5 border border-gray-200 rounded focus:ring-2 focus:ring-orange-500 outline-none" 
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors flex items-center justify-center text-lg">
              {isSaving ? "Saving Inventory..." : <><Save className="w-5 h-5 mr-2" /> Save {items.length} Items to Inventory</>}
            </button>
            <button onClick={() => { setItems([]); setImagePreview(null); setInfoMsg(null); }} className="w-full py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors">
              Cancel & Scan Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
