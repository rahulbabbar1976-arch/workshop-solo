'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Camera, 
  Search, 
  Car, 
  User, 
  Fuel, 
  Gauge, 
  CheckSquare, 
  FileText,
  Smartphone, 
  Send,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Loader2,
  Calendar,
  Clock,
  Truck,
  Printer,
  X,
  Sparkles,
  History
} from 'lucide-react';

export default function AdvisorPage() {
  const router = useRouter();

  const [currentAdvisorId, setCurrentAdvisorId] = useState('');
  // Estimates
  const [estimates, setEstimates] = useState<any[]>([]);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estCustomerName, setEstCustomerName] = useState('');
  const [estCustomerMobile, setEstCustomerMobile] = useState('');
  const [estVehicleReg, setEstVehicleReg] = useState('');
  const [estVehicleMake, setEstVehicleMake] = useState('');
  const [estVehicleModel, setEstVehicleModel] = useState('');
  const [estNotes, setEstNotes] = useState('');
  const [estPhotos, setEstPhotos] = useState<string[]>([]);
  const [estLines, setEstLines] = useState<any[]>([
    { lineType: 'labour', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }
  ]);
  const [isSavingEst, setIsSavingEst] = useState(false);
  const [estError, setEstError] = useState<string | null>(null);
  const [estSuccess, setEstSuccess] = useState<string | null>(null);

  const fetchEstimates = async () => {
    try {
      const res = await fetch('/api/estimates');
      const data = await res.json();
      if (data.success) setEstimates(data.estimates || []);
    } catch (e) { console.error(e); }
  };

  const estPerformLookup = async (plate: string) => {
    if (!plate.trim()) return;
    setEstError(null);
    try {
      const res = await fetch(`/api/vehicles?q=${encodeURIComponent(plate)}`);
      const data = await res.json();
      if (data.success && data.vehicles && data.vehicles.length > 0) {
        const cleanedQuery = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const exactMatch = data.vehicles.find((v: any) => v.registrationNumberNormalized === cleanedQuery) || data.vehicles[0];
        
        setEstVehicleReg(exactMatch.registrationNumber);
        setEstVehicleMake(exactMatch.manufacturer || '');
        setEstVehicleModel(exactMatch.model || '');
        setEstCustomerName(exactMatch.owner?.displayName || '');
        setEstCustomerMobile(exactMatch.owner?.primaryMobile || '');
        setEstSuccess('Vehicle details auto-populated!');
        setTimeout(() => setEstSuccess(null), 3000);
      } else {
        setEstError('Vehicle not found. Will be created on save.');
      }
    } catch (err: any) {
      setEstError(err.message || 'Error searching database');
    }
  };

  const estHandleCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEstError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const aiRes = await fetch('/api/vehicles/scan', { method: 'POST', body: formData });
      const aiData = await aiRes.json();
      if (aiData.success && aiData.plateNumber) {
        setEstVehicleReg(aiData.plateNumber);
        if (aiData.make) setEstVehicleMake(aiData.make);
        if (aiData.model) setEstVehicleModel(aiData.model);
        await estPerformLookup(aiData.plateNumber);
      } else {
        setEstError('Failed to read number plate.');
      }
    } catch (err) {
      setEstError('Scan error.');
    }
  };

  const createEstimate = async () => {
    if (!estCustomerName.trim()) { setEstError('Customer name is required'); return; }
    setIsSavingEst(true); setEstError(null);
    try {
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: estCustomerName,
          customerMobile: estCustomerMobile,
          vehicleRegNo: estVehicleReg,
          vehicleMake: estVehicleMake,
          vehicleModel: estVehicleModel,
          customerNotes: estNotes,
          advisorId: currentAdvisorId,
          lines: estLines.filter(l => l.name.trim()),
          photos: estPhotos
        })
      });
      const data = await res.json();
      if (data.success) {
        setEstSuccess('Estimate ' + data.estimate.estimateNumber + ' created!');
        setShowEstimateModal(false);
        setEstCustomerName(''); setEstCustomerMobile(''); setEstVehicleReg('');
        setEstVehicleMake(''); setEstVehicleModel(''); setEstNotes('');
        setEstLines([{ lineType: 'labour', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
        setEstPhotos([]);
        fetchEstimates();
        setTimeout(() => setEstSuccess(null), 4000);
      } else {
        setEstError(data.error || 'Failed to create estimate');
      }
    } catch (e: any) {
      setEstError(e.message);
    } finally {
      setIsSavingEst(false);
    }
  };

  const shareEstimateWhatsApp = (est: any) => {
    const lines = est.lines || [];
    let msg = `*ESTIMATE — ${est.estimateNumber}*\n`;
    msg += `*BABBARSONS Workshop*\n\n`;
    msg += `Customer: ${est.customerName}\n`;
    if (est.vehicleRegNo) msg += `Vehicle: ${est.vehicleRegNo} ${est.vehicleMake || ''} ${est.vehicleModel || ''}\n`;
    msg += `\n*Items:*\n`;
    lines.forEach((l: any, i: number) => {
      msg += `${i+1}. ${l.name} — ${l.quantity} x ₹${l.unitPrice} = ₹${l.lineTotal?.toFixed(2)}\n`;
    });
    msg += `\n*Subtotal: ₹${est.subtotalAmount?.toFixed(2)}*\n`;
    msg += `GST: ₹${est.taxAmount?.toFixed(2)}\n`;
    msg += `*Total: ₹${est.totalAmount?.toFixed(2)}*\n\n`;
    msg += `Valid for ${est.validityDays} days. Please confirm to proceed.\n`;
    msg += `— Autobots Workshop Intelligence`;
    const phone = (est.customerMobile || '').replace(/\D/g, '');
    const fullPhone = phone.startsWith('91') ? phone : (phone ? '91' + phone : '');
    const url = fullPhone
      ? `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const convertEstimateToJob = async (estId: string) => {
    if (!confirm('Convert this estimate to a live job card?')) return;
    try {
      const res = await fetch('/api/estimates/' + estId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ ' + data.message);
        fetchEstimates();
      } else {
        alert('Error: ' + (data.error || 'Failed to convert'));
      }
    } catch (e: any) {
      alert('Network error: ' + e.message);
    }
  };

  const [myReservations, setMyReservations] = useState<any[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [openJobcards, setOpenJobcards] = useState<any[]>([]);
  const [selectedReprintJobcardId, setSelectedReprintJobcardId] = useState('');
  
  // Edit Jobcard States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedJobcardToEdit, setSelectedJobcardToEdit] = useState<any>(null);
  const [availableMechanics, setAvailableMechanics] = useState<any[]>([]);
  const [editMechanicId, setEditMechanicId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleShareOldJobcard = (jobcardId: string) => {
    const jobcard = openJobcards.find(jc => jc.id === jobcardId);
    if (!jobcard) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const printLink = `${origin}/print/jobcard/${jobcard.id}`;
    const text = `Hello ${jobcard.customer?.name || jobcard.snapshot?.customerName || 'Customer'},\nYour job card *${jobcard.jobcardNumber}* has been opened at Autobots Multibrand Repair.\n\n*Intake Details*:\nVehicle: ${jobcard.vehicle?.manufacturer || ''} ${jobcard.vehicle?.model || ''} (${jobcard.snapshot?.vehicleRegistrationNumber || jobcard.vehicle?.registrationNumberRaw || ''})\nOdometer: ${jobcard.snapshot?.intakeOdometer || ''} KM\nFuel: ${jobcard.snapshot?.fuelLevel || ''}\n\n*View & Print your Job Card here*:\n${printLink}\n\nThank you!`;
    const customerMobile = jobcard.customer?.mobile || jobcard.snapshot?.customerMobile;
    const phoneNum = customerMobile ? `${customerMobile.replace(/\D/g, '')}` : '';
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openEditModal = (jobcard: any) => {
    router.push(`/advisor/edit/${jobcard.id}`);
  };

  const fetchMyReservations = async (advisorId: string) => {
    if (!advisorId) return;
    setResLoading(true);
    try {
      const res = await fetch(`/api/reservations?advisorId=${advisorId}`);
      const data = await res.json();
      if (data.success) {
        setMyReservations(data.bookings);
      }
    } catch (err) {}
    finally {
      setResLoading(false);
    }
  };

  const startIntakeFromBooking = async (b: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles?q=${encodeURIComponent(b.regNo)}`);
      const data = await res.json();
      if (data.success && data.vehicles && data.vehicles.length > 0) {
        const exactMatch = data.vehicles.find((v: any) => v.registrationNumberNormalized === b.regNo.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        if (exactMatch) {
          selectMatchedVehicle(exactMatch);
          await fetch('/api/reservations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: b.id, status: 'checked_in' })
          });
          return;
        }
      }
      setRegNumber(b.regNo);
      setManufacturer(b.make || '');
      setModel(b.model || '');
      setCustomerName(b.customerName);
      setCustomerMobile(b.customerMobile);
      setFoundVehicle(null);
      setStep(2);
      await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, status: 'checked_in' })
      });
    } catch (err) {
      setRegNumber(b.regNo);
      setManufacturer(b.make || '');
      setModel(b.model || '');
      setCustomerName(b.customerName);
      setCustomerMobile(b.customerMobile);
      setFoundVehicle(null);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('workshop_session');
    if (!sessionStr) {
      router.push('/');
      return;
    }
    try {
      const session = JSON.parse(sessionStr);
      if (!session || !['admin', 'manager', 'advisor'].includes(session.primaryRole)) {
        router.push('/');
      } else {
        setCurrentAdvisorId(session.id);
        fetchMyReservations(session.id);
        
        // Fetch open jobcards for printing
        fetch('/api/jobcards')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setOpenJobcards(data.jobcards.filter((jc: any) => jc.status === 'open'));
            }
          })
          .catch(e => console.error("Error fetching jobcards", e));
      }
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('workshop_session');
    document.cookie = "workshop_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "workshop_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push('/');
  };
  // Step navigation: 1 = Plate Scan / Search, 2 = Vehicle Info / Create, 3 = Complaints & Photos, 4 = Signature & Submit, 5 = Success
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanSourceInfo, setScanSourceInfo] = useState<{source: string, msg: string} | null>(null);

  useEffect(() => {
    if (step === 1) {
      setIsCustomerEstablished(false);
    }
  }, [step]);
  
  // Search state
  const [searchPlate, setSearchPlate] = useState('');
  
  // Reference Lookup State
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceVehicle, setReferenceVehicle] = useState<any>(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [foundVehicle, setFoundVehicle] = useState<any>(null);
  const [plateNormalized, setPlateNormalized] = useState('');
  
  // OCR & Search matching additions
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchResultsList, setSearchResultsList] = useState<any[]>([]);
  const [showResultsList, setShowResultsList] = useState(false);
  
  // Form States (New / Editing Vehicle & Customer)
  const [regNumber, setRegNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [vin, setVin] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerDriverName, setCustomerDriverName] = useState('');
  const [customerDriverMobile, setCustomerDriverMobile] = useState('');
  const [customerIsPriority, setCustomerIsPriority] = useState(false);
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');

  // Customer Search States (New Flow)
  const [isCustomerEstablished, setIsCustomerEstablished] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleCustomerSearch = (query: string, field: 'name' | 'mobile') => {
    if (field === 'name') setCustomerName(query);
    if (field === 'mobile') setCustomerMobile(query);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (query.trim().length >= 3) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/customers?q=${encodeURIComponent(query.trim())}`);
          const data = await res.json();
          if (data.success && data.customers?.length > 0) {
            setCustomerSuggestions(data.customers);
            setShowCustomerDropdown(true);
          } else {
            setShowCustomerDropdown(false);
          }
        } catch (e) {
          console.error(e);
        }
      }, 300);
    } else {
      setShowCustomerDropdown(false);
    }
  };

  const handleSelectCustomer = (c: any) => {
    setCustomerName(c.displayName || '');
    setCustomerMobile(c.primaryMobile || '');
    setCustomerDriverName(c.driverName || '');
    setCustomerDriverMobile(c.driverMobile || '');
    setCustomerIsPriority(c.isPriority || false);
    setCustomerAddress(c.addressLine1 || '');
    setCustomerTaxId(c.taxId || '');
    setShowCustomerDropdown(false);
    // Auto-establish if they click a valid suggestion
    if (foundVehicle) {
      // If we're just verifying mobile
      setIsCustomerEstablished(true);
    }
  };

  // Autocomplete lists for Make & Model
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [modelsGrouped, setModelsGrouped] = useState<{ [make: string]: string[] }>({});
  const [showMakeDropdown, setShowMakeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // New Battery & Next Service States
  const [batteryMake, setBatteryMake] = useState('');
  const [batterySerialNumber, setBatterySerialNumber] = useState('');
  const [batteryInstallationDate, setBatteryInstallationDate] = useState('');
  const [batteryWarrantyMonths, setBatteryWarrantyMonths] = useState(24);
  const [nextServiceOdometer, setNextServiceOdometer] = useState<number>(0);
  const [nextServiceDate, setNextServiceDate] = useState('');

  // Insurance and PUC States
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [pucNumber, setPucNumber] = useState('');
  const [nextPucDate, setNextPucDate] = useState('');

  // Real Inspection Photo Capture state/ref
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch unique manufacturers/models on load
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch('/api/vehicles?meta=true');
        const data = await res.json();
        if (data.success) {
          setManufacturers(data.manufacturers || []);
          setModelsGrouped(data.models || {});
        }
      } catch (err) {}
    };
    fetchMeta();
  }, []);

  // Intake States
  const [odometer, setOdometer] = useState<number>(25000);
  const [fuelLevel, setFuelLevel] = useState('50%');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>('');
  const [complaintText, setComplaintText] = useState('');
  const [advisorObservation, setAdvisorObservation] = useState('');
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);

  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchAiSuggestions = async () => {
    setAiSuggestionsLoading(true);
    try {
      const res = await fetch('/api/advisor/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: foundVehicle?.id || null,
          make: manufacturer,
          model,
          odometer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSuggestions(data.suggestions || []);
        setAiHistory(data.history || []);
      }
    } catch (e) {
      console.warn('AI suggestions fetch failed:', e);
    } finally {
      setAiSuggestionsLoading(false);
    }
  };
  
  // 360 Photo Grid (8 slots)
  const [photos, setPhotos] = useState<(string | null)[]>([
    null, null, null, null, null, null, null, null
  ]);
  const photoLabels = ['Front', 'Right Front', 'Right Side', 'Right Rear', 'Rear', 'Left Rear', 'Left Side', 'Left Front'];
  
  // Signature Pad State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Success State
  const [createdJobcard, setCreatedJobcard] = useState<any>(null);

  // Seeding Icon List
  const complaintIconLibrary = [
    { key: 'service', label: 'Periodic Service', color: '#6366f1' },
    { key: 'ac', label: 'AC Repair', color: '#06b6d4' },
    { key: 'body', label: 'Body Repair', color: '#f43f5e' },
    { key: 'accessories', label: 'Accessories', color: '#10b981' },
    { key: 'brakes', label: 'Brakes / Sus.', color: '#3b82f6' },
    { key: 'engine', label: 'Engine Check', color: '#eab308' },
    { key: 'tires', label: 'Tires / Align', color: '#8b5cf6' },
    { key: 'detailing', label: 'Detailing / Wash', color: '#ec4899' }
  ];

  // Helper: Normalize LPN
  const cleanLPN = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Parse Indian LPN plate formats from raw OCR text (handles standard and custom RTO formats like Delhi DL 3C)
  const cleanPlateText = (text: string) => {
    const STATE_CODES = new Set([
      'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HR', 'HP', 'JK', 
      'JH', 'KA', 'KL', 'LA', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'OR', 'PB', 'PY', 
      'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'UA', 'WB'
    ]);

    const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/);

    // 1. Try to find a word that is a highly plausible Indian plate (starts with a valid state code and fits structural pattern)
    for (const word of words) {
      const cleanWord = word.replace(/\s/g, '');
      if (cleanWord.length >= 5 && cleanWord.length <= 11) {
        const state = cleanWord.slice(0, 2);
        if (STATE_CODES.has(state)) {
          const rest = cleanWord.slice(2);
          if (/^\d{1,2}[A-Z]{0,4}\d{1,4}$/.test(rest)) {
            return cleanWord;
          }
        }
      }
    }

    // 2. Fallback to any pattern matching the primary regex anywhere in the text
    const regex = /[A-Z]{2}\s*\d{1,2}\s*[A-Z]{0,4}\s*\d{4}/g;
    const matches = cleaned.match(regex);
    if (matches && matches.length > 0) {
      return matches[0].replace(/\s/g, '');
    }

    // 3. Fallback to any word that matches general plate structure (even if state code is slightly misread)
    for (const word of words) {
      const cleanWord = word.replace(/\s/g, '');
      if (cleanWord.length >= 6 && cleanWord.length <= 11) {
        if (/^[A-Z]{2}\d{1,2}[A-Z]{0,4}\d{1,4}$/.test(cleanWord)) {
          return cleanWord;
        }
      }
    }

    return null;
  };

  // Populate vehicle and customer state from a matched vehicle record
  const selectMatchedVehicle = (vehicle: any) => {
    setFoundVehicle(vehicle);
    setRegNumber(vehicle.registrationNumberRaw);
    setManufacturer(vehicle.manufacturer || '');
    setModel(vehicle.model || '');
    setColor(vehicle.color || '');
    setFuelType(vehicle.fuelType || 'Petrol');
    setVin(vehicle.vin || '');
    setEngineNumber(vehicle.engineNumber || '');
    
    // Battery states
    setBatteryMake(vehicle.batteryMake || '');
    setBatterySerialNumber(vehicle.batterySerialNumber || '');
    setBatteryInstallationDate(vehicle.batteryInstallationDate ? new Date(vehicle.batteryInstallationDate).toISOString().split('T')[0] : '');
    setBatteryWarrantyMonths(vehicle.batteryWarrantyMonths || 24);
    
    // Next service states
    setNextServiceOdometer(vehicle.nextServiceOdometer || 0);
    setNextServiceDate(vehicle.nextServiceDate ? new Date(vehicle.nextServiceDate).toISOString().split('T')[0] : '');

    // Insurance & PUC states
    setInsurancePolicyNumber(vehicle.insurancePolicyNumber || '');
    setInsurerName(vehicle.insurerName || '');
    setInsuranceExpiryDate(vehicle.insuranceExpiryDate ? new Date(vehicle.insuranceExpiryDate).toISOString().split('T')[0] : '');
    setPucNumber(vehicle.pucNumber || '');
    setNextPucDate(vehicle.nextPucDate ? new Date(vehicle.nextPucDate).toISOString().split('T')[0] : '');

    setCustomerName(vehicle.currentCustomer?.displayName || '');
    setCustomerMobile(vehicle.currentCustomer?.primaryMobile?.replace('+91', '') || '');
    setCustomerDriverName(vehicle.currentCustomer?.driverName || '');
    setCustomerDriverMobile(vehicle.currentCustomer?.driverMobile || '');
    setCustomerIsPriority(vehicle.currentCustomer?.isPriority || false);
    setCustomerAddress(vehicle.currentCustomer?.addressLine1 || '');
    setCustomerTaxId(vehicle.currentCustomer?.taxId || '');
    
    if (vehicle.currentOdometer) {
      setOdometer(vehicle.currentOdometer);
    }
    
    setSuggestions([]);
    setShowResultsList(false);
    setStep(2); // Go to confirm screen
  };

  // Helper to find other vehicles with same last 4 digits of the current registration number
  const getSuffixSuggestions = () => {
    const normalizedPlate = cleanLPN(regNumber);
    const last4 = normalizedPlate.slice(-4);
    if (!/^\d{4}$/.test(last4)) return [];
    
    return searchResultsList.filter((v: any) => {
      if (foundVehicle && v.id === foundVehicle.id) return false;
      const otherNormalized = cleanLPN(v.registrationNumberRaw || v.registrationNumberNormalized || '');
      return otherNormalized.endsWith(last4);
    });
  };

  // Query API and handle matching routing
  const performLookup = async (plate: string, initialMake: string = '', initialModel: string = '') => {
    if (!plate.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles?q=${encodeURIComponent(plate)}`);
      const data = await res.json();
      if (data.success && data.vehicles && data.vehicles.length > 0) {
        const cleanedQuery = cleanLPN(plate);
        const exactMatch = data.vehicles.find((v: any) => v.registrationNumberNormalized === cleanedQuery);
        
        // Save the full query results list for Step 2 alternative suffix suggestions
        setSearchResultsList(data.vehicles);
        
        if (exactMatch) {
          selectMatchedVehicle(exactMatch);
        } else {
          // Multiple matches or fallback match (with spelling/OCR discrepancies)
          setShowResultsList(true);
        }
      } else {
        // Not found - let's create a new vehicle entry
        setSearchResultsList([]);
        setRegNumber(plate.toUpperCase());
        setManufacturer(initialMake);
        setModel(initialModel);
        setColor('');
        setFuelType('Petrol');
        setVin('');
        setEngineNumber('');
        setBatteryMake('');
        setBatterySerialNumber('');
        setBatteryInstallationDate('');
        setBatteryWarrantyMonths(24);
        setNextServiceOdometer(0);
        setNextServiceDate('');
        setInsurancePolicyNumber('');
        setInsurerName('');
        setInsuranceExpiryDate('');
        setPucNumber('');
        setNextPucDate('');
        setCustomerName('');
        setCustomerMobile('');
        setCustomerAddress('');
        setCustomerTaxId('');
        setFoundVehicle(null);
        setSuggestions([]);
        setShowResultsList(false);
        setStep(2); // Go to create vehicle screen
      }
    } catch (err: any) {
      setError(err.message || 'Error searching database');
    } finally {
      setLoading(false);
    }
  };

  // Search vehicle in local SQLite DB
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await performLookup(searchPlate);
  };

  // Fetch live suggestions on plate typing
  const handlePlateInputChange = async (val: string) => {
    setSearchPlate(val.toUpperCase());
    if (val.trim().length >= 2) {
      try {
        const res = await fetch(`/api/vehicles?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.success && data.vehicles) {
          setSuggestions(data.vehicles);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  // Real Camera ANPR Scan utilizing Tesseract.js
  const handleCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    // 1. Try server-side AI ANPR Scan first
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const aiRes = await fetch('/api/vehicles/scan', {
        method: 'POST',
        body: formData
      });
      
      const aiData = await aiRes.json();
      if (aiData.success && aiData.plateNumber) {
        setSearchPlate(aiData.plateNumber);
        
        let msg = "Scanned via Gemini AI";
        if (aiData.source === 'local_hash_cache') msg = "Instant Cache Hit (0 API Calls)";
        else if (aiData.source === 'local_ocr_mapping') msg = "Local OCR Heuristic (0 API Calls)";
        else if (aiData.source === 'local_ocr_direct') msg = "Local OCR Match (0 API Calls)";
        else if (aiData.source === 'cloud_gemini') msg = "Gemini AI Fallback (1 API Call)";
        
        setScanSourceInfo({ source: aiData.source || 'unknown', msg });
        setTimeout(() => setScanSourceInfo(null), 5000);
        
        // Auto-fill make and model if AI identified them
        // This will only be noticeable if the vehicle is NOT in the database, 
        // since a DB match will override these fields anyway in performLookup.
        if (aiData.make) setManufacturer(aiData.make);
        if (aiData.model) setModel(aiData.model);

        await performLookup(aiData.plateNumber, aiData.make || '', aiData.model || '');
        e.target.value = ''; // Reset input value
        setLoading(false);
        return; // Success! No need to run local Tesseract
      } else {
        console.warn('AI scanner fallback trigger:', aiData.error);
      }
    } catch (aiErr) {
      console.warn('AI scanner network error, falling back to local OCR:', aiErr);
    }

    // 2. Local Fallback utilizing Tesseract.js
    try {
      // Import Tesseract.js dynamically to avoid SSR errors
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text;
      
      const cleaned = cleanPlateText(text);
      if (cleaned) {
        setSearchPlate(cleaned);
        await performLookup(cleaned);
      } else {
        setError(`ANPR read: "${text.trim()}". Could not match a valid plate format. Please type manually or try another picture.`);
      }
    } catch (err: any) {
      setError("Failed to run ANPR OCR: " + err.message);
    } finally {
      setLoading(false);
      // Reset input value to allow consecutive files to trigger the change event
      e.target.value = '';
    }
  };

  // Mock Camera Plate Scanner
  const simulatePlateScan = () => {
    const mockPlates = ['HR 26EN 8059', 'HR 51BD 1008', 'DL 3CBA 1234', 'UP 16AD 5678'];
    const randomPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
    setSearchPlate(randomPlate);
    performLookup(randomPlate);
  };

  // Toggle Complaint Icon Selection
  const toggleIcon = (key: string) => {
    if (selectedIcons.includes(key)) {
      setSelectedIcons(selectedIcons.filter(i => i !== key));
    } else {
      setSelectedIcons([...selectedIcons, key]);
    }
  };

  // Real camera capture for 360 photos
  const capturePhoto = (index: number) => {
    setActivePhotoIndex(index);
    if (photoFileInputRef.current) {
      photoFileInputRef.current.click();
    }
  };

  const handleInspectionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activePhotoIndex === null) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const updatedPhotos = [...photos];
        updatedPhotos[activePhotoIndex] = event.target.result as string;
        setPhotos(updatedPhotos);
        setActivePhotoIndex(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Signature Pad Event Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureDataUrl(canvas.toDataURL());
  };

  // Submit Job Card
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Save or Update vehicle and customer details in DB
      let vehicleId = '';
      const vRes = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationNumberRaw: regNumber,
          manufacturer,
          model,
          color,
          fuelType,
          vin,
          engineNumber,
          currentOdometer: odometer,
          customerName,
          customerMobile,
          customerDriverName,
          customerDriverMobile,
          customerIsPriority,
          customerAddress,
          customerTaxId,
          
          // Battery and Next Service Fields
          batteryMake,
          batterySerialNumber,
          batteryInstallationDate: batteryInstallationDate || null,
          batteryWarrantyMonths,
          nextServiceOdometer,
          nextServiceDate: nextServiceDate || null,
          insurancePolicyNumber,
          insurerName,
          insuranceExpiryDate: insuranceExpiryDate || null,
          pucNumber,
          nextPucDate: nextPucDate || null
        })
      });
      const vData = await vRes.json();
      if (vData.success) {
        vehicleId = vData.vehicle.id;
      } else {
        throw new Error(vData.error || 'Failed to save vehicle details');
      }

      // 2. Submit Job Card
      const jobRes = await fetch('/api/jobcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          intakeOdometer: odometer,
          fuelLevel,
          expectedDeliveryAt: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : null,
          externalNotes: complaintText,
          complaintText: complaintText, // Explicitly pass to match API schema destructuring
          advisorObservation,
          signatureUrl: signatureDataUrl,
          photoUrls: photos.filter(p => p !== null), // Only upload captured photos
          complaintIcons: selectedIcons
        })
      });
      
      const jobData = await jobRes.json();
      if (jobData.success) {
        setCreatedJobcard(jobData);
        setStep(5); // Success step
      } else {
        throw new Error(jobData.error || 'Failed to create job card');
      }

    } catch (err: any) {
      setError(err.message || 'Error submitting job card');
    } finally {
      setLoading(false);
    }
  };

  // Generate WhatsApp Share URL
  const getWhatsAppShareLink = () => {
    if (!createdJobcard) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const printLink = `${origin}/print/jobcard/${createdJobcard.jobcardId}`;
    const text = `Hello ${customerName || 'Customer'},\nYour job card *${createdJobcard.jobcardNumber}* has been opened at Autobots Multibrand Repair.\n\n*Intake Details*:\nVehicle: ${manufacturer} ${model} (${regNumber})\nOdometer: ${odometer} KM\nFuel: ${fuelLevel}\n\n*View & Print your Job Card here*:\n${printLink}\n\nThank you!`;
    const phoneNum = customerMobile ? `${customerMobile.replace(/\D/g, '')}` : '';
    return `https://wa.me/${phoneNum}?text=${encodeURIComponent(text)}`;
  };

  const handleReferenceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceQuery.trim()) return;
    setReferenceLoading(true);
    setReferenceError(null);
    setReferenceVehicle(null);
    try {
      const res = await fetch(`/api/vehicles?q=${encodeURIComponent(referenceQuery)}`);
      const data = await res.json();
      if (data.success && data.vehicles && data.vehicles.length > 0) {
        const cleanedQuery = referenceQuery.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const exactMatch = data.vehicles.find((v: any) => v.registrationNumberNormalized === cleanedQuery);
        setReferenceVehicle(exactMatch || data.vehicles[0]);
      } else {
        setReferenceError("No vehicle found with that registration number.");
      }
    } catch (err: any) {
      setReferenceError(err.message);
    } finally {
      setReferenceLoading(false);
    }
  };

  return (
    <main className="glass-container">
      
      {/* Step 1: Plate Scan / Search */}
      {step === 1 && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '3rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <a href="/" onClick={handleLogout} style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={24} /></a>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Vehicle Intake</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <select 
                  className="btn btn-secondary" 
                  style={{ appearance: 'none', padding: '0.5rem 2rem 0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                  value={selectedReprintJobcardId}
                  onChange={(e) => setSelectedReprintJobcardId(e.target.value)}
                  title="Select Open Jobcard"
                >
                  <option value="">Select Open Jobcard...</option>
                  {openJobcards.map(jc => (
                    <option key={jc.id} value={jc.id}>
                      {jc.jobcardNumber} - {jc.snapshot?.vehicleRegistrationNumber || jc.vehicle?.registrationNumberRaw || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedReprintJobcardId && (
                <>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => window.open(`/print/jobcard/${selectedReprintJobcardId}`, '_blank')} 
                    title="Print Jobcard"
                    style={{ padding: '0.5rem' }}
                  >
                    <Printer size={16} />
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleShareOldJobcard(selectedReprintJobcardId)} 
                    title="Send WhatsApp Message"
                    style={{ padding: '0.5rem' }}
                  >
                    <Send size={16} />
                  </button>
                  {openJobcards.find(jc => jc.id === selectedReprintJobcardId)?.serviceAdvisorId === currentAdvisorId && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => openEditModal(openJobcards.find(jc => jc.id === selectedReprintJobcardId))} 
                      title="Edit Jobcard"
                      style={{ padding: '0.5rem' }}
                    >
                      <Edit size={16} />
                    </button>
                  )}
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setSelectedReprintJobcardId('')} 
                    title="Clear Selection"
                    style={{ padding: '0.5rem' }}
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#eab308', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Mobile Camera Notice:</strong> Browsers require a secure context (HTTPS) for camera access. Access this portal via <code>https://&lt;your-local-ip&gt;:3000</code>. Start the server with <code>npm run dev:secure</code> to enable HTTPS.
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Scan number plate with camera or enter registration manually to look up customer record. Matches any letters or last 4 digits.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Car size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ENTER REG NUMBER OR LAST 4 DIGITS"
                  value={searchPlate}
                  onChange={(e) => handlePlateInputChange(e.target.value)}
                  style={{ paddingLeft: '2.5rem', fontWeight: 700 }}
                  required
                  autoComplete="off"
                />

                {/* Suggestions List Dropdown */}
                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    zIndex: 20,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '0.25rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}>
                    {suggestions.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => selectMatchedVehicle(v)}
                        style={{ 
                          padding: '0.75rem', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid rgba(255,255,255,0.05)', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center' 
                        }}
                        className="suggestion-item"
                      >
                        <div>
                          <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{v.registrationNumberRaw}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                            {v.manufacturer} {v.model}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>
                          Owner: {v.currentCustomer?.displayName}
                        </span>
                      </div>
                    ))}
                    
                    <div 
                      onClick={() => {
                        setSuggestions([]);
                        setRegNumber(searchPlate.toUpperCase());
                        setManufacturer('');
                        setModel('');
                        setFoundVehicle(null);
                        setShowResultsList(false);
                        setStep(2);
                      }}
                      style={{ 
                        padding: '0.75rem', 
                        cursor: 'pointer',
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      + Proceed to Create New Vehicle
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
                <Search size={18} /> Lookup
              </button>
            </div>

            {/* Hidden Input for Camera Capture */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef} 
              onChange={handleCameraScan} 
              style={{ opacity: 0, position: 'absolute', width: 0, height: 0, zIndex: -1 }} 
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-accent" 
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                disabled={loading}
              >
                <Camera size={18} /> Camera Scan (ANPR)
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={simulatePlateScan}
                style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                disabled={loading}
              >
                Simulate Scan
              </button>
            </div>
          </form>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, justifyContent: 'center', padding: '0.5rem' }}>
              <Loader2 className="spinner" style={{ animation: 'spin 1s linear infinite' }} size={16} />
              Processing ANPR OCR reading...
            </div>
          )}

          {scanSourceInfo && (
            <div style={{ padding: '0.5rem', marginTop: '0.5rem', background: scanSourceInfo.source.includes('local') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: scanSourceInfo.source.includes('local') ? '#22c55e' : '#a855f7', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, border: `1px solid ${scanSourceInfo.source.includes('local') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(168, 85, 247, 0.2)'}` }}>
              {scanSourceInfo.msg}
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Matches Select Panel */}
          {showResultsList && (
            <div className="glass-card" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--secondary)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', color: '#fff', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertCircle size={18} style={{ color: 'var(--secondary)' }} />
                  {searchResultsList.length === 1 ? 'Matching Vehicle Suggestion' : `Multiple Matches (${searchResultsList.length})`}
                </h3>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowResultsList(false)}>
                  Close
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {searchResultsList.length === 1 
                  ? 'A matching vehicle was found in the database. Select this record to load it, or register as a new vehicle below:'
                  : 'Multiple vehicles match your lookup query. Select the correct record to load, or register as a new vehicle below:'
                }
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {searchResultsList.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => selectMatchedVehicle(v)}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    className="suggestion-item"
                  >
                    <div>
                      <strong style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>{v.registrationNumberRaw}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#fff', marginLeft: '0.5rem' }}>
                        {v.manufacturer} {v.model}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Owner: {v.currentCustomer?.displayName}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-accent" 
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  onClick={() => {
                    setRegNumber(searchPlate.toUpperCase());
                    setManufacturer('');
                    setModel('');
                    setColor('');
                    setFuelType('Petrol');
                    setVin('');
                    setEngineNumber('');
                    setInsurancePolicyNumber('');
                    setInsurerName('');
                    setInsuranceExpiryDate('');
                    setPucNumber('');
                    setNextPucDate('');
                    setCustomerName('');
                    setCustomerMobile('');
                    setCustomerAddress('');
                    setCustomerTaxId('');
                    setFoundVehicle(null);
                    setSuggestions([]);
                    setShowResultsList(false);
                    setStep(2);
                  }}
                >
                  Register "{searchPlate.toUpperCase()}" as New Vehicle
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '1.5rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>My Assigned Reservations &amp; Pre-Bookings</h3>
          </div>
          {resLoading ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Loading pre-bookings...</div>
          ) : myReservations.filter(b => b.status === 'pending' || b.status === 'confirmed').length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No upcoming pre-bookings assigned to you.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myReservations.filter(b => b.status === 'pending' || b.status === 'confirmed').map((b: any) => {
                const bookingTimeStr = new Date(b.bookingDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                const isSelfDelivery = b.bookingType === 'self_delivery';
                return (
                  <div key={b.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>{b.bookingNumber}</span>
                        <span style={{ fontSize: '0.7rem', color: isSelfDelivery ? 'var(--primary)' : '#f59e0b', background: isSelfDelivery ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                          {isSelfDelivery ? 'Self Delivery' : 'Pickup'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{b.customerName} ({b.customerMobile})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🚗 **{b.regNo}** - {b.make} {b.model}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {bookingTimeStr}
                      </div>
                      {!isSelfDelivery && b.driverName && (
                        <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>🚚 Driver Assigned: {b.driverName}</div>
                      )}
                      {b.notes && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', padding: '0.25rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                          Note: {b.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => startIntakeFromBooking(b)}
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <CheckSquare size={14} /> Start Intake
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vehicle Reference Lookup (Step 1 only) */}
      {step === 1 && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '1.5rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <Search size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Vehicle Reference Lookup</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Search for a vehicle to view its details, history, and past job cards without starting a new intake.
          </p>
          <form onSubmit={handleReferenceSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="ENTER REG NUMBER"
              value={referenceQuery}
              onChange={(e) => setReferenceQuery(e.target.value)}
              style={{ flex: 1, textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-primary" disabled={referenceLoading}>
              {referenceLoading ? 'Searching...' : 'Lookup'}
            </button>
          </form>

          {referenceError && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={14} /> {referenceError}
            </div>
          )}

          {referenceVehicle && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--secondary)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ color: 'var(--secondary)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{referenceVehicle.registrationNumberRaw}</h4>
                  <div style={{ fontSize: '0.9rem', color: '#fff' }}>{referenceVehicle.manufacturer} {referenceVehicle.model}</div>
                  {referenceVehicle.currentCustomer && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Owner: {referenceVehicle.currentCustomer.displayName} ({referenceVehicle.currentCustomer.primaryMobile})
                    </div>
                  )}
                </div>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setReferenceVehicle(null)}>Close</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Next Service Date</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>{referenceVehicle.nextServiceDate ? new Date(referenceVehicle.nextServiceDate).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Next Service Mileage</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>{referenceVehicle.nextServiceOdometer ? `${referenceVehicle.nextServiceOdometer} KM` : 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Next Oil Change</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>{referenceVehicle.nextOilChangeDistance ? `${referenceVehicle.nextOilChangeDistance} KM` : 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Next PUC Date</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>{referenceVehicle.nextPucDate ? new Date(referenceVehicle.nextPucDate).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Insurance Expiry</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>{referenceVehicle.insuranceExpiryDate ? new Date(referenceVehicle.insuranceExpiryDate).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>

              {referenceVehicle.history && referenceVehicle.history.length > 0 ? (
                <div>
                  <h5 style={{ fontSize: '0.9rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Service History</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {referenceVehicle.history.map((h: any, idx: number) => (
                      <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ color: 'var(--primary)' }}>Job Card: {h.jobcardNumber}</strong>
                          <span style={{ color: 'var(--text-secondary)' }}>{new Date(h.dateIn).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                          {h.parts && h.parts.length > 0 && (
                            <div>
                              <span style={{ color: '#fff', fontSize: '0.75rem', display: 'block', marginBottom: '0.1rem' }}>Parts Used:</span>
                              <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {h.parts.map((p: string, i: number) => <li key={i}>{p}</li>)}
                              </ul>
                            </div>
                          )}
                          {h.labour && h.labour.length > 0 && (
                            <div>
                              <span style={{ color: '#fff', fontSize: '0.75rem', display: 'block', marginBottom: '0.1rem' }}>Labour/Services:</span>
                              <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {h.labour.map((l: string, i: number) => <li key={i}>{l}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No service history found for this vehicle.</div>
              )}
            </div>
          )}
        </div>
      )}
{/* Step 2: Vehicle & Customer Directory */}
      {step === 2 && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setStep(1)}><ArrowLeft size={20} /></button>
              <h2 style={{ fontSize: '1.5rem' }}>
                {!isCustomerEstablished ? 'Verify Customer Identity' : (foundVehicle ? 'Confirm Vehicle & Customer' : 'Register New Vehicle')}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--primary)' }}>
                <input 
                  type="checkbox" 
                  checked={customerIsPriority}
                  onChange={(e) => setCustomerIsPriority(e.target.checked)}
                />
                Priority Customer
              </label>
              {foundVehicle && <span className="status-tag status-approved">Matched DB</span>}
            </div>
          </div>

          {/* Alternative Suffix Suggestions */}
          {(() => {
            const suffixMatches = getSuffixSuggestions();
            if (suffixMatches.length === 0) return null;
            return (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px dashed var(--primary)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  💡 Other vehicles ending in &quot;{cleanLPN(regNumber).slice(-4)}&quot; found:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {suffixMatches.map((v: any) => (
                    <button
                      key={v.id}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                      onClick={() => selectMatchedVehicle(v)}
                    >
                      <strong>{v.registrationNumberRaw}</strong>
                      <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({v.manufacturer})</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {!isCustomerEstablished ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                {foundVehicle 
                  ? "A vehicle was found in the database. Please verify the customer's mobile number to proceed."
                  : "Please search for an existing customer by Mobile Number or Name, or enter new details to create a profile."}
              </p>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">
                  Mobile Number 
                  {isCustomerEstablished && <span style={{fontSize: '0.75rem', marginLeft: '0.5rem', color: 'var(--text-dim)'}}>(New number adds as Alternate Phone)</span>}
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="10-digit number" 
                  value={customerMobile} 
                  onChange={(e) => handleCustomerSearch(e.target.value, 'mobile')}
                  required
                />
              </div>

              {!foundVehicle && (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Or search by Client Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Full Name" 
                    value={customerName} 
                    onChange={(e) => handleCustomerSearch(e.target.value, 'name')} 
                  />
                  {showCustomerDropdown && customerSuggestions.length > 0 && (
                    <div className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '0.25rem', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {customerSuggestions.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => handleSelectCustomer(c)}
                          style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '0.85rem' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                        >
                          <strong>{c.displayName}</strong> - {c.primaryMobile}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (foundVehicle && !customerMobile) {
                    alert("Please verify the mobile number.");
                    return;
                  }
                  if (!foundVehicle && !customerName && !customerMobile) {
                    alert("Please provide at least a Name or Mobile Number.");
                    return;
                  }
                  setIsCustomerEstablished(true);
                  if (foundVehicle) {
                    setStep(3); // Jump to Complaints
                  }
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                {foundVehicle ? 'Confirm & Proceed to Complaints' : 'Confirm Customer & Proceed'}
              </button>
            </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Vehicle Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <Car size={18} color="var(--secondary)" /> Vehicle Information
              </h3>

              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={regNumber} 
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Make / Manufacturer Autocomplete */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Make / Manufacturer</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Hyundai" 
                    value={manufacturer} 
                    onChange={(e) => {
                      setManufacturer(e.target.value);
                      setShowMakeDropdown(true);
                    }}
                    onFocus={() => setShowMakeDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMakeDropdown(false), 200)}
                    required
                    autoComplete="off"
                  />
                  {showMakeDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      zIndex: 30,
                      maxHeight: '150px',
                      overflowY: 'auto',
                      marginTop: '0.25rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                      {manufacturers
                        .filter(m => m.toLowerCase().includes(manufacturer.toLowerCase()))
                        .map(m => (
                          <div
                            key={m}
                            onMouseDown={() => setManufacturer(m)}
                            style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}
                            className="suggestion-item"
                          >
                            {m}
                          </div>
                        ))}
                      {manufacturer.trim() && !manufacturers.some(m => m.toLowerCase() === manufacturer.trim().toLowerCase()) && (
                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Add &quot;{manufacturer}&quot; as new Make
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Model Autocomplete */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Model</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. i10" 
                    value={model} 
                    onChange={(e) => {
                      setModel(e.target.value);
                      setShowModelDropdown(true);
                    }}
                    onFocus={() => setShowModelDropdown(true)}
                    onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                    required
                    autoComplete="off"
                  />
                  {showModelDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      zIndex: 30,
                      maxHeight: '150px',
                      overflowY: 'auto',
                      marginTop: '0.25rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                      {((modelsGrouped[manufacturer] || []))
                        .filter(mdl => mdl.toLowerCase().includes(model.toLowerCase()))
                        .map(mdl => (
                          <div
                            key={mdl}
                            onMouseDown={() => setModel(mdl)}
                            style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}
                            className="suggestion-item"
                          >
                            {mdl}
                          </div>
                        ))}
                      {model.trim() && !(modelsGrouped[manufacturer] || []).some(mdl => mdl.toLowerCase() === model.trim().toLowerCase()) && (
                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Add &quot;{model}&quot; as new Model
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Silver" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fuel Type</label>
                  <select 
                    className="form-control" 
                    value={fuelType} 
                    onChange={(e) => setFuelType(e.target.value)}
                  >
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>CNG</option>
                    <option>EV</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">VIN / Chassis</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={vin} 
                    onChange={(e) => setVin(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Engine Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={engineNumber} 
                    onChange={(e) => setEngineNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Battery Details */}
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>Battery Specifications</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Battery Make / Brand</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Exide, Amaron" 
                      value={batteryMake} 
                      onChange={(e) => setBatteryMake(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Serial Number (S/N)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Battery Serial Number" 
                      value={batterySerialNumber} 
                      onChange={(e) => setBatterySerialNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Installation Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={batteryInstallationDate} 
                      onChange={(e) => setBatteryInstallationDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warranty Period</label>
                    <select 
                      className="form-control" 
                      value={batteryWarrantyMonths} 
                      onChange={(e) => setBatteryWarrantyMonths(parseInt(e.target.value, 10))}
                    >
                      <option value={12}>12 Months</option>
                      <option value={18}>18 Months</option>
                      <option value={24}>24 Months</option>
                      <option value={30}>30 Months</option>
                      <option value={36}>36 Months</option>
                      <option value={48}>48 Months</option>
                      <option value={60}>60 Months</option>
                    </select>
                  </div>
                </div>

                {/* Auto Calculated Warranty status */}
                {(() => {
                  if (!batteryInstallationDate) return null;
                  const instDate = new Date(batteryInstallationDate);
                  if (isNaN(instDate.getTime())) return null;
                  
                  const expiryDate = new Date(instDate);
                  expiryDate.setMonth(expiryDate.getMonth() + batteryWarrantyMonths);
                  const today = new Date();
                  const isExpired = today > expiryDate;
                  
                  // Calculate months
                  const diffTime = expiryDate.getTime() - today.getTime();
                  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4));
                  const absMonths = Math.abs(diffMonths);
                  
                  return (
                    <div style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Warranty Expiry: <strong style={{ color: '#fff' }}>{expiryDate.toLocaleDateString()}</strong>
                      </span>
                      <span style={{ 
                        fontWeight: 600, 
                        color: isExpired ? 'var(--accent-red)' : 'var(--accent-green)' 
                      }}>
                        {isExpired 
                          ? `🔴 Out of Warranty (${absMonths} mo ago)` 
                          : `🟢 In Warranty (${absMonths} mo remaining)`
                        }
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Next Service Scheduling */}
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--secondary)', margin: 0 }}>Next Scheduled Service</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Next Service Odometer (KM)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={nextServiceOdometer} 
                      onChange={(e) => setNextServiceOdometer(parseInt(e.target.value, 10) || 0)}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                        onClick={() => setNextServiceOdometer((odometer || 0) + 5000)}
                      >
                        +5,000 KM
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                        onClick={() => setNextServiceOdometer((odometer || 0) + 10000)}
                      >
                        +10,000 KM
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Next Service Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={nextServiceDate} 
                      onChange={(e) => setNextServiceDate(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                        onClick={() => {
                          const d = new Date();
                          d.setMonth(d.getMonth() + 6);
                          setNextServiceDate(d.toISOString().split('T')[0]);
                        }}
                      >
                        +6 Months
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                        onClick={() => {
                          const d = new Date();
                          d.setMonth(d.getMonth() + 12);
                          setNextServiceDate(d.toISOString().split('T')[0]);
                        }}
                      >
                        +12 Months
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insurance Details */}
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>Insurance Details</h4>
                  {(() => {
                    if (!insuranceExpiryDate) return null;
                    const expDate = new Date(insuranceExpiryDate);
                    if (isNaN(expDate.getTime())) return null;
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffTime = expDate.getTime() - today.getTime();
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isExpired = daysLeft < 0;
                    const absDays = Math.abs(daysLeft);
                    return (
                      <span style={{ 
                        fontWeight: 600, 
                        color: isExpired ? 'var(--accent-red)' : (daysLeft <= 30 ? 'var(--accent-yellow)' : 'var(--accent-green)'),
                        fontSize: '0.8rem'
                      }}>
                        {isExpired ? `🔴 Expired (${absDays} days ago)` : `🟢 Valid (${daysLeft} days left)`}
                      </span>
                    );
                  })()}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Policy Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Policy No."
                      value={insurancePolicyNumber} 
                      onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Insurer Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. HDFC Ergo"
                      value={insurerName} 
                      onChange={(e) => setInsurerName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Insurance Expiry Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={insuranceExpiryDate} 
                    onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* PUC Details */}
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--secondary)', margin: 0 }}>PUC Details</h4>
                  {(() => {
                    if (!nextPucDate) return null;
                    const expDate = new Date(nextPucDate);
                    if (isNaN(expDate.getTime())) return null;
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffTime = expDate.getTime() - today.getTime();
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isExpired = daysLeft < 0;
                    const absDays = Math.abs(daysLeft);
                    return (
                      <span style={{ 
                        fontWeight: 600, 
                        color: isExpired ? 'var(--accent-red)' : (daysLeft <= 30 ? 'var(--accent-yellow)' : 'var(--accent-green)'),
                        fontSize: '0.8rem'
                      }}>
                        {isExpired ? `🔴 Expired (${absDays} days ago)` : `🟢 Valid (${daysLeft} days left)`}
                      </span>
                    );
                  })()}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">PUC Certificate Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="PUC No."
                      value={pucNumber} 
                      onChange={(e) => setPucNumber(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PUC Expiry / Next PUC Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={nextPucDate} 
                      onChange={(e) => setNextPucDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <User size={18} color="var(--primary)" /> Customer Details
              </h3>

              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Full Name" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isCustomerEstablished}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="10-digit number" 
                  value={customerMobile} 
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea 
                  className="form-control" 
                  rows={2} 
                  placeholder="Billing/Delivery address" 
                  value={customerAddress} 
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  disabled={isCustomerEstablished}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Driver Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Driver's Full Name" 
                    value={customerDriverName} 
                    onChange={(e) => setCustomerDriverName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Mobile</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Driver's 10-digit number" 
                    value={customerDriverMobile} 
                    onChange={(e) => setCustomerDriverMobile(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="GST Number" 
                  value={customerTaxId} 
                  onChange={(e) => setCustomerTaxId(e.target.value)}
                  disabled={isCustomerEstablished}
                />
              </div>
            </div>

          </div>
          )}

          {foundVehicle?.history && foundVehicle.history.length > 0 && (
            <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Service History:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {foundVehicle.history.map((h: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.25rem' }}>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>{h.jobcardNumber}</strong> ({new Date(h.dateIn).toLocaleDateString()}) - Odo: {h.odometer || 'N/A'} KM
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {h.parts.concat(h.labour).slice(0, 3).join(', ')}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Cancel</button>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { fetchAiSuggestions(); setStep(3); }}>
              <Sparkles size={16} /> Continue to Intake
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complaints, Photos, Odometer */}
      {step === 3 && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setStep(2)}><ArrowLeft size={20} /></button>
            <h2 style={{ fontSize: '1.5rem' }}>Intake Checklist</h2>
          </div>

          {/* ── AI Service Suggestions Panel ── */}
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Sparkles size={16} color="#6366f1" /> AI Service Advisor
                {aiSuggestionsLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              </h4>
              {aiHistory.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  onClick={() => setShowHistory(h => !h)}
                >
                  <History size={13} /> {showHistory ? 'Hide History' : `History (${aiHistory.length})`}
                </button>
              )}
            </div>

            {/* Service Suggestions */}
            {!aiSuggestionsLoading && aiSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {aiSuggestions.map((s: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                    padding: '0.6rem 0.85rem', borderRadius: '8px',
                    background: s.priority === 'HIGH' ? 'rgba(239,68,68,0.07)' : s.priority === 'MEDIUM' ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid ${s.priority === 'HIGH' ? 'rgba(239,68,68,0.2)' : s.priority === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)'}`,
                    cursor: 'pointer'
                  }}
                    onClick={() => {
                      // One-tap: auto-append suggestion to complaint text
                      setComplaintText(prev => prev ? prev + '\n' + s.service : s.service);
                      if (s.parts?.length) setAdvisorObservation(prev => prev ? prev + '\nParts needed: ' + s.parts.join(', ') : 'Parts needed: ' + s.parts.join(', '));
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', flexShrink: 0, marginTop: '1px',
                      background: s.priority === 'HIGH' ? 'rgba(239,68,68,0.2)' : s.priority === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)',
                      color: s.priority === 'HIGH' ? '#f87171' : s.priority === 'MEDIUM' ? '#fbbf24' : '#34d399'
                    }}>{s.priority}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.service}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{s.reason}</div>
                      {s.parts?.length > 0 && <div style={{ fontSize: '0.73rem', color: '#6366f1', marginTop: '0.15rem' }}>Parts: {s.parts.join(', ')}</div>}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>Tap to add ↗</span>
                  </div>
                ))}
              </div>
            )}

            {!aiSuggestionsLoading && aiSuggestions.length === 0 && !aiSuggestionsLoading && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {foundVehicle ? 'No AI suggestions available for this vehicle.' : 'Tip: Match vehicle in database first to get AI service history suggestions.'}
              </p>
            )}

            {/* Service History Panel */}
            {showHistory && aiHistory.length > 0 && (
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Past Service Records</div>
                {aiHistory.map((h: any, i: number) => (
                  <div key={i} style={{ fontSize: '0.78rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{h.date} @ {h.odo ? h.odo.toLocaleString('en-IN') + ' km' : '—'}</span>
                    <span style={{ flex: 1, textAlign: 'right', color: '#e2e8f0' }}>{h.services || h.parts || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Odometer, Fuel and Complaint Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Odometer Input */}
              <div className="glass-card" style={{ padding: '1rem 1.5rem' }}>
                <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <Gauge size={18} color="var(--primary)" /> Odometer Mileage (KM)
                </h4>
                <input 
                  type="number" 
                  className="form-control"
                  value={odometer} 
                  onChange={(e) => setOdometer(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', fontWeight: 700, fontSize: '1.25rem', textAlign: 'center', padding: '0.75rem' }}
                  min={0}
                  required
                />
              </div>

              {/* Fuel Level */}
              <div className="glass-card" style={{ padding: '1rem 1.5rem' }}>
                <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Fuel size={18} color="var(--secondary)" /> Fuel Level
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  {['E', '25%', '50%', '75%', 'F'].map((lvl) => (
                    <button 
                      key={lvl}
                      type="button"
                      className={`btn ${fuelLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFuelLevel(lvl)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated Delivery */}
              <div className="glass-card" style={{ padding: '1rem 1.5rem' }}>
                <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Calendar size={18} color="var(--accent)" /> Estimated Delivery Date &amp; Time
                </h4>
                <input 
                  type="datetime-local" 
                  className="form-control"
                  value={estimatedDeliveryDate} 
                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem' }}
                />
              </div>

              {/* Free-text Complaints */}
              <div className="form-group">
                <label className="form-label">Customer Complaints / Demanded Work</label>
                <textarea 
                  className="form-control" 
                  rows={3} 
                  placeholder="Free text complaints (e.g. Engine sound at high speeds, AC not cooling)" 
                  value={complaintText} 
                  onChange={(e) => setComplaintText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Advisor Observations</label>
                <textarea 
                  className="form-control" 
                  rows={2} 
                  placeholder="Scratchpad notes / visible body damages" 
                  value={advisorObservation} 
                  onChange={(e) => setAdvisorObservation(e.target.value)}
                />
              </div>
            </div>

            {/* Complaint Icons & 360 Photos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Icon Picker */}
              <div>
                <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <CheckSquare size={18} color="var(--accent-yellow)" /> Complaint Category Library
                </h4>
                <div className="icon-grid">
                  {complaintIconLibrary.map((item) => (
                    <div 
                      key={item.key} 
                      className={`icon-item ${selectedIcons.includes(item.key) ? 'selected' : ''}`}
                      onClick={() => toggleIcon(item.key)}
                    >
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        background: selectedIcons.includes(item.key) ? '#ffffff' : `${item.color}20`,
                        color: selectedIcons.includes(item.key) ? item.color : '#ffffff',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {item.label.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="icon-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 360 Photo Grid */}
              <div>
                <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Camera size={18} color="var(--accent-green)" /> 360° Inspection Photo Grid (4-8 Required)
                </h4>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={photoFileInputRef} 
                  onChange={handleInspectionPhotoUpload} 
                  style={{ opacity: 0, position: 'absolute', width: 0, height: 0, zIndex: -1 }} 
                />
                <div className="photo-grid">
                  {photos.map((url, idx) => (
                    <div key={idx} className="photo-cell" onClick={() => capturePhoto(idx)}>
                      {url ? (
                        <>
                          <img src={url} alt={photoLabels[idx]} />
                          <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#fff' }} onClick={(e) => { e.stopPropagation(); const p = [...photos]; p[idx] = null; setPhotos(p); }}>X</div>
                        </>
                      ) : (
                        <>
                          <Camera size={20} style={{ color: 'var(--text-secondary)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{photoLabels[idx]}</span>
                        </>
                      )}
                      <div className="photo-label">{photoLabels[idx]}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button 
              className="btn btn-primary" 
              onClick={() => setStep(4)}
              disabled={photos.filter(p => p !== null).length < 4}
            >
              Continue to Signature
            </button>
            {photos.filter(p => p !== null).length < 4 && (
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--accent-yellow)' }}>
                * Please capture at least 4 inspection photos.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Digital Signature & Submit */}
      {step === 4 && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setStep(3)}><ArrowLeft size={20} /></button>
            <h2 style={{ fontSize: '1.5rem' }}>On-Glass Customer Signature</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Ask the customer to sign on the screen using their finger or a stylus. This will watermark the signature directly on the vehicle inspection grid slip.
          </p>

          <div className="sig-canvas-container">
            <canvas 
              ref={canvasRef}
              className="sig-canvas"
              style={{ touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={clearCanvas}>Clear Signature</button>
            {hasSignature && <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><CheckCircle2 size={16} /> Signed</span>}
          </div>

          {error && (
            <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)} disabled={loading}>Back</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit} 
              disabled={loading || !hasSignature}
              style={{ flex: 1 }}
            >
              {loading ? 'Creating Job Card...' : 'Create & Open Job Card'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success & Print/Share */}
      {step === 5 && createdJobcard && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ padding: '1.25rem', borderRadius: '50%', background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
            <CheckCircle2 size={64} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Job Card Created!</h2>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em' }}>
              {createdJobcard.jobcardNumber}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Intake slip generated and client signature stamped on inspection grid PDF.
            </p>
          </div>

          <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a 
              href={getWhatsAppShareLink()} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}
            >
              <Send size={18} /> Share Intake slip via WhatsApp
            </a>

            <a 
              href={`/print/jobcard/${createdJobcard.jobcardId}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary"
              style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%', background: 'var(--accent-blue)', color: 'white', borderColor: 'var(--accent-blue)' }}
            >
              <FileText size={18} /> Print / Save as PDF
            </a>
            
            <a href="/" onClick={handleLogout} className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
              <RefreshCw size={18} /> Return to Dashboard
            </a>
          </div>
        </div>
      )}

    
      {/* ESTIMATES BUTTON */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
        <button
          onClick={() => setShowEstimateModal(true)}
          style={{ padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none', borderRadius: '50px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          📋 New Estimate
        </button>
      </div>

      {/* ESTIMATES LIST */}
      {estimates.length > 0 && (
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 Recent Estimates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {estimates.map((est: any) => (
              <div key={est.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{est.estimateNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{est.customerName} · {est.vehicleRegNo || 'No Reg'} · ₹{est.totalAmount?.toFixed(0)}</div>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: est.status === 'converted' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: est.status === 'converted' ? '#10b981' : '#6366f1', fontWeight: 600 }}>
                    {est.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => shareEstimateWhatsApp(est)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}>
                    📱 WhatsApp
                  </button>
                  {est.status !== 'converted' && (
                    <button onClick={() => convertEstimateToJob(est.id)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1', color: '#6366f1', borderRadius: '6px', cursor: 'pointer' }}>
                      ➡️ Convert
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {estSuccess && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 9999, background: 'rgba(16,185,129,0.9)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          ✅ {estSuccess}
        </div>
      )}

      {/* ESTIMATE CREATION MODAL */}
      {showEstimateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#6366f1' }}>📋 Create New Estimate</h2>
              <button onClick={() => setShowEstimateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            {estError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>{estError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Customer Name *</label>
                <input className="form-control" value={estCustomerName} onChange={e => setEstCustomerName(e.target.value)} placeholder="e.g. Babbar Singh" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Mobile (for WhatsApp)</label>
                <input className="form-control" value={estCustomerMobile} onChange={e => setEstCustomerMobile(e.target.value)} placeholder="e.g. 9876543210" inputMode="tel" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Vehicle Reg No</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-control" value={estVehicleReg} onChange={e => setEstVehicleReg(e.target.value.toUpperCase())} placeholder="e.g. DL 01 AB 1234" style={{ fontSize: '0.9rem' }} />
                  <button onClick={() => estPerformLookup(estVehicleReg)} className="btn btn-secondary" style={{ padding: '0 0.5rem' }} title="Search Database">
                    <Search size={16} />
                  </button>
                  <label className="btn btn-secondary" style={{ padding: '0 0.5rem', display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }} title="Scan Plate">
                    <Camera size={16} />
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={estHandleCameraScan} />
                  </label>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Make / Model</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-control" value={estVehicleMake} onChange={e => setEstVehicleMake(e.target.value)} placeholder="Make" style={{ fontSize: '0.9rem' }} />
                  <input className="form-control" value={estVehicleModel} onChange={e => setEstVehicleModel(e.target.value)} placeholder="Model" style={{ fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>Customer Notes</label>
                <textarea className="form-control" value={estNotes} onChange={e => setEstNotes(e.target.value)} placeholder="Complaint description or special instructions..." rows={2} style={{ fontSize: '0.9rem', resize: 'vertical' }} />
              </div>
            </div>

            
            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference Photos</h4>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {estPhotos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={photo} alt="reference" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                    <button onClick={() => setEstPhotos(estPhotos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✕</button>
                  </div>
                ))}
                <label style={{ width: '80px', height: '80px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.7rem', background: 'rgba(255,255,255,0.02)' }}>
                  <Camera size={20} style={{ marginBottom: '0.2rem' }} />
                  <span>Add Photo</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.success) {
                          setEstPhotos([...estPhotos, data.url]);
                        } else {
                          alert('Upload failed');
                        }
                      } catch (err) { alert('Upload error'); }
                    }
                  }} />
                </label>
              </div>
            </div>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Items (Parts &amp; Labour)</h4>
            {estLines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 70px 90px 60px 32px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <select className="form-control" value={line.lineType} onChange={e => { const l=[...estLines]; l[i].lineType=e.target.value; setEstLines(l); }} style={{ fontSize: '0.75rem', padding: '0.4rem' }}>
                  <option value="labour">Labour</option>
                  <option value="part">Part</option>
                </select>
                <input className="form-control" value={line.name} onChange={e => { const l=[...estLines]; l[i].name=e.target.value; setEstLines(l); }} placeholder="Description..." style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                <input type="number" className="form-control" value={line.quantity} onChange={e => { const l=[...estLines]; l[i].quantity=parseFloat(e.target.value)||1; setEstLines(l); }} placeholder="Qty" style={{ fontSize: '0.85rem', padding: '0.4rem', textAlign: 'center' }} min="1" />
                <input type="number" className="form-control" value={line.unitPrice} onChange={e => { const l=[...estLines]; l[i].unitPrice=parseFloat(e.target.value)||0; setEstLines(l); }} placeholder="₹ Price" style={{ fontSize: '0.85rem', padding: '0.4rem' }} min="0" />
                <input type="number" className="form-control" value={line.taxRate} onChange={e => { const l=[...estLines]; l[i].taxRate=parseFloat(e.target.value)||18; setEstLines(l); }} placeholder="GST%" style={{ fontSize: '0.75rem', padding: '0.4rem' }} />
                <button onClick={() => setEstLines(estLines.filter((_, j) => j !== i))} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>✕</button>
              </div>
            ))}
            
            {/* Totals preview */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.85rem', display: 'flex', gap: '1.5rem', justifyContent: 'flex-end' }}>
              {(() => {
                let subtotal = 0, tax = 0;
                estLines.forEach(l => {
                  const base = (l.unitPrice || 0) * (l.quantity || 1);
                  const t = base * (l.taxRate || 18) / 100;
                  subtotal += base; tax += t;
                });
                return <>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal: <strong style={{ color: '#fff' }}>₹{subtotal.toFixed(0)}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>GST: <strong style={{ color: '#f59e0b' }}>₹{tax.toFixed(0)}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Total: <strong style={{ color: '#10b981', fontSize: '1rem' }}>₹{(subtotal+tax).toFixed(0)}</strong></span>
                </>;
              })()}
            </div>

            <button onClick={() => setEstLines([...estLines, { lineType: 'part', name: '', quantity: 1, unitPrice: 0, taxRate: 18 }])} style={{ marginTop: '0.75rem', width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
              + Add Line Item
            </button>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEstimateModal(false)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>Cancel</button>
              <button onClick={createEstimate} disabled={isSavingEst} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isSavingEst ? '⏳ Saving...' : '✅ Create Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
