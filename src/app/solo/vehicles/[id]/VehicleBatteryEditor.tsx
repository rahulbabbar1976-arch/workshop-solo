"use client";

import { useState } from "react";
import { Battery, Edit2, Check, X } from "lucide-react";
import { updateVehicleBatteryAction } from "./actions";

export default function VehicleBatteryEditor({ vehicle }: { vehicle: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [make, setMake] = useState(vehicle.batteryMake || "");
  const [serial, setSerial] = useState(vehicle.batterySerialNumber || "");
  const [warranty, setWarranty] = useState(vehicle.batteryWarrantyMonths?.toString() || "");
  const [installDate, setInstallDate] = useState(
    vehicle.batteryInstallationDate ? new Date(vehicle.batteryInstallationDate).toISOString().split('T')[0] : ""
  );

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateVehicleBatteryAction(vehicle.id, {
        batteryMake: make,
        batterySerialNumber: serial,
        batteryWarrantyMonths: warranty ? parseInt(warranty) : null,
        batteryInstallationDate: installDate ? new Date(installDate) : null
      });
      setIsEditing(false);
    } catch (err) {
      alert("Failed to save battery details.");
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-6 relative">
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-orange-500 transition-colors"
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3 flex items-center">
          <Battery className="w-5 h-5 mr-2 text-gray-400" /> Battery Details
        </h2>
        
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mt-3">
          <div>
            <p className="text-gray-500 font-medium">Make</p>
            <p className="font-bold text-gray-800">{vehicle.batteryMake || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Serial Number</p>
            <p className="font-bold text-gray-800">{vehicle.batterySerialNumber || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Install Date</p>
            <p className="font-bold text-gray-800">{vehicle.batteryInstallationDate ? new Date(vehicle.batteryInstallationDate).toLocaleDateString() : "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Warranty</p>
            <p className="font-bold text-gray-800">{vehicle.batteryWarrantyMonths ? `${vehicle.batteryWarrantyMonths} months` : "N/A"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-5 mt-6">
      <div className="flex justify-between items-center border-b border-orange-200 pb-2 mb-3">
        <h2 className="font-bold text-orange-800 flex items-center">
          <Battery className="w-5 h-5 mr-2" /> Edit Battery
        </h2>
        <button 
          onClick={() => setIsEditing(false)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
          <input 
            type="text" 
            value={make} 
            onChange={e => setMake(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
            placeholder="e.g. Amaron, Exide"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
          <input 
            type="text" 
            value={serial} 
            onChange={e => setSerial(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Install Date</label>
            <input 
              type="date" 
              value={installDate} 
              onChange={e => setInstallDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (Months)</label>
            <input 
              type="number" 
              value={warranty} 
              onChange={e => setWarranty(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
            />
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg mt-2 flex items-center justify-center transition-colors"
        >
          {loading ? "Saving..." : <><Check className="w-4 h-4 mr-2" /> Save Details</>}
        </button>
      </div>
    </div>
  );
}
