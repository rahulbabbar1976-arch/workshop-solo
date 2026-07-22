"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Car, User, FileText, CheckCircle, ArrowLeft, Mic, MicOff, Wrench, ThermometerSnowflake, Droplets, BatteryWarning, Volume2, Lightbulb, Camera, Save, ArrowRight, Contact, Loader2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useContactPicker } from "@/hooks/useContactPicker";
import { useSaveContact } from "@/hooks/useSaveContact";
import { searchVehicleAction, createJobCardAction, ensureVehicleAction } from "@/app/actions/jobcardActions";
import { compressInBrowser } from "@/hooks/useImageCompressor";
import { ImageOff, ZoomIn, Trash2, X } from "lucide-react";

const QUOTA_BYTES = 1048576; // 1MB

export default function SoloNewJobcardPage() {
  const router = useRouter();
  const { isSupported: contactsSupported, pickContact } = useContactPicker();
  const { saveContact } = useSaveContact();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [mode, setMode] = useState<'jobcard' | 'booking'>('jobcard');
  const [employees, setEmployees] = useState<any[]>([]);
  const [bookingData, setBookingData] = useState({
    scheduledDate: "",
    scheduledTime: "",
    serviceType: "Drive In", // Drive In or Pick Up
    pickupEmployeeId: "",
  });

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => { if(d.success) setEmployees(d.users.filter((u: any) => u.isActive)); });
  }, []);

  // Vehicle photo store (identical to JobCardDetailClient)
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([]);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    regNo: "",
    make: "",
    model: "",
    year: "",
    color: "",
    odometer: "",
    customerName: "",
    mobile: "",
    address: "",
    driverName: "",
    driverMobile: "",
    complaint: "",
    observations: "",
    deliveryTime: "",
    approxEstimate: "",
    nextServiceDueKm: "",
    nextOilChangeKm: "",
    pollutionSafeDate: "",
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomerVehicles, setSelectedCustomerVehicles] = useState<any[] | null>(null);
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

  const handleRegSearch = async (val: string) => {
    setSearchQuery(val);
    // Don't auto-set regNo until a selection is made or they move on
    setFormData({...formData, regNo: val.toUpperCase().replace(/\s+/g, '')});
    setShowDropdown(true);
    
    if (val.length >= 2) { 
      setSearching(true);
      try {
        const [vehRes, custRes] = await Promise.all([
          fetch(`/api/vehicles?q=${encodeURIComponent(val)}`),
          fetch(`/api/customers?q=${encodeURIComponent(val)}`)
        ]);
        
        const vehData = await vehRes.json();
        const custData = await custRes.json();
        
        const combined: any[] = [];
        if (vehData.success && vehData.vehicles) {
          vehData.vehicles.forEach((v: any) => combined.push({ ...v, searchType: 'vehicle' }));
        }
        if (custData.success && custData.customers) {
          custData.customers.forEach((c: any) => combined.push({ ...c, searchType: 'customer' }));
        }
        setSearchResults(combined);
      } catch(e) {
        console.error("Error searching", e);
        setSearchResults([]);
      }
      setSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    if (item.searchType === 'customer') {
      setFormData(prev => ({
        ...prev,
        regNo: "",
        make: "",
        model: "",
        year: "",
        color: "",
        odometer: "",
        customerName: item.displayName || prev.customerName,
        mobile: item.primaryMobile || prev.mobile,
        address: item.addressLine1 || prev.address
      }));
      setSelectedCustomerVehicles(item.vehicles || []);
    } else {
      // Vehicle
      setFormData(prev => ({
        ...prev,
        regNo: item.registrationNumberRaw || item.registrationNumberNormalized,
        make: item.manufacturer || prev.make,
        model: item.model || prev.model,
        year: item.manufactureYear?.toString() || prev.year,
        color: item.color || prev.color,
        odometer: item.currentOdometer?.toString() || prev.odometer,
        customerName: item.currentCustomer?.displayName || prev.customerName,
        mobile: item.currentCustomer?.primaryMobile || prev.mobile,
        address: item.currentCustomer?.addressLine1 || prev.address
      }));
      setSelectedCustomerVehicles(null);
    }
    setShowDropdown(false);
  };

  const handleSaveToContacts = async () => {
    if (!formData.customerName) {
      alert("Please enter a customer name first.");
      return;
    }
    const success = await saveContact({
      name: formData.customerName,
      phone: formData.mobile,
    });
    if (success) {
      alert("Contact saved successfully!");
    } else {
      alert("Failed to save contact. Please try again.");
    }
  };

  // Mock Speech to Text using Web Speech API if available
  const handleMicToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    
    setIsRecording(true);
    // Setup native SpeechRecognition if browser supports it
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // Can be dynamic based on settings

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setFormData(prev => ({ 
          ...prev, 
          complaint: prev.complaint ? prev.complaint + " " + text : text 
        }));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } else {
      // Fallback if API not supported
      setTimeout(() => {
        setFormData(prev => ({ ...prev, complaint: prev.complaint + " (Voice dictated: Engine making noise) " }));
        setIsRecording(false);
      }, 2000);
    }
  };

  const addQuickComplaint = (text: string) => {
    setFormData(prev => ({ 
      ...prev, 
      complaint: prev.complaint ? prev.complaint + ", " + text : text 
    }));
  };

  const quickIcons = [
    { icon: <Wrench className="w-5 h-5" />, label: "Service", text: "General Service" },
    { icon: <Droplets className="w-5 h-5 text-amber-500" />, label: "Oil Leak", text: "Oil Leakage" },
    { icon: <Volume2 className="w-5 h-5 text-red-500" />, label: "Brake Noise", text: "Brake Noise" },
    { icon: <ThermometerSnowflake className="w-5 h-5 text-blue-500" />, label: "AC Not Cool", text: "AC Not Cooling" },
    { icon: <ThermometerSnowflake className="w-5 h-5 text-blue-400" />, label: "AC Service", text: "AC Servicing" },
    { icon: <BatteryWarning className="w-5 h-5 text-orange-500" />, label: "Battery", text: "Battery Issue" },
    { icon: <Lightbulb className="w-5 h-5 text-yellow-500" />, label: "Lights", text: "Lights not working" },
    { icon: <Volume2 className="w-5 h-5 text-slate-500" />, label: "Horn", text: "Horn not working" },
  ];

  const handleNextStep1 = async () => {
    if (mode === 'jobcard' && formData.regNo.length < 4) return;
    if (mode === 'booking' && !formData.customerName) {
      alert("Customer Name is required to schedule an appointment.");
      return;
    }
    
    setIsSavingVehicle(true);
    try {
      const data = new FormData();
      data.append("regNo", formData.regNo);
      data.append("customerName", formData.customerName);
      data.append("mobile", formData.mobile);
      data.append("address", formData.address);
      data.append("make", formData.make);
      data.append("model", formData.model);
      data.append("year", formData.year);
      data.append("odometer", formData.odometer);
      
      const res = await ensureVehicleAction(data);
      if (res.success && res.vehicleId) {
        setVehicleId(res.vehicleId);
        
        // Fetch existing photos for this vehicle if any
        try {
          setPhotosLoaded(false);
          const pRes = await fetch(`/api/vehicles/${res.vehicleId}/photos`);
          const pData = await pRes.json();
          if (pData.success) {
            setVehiclePhotos(pData.photos || []);
            setQuotaUsed(pData.quota?.usedBytes || 0);
          }
        } catch (e) {
          console.error("Failed to fetch vehicle photos", e);
        } finally {
          setPhotosLoaded(true);
        }
        
        setStep(2);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save vehicle details.");
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile || !vehicleId) return;

    setIsUploading(true);
    try {
      let fileToUpload: File | Blob = originalFile;
      let filename = originalFile.name || 'photo.jpg';

      try {
        const compressed = await compressInBrowser(originalFile);
        fileToUpload = compressed.blob;
        filename = filename.replace(/\.[^.]+$/, '.jpg');
      } catch (err) {
        console.warn('Client compression failed:', err);
      }

      const form = new FormData();
      form.append('file', fileToUpload, filename);
      form.append('phase', 'intake');
      form.append('captureLabel', 'vehicle');

      const res = await fetch(`/api/vehicles/${vehicleId}/photos`, { method: 'POST', body: form });
      const data = await res.json();

      if (data.success) {
        setVehiclePhotos(prev => [data.photo, ...prev]);
        setQuotaUsed(data.quota?.usedBytes || 0);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error: any) {
      console.error('Error uploading vehicle photo:', error);
      alert("Network error: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!vehicleId) return;
    if (!confirm("Are you sure you want to manually delete this photo?")) return;
    
    setDeletingId(photoId);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      });
      const data = await res.json();
      if (data.success) {
        setVehiclePhotos(prev => prev.filter(p => p.id !== photoId));
        setQuotaUsed(data.quota?.usedBytes || 0);
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    
    if (mode === 'jobcard') {
      const data = new FormData();
      data.append("regNo", formData.regNo);
      data.append("customerName", formData.customerName);
      data.append("mobile", formData.mobile);
      data.append("address", formData.address);
      data.append("make", formData.make);
      data.append("model", formData.model);
      data.append("year", formData.year);
      data.append("odometer", formData.odometer);
      data.append("complaint", formData.complaint);
      data.append("observations", formData.observations);
      
      try {
        const res = await createJobCardAction(data);
        if (res.success) {
          alert(`Job Card ${res.jobCardId} created successfully!`);
          router.push("/solo/dashboard");
        }
      } catch(e) {
        console.error(e);
        alert("Failed to create job card.");
      }
    } else {
      // Booking Mode
      if (!bookingData.scheduledDate || !bookingData.scheduledTime) {
        alert("Please provide a date and time for the appointment.");
        setLoading(false);
        return;
      }

      const dateTime = new Date(`${bookingData.scheduledDate}T${bookingData.scheduledTime}`);
      
      const payload = {
        customerName: formData.customerName,
        customerPhone: formData.mobile,
        customerAddress: formData.address,
        vehicleRegNo: formData.regNo,
        vehicleManufacturer: formData.make,
        vehicleModel: formData.model,
        scheduledDate: dateTime.toISOString(),
        pickupEmployeeId: bookingData.serviceType === 'Pick Up' ? bookingData.pickupEmployeeId : null,
        notes: bookingData.serviceType,
        complaints: formData.complaint,
        observations: formData.observations,
      };

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          const emp = employees.find(e => e.id === bookingData.pickupEmployeeId);
          let waText = `Hello ${formData.customerName}, your appointment is confirmed for ${new Date(dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`;
          if (bookingData.serviceType === 'Pick Up' && emp) {
            waText += ` Our staff member ${emp.fullName} will pick up your vehicle.`;
          }
          
          if (confirm("Appointment scheduled successfully! Open WhatsApp to send confirmation?")) {
            const url = `https://wa.me/${formData.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`;
            window.open(url, '_blank');
          }
          router.push("/solo/dashboard");
        } else {
          alert("Failed to create booking: " + data.error);
        }
      } catch (e) {
        alert("Error saving booking");
      }
    }
    setLoading(false);
  };

  const handleImportContact = async () => {
    const contact = await pickContact();
    if (contact) {
      setFormData(prev => ({
        ...prev,
        customerName: contact.name || prev.customerName,
        mobile: contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : prev.mobile,
      }));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-24 font-outfit">
      {/* Flat Teal Header */}
      <div className="bg-gray-900 px-4 py-4 shadow-md flex items-center justify-between sticky top-0 z-30 text-white">
        <div className="flex items-center">
          <Link href={step === 1 ? "/solo/dashboard" : "#"} onClick={(e) => { if (step > 1) { e.preventDefault(); setStep(step - 1); } }} className="mr-3 p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold uppercase tracking-wider">{mode === 'jobcard' ? 'New Job Card' : 'Schedule Appt'}</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-md w-full mx-auto">
        {/* Mode Toggle */}
        {step === 1 && (
          <div className="flex bg-gray-200 p-1 rounded-lg mb-6 shadow-sm">
            <button 
              onClick={() => setMode('jobcard')}
              className={`flex-1 py-2 text-sm font-bold uppercase rounded-md transition-colors ${mode === 'jobcard' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Start Job
            </button>
            <button 
              onClick={() => setMode('booking')}
              className={`flex-1 py-2 text-sm font-bold uppercase rounded-md transition-colors ${mode === 'booking' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Book Appt
            </button>
          </div>
        )}

        {/* Flat Step Indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((num) => (
             <div key={num} className={`flex-1 h-2 mx-1 rounded-sm ${step >= num ? 'bg-amber-400' : 'bg-gray-300'}`}></div>
          ))}
        </div>

        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-5 overflow-hidden">
          
          {/* STEP 1: VEHICLE & CUSTOMER */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-4 uppercase">Identity & Vehicle</h2>
              
              <div className="space-y-1" ref={dropdownRef}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Search Name, Phone, or Reg No {mode === 'jobcard' && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-2 relative">
                  <input 
                    type="text" 
                    placeholder="Enter Name, Phone, or Reg No" 
                    value={searchQuery || formData.regNo}
                    onChange={(e) => handleRegSearch(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                    className="w-full p-4 border-2 border-gray-200 rounded focus:border-orange-500 font-bold text-gray-800 uppercase focus:ring-0"
                  />
                  {searching && <span className="absolute right-4 top-4 animate-pulse text-amber-500 font-bold text-sm">Searching...</span>}
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown && searchQuery.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <ul>
                          {searchResults.map((item, i) => (
                            <li 
                              key={i} 
                              className="px-4 py-3 hover:bg-orange-50 border-b border-gray-100 cursor-pointer transition-colors"
                              onClick={() => handleSelectSearchResult(item)}
                            >
                              {item.searchType === 'customer' ? (
                                <div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-800 flex items-center">
                                      👤 {item.displayName}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 rounded text-blue-600">Customer</span>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {item.primaryMobile ? `${item.primaryMobile}` : "No Mobile"}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-800 flex items-center">
                                      🚘 {item.registrationNumberNormalized || item.registrationNumberRaw}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">{item.manufacturer} {item.model}</span>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {item.currentCustomer?.displayName || "No Owner"} {item.currentCustomer?.primaryMobile ? `• ${item.currentCustomer.primaryMobile}` : ""}
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-gray-500">
                          {searching ? "Searching database..." : (
                            <div>
                              No match found. <br />
                              <span className="font-bold text-orange-500 mt-1 inline-block">Will create as new.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Vehicles Selector */}
              {selectedCustomerVehicles !== null && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-md animate-in fade-in duration-300">
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
                    Select Vehicle for {formData.customerName}
                  </label>
                  {selectedCustomerVehicles.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomerVehicles.map((v, i) => (
                        <div 
                          key={i}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              regNo: v.registrationNumberRaw || v.registrationNumberNormalized,
                              make: v.manufacturer || prev.make,
                              model: v.model || prev.model,
                              year: v.manufactureYear?.toString() || prev.year,
                              color: v.color || prev.color,
                              odometer: v.currentOdometer?.toString() || prev.odometer,
                            }));
                            setSelectedCustomerVehicles(null);
                          }}
                          className="p-2 bg-white border border-blue-200 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-100 transition-colors flex justify-between items-center"
                        >
                          <span className="font-bold text-gray-800">{v.registrationNumberNormalized || v.registrationNumberRaw}</span>
                          <span className="text-sm text-gray-600">{v.manufacturer} {v.model}</span>
                        </div>
                      ))}
                      <div 
                        onClick={() => {
                          setSelectedCustomerVehicles(null);
                        }}
                        className="p-2 border border-dashed border-gray-400 rounded text-center text-sm font-bold text-gray-600 cursor-pointer hover:border-orange-500 hover:text-orange-500 transition-colors"
                      >
                        + Add New Vehicle
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      No existing vehicles found. Type registration above to create one.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Name</label>
                    {contactsSupported && (
                      <button 
                        type="button" 
                        onClick={handleImportContact}
                        className="text-orange-500 hover:text-orange-600 text-xs font-bold flex items-center"
                        title="Import from Contacts"
                      >
                        <Contact className="w-3 h-3 mr-1" /> Import
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={handleSaveToContacts}
                      className="text-amber-600 hover:text-amber-700 text-xs font-bold flex items-center ml-2"
                      title="Save to Phone Contacts"
                    >
                      <Save className="w-3 h-3 mr-1" /> Save
                    </button>
                  </div>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.customerName} onChange={e=>setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mt-[18px]">Mobile Number</label>
                  <input type="tel" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.mobile} onChange={e=>setFormData({...formData, mobile: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Driver Name</label>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.driverName} onChange={e=>setFormData({...formData, driverName: e.target.value})} placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Driver Mobile</label>
                  <input type="tel" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.driverMobile} onChange={e=>setFormData({...formData, driverMobile: e.target.value})} placeholder="Optional" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Make</label>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.make} onChange={e=>setFormData({...formData, make: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Model</label>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.model} onChange={e=>setFormData({...formData, model: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Year</label>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.year} onChange={e=>setFormData({...formData, year: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Odometer</label>
                  <input type="number" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" value={formData.odometer} onChange={e=>setFormData({...formData, odometer: e.target.value})} />
                </div>
              </div>

              <button
                onClick={handleNextStep1}
                disabled={(mode === 'jobcard' && formData.regNo.length < 4) || isSavingVehicle || (mode === 'booking' && !formData.customerName)}
                className="w-full py-4 mt-4 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded flex justify-center items-center uppercase tracking-wider disabled:opacity-50"
              >
                {isSavingVehicle ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next <ArrowRight className="w-5 h-5 ml-2" /></>}
              </button>
            </div>
          )}

          {/* STEP 2: COMPLAINTS & VOICE */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-4 uppercase">Complaints</h2>
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Quick Select</label>
                <div className="grid grid-cols-4 gap-2">
                  {quickIcons.map((q, idx) => (
                    <div key={idx} onClick={() => addQuickComplaint(q.text)} className="flex flex-col items-center justify-center p-2 bg-gray-50 border-2 border-gray-100 rounded cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors text-center">
                      <div className="mb-1">{q.icon}</div>
                      <span className="text-[10px] font-bold text-gray-600 leading-tight">{q.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Detailed Complaint</label>
                   <button 
                     onClick={handleMicToggle}
                     className={`flex items-center px-3 py-1 rounded-full text-xs font-bold ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-100 text-orange-600'}`}
                   >
                     {isRecording ? <><MicOff className="w-3 h-3 mr-1"/> Stop</> : <><Mic className="w-3 h-3 mr-1"/> Speak (Eng/Local)</>}
                   </button>
                </div>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-orange-500 h-28 resize-none font-medium text-gray-800"
                  placeholder="Type or use mic to capture complaints..."
                  value={formData.complaint}
                  onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                ></textarea>
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Audio/Text Observations (Optional)</label>
                <div className="relative">
                  <input type="text" className="w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 text-sm font-semibold" placeholder="Add observations..." value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})} />
                  <Mic className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 cursor-pointer hover:text-orange-500" />
                </div>
              </div>
              
              <div className="pt-2">
                 <input 
                   type="file" 
                   accept="image/*" 
                   capture="environment"
                   className="hidden" 
                   ref={fileInputRef}
                   onChange={handleFileUpload}
                 />
                 <input 
                   type="file" 
                   accept="image/*" 
                   className="hidden" 
                   ref={galleryInputRef}
                   onChange={handleFileUpload}
                 />

            {/* Quota bar */}
            {(() => {
              const pct     = Math.min(100, Math.round((quotaUsed / QUOTA_BYTES) * 100));
              const usedKB  = Math.round(quotaUsed / 1024);
              const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-teal-500';
              return (
                <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vehicle Photo Storage</span>
                    <span className={`text-xs font-bold ${pct >= 90 ? 'text-red-500' : 'text-gray-600'}`}>
                      {usedKB} KB / 1024 KB ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Max 100 KB/photo · 1 MB total · oldest auto-removed when full</p>
                </div>
              );
            })()}
                 
                 <button 
                   onClick={(e) => { e.preventDefault(); setIsPhotoModalOpen(true); }}
                   disabled={isUploading}
                   className="w-full py-5 bg-white border-2 border-dashed border-orange-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex flex-col items-center justify-center text-sm uppercase tracking-wide"
                 >
                    {isUploading ? <Loader2 className="w-7 h-7 mb-1.5 animate-spin" /> : <Camera className="w-7 h-7 mb-1.5" />}
                    {isUploading ? "Compressing & Saving..." : "Take / Upload Photo"}
                 </button>

            {/* Gallery grid */}
            {!photosLoaded ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : vehiclePhotos.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400">
                <ImageOff className="w-10 h-10 mb-2" />
                <p className="text-sm">No photos yet for this vehicle</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {vehiclePhotos.map((p: any) => (
                  <div key={p.id} className="relative group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={p.fileUrl}
                      alt={p.captureLabel || 'Vehicle photo'}
                      className="w-full h-36 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                      onClick={() => setLightboxUrl(p.fileUrl)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 bg-white">
                      <div>
                        {p.captureLabel && <span className="text-xs font-semibold text-gray-600 capitalize">{p.captureLabel}</span>}
                        <p className="text-xs text-gray-400">{Math.round(p.fileSizeBytes / 1024)} KB</p>
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDeletePhoto(p.id); }}
                        disabled={deletingId === p.id}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full py-4 mt-2 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded flex justify-center items-center uppercase tracking-wider"
              >
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}

          {/* STEP 3: FINAL DETAILS */}
          {step === 3 && mode === 'jobcard' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-4 uppercase">Estimate & Finalize</h2>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Expected Delivery Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-orange-500 font-bold text-gray-800"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Approx Estimate Amount (₹)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-orange-500 font-bold text-gray-800"
                  placeholder="e.g. 5000"
                  value={formData.approxEstimate}
                  onChange={(e) => setFormData({ ...formData, approxEstimate: e.target.value })}
                />
              </div>
              
              <div className="bg-amber-50 p-3 rounded border border-amber-200 text-xs font-medium text-amber-800 mb-4 flex items-start">
                 <CheckCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-amber-500" />
                 <span>This estimate will be shared with the customer on WhatsApp upon saving.</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                 <button
                   onClick={handleSubmit}
                   className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded flex justify-center items-center uppercase tracking-wider"
                 >
                   Save <Save className="w-4 h-4 ml-2" />
                 </button>
                 <button
                   onClick={handleSubmit}
                   className="w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded flex justify-center items-center uppercase tracking-wider"
                 >
                   Share <ArrowRight className="w-4 h-4 ml-2" />
                 </button>
              </div>
            </div>
          )}

          {step === 3 && mode === 'booking' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-4 uppercase">Appointment Details</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-orange-500 font-bold text-gray-800"
                    value={bookingData.scheduledDate}
                    onChange={(e) => setBookingData({ ...bookingData, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-orange-500 font-bold text-gray-800"
                    value={bookingData.scheduledTime}
                    onChange={(e) => setBookingData({ ...bookingData, scheduledTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1 mt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Service Type</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-orange-500 font-bold text-gray-800"
                  value={bookingData.serviceType}
                  onChange={(e) => setBookingData({ ...bookingData, serviceType: e.target.value })}
                >
                  <option value="Drive In">Drive In</option>
                  <option value="Pick Up">Pick Up & Drop</option>
                </select>
              </div>

              {bookingData.serviceType === 'Pick Up' && (
                <div className="space-y-1 mt-4 animate-in fade-in">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Assign Pickup Staff</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-orange-500 font-bold text-gray-800"
                    value={bookingData.pickupEmployeeId}
                    onChange={(e) => setBookingData({ ...bookingData, pickupEmployeeId: e.target.value })}
                  >
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.team || 'Staff'})</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded flex justify-center items-center uppercase tracking-wider shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm Appointment <CheckCircle className="w-5 h-5 ml-2" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Photo Selection Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center"><Camera className="w-5 h-5 mr-2 text-orange-500"/> Add Photo</h3>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={(e) => { e.preventDefault(); setIsPhotoModalOpen(false); fileInputRef.current?.click(); }}
                className="py-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all flex flex-col items-center justify-center text-sm">
                <Camera className="w-8 h-8 mb-2" />
                Camera
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); setIsPhotoModalOpen(false); galleryInputRef.current?.click(); }}
                className="py-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 transition-all flex flex-col items-center justify-center text-sm">
                <UploadCloud className="w-8 h-8 mb-2" />
                Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={lightboxUrl} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

    </div>
  );
}
