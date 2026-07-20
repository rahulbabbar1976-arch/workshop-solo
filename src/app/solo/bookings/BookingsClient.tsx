'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Clock, MapPin, User, ArrowRight, Loader2, Search, X, CheckCircle2 } from 'lucide-react';
import { formatDate } from "@/lib/dateUtils";

export default function BookingsClient() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    vehicleId: '',
    vehicleManufacturer: '',
    vehicleModel: '',
    vehicleRegNo: '',
    scheduledDate: '',
    pickupEmployeeId: '',
    dropEmployeeId: '',
    notes: ''
  });

  // Typeahead state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBookings();
    fetchEmployees();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchVehicles(searchQuery);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success) {
      setEmployees(data.users);
    }
  };

  const searchVehicles = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/vehicles/scan?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.vehicles || []);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVehicle = (v: any) => {
    setFormData({
      ...formData,
      vehicleId: v.id,
      vehicleRegNo: v.registrationNumberRaw,
      vehicleManufacturer: v.manufacturer || '',
      vehicleModel: v.model || '',
      customerId: v.currentCustomerId || '',
      customerName: v.currentCustomer?.displayName || '',
      customerPhone: v.currentCustomer?.primaryMobile || '',
      customerAddress: v.currentCustomer?.addressLine1 || '',
    });
    setSearchQuery(v.registrationNumberRaw);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.scheduledDate) return alert("Customer Name and Scheduled Date are required");
    
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.success) {
      setShowModal(false);
      setFormData({
        customerId: '', customerName: '', customerPhone: '', customerAddress: '',
        vehicleId: '', vehicleManufacturer: '', vehicleModel: '', vehicleRegNo: '',
        scheduledDate: '', pickupEmployeeId: '', dropEmployeeId: '', notes: ''
      });
      setSearchQuery("");
      fetchBookings();
    } else {
      alert(data.error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchBookings();
  };

  const generateWhatsAppLink = (booking: any, employee: any, type: string) => {
    if (!employee || !employee.mobile) return '#';
    const message = `Hello ${employee.fullName}, you have a new ${type} assignment for vehicle ${booking.vehicleRegNo || 'Unknown'}. Customer: ${booking.customerName}, ${booking.customerPhone || ''}. Address: ${booking.customerAddress || 'N/A'}. Scheduled at: ${new Date(booking.scheduledDate).toLocaleString()}`;
    return `https://wa.me/${employee.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-24 font-outfit">
      {/* Flat Teal Header */}
      <div className="bg-gray-900 px-4 pt-6 pb-6 shadow-md flex justify-between items-center sticky top-0 z-30 text-white">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Appointments</h1>
          <p className="text-gray-400 font-semibold text-sm">Schedule and assignments</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-2xl shadow-lg transition-colors flex items-center justify-center"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
           <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No appointments scheduled</p>
          </div>
        ) : (
          bookings.map(booking => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`px-4 py-3 border-b border-gray-100 flex justify-between items-center ${booking.status === 'Pending' ? 'bg-amber-50' : booking.status === 'Confirmed' ? 'bg-blue-50' : booking.status === 'Completed' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${booking.status === 'Pending' ? 'bg-amber-500' : booking.status === 'Confirmed' ? 'bg-blue-500' : booking.status === 'Completed' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="font-bold text-sm tracking-wide text-gray-800 uppercase">{booking.status}</span>
                </div>
                <div className="text-xs font-bold text-gray-500 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {formatDate(booking.scheduledDate)} {new Date(booking.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{booking.customerName}</h3>
                    <p className="text-sm font-semibold text-gray-500 flex items-center mt-1"><User className="w-3.5 h-3.5 mr-1" /> {booking.customerPhone || 'No Phone'}</p>
                  </div>
                  {booking.vehicleRegNo && (
                     <div className="bg-gray-100 px-3 py-1.5 rounded text-center border border-gray-200">
                       <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{booking.vehicleRegNo}</p>
                       <p className="text-[10px] font-bold text-gray-400">{booking.vehicleManufacturer} {booking.vehicleModel}</p>
                     </div>
                  )}
                </div>
                
                {booking.customerAddress && (
                  <p className="text-sm font-medium text-gray-600 flex items-start mb-3">
                    <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-gray-400 flex-shrink-0" />
                    {booking.customerAddress}
                  </p>
                )}
                
                <div className="space-y-2 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {booking.pickupEmployee && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold mr-2">P</div>
                        <span className="text-xs font-bold text-gray-700">{booking.pickupEmployee.fullName}</span>
                      </div>
                      <a href={generateWhatsAppLink(booking, booking.pickupEmployee, 'pickup')} target="_blank" rel="noreferrer" className="text-[10px] bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded font-bold transition-colors">WhatsApp</a>
                    </div>
                  )}
                  {booking.dropEmployee && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold mr-2">D</div>
                        <span className="text-xs font-bold text-gray-700">{booking.dropEmployee.fullName}</span>
                      </div>
                      <a href={generateWhatsAppLink(booking, booking.dropEmployee, 'drop-off')} target="_blank" rel="noreferrer" className="text-[10px] bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded font-bold transition-colors">WhatsApp</a>
                    </div>
                  )}
                  {!booking.pickupEmployee && !booking.dropEmployee && (
                     <p className="text-xs text-gray-400 font-semibold italic text-center">No staff assigned</p>
                  )}
                </div>
              </div>

              <div className="flex border-t border-gray-100">
                {booking.status === 'Pending' && (
                  <button onClick={() => updateStatus(booking.id, 'Confirmed')} className="flex-1 text-xs py-3 text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-wider transition-colors border-r border-gray-100">Confirm</button>
                )}
                {booking.status === 'Confirmed' && (
                  <button onClick={() => updateStatus(booking.id, 'Completed')} className="flex-1 text-xs py-3 text-emerald-600 hover:bg-emerald-50 font-bold uppercase tracking-wider transition-colors border-r border-gray-100">Complete</button>
                )}
                <button onClick={() => updateStatus(booking.id, 'Cancelled')} className="flex-1 text-xs py-3 text-red-500 hover:bg-red-50 font-bold uppercase tracking-wider transition-colors">Cancel</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-gray-800">New Appointment</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-5 custom-scrollbar">
              
              {/* Smart Search */}
              <div className="space-y-1" ref={dropdownRef}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Vehicle Search (Optional)</label>
                <div className="relative">
                  <div className="flex items-center border-2 border-gray-200 rounded focus-within:border-orange-500 bg-gray-50 overflow-hidden">
                    <Search className="w-5 h-5 ml-3 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Reg No or Phone..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                      className="w-full p-3 bg-transparent font-bold text-gray-800 focus:outline-none"
                    />
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown && searchQuery.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <ul>
                          {searchResults.map((v, i) => (
                            <li 
                              key={i} 
                              className="px-4 py-3 hover:bg-orange-50 border-b border-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                              onClick={() => handleSelectVehicle(v)}
                            >
                              <div>
                                <span className="font-bold text-gray-800">{v.registrationNumberRaw}</span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {v.currentCustomer?.displayName || "No Owner"}
                                </div>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-gray-300" />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-3 text-center text-sm text-gray-500 font-medium">
                          {isSearching ? "Searching..." : "No match found. Fill details manually."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Name <span className="text-red-500">*</span></label>
                  <input required className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Phone</label>
                  <input className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Address</label>
                <input className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Make</label>
                  <input className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.vehicleManufacturer} onChange={e => setFormData({...formData, vehicleManufacturer: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Model</label>
                  <input className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Reg No</label>
                  <input className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm uppercase" value={formData.vehicleRegNo} onChange={e => setFormData({...formData, vehicleRegNo: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Scheduled Date & Time <span className="text-red-500">*</span></label>
                <input required type="datetime-local" className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Pickup Staff</label>
                  <select className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.pickupEmployeeId} onChange={e => setFormData({...formData, pickupEmployeeId: e.target.value})}>
                    <option value="">None</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Drop Staff</label>
                  <select className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded focus:border-orange-500 font-semibold text-sm" value={formData.dropEmployeeId} onChange={e => setFormData({...formData, dropEmployeeId: e.target.value})}>
                    <option value="">None</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-200 rounded transition-colors uppercase tracking-wider text-sm">Cancel</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded hover:bg-orange-600 transition-colors uppercase tracking-wider text-sm flex items-center">
                Save <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
