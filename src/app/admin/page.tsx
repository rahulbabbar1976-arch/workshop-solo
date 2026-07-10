'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Database, 
  Users, 
  Settings, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  PlusCircle,
  Wrench,
  UserCheck,
  UserPlus,
  Calendar,
  Truck,
  Clock,
  Send
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const sessionStr = localStorage.getItem('workshop_session');
    if (!sessionStr) {
      router.push('/');
      return;
    }
    try {
      const session = JSON.parse(sessionStr);
      if (!session || session.primaryRole !== 'admin') {
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

  // Import states
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // User states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // User Form states
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [quickPin, setQuickPin] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['mechanic']); // Default
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Workshop Profile States
  const [profileId, setProfileId] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [showCompanyAddress, setShowCompanyAddress] = useState(true);
  const [showCompanyContact, setShowCompanyContact] = useState(true);
  const [showCompanyGstin, setShowCompanyGstin] = useState(true);
  const [showCompanyLogo, setShowCompanyLogo] = useState(true);
  const [showGstRates, setShowGstRates] = useState(true);
  const [showCompanyDetails, setShowCompanyDetails] = useState(true);
  const [geminiApiKeys, setGeminiApiKeys] = useState<string[]>(['']);
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Load profile details
  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        setProfileId(p.id);
        setWorkshopName(p.workshopName);
        setAddressLine1(p.addressLine1 || '');
        setAddressLine2(p.addressLine2 || '');
        setCity(p.city || '');
        setState(p.state || '');
        setPostalCode(p.postalCode || '');
        setProfileMobile(p.mobile || '');
        setProfileEmail(p.email || '');
        setGstin(p.gstin || '');
        setPan(p.pan || '');
        setLogoUrl(p.logoUrl || '');
        setShowCompanyName(p.showCompanyName !== undefined ? p.showCompanyName : true);
        setShowCompanyAddress(p.showCompanyAddress !== undefined ? p.showCompanyAddress : true);
        setShowCompanyContact(p.showCompanyContact !== undefined ? p.showCompanyContact : true);
        setShowCompanyGstin(p.showCompanyGstin !== undefined ? p.showCompanyGstin : true);
        setShowCompanyLogo(p.showCompanyLogo !== undefined ? p.showCompanyLogo : true);
        setShowGstRates(p.showGstRates !== undefined ? p.showGstRates : true);
        setShowCompanyDetails(p.showCompanyDetails !== undefined ? p.showCompanyDetails : true);
        const loadedKeys = (p.geminiApiKey || '').split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
        setGeminiApiKeys(loadedKeys.length > 0 ? loadedKeys : ['']);
      }
    } catch (err) {}
    finally {
      setProfileLoading(false);
    }
  };

  // Load users and roles on mount
  const loadUsersAndRoles = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users);
        setAvailableRoles(data.roles);
      }
    } catch (err) {}
    finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndRoles();
    loadProfile();
  }, []);

  const runImport = async () => {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await fetch('/api/import', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setImportResult(data);
        // Refresh users list after import, in case any new users were imported
        loadUsersAndRoles();
      } else {
        setImportError(data.error || 'Import failed');
      }
    } catch (err: any) {
      setImportError(err.message || 'Network error');
    } finally {
      setImporting(false);
    }
  };

  const handleRoleCheckbox = (roleKey: string) => {
    if (selectedRoles.includes(roleKey)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleKey));
    } else {
      setSelectedRoles([...selectedRoles, roleKey]);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(false);

    if (!fullName.trim()) {
      setUserError('Full Name is required');
      return;
    }
    if (selectedRoles.length === 0) {
      setUserError('Please select at least one role');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          mobile,
          email,
          password,
          quickPin,
          skillCategory: selectedRoles.includes('mechanic') ? skillCategory : null,
          roleKeys: selectedRoles,
          team: newUserTeam || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setUserSuccess(true);
        // Reset form
        setFullName('');
        setMobile('');
        setEmail('');
        setPassword('');
        setQuickPin('');
        setSkillCategory('');
        setNewUserTeam('');
        setSelectedRoles(['mechanic']);
        setShowAddForm(false);
        // Refresh list
        loadUsersAndRoles();
      } else {
        setUserError(data.error || 'Failed to create account');
      }
    } catch (err: any) {
      setUserError(err.message || 'Network error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profileId,
          workshopName,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          mobile: profileMobile,
          email: profileEmail,
          gstin,
          pan,
          logoUrl,
          showCompanyName,
          showCompanyAddress,
          showCompanyContact,
          showCompanyGstin,
          showCompanyLogo,
          showGstRates,
          showCompanyDetails,
          geminiApiKey: geminiApiKeys.map(k => k.trim()).filter(k => k.length > 0).join(',')
        })
      });

      const data = await res.json();
      if (data.success) {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      } else {
        setProfileError(data.error || 'Failed to update company profile');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Connection error');
    } finally {
      setProfileSaving(false);
    }
  };

  // ================= PRE-BOOKING STATES =================
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Form inputs
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [vehReg, setVehReg] = useState('');
  const [vehMake, setVehMake] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehYear, setVehYear] = useState('');
  const [bookingType, setBookingType] = useState('self_delivery'); // self_delivery / pick_up
  const [bookingDate, setBookingDate] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [lastAdvisorFound, setLastAdvisorFound] = useState<any>(null);
  const [checkingLastAdvisor, setCheckingLastAdvisor] = useState(false);
  const [matchedVehicle, setMatchedVehicle] = useState<any>(null);
  const [vehicleExists, setVehicleExists] = useState<boolean | null>(null);
  const [registerNewVehicle, setRegisterNewVehicle] = useState<boolean>(false);

  // Create user extra field
  const [newUserTeam, setNewUserTeam] = useState('');

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

  const handleCheckLastAdvisor = async (reg: string) => {
    if (!reg.trim()) return;
    setCheckingLastAdvisor(true);
    setLastAdvisorFound(null);
    setMatchedVehicle(null);
    setVehicleExists(false);
    setRegisterNewVehicle(false);
    try {
      // 1. Check if vehicle exists in the database
      const vehRes = await fetch(`/api/vehicles?q=${encodeURIComponent(reg)}`);
      const vehData = await vehRes.json();
      if (vehData.success && vehData.vehicles && vehData.vehicles.length > 0) {
        const exactMatch = vehData.vehicles.find(
          (v: any) => v.registrationNumberNormalized === reg.toUpperCase().replace(/[^A-Z0-9]/g, '')
        );
        if (exactMatch) {
          setMatchedVehicle(exactMatch);
          setVehicleExists(true);
          // Auto populate specs
          setVehMake(exactMatch.manufacturer || '');
          setVehModel(exactMatch.model || '');
          setVehYear(exactMatch.manufactureYear ? String(exactMatch.manufactureYear) : '');
          if (exactMatch.currentCustomer) {
            setCustName(exactMatch.currentCustomer.displayName || '');
            setCustMobile(exactMatch.currentCustomer.primaryMobile ? exactMatch.currentCustomer.primaryMobile.replace('+91', '') : '');
            setCustEmail(exactMatch.currentCustomer.email || '');
          }
        } else {
          setVehicleExists(false);
          setRegisterNewVehicle(true);
        }
      } else {
        setVehicleExists(false);
        setRegisterNewVehicle(true);
      }

      // 2. Check last advisor
      const res = await fetch(`/api/reservations?regNo=${encodeURIComponent(reg)}`);
      const data = await res.json();
      if (data.success && data.lastAdvisor) {
        setLastAdvisorFound(data.lastAdvisor);
        setSelectedAdvisor(data.lastAdvisor.id);
        setSelectedTeam(data.lastAdvisor.team || '');
      }
    } catch (err) {}
    finally {
      setCheckingLastAdvisor(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // If new vehicle check is active, register it in the master directory
      if (registerNewVehicle) {
        const vehRes = await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registrationNumberRaw: vehReg,
            manufacturer: vehMake,
            model: vehModel,
            currentOdometer: '0',
            customerName: custName,
            customerMobile: custMobile,
            customerEmail: custEmail || undefined,
            fuelType: matchedVehicle?.fuelType || 'Petrol'
          })
        });
        const vehData = await vehRes.json();
        if (!vehData.success) {
          alert('Failed to register vehicle in master directory: ' + vehData.error);
          return;
        }
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: custName,
          customerMobile: custMobile,
          customerEmail: custEmail || null,
          regNo: vehReg,
          make: vehMake,
          model: vehModel,
          year: vehYear || null,
          bookingType,
          bookingDate,
          advisorId: selectedAdvisor || undefined,
          team: selectedTeam || undefined,
          driverId: selectedDriver || undefined,
          notes: bookingNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setCustName('');
        setCustMobile('');
        setCustEmail('');
        setVehReg('');
        setVehMake('');
        setVehModel('');
        setVehYear('');
        setBookingType('self_delivery');
        setBookingDate('');
        setSelectedAdvisor('');
        setSelectedTeam('');
        setSelectedDriver('');
        setBookingNotes('');
        setLastAdvisorFound(null);
        setMatchedVehicle(null);
        setVehicleExists(null);
        setRegisterNewVehicle(false);
        setShowBookingForm(false);
        fetchBookings();
        alert('Booking successfully registered!');
      } else {
        alert(data.error || 'Failed to create booking');
      }
    } catch (err: any) {
      alert(err.message || 'Connection error');
    }
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
        alert('Assignments updated successfully!');
      }
    } catch (err) {}
  };

  // Add fetchBookings call to Mount
  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <main className="glass-container">
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
        <a href="/" onClick={handleLogout} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </a>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={28} className="role-admin" style={{ padding: '2px', border: 'none', background: 'transparent' }} />
            System Control Panel
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure database seeds, import legacy records, and create team member accounts.
          </p>
        </div>

      </div>

      {/* ================= PRE-BOOKINGS & RESERVATIONS SYSTEM ================= */}
      <div className="glass-card" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar style={{ color: 'var(--primary)' }} /> Pre-Bookings &amp; Vehicle Reservations
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
              Create customer reservations, assign service advisors, coordinate vehicle pick-ups, and track check-in statuses.
            </p>
          </div>
          <button 
            onClick={() => setShowBookingForm(true)} 
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <PlusCircle size={16} /> New Reservation
          </button>
        </div>

        {bookingsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading reservations...</div>
        ) : (
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
                            {isSelfDelivery ? <UserPlus size={12} /> : <Truck size={12} />}
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
        )}
      </div>

      {/* ================= NEW RESERVATION MODAL ================= */}
      {showBookingForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(8px)' }} className="no-print">
          <form onSubmit={handleCreateBooking} className="glass-card" style={{ width: '100%', maxWidth: '550px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={18} /> New Pre-Booking Reservation
              </h3>
              <button type="button" onClick={() => setShowBookingForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              <h5 style={{ color: 'var(--primary)', margin: '0.25rem 0 0 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Details</h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Registration Number *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="e.g. DL3CAN1234" 
                    value={vehReg} 
                    onChange={(e) => setVehReg(e.target.value.toUpperCase())}
                    onBlur={() => handleCheckLastAdvisor(vehReg)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Manufacture Year</label>
                  <input type="text" className="form-control" placeholder="e.g. 2021" value={vehYear} onChange={(e) => setVehYear(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Vehicle Make *</label>
                  <input type="text" required className="form-control" placeholder="e.g. Hyundai" value={vehMake} onChange={(e) => setVehMake(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Vehicle Model *</label>
                  <input type="text" required className="form-control" placeholder="e.g. i20" value={vehModel} onChange={(e) => setVehModel(e.target.value)} />
                </div>
              </div>

              {checkingLastAdvisor && (
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>
                  <Loader2 className="spinner" size={12} style={{ display: 'inline', marginRight: '0.25rem' }} /> Checking database records...
                </span>
              )}
              {!checkingLastAdvisor && vehicleExists === true && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#fff' }}>
                  🚗 **Vehicle Found in Database**: {matchedVehicle?.manufacturer} {matchedVehicle?.model}. Specifications and customer contact details auto-populated.
                </div>
              )}
              {!checkingLastAdvisor && vehicleExists === false && vehReg.trim().length > 2 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#fff' }}>
                  ⚠️ **New Vehicle Detection**: This plate is not registered in the system. Fill in details to save as new.
                </div>
              )}
              {vehReg.trim().length > 2 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '0.1rem', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={registerNewVehicle} 
                    onChange={(e) => setRegisterNewVehicle(e.target.checked)} 
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Save/Update vehicle specifications and owner information to Master Directory</span>
                </label>
              )}
              {lastAdvisorFound && (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#fff' }}>
                  💡 **Previous Advisor Detected**: {lastAdvisorFound.fullName} {lastAdvisorFound.team && `(${lastAdvisorFound.team})`}. Defaulting allocation to them.
                </div>
              )}

              <h5 style={{ color: 'var(--primary)', margin: '0.5rem 0 0 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Details</h5>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Customer Name *</label>
                <input type="text" required className="form-control" placeholder="e.g. Ramesh Chandra" value={custName} onChange={(e) => setCustName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Mobile Number *</label>
                  <input type="text" required className="form-control" placeholder="e.g. 9876543210" value={custMobile} onChange={(e) => setCustMobile(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Email Address</label>
                  <input type="email" className="form-control" placeholder="e.g. customer@gmail.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
                </div>
              </div>

              <h5 style={{ color: 'var(--primary)', margin: '0.5rem 0 0 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule &amp; Assignment</h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Booking Type *</label>
                  <select required className="form-control" value={bookingType} onChange={(e) => setBookingType(e.target.value)}>
                    <option value="self_delivery">🚙 Self Delivery (Advisor Check-in)</option>
                    <option value="pick_up">🚚 Vehicle Pick-up (Assign Driver)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Reservation Time *</label>
                  <input type="datetime-local" required className="form-control" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Service Advisor</label>
                  <select 
                    className="form-control" 
                    value={selectedAdvisor} 
                    onChange={(e) => {
                      setSelectedAdvisor(e.target.value);
                      const adv = usersList.find(u => u.id === e.target.value);
                      if (adv) setSelectedTeam(adv.team || '');
                    }}
                  >
                    <option value="">-- Select Advisor --</option>
                    {usersList.filter(u => u.roles.some((r: any) => r.role?.roleKey === 'advisor')).map(a => (
                      <option key={a.id} value={a.id}>{a.fullName} ({a.team || 'No Team'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Advisor Team</label>
                  <input type="text" className="form-control" placeholder="e.g. Team Alpha" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} />
                </div>
              </div>

              {bookingType === 'pick_up' && (
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Assign Pick-up Driver *</label>
                  <select required className="form-control" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                    <option value="">-- Choose Driver --</option>
                    {usersList.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Special Instructions / Remarks</label>
                <textarea className="form-control" style={{ padding: '0.5rem', height: '60px' }} placeholder="e.g. Customer complains of noise from front suspension..." value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} />
              </div>

            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowBookingForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Create Booking &amp; Allocate</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* CSV Importer Block */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
              <Database size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem' }}>Legacy CSV Data Importer</h3>
          </div>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Extracts, normalizes, and merges your past 4 years of JobCard2 database files located in:
            <code style={{ display: 'block', padding: '0.5rem', background: '#000', borderRadius: '4px', margin: '0.5rem 0', wordBreak: 'break-all', fontSize: '0.8rem' }}>
              C:\Users\rahul\OneDrive\Documents\
            </code>
            *Optimized for in-memory caching and bulk insert operations.*
          </p>

          {!importing && !importResult && !importError && (
            <button className="btn btn-primary" onClick={runImport} style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
              <Play size={18} /> Start Legacy Migration
            </button>
          )}

          {importing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
              <Loader2 className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              Migrating database tables...
            </div>
          )}

          {importResult && (
            <div className="glass-card" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'var(--accent-green)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                <CheckCircle2 size={20} /> Migration Completed in {importResult.durationSeconds}s!
              </div>
              <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>Customers:</div>
                <div style={{ fontWeight: 600 }}>{importResult.summary?.customers?.total || 0} ({importResult.summary?.customers?.created} created, {importResult.summary?.customers?.updated} updated)</div>
                
                <div>Vehicles:</div>
                <div style={{ fontWeight: 600 }}>{importResult.summary?.vehicles?.total || 0} ({importResult.summary?.vehicles?.created} created, {importResult.summary?.vehicles?.updated} updated)</div>
                
                <div>Parts catalog:</div>
                <div style={{ fontWeight: 600 }}>{importResult.summary?.partsCatalog?.imported || 0} products</div>
                
                <div>Labour catalog:</div>
                <div style={{ fontWeight: 600 }}>{importResult.summary?.labourCatalog?.imported || 0} services</div>
                
                <div>Job Cards:</div>
                <div style={{ fontWeight: 600 }}>{importResult.summary?.jobcards?.imported || 0} records</div>
              </div>
              <button className="btn btn-secondary" onClick={runImport} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', alignSelf: 'flex-start' }}>
                Re-Run Migration
              </button>
            </div>
          )}

          {importError && (
            <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'var(--accent-red)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontWeight: 700 }}>
                <AlertCircle size={20} /> Migration Error
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{importError}</p>
              <button className="btn btn-primary" onClick={runImport} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', alignSelf: 'flex-start' }}>
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* User Management Block */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--accent-yellow-bg)', color: 'var(--accent-yellow)' }}>
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>Staff Directory</h3>
            </div>
            
            {!showAddForm && (
              <button className="btn btn-secondary" onClick={() => setShowAddForm(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <PlusCircle size={14} /> Add User
              </button>
            )}
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <form onSubmit={createUser} className="glass-card" style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', display: 'flex', gap: '0.25rem', alignItems: 'center', color: '#fff' }}><UserPlus size={16} /> Register Staff Account</h4>
              
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.5rem' }}
                  placeholder="e.g. Amit Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Mobile (Login ID)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.5rem' }}
                    placeholder="10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Quick PIN (4 digits)</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    style={{ padding: '0.5rem' }}
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={quickPin}
                    onChange={(e) => setQuickPin(e.target.value)}
                  />
                </div>
              </div>

              {/* Roles Selector Checkboxes */}
              <div>
                <label className="form-label">Assign System Roles</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {['admin', 'manager', 'advisor', 'mechanic', 'parts_manager', 'accounts'].map(roleKey => {
                    const labelText = roleKey === 'parts_manager' ? 'Store Manager' : 
                                      roleKey === 'accounts' ? 'Accounts & Billing' : 
                                      roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
                    return (
                      <label key={roleKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedRoles.includes(roleKey)}
                          onChange={() => handleRoleCheckbox(roleKey)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{labelText}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Skill category (only for mechanics) */}
              {selectedRoles.includes('mechanic') && (
                <div className="form-group" style={{ marginBottom: '0.75rem', marginTop: '0.25rem' }}>
                  <label className="form-label">Skill / Workbay Category</label>
                  <select 
                    className="form-control" 
                    style={{ padding: '0.5rem' }}
                    value={skillCategory} 
                    onChange={(e) => setSkillCategory(e.target.value)}
                  >
                    <option value="">General Repairs</option>
                    <option value="electrical">Electricals</option>
                    <option value="mechanical">Engine / Mechanical</option>
                    <option value="ac">Air Conditioning</option>
                    <option value="body">Body Shop / Painting</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Assign Team Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.5rem' }}
                  placeholder="e.g. Team Alpha"
                  value={newUserTeam}
                  onChange={(e) => setNewUserTeam(e.target.value)}
                />
              </div>

              {userError && (
                <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                  <AlertCircle size={14} /> {userError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}>Save Account</button>
              </div>
            </form>
          )}

          {/* Users List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Loading directory...</div>
            ) : (
              usersList.map((user) => (
                <div 
                  key={user.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.fullName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {user.mobile ? `ID: ${user.mobile}` : 'No mobile ID'} {user.skillCategory ? `| Category: ${user.skillCategory}` : ''}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {user.roles.map((ur: any) => (
                      <span 
                        key={ur.roleId} 
                        className={`role-badge ${
                          ur.role.roleKey === 'admin' ? 'role-admin' : 
                          ur.role.roleKey === 'manager' ? 'role-manager' : 
                          ur.role.roleKey === 'advisor' ? 'role-advisor' : 
                          'role-mechanic'
                        }`} 
                        style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem' }}
                      >
                        {ur.role.roleKey}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Company Profile Setup Block */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
              <Settings size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem' }}>Company Settings</h3>
          </div>

          {profileLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading settings...</div>
          ) : (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Logo Upload and Preview */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '6px', background: '#1e293b', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>No Logo</span>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600, display: 'block' }}>Workshop Logo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setLogoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}
                  />
                  {logoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setLogoUrl('')} 
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Company / Workshop Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Address Line 1</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Address Line 2</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>City</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>State</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>PIN Code</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Mobile Phone</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    value={profileMobile}
                    onChange={(e) => setProfileMobile(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>GSTIN Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem', fontSize: '0.8rem', textTransform: 'uppercase' }}
                    value={gstin}
                    placeholder="e.g. 07AAAAA1111A1Z1"
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>PAN Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ padding: '0.4rem', fontSize: '0.8rem', textTransform: 'uppercase' }}
                    value={pan}
                    placeholder="AAAAA1111A"
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              {/* Gemini API Keys Multi-Key Manager */}
              <div style={{ marginTop: '1rem', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px', padding: '0.85rem', background: 'rgba(139,92,246,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>✦ Gemini AI API Keys</span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(139,92,246,0.35)', color: '#c4b5fd', borderRadius: '999px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>
                      {geminiApiKeys.filter(k => k.trim().length > 0).length} active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeminiApiKeys(prev => [...prev, ''])}
                    style={{ fontSize: '0.7rem', background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '6px', padding: '0.2rem 0.55rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    + Add Key
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {geminiApiKeys.map((key, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', minWidth: '18px', textAlign: 'right', fontWeight: 600 }}>#{idx + 1}</span>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', flex: 1, fontFamily: 'monospace', letterSpacing: '0.02em' }}
                        value={key}
                        placeholder="AIzaSy..."
                        onChange={(e) => {
                          const updated = [...geminiApiKeys];
                          updated[idx] = e.target.value;
                          setGeminiApiKeys(updated);
                        }}
                      />
                      {geminiApiKeys.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setGeminiApiKeys(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.25rem 0.45rem', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1 }}
                          title="Remove this key"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.6rem', marginBottom: 0, lineHeight: 1.5 }}>
                  Each request will randomly use one key from the pool — distributing load across quotas. Get keys from{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#a78bfa', textDecoration: 'underline' }}>Google AI Studio</a>.
                </p>
              </div>

              {/* Print Visibility Settings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>Printout Visibility Controls</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showCompanyName} 
                      onChange={(e) => setShowCompanyName(e.target.checked)} 
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Show Company Name
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showCompanyLogo} 
                      onChange={(e) => setShowCompanyLogo(e.target.checked)} 
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Show Company Logo
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showCompanyAddress} 
                      onChange={(e) => setShowCompanyAddress(e.target.checked)} 
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Show Company Address
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showCompanyContact} 
                      onChange={(e) => setShowCompanyContact(e.target.checked)} 
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Show Contact (Phone/Email)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', gridColumn: '1/-1' }}>
                    <input 
                      type="checkbox" 
                      checked={showCompanyGstin} 
                      onChange={(e) => setShowCompanyGstin(e.target.checked)} 
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Show GSTIN &amp; PAN Details
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showCompanyDetails} 
                      onChange={(e) => setShowCompanyDetails(e.target.checked)} 
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Publish Company Details (Header)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showGstRates} 
                      onChange={(e) => setShowGstRates(e.target.checked)} 
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Publish GST Rate &amp; % Columns
                  </label>
                </div>
              </div>

              {profileError && (
                <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                  <AlertCircle size={14} /> {profileError}
                </div>
              )}

              {profileSuccess && (
                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Company profile updated successfully!
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={profileSaving}
                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.5rem' }}
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="spinner" size={14} /> Saving Settings...
                  </>
                ) : (
                  'Update Company Info'
                )}
              </button>

            </form>
          )}

        </div>

      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </main>
  );
}
