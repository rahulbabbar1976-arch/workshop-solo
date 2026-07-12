"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, Printer, FileText, Image as ImageIcon, Settings2, FileSignature, Edit3, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PrintSettingsPage() {
  const [activeTab, setActiveTab] = useState<"jobcard" | "estimate" | "invoice">("jobcard");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [baseFontSize, setBaseFontSize] = useState("12px");
  const [primaryColor, setPrimaryColor] = useState("#0d9488"); // teal-600
  const [showLogo, setShowLogo] = useState(true);
  const [showTaxId, setShowTaxId] = useState(true);
  const [showWorkshopHeader, setShowWorkshopHeader] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Field toggles
  const [fields, setFields] = useState({
    partNo: true,
    brand: true,
    qty: true,
    rate: true,
    taxRate: true,
    discount: true,
    total: true,
  });

  // Photo toggles
  const [photos, setPhotos] = useState({
    intake: true,
    work: false,
    delivery: false,
  });

  const [footerText, setFooterText] = useState("Thank you for your business. All parts are subject to standard warranty.");

  useEffect(() => {
    loadSettings(activeTab.toUpperCase());
  }, [activeTab]);

  const loadSettings = async (docType: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/settings/print?documentType=${docType}`);
      const data = await res.json();
      if (data.template) {
        setFontFamily(data.template.fontFamily || "Inter");
        setBaseFontSize(data.template.baseFontSize || "12px");
        setPrimaryColor(data.template.primaryColor || "#0d9488");
        setShowLogo(data.template.showLogo ?? true);
        setShowWorkshopHeader(data.template.showWorkshopHeader ?? true);
        setFooterText(data.template.footerText || "");
        if (data.template.columnsConfig) {
          try {
            const cols = JSON.parse(data.template.columnsConfig);
            setShowWorkshopHeader(cols.showWorkshopHeader ?? true);
            setFields({
              partNo: cols.parts?.includes("partNo") ?? true,
              brand: cols.parts?.includes("brand") ?? true,
              qty: cols.parts?.includes("qty") ?? true,
              rate: cols.parts?.includes("rate") ?? true,
              taxRate: cols.parts?.includes("tax") ?? true,
              discount: cols.parts?.includes("discount") ?? true,
              total: cols.parts?.includes("total") ?? true,
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const columnsConfig = {
        showWorkshopHeader,
        labour: ["description", fields.qty ? "qty" : "", fields.rate ? "rate" : "", fields.taxRate ? "tax" : "", fields.discount ? "discount" : "", fields.total ? "total" : ""].filter(Boolean),
        parts: ["partName", fields.partNo ? "partNo" : "", fields.brand ? "brand" : "", fields.qty ? "qty" : "", fields.rate ? "rate" : "", fields.taxRate ? "tax" : "", fields.discount ? "discount" : "", fields.total ? "total" : ""].filter(Boolean)
      };

      await fetch(`/api/settings/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: activeTab.toUpperCase(),
          fontFamily,
          baseFontSize,
          primaryColor,
          showLogo,
          showWorkshopHeader,
          footerText,
          columnsConfig
        })
      });
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldToggle = (field: keyof typeof fields) => {
    setFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePhotoToggle = (field: keyof typeof photos) => {
    setPhotos(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-outfit">
      {/* Header */}
      <div className="bg-teal-500 px-4 pt-6 pb-6 shadow-md relative z-10 flex items-center justify-between">
        <Link href="/solo/settings" className="text-white p-2 -ml-2 hover:bg-teal-600 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold text-white uppercase tracking-wider">Print Templates</h1>
        <button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          className="text-white p-2 bg-teal-600 hover:bg-teal-700 rounded-full transition-colors disabled:opacity-50 flex items-center"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Controls Panel */}
        <div className="w-full lg:w-1/3 space-y-4">
          {/* Document Type Selector */}
          <div className="bg-white p-4 rounded-md shadow-sm border-t-4 border-teal-500">
            <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-teal-500" /> Document Type
            </h2>
            <div className="flex flex-col gap-2">
              {(["jobcard", "estimate", "invoice"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded border transition-colors ${
                    activeTab === tab ? "bg-teal-500 text-white border-teal-500" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border-t-4 border-amber-400">
            <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center">
              <Settings2 className="w-4 h-4 mr-2 text-amber-500" /> General Styling
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Font Family</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  <option value="Inter">Inter (Clean & Modern)</option>
                  <option value="Roboto">Roboto (Standard)</option>
                  <option value="serif">Times New Roman (Classic)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Base Font Size</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                  value={baseFontSize}
                  onChange={(e) => setBaseFontSize(e.target.value)}
                >
                  <option value="10px">Small (10px)</option>
                  <option value="12px">Medium (12px)</option>
                  <option value="14px">Large (14px)</option>
                  <option value="16px">Extra Large (16px)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Primary Brand Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-sm text-gray-800 uppercase"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showWorkshopHeader} 
                    onChange={(e) => setShowWorkshopHeader(e.target.checked)}
                    className="rounded text-teal-500 focus:ring-teal-500 h-4 w-4"
                  />
                  <span>Show Workshop Details in Header</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border-t-4 border-teal-500">
            <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-teal-500" /> Column Visibility
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(fields).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={value} 
                    onChange={() => handleFieldToggle(key as keyof typeof fields)}
                    className="rounded text-teal-500 focus:ring-teal-500 h-4 w-4"
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border-t-4 border-amber-400">
            <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center">
              <ImageIcon className="w-4 h-4 mr-2 text-amber-500" /> Photo Inclusions
            </h2>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={photos.intake} onChange={() => handlePhotoToggle('intake')} className="rounded text-teal-500 h-4 w-4" />
                <span>Intake Photos (Before)</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={photos.work} onChange={() => handlePhotoToggle('work')} className="rounded text-teal-500 h-4 w-4" />
                <span>Work in Progress Photos</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={photos.delivery} onChange={() => handlePhotoToggle('delivery')} className="rounded text-teal-500 h-4 w-4" />
                <span>Delivery Photos (After)</span>
              </label>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border-t-4 border-teal-500">
            <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center">
              <FileSignature className="w-4 h-4 mr-2 text-teal-500" /> Footer & Terms
            </h2>
            <textarea 
              className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-24"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Terms and conditions..."
            />
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="w-full lg:w-2/3 min-w-0">
          <div className="bg-gray-800 p-3 rounded-t-md flex justify-between items-center">
            <span className="text-white text-sm font-bold tracking-wider ml-2">PRINT PREVIEW</span>
            <button className="text-white bg-teal-500 hover:bg-teal-600 px-4 py-1.5 rounded text-sm font-bold flex items-center transition-colors">
              <Printer className="w-4 h-4 mr-2" /> PRINT
            </button>
          </div>
          
          {/* A4 Paper Mock */}
          <div className="bg-gray-200 p-4 lg:p-8 flex justify-start lg:justify-center items-start rounded-b-md overflow-x-auto min-h-[600px]">
            <style jsx global>{`
              @media print {
                @page { margin: 20mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            `}</style>
            <div 
              className="bg-white shadow-lg w-[210mm] min-w-[210mm] shrink-0 min-h-[297mm] transition-all duration-300"
              style={{ 
                padding: '20mm', // Standard 20mm industry print margins
                fontFamily: fontFamily === 'serif' ? 'Times New Roman, serif' : `"${fontFamily}", sans-serif` 
              }}
            >
              {/* Preview Content */}
              <div className="border-b-2 pb-4 mb-4 flex justify-between items-start" style={{ borderColor: primaryColor }}>
                <div>
                  {showWorkshopHeader && (
                    <>
                      <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>AUTOBOTS WORKSHOP</h1>
                      <p className="text-xs text-gray-600 mt-1">123 Service Lane, Auto City</p>
                      <p className="text-xs text-gray-600">Ph: +1 234 567 890</p>
                      {showTaxId && <p className="text-xs text-gray-600">Tax ID: 98-7654321</p>}
                    </>
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-black uppercase tracking-widest text-gray-200">
                    {activeTab === 'jobcard' ? 'JOBCARD' : activeTab === 'estimate' ? 'ESTIMATE' : 'INVOICE'}
                  </h2>
                  <p className="text-sm font-bold text-gray-800 mt-2"># {activeTab === 'jobcard' ? 'JC-2023-001' : activeTab === 'estimate' ? 'EST-2023-050' : 'INV-2023-099'}</p>
                  <p className="text-xs text-gray-500">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>Customer Details</h3>
                  <p className="text-sm font-bold text-gray-800">John Doe</p>
                  <p className="text-xs text-gray-600">+1 555-0198</p>
                  <p className="text-xs text-gray-600">john.doe@example.com</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>Vehicle Details</h3>
                  <p className="text-sm font-bold text-gray-800">Honda Civic (2020)</p>
                  <p className="text-xs text-gray-600">Reg: ABC-1234</p>
                  <p className="text-xs text-gray-600">Odometer: 45,000 km</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse mb-8">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: primaryColor }}>
                    <th className="py-2 text-xs font-bold uppercase text-gray-600">Item Description</th>
                    {fields.partNo && <th className="py-2 text-xs font-bold uppercase text-gray-600">Part No</th>}
                    {fields.brand && <th className="py-2 text-xs font-bold uppercase text-gray-600">Brand</th>}
                    {fields.qty && <th className="py-2 text-xs font-bold uppercase text-gray-600 text-center">Qty</th>}
                    {fields.rate && <th className="py-2 text-xs font-bold uppercase text-gray-600 text-right">Rate</th>}
                    {fields.discount && <th className="py-2 text-xs font-bold uppercase text-gray-600 text-right">Disc</th>}
                    {fields.taxRate && <th className="py-2 text-xs font-bold uppercase text-gray-600 text-right">Tax</th>}
                    {fields.total && <th className="py-2 text-xs font-bold uppercase text-gray-600 text-right">Total</th>}
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                  <tr className="border-b border-gray-100">
                    <td className="py-3">Synthetic Engine Oil 5W-30</td>
                    {fields.partNo && <td className="py-3 text-gray-500 text-xs">EO-5W30-4L</td>}
                    {fields.brand && <td className="py-3 text-gray-500 text-xs">Castrol</td>}
                    {fields.qty && <td className="py-3 text-center">1</td>}
                    {fields.rate && <td className="py-3 text-right">$45.00</td>}
                    {fields.discount && <td className="py-3 text-right">10%</td>}
                    {fields.taxRate && <td className="py-3 text-right">5%</td>}
                    {fields.total && <td className="py-3 text-right font-bold">$42.52</td>}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3">Oil Filter Replacement (Labour)</td>
                    {fields.partNo && <td className="py-3 text-gray-500 text-xs">-</td>}
                    {fields.brand && <td className="py-3 text-gray-500 text-xs">-</td>}
                    {fields.qty && <td className="py-3 text-center">1</td>}
                    {fields.rate && <td className="py-3 text-right">$20.00</td>}
                    {fields.discount && <td className="py-3 text-right">-</td>}
                    {fields.taxRate && <td className="py-3 text-right">5%</td>}
                    {fields.total && <td className="py-3 text-right font-bold">$21.00</td>}
                  </tr>
                </tbody>
              </table>

              {/* Totals Box */}
              <div className="flex justify-end mb-12">
                <div className="w-1/2 bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-bold">$65.00</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Total Discount</span>
                    <span className="font-bold text-green-600">-$4.50</span>
                  </div>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-gray-600">Tax Amount</span>
                    <span className="font-bold">$3.02</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2" style={{ color: primaryColor }}>
                    <span>Grand Total</span>
                    <span>$63.52</span>
                  </div>
                </div>
              </div>

              {/* Photos Section */}
              {(photos.intake || photos.work || photos.delivery) && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4 border-b pb-2" style={{ color: primaryColor }}>Vehicle Photos</h3>
                  <div className="flex gap-4">
                    {photos.intake && <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-bold">INTAKE</div>}
                    {photos.work && <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-bold">WORK</div>}
                    {photos.delivery && <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-bold">DELIVERY</div>}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-16 pt-8 border-t-2" style={{ borderColor: primaryColor }}>
                <p className="text-xs text-gray-500 whitespace-pre-line">{footerText}</p>
                <div className="flex justify-between mt-8">
                  <div className="text-center w-1/3">
                    <div className="border-b border-gray-400 h-8 mb-2"></div>
                    <p className="text-xs font-bold text-gray-700 uppercase">Customer Signature</p>
                  </div>
                  <div className="text-center w-1/3">
                    <div className="border-b border-gray-400 h-8 mb-2"></div>
                    <p className="text-xs font-bold text-gray-700 uppercase">Authorized Signatory</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
