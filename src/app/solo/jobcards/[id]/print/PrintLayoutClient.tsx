"use client";

import { useState } from "react";
import { Printer, Settings2, ChevronLeft } from "lucide-react";
import Link from "next/link";

export function PrintLayoutClient({ jobCard }: { jobCard: any }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (d: string | Date | null) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
  };

  const calcRow = (item: any) => {
    const qty = item.quantityRequested || item.quantity || 0;
    const netUnitPrice = item.sellingPrice || 0; // The price stored in DB
    const discPercent = item.discountType === 'percent' ? (item.discountValue || 0) : 0;
    const taxPercent = item.taxRate || 0;
    
    // Reverse engineer the sum without discount if we assume netUnitPrice is the discounted price
    // Wait, let's assume netUnitPrice in DB is the "Net unit pr." 
    const grossSumWithoutTax = netUnitPrice * qty;
    
    // If there is a discount %, original sum = grossSumWithoutTax / (1 - discPercent/100)
    let sumWithoutDisc = grossSumWithoutTax;
    if (discPercent > 0 && discPercent < 100) {
      sumWithoutDisc = grossSumWithoutTax / (1 - (discPercent / 100));
    } else if (discPercent === 100) {
       // If 100% discount, the netUnitPrice would be 0, so we can't reverse engineer easily unless we had original price.
       // We'll just show 0 for sumWithoutDisc if it's 100% discounted and sellingPrice is 0.
       sumWithoutDisc = 0; 
    }

    const grDiscSum = sumWithoutDisc - grossSumWithoutTax;
    const unitTax = netUnitPrice * (taxPercent / 100);
    const grossSum = grossSumWithoutTax + (unitTax * qty);

    return {
      qty,
      discPercent,
      taxPercent,
      netUnitPrice,
      unitTax,
      sumWithoutDisc,
      grDiscSum,
      grossSum
    };
  };

  let totalServicesWithoutDisc = 0;
  let totalServicesDisc = 0;
  let totalServicesGross = 0;

  const services = (jobCard.labourLines || []).map((l: any, i: number) => {
    const calc = calcRow(l);
    totalServicesWithoutDisc += calc.sumWithoutDisc;
    totalServicesDisc += calc.grDiscSum;
    totalServicesGross += calc.grossSum;
    return { ...l, index: i + 1, calc, name: l.labourName };
  });

  let totalProductsWithoutDisc = 0;
  let totalProductsDisc = 0;
  let totalProductsGross = 0;

  const products = (jobCard.partLines || []).map((p: any, i: number) => {
    const calc = calcRow(p);
    totalProductsWithoutDisc += calc.sumWithoutDisc;
    totalProductsDisc += calc.grDiscSum;
    totalProductsGross += calc.grossSum;
    return { ...p, index: i + 1, calc, name: p.partName };
  });

  const grandGrossSum = totalServicesGross + totalProductsGross;
  const grandNetSum = grandGrossSum; // Since we are assuming tax is 0 or included in gross sum for the summary row. Let's separate it properly if needed.
  
  // Tax aggregation
  let totalTaxSum = 0;
  services.forEach((s: any) => totalTaxSum += (s.calc.unitTax * s.calc.qty));
  products.forEach((p: any) => totalTaxSum += (p.calc.unitTax * p.calc.qty));

  const totalNetSum = grandGrossSum - totalTaxSum;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Settings Panel - Hidden when printing */}
      <div className={`print:hidden bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ${isSettingsOpen ? 'w-full md:w-64 p-6' : 'w-0 overflow-hidden'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Print Options</h2>
          <Link href={`/solo/jobcards/${jobCard.id}`} className="text-teal-600 hover:text-teal-800">
             <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>
        <button 
          onClick={handlePrint}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded shadow flex items-center justify-center transition-colors"
        >
          <Printer className="w-5 h-5 mr-2" /> Print
        </button>
      </div>

      <div className="print:hidden absolute top-4 right-4 md:hidden z-10">
         <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white p-2 rounded-full shadow-md text-gray-700 border border-gray-200">
            <Settings2 className="w-5 h-5" />
         </button>
      </div>

      {/* Print Preview Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0 print:overflow-visible flex justify-center">
        <div className="bg-white shadow-xl print:shadow-none print:w-full w-full max-w-4xl text-black" style={{ fontFamily: 'Arial, sans-serif', padding: '1cm 1.5cm' }}>
          
          {/* Header */}
          <div className="text-center italic font-bold text-lg border-b border-black pb-1 mb-2">JOB CARD</div>

          {/* Customer */}
          <div className="mb-2">
            <div className="font-bold italic text-sm">CUSTOMER</div>
            <div className="font-bold italic text-base">{jobCard.customer?.displayName || 'Unknown Customer'}</div>
          </div>

          <table className="w-full text-xs border-y border-black mb-4">
            <thead>
              <tr className="italic font-bold">
                <td className="py-1 w-1/3">Creation time</td>
                <td className="py-1 w-1/3 text-center">Completion deadline</td>
                <td className="py-1 w-1/3 text-right">Completion time</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">{formatDate(jobCard.createdAt)}</td>
                <td className="py-1 text-center"></td>
                <td className="py-1 text-right"></td>
              </tr>
            </tbody>
          </table>

          {/* Auto */}
          <div className="mb-4 text-xs">
            <div className="font-bold italic mb-1">AUTO</div>
            <div className="flex justify-between">
              <div>LPN: &nbsp;&nbsp;&nbsp;{jobCard.vehicle?.registrationNumberRaw}</div>
              <div>Next oil change dist.: {jobCard.vehicle?.nextOilChangeDistance || 0} Km</div>
            </div>
            <div>Model: &nbsp;{jobCard.vehicle?.model || ''}</div>
          </div>

          {/* Services */}
          <div className="font-bold italic text-sm mb-1">SERVICES</div>
          <table className="w-full text-xs mb-2">
            <thead>
              <tr className="italic border-b border-black font-bold">
                <td className="text-left w-6">Id</td>
                <td className="text-left">Name</td>
                <td className="text-center w-10">Code</td>
                <td className="text-right w-12">Quant.</td>
                <td className="text-left w-8 pl-1">Unit</td>
                <td className="text-right w-12">Disc.</td>
                <td className="text-right w-12">Tax r.</td>
                <td className="text-right w-20">Net unit pr.</td>
                <td className="text-right w-16">Unit tax</td>
                <td className="text-right w-24">Sum without disc.</td>
                <td className="text-right w-20">Gr.disc.sum.</td>
                <td className="text-right w-20">Gross sum</td>
                <td className="text-left w-8 pl-1">Cur.</td>
              </tr>
            </thead>
            <tbody>
              {services.map((s: any) => (
                <tr key={s.id}>
                  <td className="text-right pr-2">{s.index}</td>
                  <td className="text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{s.name}</td>
                  <td className="text-center"></td>
                  <td className="text-right">{s.calc.qty}</td>
                  <td className="text-left pl-1">pcs</td>
                  <td className="text-right">{s.calc.discPercent > 0 ? `${s.calc.discPercent.toFixed(1)}%` : '0.0%'}</td>
                  <td className="text-right">{s.calc.taxPercent.toFixed(1)}%</td>
                  <td className="text-right">{s.calc.netUnitPrice.toFixed(2)}</td>
                  <td className="text-right">{s.calc.unitTax.toFixed(2)}</td>
                  <td className="text-right">{s.calc.sumWithoutDisc.toFixed(2)}</td>
                  <td className="text-right">{s.calc.grDiscSum.toFixed(2)}</td>
                  <td className="text-right">{s.calc.grossSum.toFixed(2)}</td>
                  <td className="text-left pl-1">INR</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black">
                <td colSpan={9} className="text-left">Sum:</td>
                <td className="text-right">{totalServicesWithoutDisc.toFixed(2)}</td>
                <td className="text-right">{totalServicesDisc.toFixed(2)}</td>
                <td className="text-right">{totalServicesGross.toFixed(2)}</td>
                <td className="text-left pl-1">INR</td>
              </tr>
            </tfoot>
          </table>

          {/* Products */}
          <div className="font-bold italic text-sm mt-4 mb-1">PRODUCTS</div>
          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="italic border-b border-black font-bold">
                <td className="text-left w-6">Id</td>
                <td className="text-left">Name</td>
                <td className="text-center w-10">Code</td>
                <td className="text-right w-12">Quant.</td>
                <td className="text-left w-8 pl-1">Unit</td>
                <td className="text-right w-12">Disc.</td>
                <td className="text-right w-12">Tax r.</td>
                <td className="text-right w-20">Net unit pr.</td>
                <td className="text-right w-16">Unit tax</td>
                <td className="text-right w-24">Gross sum</td>
                <td className="text-left w-8 pl-1">Cur.</td>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id}>
                  <td className="text-right pr-2">{p.index}</td>
                  <td className="text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{p.name}</td>
                  <td className="text-center"></td>
                  <td className="text-right">{p.calc.qty}</td>
                  <td className="text-left pl-1">pcs</td>
                  <td className="text-right">{p.calc.discPercent > 0 ? `${p.calc.discPercent.toFixed(1)}%` : '0.0%'}</td>
                  <td className="text-right">{p.calc.taxPercent.toFixed(1)}%</td>
                  <td className="text-right">{p.calc.netUnitPrice.toFixed(2)}</td>
                  <td className="text-right">{p.calc.unitTax.toFixed(2)}</td>
                  <td className="text-right">{p.calc.grossSum.toFixed(2)}</td>
                  <td className="text-left pl-1">INR</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black">
                <td colSpan={9} className="text-left">Sum:</td>
                <td className="text-right">{totalProductsGross.toFixed(2)}</td>
                <td className="text-left pl-1">INR</td>
              </tr>
            </tfoot>
          </table>

          {/* SUM */}
          <div className="font-bold italic text-sm mb-1 mt-6">SUM</div>
          <table className="w-full text-xs mb-1">
            <thead>
              <tr className="italic border-b border-black font-bold">
                <td className="text-center w-1/4">Tax rate</td>
                <td className="text-center w-1/4">Net sum</td>
                <td className="text-center w-1/4">Tax sum</td>
                <td className="text-center w-1/4">Gross sum</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center">0.0%</td>
                <td className="text-center">{totalNetSum.toFixed(2)} INR</td>
                <td className="text-center">{totalTaxSum.toFixed(2)} INR</td>
                <td className="text-center">{grandGrossSum.toFixed(2)} INR</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-black">
                <td className="text-right font-normal">Sum:</td>
                <td className="text-center">{totalNetSum.toFixed(2)} INR</td>
                <td className="text-center">{totalTaxSum.toFixed(2)} INR</td>
                <td className="text-center">{grandGrossSum.toFixed(2)} INR</td>
              </tr>
              <tr className="border-b border-black">
                <td colSpan={3} className="text-left font-bold italic text-sm py-1">To be paid:</td>
                <td className="text-center font-bold italic text-sm py-1">{grandGrossSum.toFixed(2)} INR</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer branding */}
          <div className="mt-16 text-center text-[10px] text-gray-500">
             Created with JobCard 2.9.4.9 | Home page: https://JobcardsSystems.com
          </div>
        </div>
      </div>
    </div>
  );
}
