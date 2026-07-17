"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, FileText, CheckCircle2, AlertCircle, RefreshCw, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export default function SupplierBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory/parts/bills");
      const data = await res.json();
      if (data.success) {
        setBills(data.bills || []);
      }
    } catch (e) {
      console.error("Error fetching bills:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToZoho = async (billId: string) => {
    setSyncingId(billId);
    try {
      const res = await fetch("/api/inventory/parts/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Bill and Payment successfully pushed to Zoho Books!");
        fetchBills();
      } else {
        alert(data.error || "Failed to push to Zoho Books");
      }
    } catch (err: any) {
      alert("Error pushing to Zoho: " + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this bill record locally? (Stock count will remain unchanged)")) return;
    try {
      const res = await fetch(`/api/inventory/parts/bills/${billId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setBills(bills.filter(b => b.id !== billId));
      } else {
        alert(data.error || "Failed to delete bill");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedBillId(expandedBillId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-outfit">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-150">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <div className="flex items-center space-x-3">
            <Link href="/solo/inventory/parts" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-orange-500" /> Scanned Invoices
            </h1>
          </div>
          <button 
            onClick={fetchBills}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            title="Refresh List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {isLoading ? (
          <p className="text-center text-gray-500 py-10 font-medium flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-teal-600 mr-2" /> Loading scanned invoices...
          </p>
        ) : bills.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-150">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">No scanned invoices saved yet</p>
            <p className="text-xs text-gray-400 mt-1">Use the AI Bill Scanner to scan and upload new invoices.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => {
              const isExpanded = expandedBillId === bill.id;
              const isSynced = bill.zohoSyncStatus === "synced";
              const isSyncing = syncingId === bill.id;

              return (
                <div key={bill.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
                  <div className="p-4 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-800 text-base">{bill.supplierName}</span>
                        {isSynced ? (
                          <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Zoho Synced
                          </span>
                        ) : (
                          <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" /> Draft / Local
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        <span>Invoice No: <strong>{bill.billNumber}</strong></span>
                        <span className="mx-2">•</span>
                        <span>Date: {new Date(bill.billDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {bill.supplierGstin && <span>Supplier GSTIN: {bill.supplierGstin}</span>}
                        {bill.supplierGstin && <span className="mx-2">•</span>}
                        <span>Paid via {bill.paymentMode}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-3">
                      <span className="text-lg font-black text-gray-800">
                        ₹{bill.totalAmount.toFixed(2)}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleExpand(bill.id)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                          title="View Items"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        {!isSynced && (
                          <button
                            onClick={() => handlePushToZoho(bill.id)}
                            disabled={isSyncing}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
                            title="Push to Zoho Books"
                          >
                            {isSyncing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"
                          title="Delete Bill locally"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Items Details */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-150 p-4 space-y-2 animate-in slide-in-from-top-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Invoice line items:</h4>
                      {bill.items.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0 text-xs">
                          <div>
                            <p className="font-bold text-gray-800">{item.partMaster?.partName || 'Spare Part'}</p>
                            <p className="text-[10px] text-gray-400">
                              Qty: {item.quantityBought} × ₹{item.purchasePrice} 
                              {item.partMaster?.hsnCode && ` (HSN: ${item.partMaster.hsnCode})`}
                            </p>
                          </div>
                          <span className="font-bold text-gray-700">
                            ₹{((item.quantityBought || 1) * (item.purchasePrice || 0)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
