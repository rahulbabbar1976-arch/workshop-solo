"use client";

import { useState } from "react";
import { Printer, Settings2, ChevronLeft } from "lucide-react";
import Link from "next/link";

type PrintSettings = {
  fontFamily: string;
  fontSize: string;
  showHeader: boolean;
  showFooter: boolean;
  showTax: boolean;
  showDiscount: boolean;
};

export function PrintLayoutClient({ jobCard }: { jobCard: any }) {
  const [settings, setSettings] = useState<PrintSettings>({
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    showHeader: true,
    showFooter: true,
    showTax: false,
    showDiscount: false,
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const totalParts = jobCard.parts.reduce((sum: number, p: any) => sum + ((p.quantityRequested || 0) * (p.sellingPrice || 0)), 0);
  const totalLabour = jobCard.labour.reduce((sum: number, l: any) => sum + ((l.quantity || 0) * (l.sellingPrice || 0)), 0);
  const grandTotal = totalParts + totalLabour;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      
      {/* Settings Panel - Hidden when printing */}
      <div className={`print:hidden bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ${isSettingsOpen ? 'w-full md:w-80 p-6' : 'w-0 overflow-hidden'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Print Settings</h2>
          <Link href={`/solo/jobcards/${jobCard.id}`} className="text-teal-600 hover:text-teal-800">
            <ChevronLeft className="w-5 h-5" /> Back
          </Link>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
            <select 
              value={settings.fontFamily}
              onChange={(e) => setSettings({...settings, fontFamily: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="Inter, sans-serif">Sans-Serif (Modern)</option>
              <option value="Merriweather, serif">Serif (Classic)</option>
              <option value="monospace">Monospace (Receipt)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
            <select 
              value={settings.fontSize}
              onChange={(e) => setSettings({...settings, fontSize: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="12px">Small</option>
              <option value="14px">Medium</option>
              <option value="16px">Large</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 uppercase">Visibility</h3>
            
            <label className="flex items-center">
              <input type="checkbox" checked={settings.showHeader} onChange={(e) => setSettings({...settings, showHeader: e.target.checked})} className="rounded text-teal-600" />
              <span className="ml-2 text-sm text-gray-700">Show Header (Company Details)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked={settings.showFooter} onChange={(e) => setSettings({...settings, showFooter: e.target.checked})} className="rounded text-teal-600" />
              <span className="ml-2 text-sm text-gray-700">Show Footer (Terms)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked={settings.showTax} onChange={(e) => setSettings({...settings, showTax: e.target.checked})} className="rounded text-teal-600" />
              <span className="ml-2 text-sm text-gray-700">Show Tax Columns</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked={settings.showDiscount} onChange={(e) => setSettings({...settings, showDiscount: e.target.checked})} className="rounded text-teal-600" />
              <span className="ml-2 text-sm text-gray-700">Show Discount Columns</span>
            </label>
          </div>

          <button 
            onClick={handlePrint}
            className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded shadow flex items-center justify-center transition-colors"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print Job Card
          </button>
        </div>
      </div>

      {/* Floating Settings Toggle Button (for Mobile) - Hidden when printing */}
      <div className="print:hidden absolute top-4 right-4 md:hidden z-10">
         <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white p-2 rounded-full shadow-md text-gray-700 border border-gray-200">
            <Settings2 className="w-5 h-5" />
         </button>
      </div>

      {/* Print Preview Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0 print:overflow-visible">
        <div 
          className="bg-white mx-auto shadow-xl print:shadow-none print:w-full max-w-4xl"
          style={{ 
            fontFamily: settings.fontFamily, 
            fontSize: settings.fontSize,
            minHeight: '11in',
            padding: '2rem'
          }}
        >
          {/* Document Header */}
          {settings.showHeader && (
            <div className="border-b-2 border-gray-800 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">BABBARSONS</h1>
                  <p className="text-gray-600 mt-1">Okhla Industrial Estate</p>
                  <p className="text-gray-600">New Delhi, Delhi 110020</p>
                  <p className="text-gray-600">Phone: +91 9811012345</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-teal-600 uppercase tracking-widest">Job Card</h2>
                  <p className="text-gray-800 font-semibold mt-2">No: {jobCard.jobcardNumber}</p>
                  <p className="text-gray-600">Date: {new Date(jobCard.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Customer & Vehicle Details */}
          <div className="flex flex-col sm:flex-row justify-between mb-8 gap-6">
            <div className="flex-1 bg-gray-50 p-4 rounded border border-gray-200 print:border-gray-300">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">Customer Details</h3>
              <p className="font-bold text-gray-900">{jobCard.customer?.displayName || 'Unknown Customer'}</p>
              <p className="text-gray-700">{jobCard.customer?.primaryMobile || 'No Contact'}</p>
              <p className="text-gray-700">{jobCard.customer?.addressLine1}</p>
            </div>
            
            <div className="flex-1 bg-gray-50 p-4 rounded border border-gray-200 print:border-gray-300">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">Vehicle Details</h3>
              <p className="font-bold text-gray-900 text-lg">{jobCard.vehicle?.registrationNumberRaw || jobCard.vehicle?.registrationNumberNormalized || 'Unknown Vehicle'}</p>
              <p className="text-gray-700">{jobCard.vehicle?.manufacturer} {jobCard.vehicle?.model}</p>
              <p className="text-gray-700">VIN: {jobCard.vehicle?.vin || 'N/A'}</p>
            </div>
          </div>

          {/* Complaints */}
          {jobCard.complaints?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-md font-bold text-gray-800 uppercase tracking-wider border-b-2 border-gray-800 pb-2 mb-4">Customer Complaints</h3>
              <ul className="list-disc pl-5 space-y-1">
                {jobCard.complaints.map((c: any) => (
                  <li key={c.id} className="text-gray-800">{c.customerComplaintText}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parts Section */}
          {jobCard.parts?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-md font-bold text-gray-800 uppercase tracking-wider border-b-2 border-gray-800 pb-2 mb-4">Parts & Materials</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-200">
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800">Part Description</th>
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-24">Qty</th>
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-32">Rate</th>
                    {settings.showTax && <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-24">Tax</th>}
                    {settings.showDiscount && <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-24">Disc</th>}
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCard.parts.map((p: any) => {
                    const amount = (p.quantityRequested || 0) * (p.sellingPrice || 0);
                    return (
                      <tr key={p.id} className="border-b border-gray-200">
                        <td className="py-2 px-3 border-x border-gray-300">{p.partName}</td>
                        <td className="py-2 px-3 border-x border-gray-300 text-right">{p.quantityRequested}</td>
                        <td className="py-2 px-3 border-x border-gray-300 text-right">{p.sellingPrice?.toFixed(2) || '0.00'}</td>
                        {settings.showTax && <td className="py-2 px-3 border-x border-gray-300 text-right">-</td>}
                        {settings.showDiscount && <td className="py-2 px-3 border-x border-gray-300 text-right">-</td>}
                        <td className="py-2 px-3 border-x border-gray-300 text-right font-medium">{amount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={settings.showTax && settings.showDiscount ? 5 : settings.showTax || settings.showDiscount ? 4 : 3} className="py-2 px-3 text-right font-bold border border-gray-300 bg-gray-50 print:bg-gray-100">Parts Total:</td>
                    <td className="py-2 px-3 text-right font-bold border border-gray-300 bg-gray-50 print:bg-gray-100">{totalParts.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Labour Section */}
          {jobCard.labour?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-md font-bold text-gray-800 uppercase tracking-wider border-b-2 border-gray-800 pb-2 mb-4">Labour Charges</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-200">
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800">Service Description</th>
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-24">Qty/Hrs</th>
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-32">Rate</th>
                    {settings.showTax && <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-24">Tax</th>}
                    {settings.showDiscount && <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-24">Disc</th>}
                    <th className="py-2 px-3 border border-gray-300 font-bold text-gray-800 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCard.labour.map((l: any) => {
                    const amount = (l.quantity || 0) * (l.sellingPrice || 0);
                    return (
                      <tr key={l.id} className="border-b border-gray-200">
                        <td className="py-2 px-3 border-x border-gray-300">{l.labourName}</td>
                        <td className="py-2 px-3 border-x border-gray-300 text-right">{l.quantity}</td>
                        <td className="py-2 px-3 border-x border-gray-300 text-right">{l.sellingPrice?.toFixed(2) || '0.00'}</td>
                        {settings.showTax && <td className="py-2 px-3 border-x border-gray-300 text-right">-</td>}
                        {settings.showDiscount && <td className="py-2 px-3 border-x border-gray-300 text-right">-</td>}
                        <td className="py-2 px-3 border-x border-gray-300 text-right font-medium">{amount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={settings.showTax && settings.showDiscount ? 5 : settings.showTax || settings.showDiscount ? 4 : 3} className="py-2 px-3 text-right font-bold border border-gray-300 bg-gray-50 print:bg-gray-100">Labour Total:</td>
                    <td className="py-2 px-3 text-right font-bold border border-gray-300 bg-gray-50 print:bg-gray-100">{totalLabour.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-end mb-12">
            <div className="w-64">
              <table className="w-full text-left">
                <tbody>
                  <tr>
                    <td className="py-2 text-gray-600 font-medium">Parts Total:</td>
                    <td className="py-2 text-right text-gray-800 font-medium">{totalParts.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b-2 border-gray-800">
                    <td className="py-2 text-gray-600 font-medium">Labour Total:</td>
                    <td className="py-2 text-right text-gray-800 font-medium">{totalLabour.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-gray-900 text-lg uppercase tracking-wider">Grand Total:</td>
                    <td className="py-3 text-right font-bold text-teal-700 text-xl">{grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Footer */}
          {settings.showFooter && (
            <div className="mt-16 pt-8 border-t-2 border-gray-200 flex justify-between">
              <div className="w-1/2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Terms & Conditions</h4>
                <p className="text-xs text-gray-600">1. Vehicles are parked at owner's risk.</p>
                <p className="text-xs text-gray-600">2. All disputes are subject to Delhi jurisdiction.</p>
                <p className="text-xs text-gray-600">3. Estimated costs are approximate and subject to change.</p>
              </div>
              <div className="w-1/3 text-center mt-12 border-t border-gray-400 pt-2">
                <p className="text-sm font-semibold text-gray-800">Authorized Signatory</p>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
