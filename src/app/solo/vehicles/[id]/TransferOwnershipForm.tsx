"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Search, CheckCircle } from "lucide-react";
import { transferVehicleOwnershipAction } from "../actions";

export default function TransferOwnershipForm({ vehicleId, currentCustomerId }: { vehicleId: string, currentCustomerId: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [success, setSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    setSelectedCustomer(null);
    setShowDropdown(true);

    if (val.length >= 2) {
      setSearching(true);
      try {
        const res = await fetch(`/api/customers?q=${val}`);
        const data = await res.json();
        if (data.success && data.customers) {
          // Exclude the current customer from results
          setSearchResults(data.customers.filter((c: any) => c.id !== currentCustomerId));
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        console.error("Error searching customers", e);
        setSearchResults([]);
      }
      setSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleTransfer = async () => {
    if (!selectedCustomer) return;
    
    const confirmTransfer = window.confirm(`Are you sure you want to transfer this vehicle to ${selectedCustomer.displayName}?`);
    if (!confirmTransfer) return;

    setLoading(true);
    try {
      await transferVehicleOwnershipAction(vehicleId, selectedCustomer.id);
      setSuccess(true);
      setSearchTerm("");
      setSelectedCustomer(null);
    } catch (e: any) {
      alert("Failed to transfer: " + e.message);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 text-teal-800 flex items-start">
        <CheckCircle className="w-5 h-5 mr-3 shrink-0" />
        <div>
          <p className="font-bold">Transfer Successful!</p>
          <p className="text-sm mt-1">The vehicle is now owned by the selected customer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
      <h3 className="font-bold text-gray-800 mb-3">Transfer Ownership</h3>
      <p className="text-sm text-gray-500 mb-4">Search for an existing customer to transfer this vehicle to.</p>
      
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by name or mobile..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded focus:border-orange-500 font-medium text-gray-800 focus:ring-0"
            />
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse text-amber-500 text-xs font-bold">...</span>}
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && searchTerm.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto">
            {searchResults.length > 0 ? (
              <ul>
                {searchResults.map((c, i) => (
                  <li 
                    key={i} 
                    className="px-4 py-3 hover:bg-orange-50 border-b border-gray-100 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setSearchTerm(`${c.displayName} (${c.primaryMobile || 'No Mobile'})`);
                      setShowDropdown(false);
                    }}
                  >
                    <div className="font-bold text-gray-800">{c.displayName}</div>
                    <div className="text-sm text-gray-500 mt-1">{c.primaryMobile || "No mobile"}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                {searching ? "Searching..." : "No matching customers found."}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleTransfer}
        disabled={!selectedCustomer || loading}
        className="w-full mt-4 py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-lg uppercase tracking-wider disabled:opacity-50 transition-colors flex justify-center items-center"
      >
        {loading ? "Processing..." : "Transfer Vehicle"} <ArrowRight className="w-5 h-5 ml-2" />
      </button>
    </div>
  );
}
