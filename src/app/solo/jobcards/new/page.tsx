"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Car, User, FileText, CheckCircle, ArrowLeft, Mic, MicOff, Wrench, ThermometerSnowflake, Droplets, BatteryWarning, Volume2, Lightbulb, Camera, Save, ArrowRight, Contact } from "lucide-react";
import Link from "next/link";
import { useContactPicker } from "@/hooks/useContactPicker";
import { useSaveContact } from "@/hooks/useSaveContact";

export default function SoloNewJobcardPage() {
  const router = useRouter();
  const { isSupported: contactsSupported, pickContact } = useContactPicker();
  const { saveContact } = useSaveContact();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
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

  // Mock Database for auto-population
  const mockDB = {
    "MH01AB1234": {
      make: "Hyundai", model: "i20", year: "2018", color: "White",
      customerName: "John Doe", mobile: "9876543210", address: "Mumbai, Bandra",
    }
  };

  const handleRegSearch = (val: string) => {
    setFormData({...formData, regNo: val.toUpperCase()});
    if (val.length >= 4) {
      const match = mockDB[val.toUpperCase() as keyof typeof mockDB];
      if (match) {
        setFormData(prev => ({...prev, ...match, regNo: val.toUpperCase()}));
      }
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/solo/jobcards/JC-1005");
    }, 1500);
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
    <div className="flex flex-col min-h-screen bg-gray-100 pb-24 font-[Outfit]">
      {/* Flat Teal Header */}
      <div className="bg-teal-500 px-4 py-4 shadow-md flex items-center sticky top-0 z-30 text-white">
        <Link href={step === 1 ? "/solo/dashboard" : "#"} onClick={(e) => { if (step > 1) { e.preventDefault(); setStep(step - 1); } }} className="mr-3 p-2 -ml-2 hover:bg-teal-600 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold uppercase tracking-wider">New Job Card</h1>
      </div>

      <div className="flex-1 px-4 py-6 max-w-md w-full mx-auto">
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
              <h2 className="text-lg font-bold text-teal-600 border-b-2 border-teal-500 pb-2 mb-4 uppercase">Identity & Vehicle</h2>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Reg No / Phone <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-teal-500 font-bold text-gray-800 uppercase"
                  placeholder="Enter Reg or Phone to Auto-fill"
                  value={formData.regNo}
                  onChange={(e) => handleRegSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Name</label>
                    {contactsSupported && (
                      <button 
                        type="button" 
                        onClick={handleImportContact}
                        className="text-teal-600 hover:text-teal-700 text-xs font-bold flex items-center"
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
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-teal-500 text-sm font-semibold" value={formData.customerName} onChange={e=>setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mt-[18px]">Mobile Number</label>
                  <input type="tel" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-teal-500 text-sm font-semibold" value={formData.mobile} onChange={e=>setFormData({...formData, mobile: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Make</label>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-teal-500 text-sm font-semibold" value={formData.make} onChange={e=>setFormData({...formData, make: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Model</label>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-teal-500 text-sm font-semibold" value={formData.model} onChange={e=>setFormData({...formData, model: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Year</label>
                  <input type="text" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-teal-500 text-sm font-semibold" value={formData.year} onChange={e=>setFormData({...formData, year: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Odometer</label>
                  <input type="number" className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded focus:border-teal-500 text-sm font-semibold" value={formData.odometer} onChange={e=>setFormData({...formData, odometer: e.target.value})} />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={formData.regNo.length < 4}
                className="w-full py-4 mt-4 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded flex justify-center items-center uppercase tracking-wider disabled:opacity-50"
              >
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2: COMPLAINTS & VOICE */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-bold text-teal-600 border-b-2 border-teal-500 pb-2 mb-4 uppercase">Complaints</h2>
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Quick Select</label>
                <div className="grid grid-cols-4 gap-2">
                  {quickIcons.map((q, idx) => (
                    <div key={idx} onClick={() => addQuickComplaint(q.text)} className="flex flex-col items-center justify-center p-2 bg-gray-50 border-2 border-gray-100 rounded cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors text-center">
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
                     className={`flex items-center px-3 py-1 rounded-full text-xs font-bold ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-teal-100 text-teal-700'}`}
                   >
                     {isRecording ? <><MicOff className="w-3 h-3 mr-1"/> Stop</> : <><Mic className="w-3 h-3 mr-1"/> Speak (Eng/Local)</>}
                   </button>
                </div>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-teal-500 h-28 resize-none font-medium text-gray-800"
                  placeholder="Type or use mic to capture complaints..."
                  value={formData.complaint}
                  onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                ></textarea>
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Audio/Text Observations (Optional)</label>
                <div className="relative">
                  <input type="text" className="w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-200 rounded focus:border-teal-500 text-sm font-semibold" placeholder="Add observations..." value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})} />
                  <Mic className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 cursor-pointer hover:text-teal-500" />
                </div>
              </div>
              
              <div className="pt-2">
                 <button className="w-full py-3 bg-gray-100 text-gray-600 border-2 border-gray-200 border-dashed rounded font-bold flex justify-center items-center hover:bg-gray-200">
                    <Camera className="w-5 h-5 mr-2" /> Capture Vehicle Pictures
                 </button>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full py-4 mt-2 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded flex justify-center items-center uppercase tracking-wider"
              >
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}

          {/* STEP 3: ESTIMATE & SAVE */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-bold text-teal-600 border-b-2 border-teal-500 pb-2 mb-4 uppercase">Estimate & Finalize</h2>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Expected Delivery Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-teal-500 font-bold text-gray-800"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Approx Estimate Amount (₹)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded focus:ring-0 focus:border-teal-500 font-bold text-gray-800"
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
                   className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded flex justify-center items-center uppercase tracking-wider"
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
        </div>
      </div>
    </div>
  );
}
