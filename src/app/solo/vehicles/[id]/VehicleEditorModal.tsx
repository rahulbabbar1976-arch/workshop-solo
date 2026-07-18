"use client";

import { useState } from "react";
import { Edit, Save, X } from "lucide-react";
import { updateVehicleDetailsAction } from "./actions";
import { useRouter } from "next/navigation";

export default function VehicleEditorModal({ vehicle }: { vehicle: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    registrationNumberRaw: vehicle.registrationNumberRaw || "",
    manufacturer: vehicle.manufacturer || "",
    model: vehicle.model || "",
    manufactureYear: vehicle.manufactureYear || "",
    vin: vehicle.vin || "",
    color: vehicle.color || ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateVehicleDetailsAction(vehicle.id, formData);
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update vehicle.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="ml-auto text-xs bg-white text-gray-700 px-3 py-1 rounded-lg border border-gray-200 shadow-sm flex items-center hover:bg-gray-50 transition-colors"
      >
        <Edit className="w-3 h-3 mr-1" /> Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-50 px-5 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Edit Vehicle Details</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <div className="p-2 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                <input 
                  required
                  type="text" 
                  name="registrationNumberRaw" 
                  value={formData.registrationNumberRaw} 
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input 
                    type="text" 
                    name="manufacturer" 
                    value={formData.manufacturer} 
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input 
                    type="text" 
                    name="model" 
                    value={formData.model} 
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input 
                    type="text" 
                    name="manufactureYear" 
                    value={formData.manufactureYear} 
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input 
                    type="text" 
                    name="color" 
                    value={formData.color} 
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN / Chassis No</label>
                <input 
                  type="text" 
                  name="vin" 
                  value={formData.vin} 
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center">
                  <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
