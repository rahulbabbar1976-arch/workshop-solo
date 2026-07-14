"use client";

import { useState, useEffect } from "react";
import { getPrintSettingsAction, savePrintSettingsAction } from "./actions";
import { Printer, Save, CheckCircle, AlertCircle, Layout, Type, Columns } from "lucide-react";

export default function PrintSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    printTemplate: "classic",
    showTaxByDefault: true,
    showDiscountByDefault: true,
    showPartsLabourSeparately: true,
    showCustomerDetails: true,
    showVehicleDetails: true,
    showSummary: true,
    showSignatureSection: true,
    defaultTerms: "",
    fontFamily: "Century Gothic",
    baseFontSize: "9pt",
    margins: "20px",
    showColPartNo: true,
    showColPartBrand: true,
    showColQty: true,
    showColRate: true,
    showColTaxRate: true,
    showColTotal: true,
    showColDiscount: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const { printSettings, docTemplate } = await getPrintSettingsAction();
        
        let margins = "20px";
        if (docTemplate?.layoutConfig) {
          try {
            const layout = JSON.parse(docTemplate.layoutConfig);
            if (layout.margins) margins = layout.margins;
          } catch(e) {}
        }

        setFormData({
          printTemplate: printSettings?.printTemplate || "classic",
          showTaxByDefault: printSettings?.showTaxByDefault ?? true,
          showDiscountByDefault: printSettings?.showDiscountByDefault ?? true,
          showPartsLabourSeparately: printSettings?.showPartsLabourSeparately ?? true,
          showCustomerDetails: printSettings?.showCustomerDetails ?? true,
          showVehicleDetails: printSettings?.showVehicleDetails ?? true,
          showSummary: printSettings?.showSummary ?? true,
          showSignatureSection: printSettings?.showSignatureSection ?? true,
          defaultTerms: printSettings?.defaultTerms || "",
          fontFamily: docTemplate?.fontFamily || "Century Gothic",
          baseFontSize: docTemplate?.baseFontSize || "9pt",
          margins,
          showColPartNo: printSettings?.showColPartNo ?? true,
          showColPartBrand: printSettings?.showColPartBrand ?? true,
          showColQty: printSettings?.showColQty ?? true,
          showColRate: printSettings?.showColRate ?? true,
          showColTaxRate: printSettings?.showColTaxRate ?? true,
          showColTotal: printSettings?.showColTotal ?? true,
          showColDiscount: printSettings?.showColDiscount ?? true,
        });
      } catch (e: any) {
        setMessage({ type: "error", text: "Failed to load print settings." });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await savePrintSettingsAction(formData);
      setMessage({ type: "success", text: "Print preferences saved successfully!" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Print Preferences...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800 text-lg flex items-center">
            <Printer className="w-5 h-5 mr-2 text-indigo-600" /> Print Preferences
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure exactly how your Estimates and Jobcards look when printed.</p>
        </div>
      </div>

      <div className="p-5">
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-start text-sm ${message.type === 'success' ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2 mt-0.5" /> : <AlertCircle className="w-4 h-4 mr-2 mt-0.5" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* General Formatting */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center"><Layout className="w-4 h-4 mr-1 text-gray-400" /> General Layout</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Print Template</label>
                <select name="printTemplate" value={formData.printTemplate} onChange={handleChange} className="w-full p-2 text-sm border rounded-lg">
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="minimalist">Minimalist</option>
                </select>
              </div>
              <div className="flex items-center mt-6">
                <input type="checkbox" id="showPartsLabourSeparately" name="showPartsLabourSeparately" checked={formData.showPartsLabourSeparately} onChange={handleChange} className="mr-2" />
                <label htmlFor="showPartsLabourSeparately" className="text-sm text-gray-700">Show Parts & Labour Separately</label>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Typography & Margins */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center"><Type className="w-4 h-4 mr-1 text-gray-400" /> Typography & Margins</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Font Family</label>
                <select name="fontFamily" value={formData.fontFamily} onChange={handleChange} className="w-full p-2 text-sm border rounded-lg">
                  <option value="Century Gothic">Century Gothic (Eco)</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Arial">Arial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Base Font Size</label>
                <select name="baseFontSize" value={formData.baseFontSize} onChange={handleChange} className="w-full p-2 text-sm border rounded-lg">
                  <option value="7pt">7pt</option>
                  <option value="8pt">8pt</option>
                  <option value="9pt">9pt</option>
                  <option value="10pt">10pt</option>
                  <option value="11pt">11pt</option>
                  <option value="12pt">12pt</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Page Margins</label>
                <select name="margins" value={formData.margins} onChange={handleChange} className="w-full p-2 text-sm border rounded-lg">
                  <option value="10px">Narrow (10px)</option>
                  <option value="20px">Normal (20px)</option>
                  <option value="40px">Wide (40px)</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Columns Config */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center"><Columns className="w-4 h-4 mr-1 text-gray-400" /> Visible Columns</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showColPartNo" checked={formData.showColPartNo} onChange={handleChange} className="mr-2" /> Part Number</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showColPartBrand" checked={formData.showColPartBrand} onChange={handleChange} className="mr-2" /> Brand/Make</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showColQty" checked={formData.showColQty} onChange={handleChange} className="mr-2" /> Quantity</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showColRate" checked={formData.showColRate} onChange={handleChange} className="mr-2" /> Rate (Price)</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showColTaxRate" checked={formData.showColTaxRate} onChange={handleChange} className="mr-2" /> Tax Rate</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showColDiscount" checked={formData.showColDiscount} onChange={handleChange} className="mr-2" /> Discount</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showColTotal" checked={formData.showColTotal} onChange={handleChange} className="mr-2" /> Total</label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Visibility Toggles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center"><Layout className="w-4 h-4 mr-1 text-gray-400" /> Section Visibility</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showCustomerDetails" checked={formData.showCustomerDetails} onChange={handleChange} className="mr-2" /> Show Customer Details</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showVehicleDetails" checked={formData.showVehicleDetails} onChange={handleChange} className="mr-2" /> Show Vehicle Details</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showSummary" checked={formData.showSummary} onChange={handleChange} className="mr-2" /> Show Financial Summary</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showSignatureSection" checked={formData.showSignatureSection} onChange={handleChange} className="mr-2" /> Show Signature Section</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showTaxByDefault" checked={formData.showTaxByDefault} onChange={handleChange} className="mr-2" /> Apply Tax By Default</label>
              <label className="flex items-center text-sm text-gray-700"><input type="checkbox" name="showDiscountByDefault" checked={formData.showDiscountByDefault} onChange={handleChange} className="mr-2" /> Apply Discount By Default</label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Terms */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Default Terms & Conditions</label>
            <textarea 
              name="defaultTerms" 
              value={formData.defaultTerms} 
              onChange={handleChange} 
              rows={4}
              placeholder="e.g. 1. Goods once sold will not be taken back."
              className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" disabled={saving} className="primary-btn m-0 flex items-center">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Print Preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
