'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  FileText, 
  Car, 
  User, 
  DollarSign, 
  Percent, 
  Printer, 
  Clock, 
  Wrench, 
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Check,
  Package,
  PlusCircle,
  Search,
  Send,
  Calendar,
  Truck,
  RefreshCw
} from 'lucide-react';

export default function ManagerPage() {
  const router = useRouter();

  useEffect(() => {
    const sessionStr = localStorage.getItem('workshop_session');
    if (!sessionStr) {
      router.push('/');
      return;
    }
    try {
      const session = JSON.parse(sessionStr);
      if (!session || !['admin', 'manager'].includes(session.primaryRole)) {
        router.push('/');
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
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState('jobcards');
  const [activeReservation, setActiveReservation] = useState<any>(null);
  const [mechanicUsers, setMechanicUsers] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  
  // Available mechanics for dropdown selection
  const [availableMechanics, setAvailableMechanics] = useState<any[]>([]);

  // Local state for line edits (flushed to DB on Save)
  const [partsLines, setPartsLines] = useState<any[]>([]);
  const [labourLines, setLabourLines] = useState<any[]>([]);
  const [primaryMechanicId, setPrimaryMechanicId] = useState('');
  
  // WhatsApp Vendor Request states
  const [selectedVendorParts, setSelectedVendorParts] = useState<string[]>([]);
  const [whatsappVendorMobile, setWhatsappVendorMobile] = useState('');
  const [overallDiscountType, setOverallDiscountType] = useState('percent');
  const [overallDiscountValue, setOverallDiscountValue] = useState(0);
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState('Delhi'); // Default local state
  const [taxEnabled, setTaxEnabled] = useState(true);

  // Editable Customer & Vehicle Profile States
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerDriverName, setCustomerDriverName] = useState('');
  const [customerDriverMobile, setCustomerDriverMobile] = useState('');
  const [customerIsPriority, setCustomerIsPriority] = useState(false);
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  
  const [vehicleManufacturer, setVehicleManufacturer] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [vehicleEngineNumber, setVehicleEngineNumber] = useState('');
  const [vehicleFuelType, setVehicleFuelType] = useState('Petrol');
  const [intakeOdometer, setOdometer] = useState<number>(0);

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

  // Search Masters state
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [labourSearchQuery, setLabourSearchQuery] = useState('');
  const [labourSearchResults, setLabourSearchResults] = useState<any[]>([]);

  // Pre-Bookings States
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch('/api/reservations');
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {}
    finally {
      setBookingsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users);
      }
    } catch (err) {}
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings();
      }
    } catch (err) {}
  };

  const handleAssignBooking = async (id: string, advisorId: string, team: string, driverId: string) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, advisorId, team, driverId })
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings();
        alert('Booking assignment updated!');
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchBookings();
    fetchUsers();
  }, []);

  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch all jobs
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobcards');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobcards);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchEstimates = async () => {
    try {
      const res = await fetch('/api/estimates');
      const data = await res.json();
      if (data.success) setEstimates(data.estimates || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchJobs();
    fetchEstimates();
  }, []);

  // Fetch active job card details
  const selectJob = async (jobId: string) => {
    setLoading(true);
    setError(null);
    setSelectedVendorParts([]);
    setWhatsappVendorMobile('');
    try {
      const res = await fetch(`/api/jobcards/${jobId}`);
      const data = await res.json();
      if (data.success) {
        setActiveJob(data.jobcard);
        setAvailableMechanics(data.availableMechanics || []);
        
        // Load lines into edit state
        setPartsLines(data.jobcard.partLines || []);
        setLabourLines(data.jobcard.labourLines || []);
        setPrimaryMechanicId(data.jobcard.primaryMechanicId || '');
        setOverallDiscountType(data.jobcard.overallDiscountType || 'percent');
        setOverallDiscountValue(data.jobcard.overallDiscountValue || 0);
        setPlaceOfSupplyState(data.jobcard.placeOfSupplyState || 'Delhi');

        // Populate customer & vehicle profile edit states
        setCustomerName(data.jobcard.customer?.displayName || data.jobcard.snapshot?.customerName || '');
        setCustomerMobile(data.jobcard.customer?.primaryMobile?.replace('+91', '') || data.jobcard.snapshot?.customerMobile?.replace('+91', '') || '');
        setCustomerDriverName(data.jobcard.customer?.driverName || data.jobcard.snapshot?.customerDriverName || '');
        setCustomerDriverMobile(data.jobcard.customer?.driverMobile?.replace('+91', '') || data.jobcard.snapshot?.customerDriverMobile?.replace('+91', '') || '');
        setCustomerIsPriority(data.jobcard.customer?.isPriority || data.jobcard.snapshot?.customerIsPriority || false);
        setCustomerAddress(data.jobcard.customer?.addressLine1 || data.jobcard.snapshot?.customerAddress || '');
        setCustomerTaxId(data.jobcard.customer?.taxId || data.jobcard.snapshot?.customerTaxId || '');
        
        setVehicleManufacturer(data.jobcard.vehicle?.manufacturer || data.jobcard.snapshot?.vehicleManufacturer || '');
        setVehicleModel(data.jobcard.vehicle?.model || data.jobcard.snapshot?.vehicleModel || '');
        setVehicleColor(data.jobcard.vehicle?.color || data.jobcard.snapshot?.vehicleColor || '');
        setVehicleVin(data.jobcard.vehicle?.vin || data.jobcard.snapshot?.vehicleVin || '');
        setVehicleEngineNumber(data.jobcard.vehicle?.engineNumber || '');
        setVehicleFuelType(data.jobcard.vehicle?.fuelType || 'Petrol');
        setOdometer(data.jobcard.intakeOdometer || data.jobcard.vehicle?.currentOdometer || 0);

        // Load battery and scheduling states
        setBatteryMake(data.jobcard.vehicle?.batteryMake || '');
        setBatterySerialNumber(data.jobcard.vehicle?.batterySerialNumber || '');
        setBatteryInstallationDate(data.jobcard.vehicle?.batteryInstallationDate ? new Date(data.jobcard.vehicle.batteryInstallationDate).toISOString().split('T')[0] : '');
        setBatteryWarrantyMonths(data.jobcard.vehicle?.batteryWarrantyMonths || 24);
        setNextServiceOdometer(data.jobcard.vehicle?.nextServiceOdometer || 0);
        setNextServiceDate(data.jobcard.vehicle?.nextServiceDate ? new Date(data.jobcard.vehicle.nextServiceDate).toISOString().split('T')[0] : '');

        // Load Insurance and PUC states
        setInsurancePolicyNumber(data.jobcard.vehicle?.insurancePolicyNumber || '');
        setInsurerName(data.jobcard.vehicle?.insurerName || '');
        setInsuranceExpiryDate(data.jobcard.vehicle?.insuranceExpiryDate ? new Date(data.jobcard.vehicle.insuranceExpiryDate).toISOString().split('T')[0] : '');
        setPucNumber(data.jobcard.vehicle?.pucNumber || '');
        setNextPucDate(data.jobcard.vehicle?.nextPucDate ? new Date(data.jobcard.vehicle.nextPucDate).toISOString().split('T')[0] : '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  // Search parts master
  const handlePartSearch = async (val: string) => {
    setPartSearchQuery(val);
    if (val.length < 2) {
      setPartSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/parts?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setPartSearchResults(data.parts);
      }
    } catch (err) {}
  };

  // Search labour master
  const handleLabourSearch = async (val: string) => {
    setLabourSearchQuery(val);
    if (val.length < 2) {
      setLabourSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/labour?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setLabourSearchResults(data.labour);
      }
    } catch (err) {}
  };

  // Add Part from Master search
  const addPartFromMaster = (partMaster: any) => {
    const newPart = {
      partMasterId: partMaster.id,
      partName: partMaster.partName,
      partNumber: partMaster.partNumber,
      brand: partMaster.brand,
      quantityRequested: 1,
      sellingPrice: partMaster.defaultSellingPrice || 0,
      taxRate: partMaster.defaultTaxRate || 18.00,
      status: 'approved' // Manager additions default to approved
    };
    setPartsLines([...partsLines, newPart]);
    setPartSearchQuery('');
    setPartSearchResults([]);
  };

  // Add Free-text Part
  const addFreeTextPart = () => {
    const newPart = {
      partName: partSearchQuery || 'Custom Part',
      quantityRequested: 1,
      sellingPrice: 0,
      taxRate: 18.00,
      status: 'approved'
    };
    setPartsLines([...partsLines, newPart]);
    setPartSearchQuery('');
    setPartSearchResults([]);
  };

  // Add Labour from Master search
  const addLabourFromMaster = (labourMaster: any) => {
    const newLabour = {
      labourMasterId: labourMaster.id,
      labourName: labourMaster.labourName,
      quantity: 1,
      sellingPrice: labourMaster.defaultSellingPrice || 0,
      taxRate: labourMaster.defaultTaxRate || 18.00,
      status: 'approved'
    };
    setLabourLines([...labourLines, newLabour]);
    setLabourSearchQuery('');
    setLabourSearchResults([]);
  };

  // Add Free-text Labour
  const addFreeTextLabour = () => {
    const newLabour = {
      labourName: labourSearchQuery || 'Custom Service',
      quantity: 1,
      sellingPrice: 0,
      taxRate: 18.00,
      status: 'approved'
    };
    setLabourLines([...labourLines, newLabour]);
    setLabourSearchQuery('');
    setLabourSearchResults([]);
  };

  // Edit fields on state lines
  const updatePartLine = (index: number, key: string, value: any) => {
    const lines = [...partsLines];
    lines[index][key] = value;
    setPartsLines(lines);
  };

  const updateLabourLine = (index: number, key: string, value: any) => {
    const lines = [...labourLines];
    lines[index][key] = value;
    setLabourLines(lines);
  };

  // Remove lines
  const deletePartLine = (index: number) => {
    const lines = [...partsLines];
    if (lines[index].id) {
      lines[index].isDeleted = true;
      setPartsLines(lines);
    } else {
      setPartsLines(lines.filter((_, i) => i !== index));
    }
  };

  const deleteLabourLine = (index: number) => {
    const lines = [...labourLines];
    if (lines[index].id) {
      lines[index].isDeleted = true;
      setLabourLines(lines);
    } else {
      setLabourLines(lines.filter((_, i) => i !== index));
    }
  };

  // Delete Job Card from DB
  const handleDeleteJobcard = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this job card? This will also delete all associated parts and labor lines. This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobcards/${activeJob.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setActiveJob(null);
        fetchJobs();
      } else {
        throw new Error(data.error || 'Failed to delete job card');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting job card');
    } finally {
      setLoading(false);
    }
  };

  // Save changes to DB
  const saveJobcard = async (newStatus?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobcards/${activeJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus || activeJob.status,
          primaryMechanicId,
          overallDiscountType,
          overallDiscountValue,
          parts: partsLines,
          labour: labourLines,
          
          // Customer & Vehicle detail edits
          customerName,
          customerMobile,
          customerDriverName,
          customerDriverMobile,
          customerIsPriority,
          customerAddress,
          customerTaxId,
          vehicleManufacturer,
          vehicleModel,
          vehicleColor,
          vehicleVin,
          vehicleEngineNumber,
          vehicleFuelType,
          intakeOdometer,
          
          // Battery & Next Service Fields
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
      const data = await res.json();
      if (data.success) {
        // Reload jobcard details
        selectJob(activeJob.id);
        fetchJobs();
      } else {
        throw new Error(data.error || 'Failed to save changes');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving changes');
    } finally {
      setLoading(false);
    }
  };

  // Trigger WhatsApp Vendor parts request
  const sendWhatsAppVendorRequest = () => {
    if (!activeJob || selectedVendorParts.length === 0 || !whatsappVendorMobile) return;

    const partsToRequest = partsLines.filter((p: any) => selectedVendorParts.includes(p.id) || selectedVendorParts.includes(p.partName));
    if (partsToRequest.length === 0) return;

    const mfg = vehicleManufacturer || activeJob.snapshot?.vehicleManufacturer || activeJob.vehicle?.manufacturer || 'N/A';
    const model = vehicleModel || activeJob.snapshot?.vehicleModel || activeJob.vehicle?.model || 'N/A';
    const year = activeJob.vehicle?.manufactureYear || 'N/A';
    const vin = vehicleVin || activeJob.snapshot?.vehicleVin || activeJob.vehicle?.vin || 'N/A';

    let message = `Hello,\n\nPlease quote/supply the following parts for:\n`;
    message += `Vehicle: *${mfg} ${model}*\n`;
    message += `Year: *${year}*\n`;
    message += `VIN: *${vin}*\n\n`;
    message += `*Parts List:*\n`;

    partsToRequest.forEach((p: any, idx: number) => {
      const partNo = p.partNumber ? ` (Part #: ${p.partNumber})` : '';
      const brand = p.brand ? ` [Brand: ${p.brand}]` : '';
      message += `${idx + 1}. ${p.partName} - Qty: ${p.quantityRequested}${partNo}${brand}\n`;
    });

    const cleanPhone = whatsappVendorMobile.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Calculations for real-time manager feedback
  const getSubtotal = () => {
    let subtotal = 0;
    partsLines.forEach(p => {
      if (!p.isDeleted && p.status !== 'requested' && p.status !== 'rejected' && p.status !== 'cancelled') {
        const disc = p.discountType === 'percent' ? (p.sellingPrice * (p.discountValue || 0) / 100) : (p.discountValue || 0);
        subtotal += ((p.sellingPrice || 0) - disc) * (p.quantityRequested || 1);
      }
    });
    labourLines.forEach(l => {
      if (!l.isDeleted) {
        const disc = l.discountType === 'percent' ? (l.sellingPrice * (l.discountValue || 0) / 100) : (l.discountValue || 0);
        subtotal += ((l.sellingPrice || 0) - disc) * (l.quantity || 1);
      }
    });
    return subtotal;
  };

  const getTaxAmount = (subtotal: number) => {
    if (!taxEnabled) return 0;
    let totalTax = 0;
    partsLines.forEach(p => {
      if (!p.isDeleted && p.status !== 'requested' && p.status !== 'rejected' && p.status !== 'cancelled') {
        const price = p.sellingPrice || 0;
        const disc = p.discountType === 'percent' ? (price * (p.discountValue || 0) / 100) : (p.discountValue || 0);
        totalTax += ((price - disc) * (p.quantityRequested || 1)) * ((p.taxRate || 18) / 100);
      }
    });
    labourLines.forEach(l => {
      if (!l.isDeleted) {
        const price = l.sellingPrice || 0;
        const disc = l.discountType === 'percent' ? (price * (l.discountValue || 0) / 100) : (l.discountValue || 0);
        totalTax += ((price - disc) * (l.quantity || 1)) * ((l.taxRate || 18) / 100);
      }
    });

    let overallDiscount = 0;
    if (overallDiscountType === 'percent') {
      overallDiscount = subtotal * overallDiscountValue / 100;
    } else {
      overallDiscount = overallDiscountValue;
    }

    const discountedSubtotal = Math.max(0, subtotal - overallDiscount);
    const taxRatio = subtotal > 0 ? (discountedSubtotal / subtotal) : 0;
    return totalTax * taxRatio;
  };

  const subtotal = getSubtotal();
  const tax = getTaxAmount(subtotal);
  const discount = overallDiscountType === 'percent' ? (subtotal * overallDiscountValue / 100) : overallDiscountValue;
  const total = Math.max(0, subtotal - discount) + tax;

  return (
    <main className="glass-container">
      
      {/* Step 1: Active Jobs Queue */}
      {!activeJob && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <a href="/" onClick={handleLogout} style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={24} /></a>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={28} className="role-manager" style={{ padding: '2px', border: 'none', background: 'transparent' }} />
                Manager Dashboard
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Monitor active repairs, approve mechanic parts requests, edit billing items, and finalize estimates.
              </p>
            </div>
          </div>

          {/* Sub Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
            <button 
              onClick={() => setSubTab('jobcards')} 
              className={`btn ${subTab === 'jobcards' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              Active Job Cards ({jobs.length})
            </button>
            <button 
              onClick={() => setSubTab('bookings')} 
              className={`btn ${subTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              Today's Bookings ({bookings.filter(r => new Date(r.bookingDate).toDateString() === new Date().toDateString()).length})
            </button>
            <button 
              onClick={() => setSubTab('estimates')} 
              className={`btn ${subTab === 'estimates' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              Estimates ({estimates.length})
            </button>
          </div>

          {subTab === 'jobcards' && (
            loading && jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary)', fontWeight: 600 }}>
              Loading active workshop queues...
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Job Card</th>
                    <th style={{ padding: '0.75rem' }}>Vehicle</th>
                    <th style={{ padding: '0.75rem' }}>Customer</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Date In</th>
                    <th style={{ padding: '0.75rem' }}>Total (Est)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No job cards found. Go to Advisor to create a new intake.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{job.jobcardNumber}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <p style={{ fontWeight: 600 }}>{job.snapshot?.vehicleManufacturer} {job.snapshot?.vehicleModel}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{job.snapshot?.vehicleRegistrationNumber}</p>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{job.snapshot?.customerName}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`role-badge ${
                            job.status === 'open' ? 'role-advisor' : 
                            job.status === 'closed' ? 'role-admin' : 'role-mechanic'
                          }`} style={{ fontSize: '0.65rem' }}>
                            {job.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{new Date(job.dateIn).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{job.totalAmount?.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button className="btn btn-secondary" onClick={() => selectJob(job.id)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Control
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

          {subTab === 'reservations' && (
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} style={{ color: 'var(--primary)' }} /> Upcoming Customer Pre-Bookings
                </h3>
                <button className="btn btn-secondary" onClick={fetchBookings} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  Refresh List
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem' }}>Booking No</th>
                      <th style={{ padding: '0.75rem' }}>Customer</th>
                      <th style={{ padding: '0.75rem' }}>Vehicle</th>
                      <th style={{ padding: '0.75rem' }}>Type</th>
                      <th style={{ padding: '0.75rem' }}>Schedule</th>
                      <th style={{ padding: '0.75rem' }}>Assigned Advisor</th>
                      <th style={{ padding: '0.75rem' }}>Assigned Driver</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No upcoming reservations found.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b: any) => {
                        const bookingTimeStr = new Date(b.bookingDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                        const isSelfDelivery = b.bookingType === 'self_delivery';
                        const advisorsList = usersList.filter(u => u.roles.some((r: any) => r.role?.roleKey === 'advisor'));
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{b.bookingNumber}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ color: '#fff', fontWeight: 600 }}>{b.customerName}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>📞 {b.customerMobile}</div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ color: '#fff' }}>{b.regNo}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{b.make} {b.model} {b.year && `(${b.year})`}</div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', background: isSelfDelivery ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)', color: isSelfDelivery ? 'var(--primary)' : '#f59e0b', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                {isSelfDelivery ? <User size={12} /> : <Truck size={12} />}
                                {isSelfDelivery ? 'Self Delivery' : 'Pickup'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', color: '#fff' }}>{bookingTimeStr}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <select 
                                value={b.advisorId || ''} 
                                onChange={(e) => handleAssignBooking(b.id, e.target.value, b.team, b.driverId)}
                                style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.75rem', padding: '0.2rem', borderRadius: '4px' }}
                              >
                                <option value="">-- Choose Advisor --</option>
                                {advisorsList.map(a => (
                                  <option key={a.id} value={a.id}>{a.fullName} ({a.team || 'No Team'})</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {isSelfDelivery ? (
                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>N/A (Self)</span>
                              ) : (
                                <select 
                                  value={b.driverId || ''} 
                                  onChange={(e) => handleAssignBooking(b.id, b.advisorId, b.team, e.target.value)}
                                  style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.75rem', padding: '0.2rem', borderRadius: '4px' }}
                                >
                                  <option value="">-- Choose Driver --</option>
                                  {usersList.map(d => (
                                    <option key={d.id} value={d.id}>{d.fullName}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <select 
                                value={b.status} 
                                onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                                style={{ 
                                  background: b.status === 'confirmed' ? '#10b981' : b.status === 'checked_in' ? 'var(--primary)' : b.status === 'cancelled' ? 'var(--accent-red)' : '#1e293b', 
                                  color: '#fff', fontSize: '0.75rem', padding: '0.2rem', borderRadius: '4px', border: 'none', fontWeight: 600 
                                }}
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="checked_in">Checked In</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => {
                                    const cleanPhone = b.customerMobile.replace(/\D/g, '');
                                    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                                    const drvObj = usersList.find(u => u.id === b.driverId);
                                    const msg = `Dear ${b.customerName},\n\nYour Autobots booking ${b.bookingNumber} is confirmed for ${bookingTimeStr} for vehicle ${b.make} ${b.model} (${b.regNo}).\n\n*Assigned Personnel:*\n- Repair Team: ${b.team || 'Not Assigned'}\n- Service Advisor: ${b.advisorName || 'Not Assigned'}\n${!isSelfDelivery ? `- Pick-up Driver: ${b.driverName || 'Not Assigned'} (${drvObj?.mobile || 'N/A'})\n` : '- Delivery: Self Delivery\n'}\nThank you for choosing Autobots!`;
                                    window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  className="btn btn-secondary"
                                  title="Notify Customer"
                                  style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', borderColor: '#10b981', color: '#10b981' }}
                                >
                                  <Send size={12} /> Cust
                                </button>
                                {b.advisorId && (
                                  <button
                                    onClick={() => {
                                      const adv = usersList.find(u => u.id === b.advisorId);
                                      if (!adv || !adv.mobile) return alert('Advisor mobile number missing');
                                      const cleanPhone = adv.mobile.replace(/\D/g, '');
                                      const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                                      const drvObj = usersList.find(u => u.id === b.driverId);
                                      const msg = `Hello ${b.advisorName},\n\nYou are assigned booking ${b.bookingNumber} for ${b.make} ${b.model} (${b.regNo}) scheduled on ${bookingTimeStr}.\n\n*Details:*\n- Customer: ${b.customerName} (Ph: ${b.customerMobile})\n- Repair Team: ${b.team || 'Not Assigned'}\n- Pick-up Driver: ${b.driverName || 'Not Assigned'} (${drvObj?.mobile || 'N/A'})\n\nPlease prepare accordingly.`;
                                      window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="btn btn-secondary"
                                    title="Notify Advisor"
                                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}
                                  >
                                    <Send size={12} /> Adv
                                  </button>
                                )}
                                {!isSelfDelivery && b.driverId && (
                                  <button
                                    onClick={() => {
                                      const drv = usersList.find(u => u.id === b.driverId);
                                      if (!drv || !drv.mobile) return alert('Driver mobile number missing');
                                      const cleanPhone = drv.mobile.replace(/\D/g, '');
                                      const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                                      const msg = `Hello ${b.driverName},\n\nYou are assigned pick-up for vehicle ${b.regNo} (${b.make} ${b.model}) on ${bookingTimeStr}.\n\n*Details:*\n- Customer: ${b.customerName} (Ph: ${b.customerMobile})\n- Repair Team: ${b.team || 'Not Assigned'}\n- Service Advisor: ${b.advisorName || 'Not Assigned'}\n\nPlease contact the customer to coordinate the pick-up.`;
                                      window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="btn btn-secondary"
                                    title="Notify Driver"
                                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', borderColor: '#f59e0b', color: '#f59e0b' }}
                                  >
                                    <Send size={12} /> Drv
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* --- SUBTAB: ESTIMATES --- */}
          {subTab === 'estimates' && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#6366f1' }}>📋 Generated Estimates</h3>
                <button className="btn btn-secondary" onClick={fetchEstimates} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {estimates.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No estimates found.</p>
                ) : (
                  estimates.map(est => (
                    <div key={est.id} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginBottom: '0.2rem' }}>{est.estimateNumber}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          Customer: {est.customerName} · Vehicle: {est.vehicleRegNo || 'N/A'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', marginBottom: '0.2rem' }}>₹{est.totalAmount?.toFixed(0)}</div>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 600,
                          background: est.status === 'converted' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                          color: est.status === 'converted' ? '#10b981' : '#6366f1'
                        }}>
                          {est.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                        <a 
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`*ESTIMATE — ${est.estimateNumber}*\n\nCustomer: ${est.customerName}\nVehicle: ${est.vehicleRegNo}\nAmount: ₹${est.totalAmount}\n\nPlease contact us for further details.`)}`} 
                          target="_blank" rel="noreferrer"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          📱 Share via WhatsApp
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Job Card Controller */}
      {activeJob && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="no-print">
          
          {/* Header controllers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setActiveJob(null)}><ArrowLeft size={20} /></button>
              <h2 style={{ fontSize: '1.5rem' }}>
                Control Card: <span style={{ color: 'var(--primary)' }}>{activeJob.jobcardNumber}</span>
              </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleDeleteJobcard}
                style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
              >
                <Trash2 size={16} /> Delete Card
              </button>
              <div style={{ position: 'relative' }}>
                <select 
                  className="btn btn-secondary" 
                  style={{ appearance: 'none', padding: '0.5rem 1rem 0.5rem 2.25rem', fontSize: '0.85rem', cursor: 'pointer' }}
                  onChange={(e) => {
                    if (e.target.value) {
                      window.open(`/print/${e.target.value}/${activeJob.id}`, '_blank');
                      e.target.value = '';
                    }
                  }}
                  title="Print Document"
                >
                  <option value="">Print...</option>
                  <option value="jobcard">Jobcard</option>
                  <option value="estimate">Estimate</option>
                  <option value="invoice">Invoice</option>
                  <option value="delivery_slip">Delivery Slip</option>
                </select>
                <Printer size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
              
              {activeJob.status === 'closed' ? (
                <button className="btn btn-secondary" onClick={() => saveJobcard('open')} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)' }}>
                  <Unlock size={16} /> Re-Open Card
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => saveJobcard('closed')} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', background: 'var(--accent-green)', color: '#fff' }}>
                  <Lock size={16} /> Close &amp; Lock Card
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                        {/* Customer Details Form */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <User size={16} color="var(--primary)" /> Edit Customer Profile
              </h3>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Customer Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Mobile</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={customerMobile} 
                  onChange={(e) => setCustomerMobile(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Driver Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={customerDriverName} 
                  onChange={(e) => setCustomerDriverName(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Driver Mobile</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={customerDriverMobile} 
                  onChange={(e) => setCustomerDriverMobile(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={customerIsPriority}
                  onChange={(e) => setCustomerIsPriority(e.target.checked)} 
                  id="isPriorityCheck"
                />
                <label htmlFor="isPriorityCheck" className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Priority Customer</label>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Billing Address</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={customerAddress} 
                  onChange={(e) => setCustomerAddress(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>GSTIN</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={customerTaxId} 
                  onChange={(e) => setCustomerTaxId(e.target.value)} 
                />
              </div>
            </div>

            {/* Vehicle Details & Mechanic Assignment Form */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Car size={16} color="var(--secondary)" /> Edit Vehicle &amp; Assignment
              </h3>
              <div style={{ fontSize: '0.95rem' }}>
                Reg Plate: <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{activeJob.snapshot?.vehicleRegistrationNumber || activeJob.vehicle?.registrationNumberRaw}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Make</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={vehicleManufacturer} 
                    onChange={(e) => setVehicleManufacturer(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Model</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={vehicleModel} 
                    onChange={(e) => setVehicleModel(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Color</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={vehicleColor} 
                    onChange={(e) => setVehicleColor(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Fuel Type</label>
                  <select 
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={vehicleFuelType} 
                    onChange={(e) => setVehicleFuelType(e.target.value)}
                  >
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>CNG</option>
                    <option>EV</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Odometer (KM)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={intakeOdometer} 
                    onChange={(e) => setOdometer(parseInt(e.target.value, 10) || 0)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>VIN / Chassis</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={vehicleVin} 
                    onChange={(e) => setVehicleVin(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Engine Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={vehicleEngineNumber} 
                  onChange={(e) => setVehicleEngineNumber(e.target.value)} 
                />
              </div>

              {/* Battery Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Battery Details</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Battery Make</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={batteryMake} 
                      onChange={(e) => setBatteryMake(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Serial Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={batterySerialNumber} 
                      onChange={(e) => setBatterySerialNumber(e.target.value)} 
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Install Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={batteryInstallationDate} 
                      onChange={(e) => setBatteryInstallationDate(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Warranty</label>
                    <select 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
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
                {batteryInstallationDate && (() => {
                  const instDate = new Date(batteryInstallationDate);
                  if (isNaN(instDate.getTime())) return null;
                  const expiryDate = new Date(instDate);
                  expiryDate.setMonth(expiryDate.getMonth() + batteryWarrantyMonths);
                  const today = new Date();
                  const isExpired = today > expiryDate;
                  const diffTime = expiryDate.getTime() - today.getTime();
                  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4));
                  const absMonths = Math.abs(diffMonths);
                  return (
                    <div style={{ fontSize: '0.75rem', color: isExpired ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600 }}>
                      Expiry: {expiryDate.toLocaleDateString()} ({isExpired ? `Expired ${absMonths} mo ago` : `${absMonths} mo left`})
                    </div>
                  );
                })()}
              </div>
              {/* Next Service Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600 }}>Next Scheduled Service</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Next Odo (KM)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={nextServiceOdometer} 
                      onChange={(e) => setNextServiceOdometer(parseInt(e.target.value, 10) || 0)} 
                    />
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} onClick={() => setNextServiceOdometer((intakeOdometer || 0) + 5000)}>+5k</button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} onClick={() => setNextServiceOdometer((intakeOdometer || 0) + 10000)}>+10k</button>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Next Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={nextServiceDate} 
                      onChange={(e) => setNextServiceDate(e.target.value)} 
                    />
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 6); setNextServiceDate(d.toISOString().split('T')[0]); }}>+6m</button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 12); setNextServiceDate(d.toISOString().split('T')[0]); }}>+12m</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insurance Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Insurance Details</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Policy Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={insurancePolicyNumber} 
                      onChange={(e) => setInsurancePolicyNumber(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Insurer Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={insurerName} 
                      onChange={(e) => setInsurerName(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Insurance Expiry Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                    value={insuranceExpiryDate} 
                    onChange={(e) => setInsuranceExpiryDate(e.target.value)} 
                  />
                </div>
              </div>

              {/* PUC Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600 }}>PUC Details</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>PUC Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={pucNumber} 
                      onChange={(e) => setPucNumber(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>PUC Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={nextPucDate} 
                      onChange={(e) => setNextPucDate(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Assign Mechanic</label>
                <select 
                  className="form-control"
                  value={primaryMechanicId}
                  onChange={(e) => setPrimaryMechanicId(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                >
                  <option value="">Unassigned</option>
                  {availableMechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.skillCategory || 'General'})</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Intake Notes & Media */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              Intake Notes & Media
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Customer Complaints / External Notes</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem', minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                  {activeJob.externalNotes || activeJob.snapshot?.customerComplaints || 'No external notes recorded.'}
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Internal Advisor Notes</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem', minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                  {activeJob.internalNotes || 'No internal notes recorded.'}
                </div>
              </div>
            </div>

            {activeJob.media && activeJob.media.length > 0 ? (
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'block' }}>Attached Media</label>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {activeJob.media.map((m: any) => (
                    <div key={m.id} style={{ minWidth: '120px', position: 'relative' }}>
                      <img src={m.fileUrl} alt="Job Media" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', fontSize: '0.65rem', padding: '0.25rem', textAlign: 'center', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', textTransform: 'capitalize' }}>
                        {m.mediaType?.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No photos or media attached to this job card.
              </div>
            )}
          </div>

          {/* Parts Manager Panel */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Package size={18} color="var(--accent-yellow)" /> Parts Approvals &amp; Cost Control
            </h3>

            {/* Parts Search / Add Bar */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search Parts Catalog to Add (e.g. brake pads, sensor)..."
                    value={partSearchQuery}
                    onChange={(e) => handlePartSearch(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {partSearchQuery && (
                  <button className="btn btn-secondary" onClick={addFreeTextPart}>
                    <Plus size={16} /> Add Custom Part
                  </button>
                )}
              </div>
              
              {/* Search Suggestions Dropdown */}
              {partSearchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '0.25rem', boxShadow: '0 10px 15px rgba(0,0,0,0.5)' }}>
                  {partSearchResults.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => addPartFromMaster(p)}
                      style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
                    >
                      <div>
                        <strong>{p.partName}</strong> {p.brand ? `| Brand: ${p.brand}` : ''}
                      </div>
                      <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{p.defaultSellingPrice}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parts Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.5rem', width: '40px' }}>Select</th>
                  <th style={{ padding: '0.5rem' }}>Part Name</th>
                  <th style={{ padding: '0.5rem', width: '90px' }}>Qty</th>
                  <th style={{ padding: '0.5rem', width: '110px' }}>Selling Price</th>
                  <th style={{ padding: '0.5rem', width: '90px' }}>Tax Slab</th>
                  <th style={{ padding: '0.5rem', width: '150px' }}>Status Tag</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', width: '50px' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {partsLines.filter(p => !p.isDeleted).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No parts logged on this job.</td>
                  </tr>
                ) : (
                  partsLines.map((part, idx) => {
                    if (part.isDeleted) return null;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <input 
                            type="checkbox"
                            checked={selectedVendorParts.includes(part.id || part.partName)}
                            onChange={(e) => {
                              const key = part.id || part.partName;
                              if (e.target.checked) {
                                setSelectedVendorParts([...selectedVendorParts, key]);
                              } else {
                                setSelectedVendorParts(selectedVendorParts.filter(k => k !== key));
                              }
                            }}
                            style={{ width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <p style={{ fontWeight: 600 }}>{part.partName}</p>
                          {part.mechanicNote && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Note: {part.mechanicNote}</p>}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            value={part.quantityRequested}
                            onChange={(e) => updatePartLine(idx, 'quantityRequested', parseFloat(e.target.value) || 1)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '6px', color: 'var(--text-secondary)' }}>₹</span>
                            <input 
                              type="number" 
                              className="form-control" 
                              style={{ padding: '0.25rem 0.5rem 0.25rem 1rem', fontSize: '0.8rem' }}
                              value={part.sellingPrice || 0}
                              onChange={(e) => updatePartLine(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <select 
                            className="form-control" 
                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            value={part.taxRate}
                            onChange={(e) => updatePartLine(idx, 'taxRate', parseFloat(e.target.value))}
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <select 
                            className="form-control" 
                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            value={part.status}
                            onChange={(e) => updatePartLine(idx, 'status', e.target.value)}
                          >
                            <option value="requested">⏳ Requested</option>
                            <option value="approved">🟢 Approved</option>
                            <option value="in_stock">🟢 In Stock</option>
                            <option value="ordered">🔵 Ordered</option>
                            <option value="rejected">🔴 Rejected</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <button className="btn btn-secondary" onClick={() => deletePartLine(idx)} style={{ padding: '0.25rem', color: 'var(--accent-red)' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* WhatsApp On-Demand Vendor Request Block */}
            {partsLines.filter(p => !p.isDeleted).length > 0 && (
              <div style={{ border: '1px solid rgba(139, 92, 246, 0.2)', background: 'rgba(139, 92, 246, 0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', display: 'flex', gap: '0.25rem', alignItems: 'center', color: '#a78bfa', margin: 0 }}>
                  <Send size={16} /> On-Demand WhatsApp Vendor Request
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Send the vehicle details (Make, Model, Year, VIN) and selected parts request to your parts supplier.
                </p>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Vendor Phone Number (with country code)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 919876543210" 
                    value={whatsappVendorMobile} 
                    onChange={(e) => setWhatsappVendorMobile(e.target.value.replace(/\D/g, ''))}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  disabled={selectedVendorParts.length === 0 || !whatsappVendorMobile}
                  onClick={sendWhatsAppVendorRequest}
                  style={{ background: '#8b5cf6', borderColor: '#8b5cf6', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', justifyContent: 'center', alignItems: 'center', padding: '0.5rem' }}
                >
                  <Send size={12} /> Send Vendor Request ({selectedVendorParts.length} selected)
                </button>
              </div>
            )}
          </div>

          {/* Labour / Services Pricing Panel */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Wrench size={18} color="var(--secondary)" /> Labour &amp; Repair Pricing Control
            </h3>

            {/* Labour Search / Add Bar */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search Labour Catalog to Add (e.g. engine tuning, washing)..."
                    value={labourSearchQuery}
                    onChange={(e) => handleLabourSearch(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {labourSearchQuery && (
                  <button className="btn btn-secondary" onClick={addFreeTextLabour}>
                    <Plus size={16} /> Add Custom Labour
                  </button>
                )}
              </div>
              
              {/* Search Suggestions Dropdown */}
              {labourSearchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '0.25rem', boxShadow: '0 10px 15px rgba(0,0,0,0.5)' }}>
                  {labourSearchResults.map(l => (
                    <div 
                      key={l.id} 
                      onClick={() => addLabourFromMaster(l)}
                      style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
                    >
                      <div><strong>{l.labourName}</strong></div>
                      <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{l.defaultSellingPrice}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Labour Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.5rem' }}>Service Task</th>
                  <th style={{ padding: '0.5rem', width: '90px' }}>Hours/Qty</th>
                  <th style={{ padding: '0.5rem', width: '120px' }}>Rate / Price</th>
                  <th style={{ padding: '0.5rem', width: '90px' }}>Tax Slab</th>
                  <th style={{ padding: '0.5rem', width: '150px' }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', width: '50px' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {labourLines.filter(l => !l.isDeleted).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No labour charges logged on this job.</td>
                  </tr>
                ) : (
                  labourLines.map((line, idx) => {
                    if (line.isDeleted) return null;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <p style={{ fontWeight: 600 }}>{line.labourName}</p>
                          {line.mechanicNote && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Note: {line.mechanicNote}</p>}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            value={line.quantity || 1}
                            onChange={(e) => updateLabourLine(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '6px', color: 'var(--text-secondary)' }}>₹</span>
                            <input 
                              type="number" 
                              className="form-control" 
                              style={{ padding: '0.25rem 0.5rem 0.25rem 1rem', fontSize: '0.8rem' }}
                              value={line.sellingPrice || 0}
                              onChange={(e) => updateLabourLine(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <select 
                            className="form-control" 
                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            value={line.taxRate || 18}
                            onChange={(e) => updateLabourLine(idx, 'taxRate', parseFloat(e.target.value))}
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <select 
                            className="form-control" 
                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            value={line.status}
                            onChange={(e) => updateLabourLine(idx, 'status', e.target.value)}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="in_progress">⚙️ In Progress</option>
                            <option value="completed">🟢 Done</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <button className="btn btn-secondary" onClick={() => deleteLabourLine(idx)} style={{ padding: '0.25rem', color: 'var(--accent-red)' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary & Discount Configuration */}
          <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Tax & Discount Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>Discounts &amp; Taxes</h4>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Discount Type</label>
                  <select 
                    className="form-control"
                    value={overallDiscountType}
                    onChange={(e) => setOverallDiscountType(e.target.value)}
                  >
                    <option value="percent">% Percentage</option>
                    <option value="amount">₹ Flat Amount</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Value</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={overallDiscountValue}
                    onChange={(e) => setOverallDiscountValue(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                <span className="form-label" style={{ margin: 0 }}>Apply 18% GST (CGST + SGST)</span>
                <input 
                  type="checkbox" 
                  checked={taxEnabled} 
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Place of Supply (State)</label>
                <select 
                  className="form-control"
                  value={placeOfSupplyState}
                  onChange={(e) => setPlaceOfSupplyState(e.target.value)}
                >
                  <option value="Delhi">Delhi (Intra-state CGST/SGST 9%+9%)</option>
                  <option value="Haryana">Haryana (Inter-state IGST 18%)</option>
                  <option value="Uttar Pradesh">Uttar Pradesh (Inter-state IGST 18%)</option>
                </select>
              </div>
            </div>

            {/* Calculations Display */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Subtotal (Net):</span>
                <span>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Overall Discount:</span>
                <span style={{ color: 'var(--accent-red)' }}>- ₹{discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {/* GST split visualization */}
              {taxEnabled && placeOfSupplyState === 'Delhi' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1rem' }}>
                    <span>CGST (9%):</span>
                    <span>₹{(tax / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1rem' }}>
                    <span>SGST (9%):</span>
                    <span>₹{(tax / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>{taxEnabled ? 'IGST (18%):' : 'Taxes (Tax-Exclusive):'}</span>
                  <span>₹{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                <span>Grand Total:</span>
                <span>₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setActiveJob(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => saveJobcard()} style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Saving adjustments...' : 'Save Pricing & Approvals'}
            </button>
          </div>

        </div>
      )}

      {/* A4 PRINT VIEW MARKUP (Only visible when printing) */}
      {activeJob && (
        <div className="print-only" style={{ display: 'none' }}>
          
          {/* Print Header */}
          <div className="print-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '1.5rem' }}>
            {(!profile || profile.showCompanyDetails !== false) && (
              <div>
                {(!profile || profile.showCompanyName) && (
                  <h1 style={{ fontSize: '20pt', margin: 0 }}>{profile?.workshopName || 'Autobots Multibrand Repair'}</h1>
                )}
                {(!profile || profile.showCompanyAddress || profile.showCompanyContact || profile.showCompanyGstin) && (
                  <p style={{ fontSize: '9pt', color: '#555', margin: '4px 0 0 0' }}>
                    {(!profile || profile.showCompanyAddress) && (
                      <>
                        {profile?.addressLine1 || 'B-108, Phase-I, Okhla Industrial Area'}{profile?.addressLine2 && `, ${profile.addressLine2}`}{profile?.city && `, ${profile.city}`}{profile?.state && `, ${profile.state}`} {profile?.postalCode || '110020'}<br />
                      </>
                    )}
                    {(!profile || profile.showCompanyContact) && (
                      <>
                        Ph: {profile?.mobile || '+91-9876543210'} | Email: {profile?.email || 'info@autobots.co.in'}<br />
                      </>
                    )}
                    {(!profile || profile.showCompanyGstin) && (
                      <>
                        GSTIN: {profile?.gstin || '07AAAAA1111A1Z1'} {profile?.pan && `| PAN: ${profile.pan}`}
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
              {(!profile || (profile.showCompanyDetails !== false && profile.showCompanyLogo)) && profile?.logoUrl && (
                <img src={profile.logoUrl} alt="Logo" style={{ maxHeight: '55px', objectFit: 'contain', marginBottom: '4px' }} />
              )}
              <div>
                <h2 style={{ fontSize: '18pt', margin: 0, textTransform: 'uppercase', color: '#000', fontWeight: 'bold' }}>REPAIR ESTIMATE</h2>
                <p style={{ fontSize: '10pt', margin: '4px 0 0 0' }}>
                  <strong>No:</strong> {activeJob.jobcardNumber}<br />
                  <strong>Date:</strong> {new Date(activeJob.dateIn).toLocaleDateString()}<br />
                  <strong>Status:</strong> {activeJob.status}
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderBottom: '1px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem', fontSize: '10pt' }}>
            <div>
              <h3 style={{ fontSize: '11pt', margin: '0 0 6px 0', borderBottom: '1px solid #ccc' }}>CUSTOMER DETAILS</h3>
              <strong>Name:</strong> {customerName}<br />
              <strong>Phone:</strong> {customerMobile || 'N/A'}<br />
              <strong>Address:</strong> {customerAddress || 'N/A'}<br />
              <strong>GSTIN:</strong> {customerTaxId || 'N/A'}
            </div>
            <div>
              <h3 style={{ fontSize: '11pt', margin: '0 0 6px 0', borderBottom: '1px solid #ccc' }}>VEHICLE DETAILS</h3>
              <strong>Registration:</strong> {activeJob.snapshot?.vehicleRegistrationNumber || activeJob.vehicle?.registrationNumberRaw}<br />
              <strong>Make / Model:</strong> {vehicleManufacturer} {vehicleModel}<br />
              <strong>Odometer intake:</strong> {intakeOdometer ? `${intakeOdometer} KM` : 'N/A'}<br />
              <strong>Fuel Level:</strong> {activeJob.fuelLevel || 'N/A'}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="print-table" style={{ fontSize: '9.5pt' }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Tax</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Part Lines */}
              {partsLines
                .filter(p => !p.isDeleted && p.status !== 'requested' && p.status !== 'rejected' && p.status !== 'cancelled')
                .map((part, idx) => {
                  const disc = part.discountType === 'percent' ? (part.sellingPrice * (part.discountValue || 0) / 100) : (part.discountValue || 0);
                  const price = part.sellingPrice - disc;
                  const total = price * part.quantityRequested;
                  return (
                    <tr key={`p-${idx}`}>
                      <td>{part.partName} {part.brand ? `(${part.brand})` : ''}</td>
                      <td>Part / Spares</td>
                      <td style={{ textAlign: 'center' }}>{part.quantityRequested}</td>
                      <td style={{ textAlign: 'right' }}>{part.sellingPrice?.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{part.taxRate}%</td>
                      <td style={{ textAlign: 'right' }}>{total?.toFixed(2)}</td>
                    </tr>
                  );
                })}

              {/* Labour Lines */}
              {labourLines
                .filter(l => !l.isDeleted)
                .map((labour, idx) => {
                  const disc = labour.discountType === 'percent' ? (labour.sellingPrice * (labour.discountValue || 0) / 100) : (labour.discountValue || 0);
                  const price = labour.sellingPrice - disc;
                  const total = price * labour.quantity;
                  return (
                    <tr key={`l-${idx}`}>
                      <td>{labour.labourName}</td>
                      <td>Labour / Service</td>
                      <td style={{ textAlign: 'center' }}>{labour.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{labour.sellingPrice?.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{labour.taxRate}%</td>
                      <td style={{ textAlign: 'right' }}>{total?.toFixed(2)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* Pricing Totals */}
          <div className="print-totals" style={{ fontSize: '10pt' }}>
            <div className="print-totals-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="print-totals-row">
                <span>Discount:</span>
                <span>- ₹{discount.toFixed(2)}</span>
              </div>
            )}
            
            {taxEnabled && profile?.showGstRates !== false && placeOfSupplyState === 'Delhi' ? (
              <>
                <div className="print-totals-row">
                  <span>CGST (9%):</span>
                  <span>₹{(tax / 2).toFixed(2)}</span>
                </div>
                <div className="print-totals-row">
                  <span>SGST (9%):</span>
                  <span>₹{(tax / 2).toFixed(2)}</span>
                </div>
              </>
            ) : taxEnabled && profile?.showGstRates !== false ? (
              <div className="print-totals-row">
                <span>IGST (18%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
            ) : (
              <div className="print-totals-row">
                <span>{taxEnabled ? 'GST / Taxes:' : 'Taxes:'}</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
            )}

            <div className="print-totals-row grand-total" style={{ fontSize: '11pt', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px' }}>
              <span>Grand Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Signatures placeholder */}
          <div style={{ marginTop: '6rem', display: 'flex', justifyContent: 'space-between', fontSize: '10pt' }}>
            <div style={{ borderTop: '1px dashed #000', width: '200px', textAlign: 'center', paddingTop: '6px' }}>
              Service Advisor Signature
            </div>
            <div style={{ borderTop: '1px dashed #000', width: '200px', textAlign: 'center', paddingTop: '6px' }}>
              Customer Signature
            </div>
          </div>

        </div>
      )}

      {/* Global CSS injection to display print view during print dialog */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </main>
  );
}
