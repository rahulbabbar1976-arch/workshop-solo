"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Edit2, Camera, Car, Calendar, Package, Wrench, CheckCircle, Clock, Trash2, ZoomIn, X, Loader2, Save, Send, ShieldAlert, BadgeCheck, FileText, ChevronRight, PenLine, Phone, Contact, MessageCircle, Printer, Plus, UploadCloud, ImageOff, Calculator } from "lucide-react";
import Link from "next/link";
import { useSaveContact } from "@/hooks/useSaveContact";
import { compressInBrowser } from "@/hooks/useImageCompressor";
import { useRouter } from "next/navigation";
import WhatsAppButton from "@/components/WhatsAppButton";

const QUOTA_BYTES = 1_048_576; // 1 MB

export function JobCardDetailClient({ jobCard: initialJobCard, profile, permissions }: { jobCard: any, profile?: any, permissions?: any }) {
  const router = useRouter();
  const [jobCard, setJobCard] = useState(initialJobCard);
  const [activeTab, setActiveTab] = useState("details");
  const { saveContact } = useSaveContact();

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null);
  
  const [newPartName, setNewPartName] = useState("");
  const [newPartQty, setNewPartQty] = useState(1);
  const [newPartPrice, setNewPartPrice] = useState("");
  const [newPartDiscountType, setNewPartDiscountType] = useState("percent");
  const [newPartDiscountValue, setNewPartDiscountValue] = useState("");
  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [showPartResults, setShowPartResults] = useState(false);
  const [selectedSerialNumberId, setSelectedSerialNumberId] = useState<string | null>(null);
  const [availableSerialNumbers, setAvailableSerialNumbers] = useState<any[]>([]);

  const [newLaborName, setNewLaborName] = useState("");
  const [newLaborQty, setNewLaborQty] = useState(1);
  const [newLaborPrice, setNewLaborPrice] = useState("");
  const [newLaborDiscountType, setNewLaborDiscountType] = useState("percent");
  const [newLaborDiscountValue, setNewLaborDiscountValue] = useState("");
  const [laborSearchResults, setLaborSearchResults] = useState<any[]>([]);
  const [showLaborResults, setShowLaborResults] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Vehicle photo store
  const [vehiclePhotos, setVehiclePhotos]   = useState<any[]>([]);
  const [quotaUsed,     setQuotaUsed]       = useState(0);
  const [photosLoaded,  setPhotosLoaded]    = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [deletingId,    setDeletingId]      = useState<string | null>(null);

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingInvoiceNum, setBillingInvoiceNum] = useState(jobCard.invoiceNumber || "");
  const [billingSearchQuery, setBillingSearchQuery] = useState("");
  const [billingSearchResults, setBillingSearchResults] = useState<any[]>([]);
  const [selectedBillingCustomer, setSelectedBillingCustomer] = useState<any>(jobCard.billingCustomer || null);
  const [isPushingToZoho, setIsPushingToZoho] = useState(false);
  const [zohoSearchQuery, setZohoSearchQuery] = useState("");
  const [zohoSearchResults, setZohoSearchResults] = useState<any[]>([]);
  const [isSearchingZoho, setIsSearchingZoho] = useState(false);
  const [zohoSearchError, setZohoSearchError] = useState("");
  const [billingModalTab, setBillingModalTab] = useState<"local" | "zoho">("local");

  const vehicleId = jobCard.vehicle?.id || jobCard.vehicleId;

  // General Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editOdometer, setEditOdometer] = useState(jobCard.intakeOdometer?.toString() || "");
  const [editFuel, setEditFuel] = useState(jobCard.fuelLevel || "");
  const [editExpectedDate, setEditExpectedDate] = useState(jobCard.expectedDeliveryAt ? new Date(jobCard.expectedDeliveryAt).toISOString().split('T')[0] : "");

  // Vehicle Edit state
  // Customer Edit state
  const [isCustomerEditModalOpen, setIsCustomerEditModalOpen] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState(jobCard.customer?.displayName || "");
  const [editCustomerMobile, setEditCustomerMobile] = useState(jobCard.customer?.primaryMobile || "");
  const [editCustomerAddress, setEditCustomerAddress] = useState(jobCard.customer?.addressLine1 || "");
  const [editDriverName, setEditDriverName] = useState(jobCard.customer?.driverName || "");
  const [editDriverMobile, setEditDriverMobile] = useState(jobCard.customer?.driverMobile || "");
  
  // Complaint Edit state
  const [isComplaintEditModalOpen, setIsComplaintEditModalOpen] = useState(false);
  const [editComplaints, setEditComplaints] = useState<any[]>(jobCard.complaints || []);

  const [showPrintDropdown, setShowPrintDropdown] = useState(false);

  const [isVehicleEditModalOpen, setIsVehicleEditModalOpen] = useState(false);
  const [editNextOilDate, setEditNextOilDate] = useState(jobCard.vehicle?.nextOilChangeDate ? new Date(jobCard.vehicle.nextOilChangeDate).toISOString().split('T')[0] : "");
  const [editNextOilDistance, setEditNextOilDistance] = useState(jobCard.vehicle?.nextOilChangeDistance?.toString() || "");
  const [editBatteryMake, setEditBatteryMake] = useState(jobCard.vehicle?.batteryMake || "");
  const [editBatterySN, setEditBatterySN] = useState(jobCard.vehicle?.batterySerialNumber || "");
  const [editBatteryDate, setEditBatteryDate] = useState(jobCard.vehicle?.batteryInstallationDate ? new Date(jobCard.vehicle.batteryInstallationDate).toISOString().split('T')[0] : "");
  const [editInsurerName, setEditInsurerName] = useState(jobCard.vehicle?.insurerName || "");
  const [editInsurancePolicy, setEditInsurancePolicy] = useState(jobCard.vehicle?.insurancePolicyNumber || "");
  const [editInsuranceExpiry, setEditInsuranceExpiry] = useState(jobCard.vehicle?.insuranceExpiryDate ? new Date(jobCard.vehicle.insuranceExpiryDate).toISOString().split('T')[0] : "");

  // Estimates store
  const [estimates, setEstimates] = useState<any[]>([]);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<any>(null);
  const [flexibleCost, setFlexibleCost] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [isSavingEstimate, setIsSavingEstimate] = useState(false);

  // Action Menu
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchVehiclePhotos = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const res  = await fetch(`/api/vehicles/${vehicleId}/photos`);
      const data = await res.json();
      if (data.success) {
        setVehiclePhotos(data.photos || []);
        setQuotaUsed(data.quota?.usedBytes || 0);
      }
    } catch { /* ignore */ } finally {
      setPhotosLoaded(true);
    }
  }, [vehicleId]);

  const fetchEstimates = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobcards/${jobCard.id}/estimates`);
      if (res.ok) {
        const data = await res.json();
        setEstimates(data.estimates || []);
      }
    } catch (e) {
      console.error("Failed to fetch estimates", e);
    }
  }, [jobCard.id]);

  useEffect(() => {
    if (activeTab === 'pictures') fetchVehiclePhotos();
    if (activeTab === 'estimates') fetchEstimates();
  }, [activeTab, fetchVehiclePhotos, fetchEstimates]);

  const handleCloneJobCard = async () => {
    if (confirm("Are you sure you want to clone this job card? (Excludes dates, KM, battery, issues)")) {
      try {
        const res = await fetch(`/api/jobcards/${jobCard.id}/clone`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          alert("Jobcard cloned successfully!");
          router.push(`/solo/jobcards/${data.jobcardId}`);
        } else {
          alert("Failed to clone job card");
        }
      } catch (e) {
        console.error(e);
        alert("Error cloning job card");
      }
    }
  };

  const handleGenerateEstimate = async () => {
    if (confirm("Are you sure you want to generate an estimate based on current parts and labor?")) {
      try {
        setIsGeneratingEstimate(true);
        const res = await fetch(`/api/jobcards/${jobCard.id}/estimates`, {
          method: "POST"
        });
        if (res.ok) {
          alert("Estimate generated successfully");
          if (activeTab === 'estimates') fetchEstimates();
          else setActiveTab('estimates');
        } else {
          alert("Failed to generate estimate");
        }
      } catch (e) {
        console.error(e);
        alert("Error generating estimate");
      } finally {
        setIsGeneratingEstimate(false);
      }
    }
  };

  const handleSaveEstimateDetails = async () => {
    if (!editingEstimate) return;
    try {
      setIsSavingEstimate(true);
      const res = await fetch(`/api/estimates/${editingEstimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flexibleCost, estimatedTime })
      });
      if (res.ok) {
        setEstimates(estimates.map(e => e.id === editingEstimate.id ? { ...e, flexibleCost, estimatedTime } : e));
        setEditingEstimate(null);
      } else {
        alert("Failed to save estimate details");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving estimate details");
    } finally {
      setIsSavingEstimate(false);
    }
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    if (confirm("Are you sure you want to delete this estimate?")) {
      try {
        const res = await fetch(`/api/estimates/${estimateId}`, { method: "DELETE" });
        if (res.ok) {
          setEstimates(estimates.filter(e => e.id !== estimateId));
        } else {
          alert("Failed to delete estimate");
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveGeneralDetails = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeOdometer: editOdometer ? parseInt(editOdometer) : null,
          fuelLevel: editFuel || null,
          expectedDeliveryAt: editExpectedDate ? new Date(editExpectedDate) : null,
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.jobcard) setJobCard(data.jobcard);
        setIsEditModalOpen(false);
      } else {
        alert("Failed to save details");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVehicleDetails = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/vehicles/${jobCard.vehicle?.id || jobCard.vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextOilChangeDate: editNextOilDate ? new Date(editNextOilDate) : null,
          nextOilChangeDistance: editNextOilDistance ? parseInt(editNextOilDistance) : null,
          batteryMake: editBatteryMake || null,
          batterySerialNumber: editBatterySN || null,
          batteryInstallationDate: editBatteryDate ? new Date(editBatteryDate) : null,
          insurerName: editInsurerName || null,
          insurancePolicyNumber: editInsurancePolicy || null,
          insuranceExpiryDate: editInsuranceExpiry ? new Date(editInsuranceExpiry) : null,
        })
      });
      if (res.ok) {
        const data = await res.json();
        setJobCard({ ...jobCard, vehicle: data.vehicle });
        setIsVehicleEditModalOpen(false);
      } else {
        alert("Failed to save vehicle details");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving vehicle details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteJobCard = async () => {
    if (confirm("Are you sure you want to delete this job card? This action cannot be undone.")) {
      try {
        const res = await fetch(`/api/jobcards/${jobCard.id}`, { method: "DELETE" });
        if (res.ok) {
          router.push('/solo/jobcards');
        } else {
          alert("Failed to delete job card");
        }
      } catch (e) {
        console.error(e);
        alert("Error deleting job card");
      }
    }
  };

  const handlePartNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewPartName(val);
    if (!val) {
      setPartSearchResults([]);
      setShowPartResults(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/parts?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setPartSearchResults(data.parts || []);
        setShowPartResults(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPart = (part: any) => {
    setNewPartName(part.partName);
    setNewPartPrice(part.defaultSellingPrice?.toString() || "");
    setAvailableSerialNumbers(part.serialNumbers || []);
    setSelectedSerialNumberId(null);
    setShowPartResults(false);
  };

  const handleSavePart = async () => {
    if (!newPartName || !newPartPrice) return;
    setIsSaving(true);
    try {
      let masterId = partSearchResults.find(p => p.partName.toLowerCase() === newPartName.toLowerCase())?.id;
      
      if (!masterId) {
        const createRes = await fetch('/api/inventory/parts', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partName: newPartName, defaultSellingPrice: parseFloat(newPartPrice) })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          masterId = createData.part?.id;
        }
      }

      let updatedParts = [...(jobCard.partLines || [])];
      
      if (editingPartId) {
        updatedParts = updatedParts.map(p => 
          p.id === editingPartId 
            ? { ...p, partMasterId: masterId || p.partMasterId, partName: newPartName, quantityRequested: newPartQty, sellingPrice: parseFloat(newPartPrice), discountType: newPartDiscountType, discountValue: newPartDiscountValue ? parseFloat(newPartDiscountValue) : 0, serialNumberId: selectedSerialNumberId } 
            : p
        );
      } else {
        updatedParts.push({
          partMasterId: masterId || null,
          partName: newPartName,
          quantityRequested: newPartQty,
          sellingPrice: parseFloat(newPartPrice),
          discountType: newPartDiscountType,
          discountValue: newPartDiscountValue ? parseFloat(newPartDiscountValue) : 0,
          status: "requested",
          serialNumberId: selectedSerialNumberId
        });
      }

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts: updatedParts
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state instead of router.refresh() to ensure immediate UI update
        if (data.jobcard) {
          setJobCard(data.jobcard);
        } else {
          router.refresh();
        }
        setIsPartModalOpen(false);
        setEditingPartId(null);
        setNewPartName("");
        setNewPartQty(1);
        setNewPartPrice("");
        setNewPartDiscountType("percent");
        setNewPartDiscountValue("");
        setSelectedSerialNumberId(null);
        setAvailableSerialNumbers([]);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save part");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaborNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewLaborName(val);
    if (!val) {
      setLaborSearchResults([]);
      setShowLaborResults(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/labour?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setLaborSearchResults(data.labour || []);
        setShowLaborResults(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectLabor = (labor: any) => {
    setNewLaborName(labor.labourName);
    setNewLaborPrice(labor.defaultSellingPrice?.toString() || "");
    setShowLaborResults(false);
  };

  const handleSaveLabor = async () => {
    if (!newLaborName || !newLaborPrice) return;
    setIsSaving(true);
    try {
      let masterId = laborSearchResults.find(l => l.labourName.toLowerCase() === newLaborName.toLowerCase())?.id;
      
      if (!masterId) {
        const createRes = await fetch('/api/labour', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labourName: newLaborName, defaultSellingPrice: parseFloat(newLaborPrice) })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          masterId = createData.labour?.id;
        }
      }

      let updatedLabor = [...(jobCard.labourLines || [])];
      
      if (editingLaborId) {
        updatedLabor = updatedLabor.map(l => 
          l.id === editingLaborId 
            ? { ...l, labourMasterId: masterId || l.labourMasterId, labourName: newLaborName, quantity: newLaborQty, sellingPrice: parseFloat(newLaborPrice), discountType: newLaborDiscountType, discountValue: newLaborDiscountValue ? parseFloat(newLaborDiscountValue) : 0 } 
            : l
        );
      } else {
        updatedLabor.push({
          labourMasterId: masterId || null,
          labourName: newLaborName,
          quantity: newLaborQty,
          sellingPrice: parseFloat(newLaborPrice),
          discountType: newLaborDiscountType,
          discountValue: newLaborDiscountValue ? parseFloat(newLaborDiscountValue) : 0,
          status: "pending"
        });
      }

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labour: updatedLabor
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.jobcard) {
          setJobCard(data.jobcard);
        } else {
          router.refresh();
        }
        setIsLaborModalOpen(false);
        setEditingLaborId(null);
        setNewLaborName("");
        setNewLaborQty(1);
        setNewLaborPrice("");
        setNewLaborDiscountType("percent");
        setNewLaborDiscountValue("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save labor");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };


  const handleSaveCustomer = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: editCustomerName,
          customerMobile: editCustomerMobile,
          customerAddress: editCustomerAddress,
          customerDriverName: editDriverName,
          customerDriverMobile: editDriverMobile,
          isOwner: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        setJobCard(data.jobcard);
        setIsCustomerEditModalOpen(false);
      } else alert("Failed to save customer details");
    } catch(e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleSaveComplaints = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaints: editComplaints })
      });
      if (res.ok) {
        const data = await res.json();
        setJobCard(data.jobcard);
        setIsComplaintEditModalOpen(false);
      } else alert("Failed to save complaints");
    } catch(e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.jobcard) setJobCard(data.jobcard);
        else router.refresh();
      } else {
        alert("Failed to update status");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToZoho = async () => {
    setIsPushingToZoho(true);
    try {
      const res = await fetch("/api/integrations/zoho/push-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobCardId: jobCard.id })
      });
      const data = await res.json();
      if (data.success) {
        setJobCard({
          ...jobCard,
          zohoInvoiceId: data.invoiceId,
          zohoInvoiceNumber: data.invoiceNumber,
          zohoInvoiceUrl: data.invoiceUrl
        });
      } else {
        alert("Zoho Push Failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error pushing to Zoho");
      console.error(e);
    } finally {
      setIsPushingToZoho(false);
    }
  };

  const handleDeleteZohoEstimate = async () => {
    if (!confirm("Are you sure you want to delete and unlink this Zoho estimate? This will remove it from Zoho Books and allow you to regenerate it.")) return;
    setIsPushingToZoho(true);
    try {
      const res = await fetch("/api/integrations/zoho/push-invoice", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobCardId: jobCard.id })
      });
      const data = await res.json();
      if (data.success) {
        setJobCard({
          ...jobCard,
          zohoInvoiceId: null,
          zohoInvoiceNumber: null,
          zohoInvoiceUrl: null
        });
      } else {
        alert("Zoho Delete Failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error deleting Zoho estimate");
      console.error(e);
    } finally {
      setIsPushingToZoho(false);
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
              resolve(newFile);
            } else {
              resolve(file); // fallback to original
            }
          }, 'image/jpeg', 0.7);
        };
      };
      reader.onerror = () => resolve(file); // fallback to original
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile || !vehicleId) return;

    setIsUploading(true);
    try {
      let fileToUpload: File | Blob = originalFile;
      let filename = originalFile.name || 'photo.jpg';

      try {
        // Attempt client-side compression to save bandwidth
        const compressed = await compressInBrowser(originalFile);
        fileToUpload = compressed.blob;
        filename = filename.replace(/\.[^.]+$/, '.jpg');
      } catch (err) {
        console.warn('Client compression failed (likely HEIC), falling back to raw upload:', err);
      }

      const form = new FormData();
      form.append('file', fileToUpload, filename);
      form.append('jobcardId',   jobCard.id);
      form.append('phase',       'work');
      form.append('captureLabel', 'vehicle');

      // → quota-aware vehicle photo API (compresses to ≤100 KB + enforces 1 MB)
      const res  = await fetch(`/api/vehicles/${vehicleId}/photos`, { method: 'POST', body: form });
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
      if (fileInputRef.current)   fileInputRef.current.value   = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!vehicleId) return;
    if (!confirm("Are you sure you want to manually delete this photo?")) return;
    
    setDeletingId(photoId);
    try {
      const res  = await fetch(`/api/vehicles/${vehicleId}/photos`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ photoId }),
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

  const handleEditPart = (p: any) => {
    setEditingPartId(p.id);
    setNewPartName(p.partName);
    setNewPartQty(p.quantityRequested || 1);
    setNewPartPrice(p.sellingPrice?.toString() || "");
    setNewPartDiscountType(p.discountType || "percent");
    setNewPartDiscountValue(p.discountValue?.toString() || "");
    setSelectedSerialNumberId(p.serialNumberId || null);
    setIsPartModalOpen(true);
  };

  const handleDeletePart = async (pId: string) => {
    if (!confirm("Are you sure you want to remove this part?")) return;
    try {
      const partsArr = jobCard.partLines || [];
      const updatedParts = partsArr.map((p: any) => p.id === pId ? { ...p, isDeleted: true } : p);
      
      // Optimistic update
      const previousJobCard = jobCard;
      setJobCard({ ...jobCard, partLines: updatedParts });

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: updatedParts })
      });
      if (res.ok) {
        const data = await res.json();
        if(data.jobcard) setJobCard(data.jobcard);
        else router.refresh();
      } else {
        setJobCard(previousJobCard);
        const data = await res.json();
        alert(data.error || "Failed to remove part");
      }
    } catch (e) { console.error(e); }
  };

  const handleEditLabor = (l: any) => {
    setEditingLaborId(l.id);
    setNewLaborName(l.labourName);
    setNewLaborQty(l.quantity || 1);
    setNewLaborPrice(l.sellingPrice?.toString() || "");
    setNewLaborDiscountType(l.discountType || "percent");
    setNewLaborDiscountValue(l.discountValue?.toString() || "");
    setIsLaborModalOpen(true);
  };

  const handleDeleteLabor = async (lId: string) => {
    if (!confirm("Are you sure you want to remove this labor charge?")) return;
    try {
      const laborArr = jobCard.labourLines || [];
      const updatedLabor = laborArr.map((l: any) => l.id === lId ? { ...l, isDeleted: true } : l);

      // Optimistic update
      const previousJobCard = jobCard;
      setJobCard({ ...jobCard, labourLines: updatedLabor });

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labour: updatedLabor })
      });
      if (res.ok) {
        const data = await res.json();
        if(data.jobcard) setJobCard(data.jobcard);
        else router.refresh();
      } else {
        setJobCard(previousJobCard);
        const data = await res.json();
        alert(data.error || "Failed to remove labor charge");
      }
    } catch (e) { console.error(e); }
  };

  
  const customerName = jobCard.currentCustomer?.displayName || jobCard.customer?.displayName || "Unknown Customer";
  const mobile = jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile || "No Contact";
  
  const vehicleName = jobCard.vehicle?.registrationNumberRaw || jobCard.vehicle?.registrationNumberNormalized || "Unknown Vehicle";
  const makeModel = `${jobCard.vehicle?.manufacturer || ""} ${jobCard.vehicle?.model || ""}`.trim() || "Unknown Make/Model";

  const parts = (jobCard.partLines || []).filter((p: any) => !p.isDeleted);
  const labor = (jobCard.labourLines || []).filter((l: any) => !l.isDeleted);
  const complaints = jobCard.complaints || [];

  const getPartTotal = (p: any) => {
    const qty = p.quantityRequested || 0;
    const price = p.sellingPrice || 0;
    const disc = p.discountType === 'percent' ? (price * (p.discountValue || 0) / 100) : (p.discountValue || 0);
    return Math.max(0, (price - disc) * qty);
  };
  
  const handleBillingSearch = async (val: string) => {
    setBillingSearchQuery(val);
    if (!val) {
      setBillingSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setBillingSearchResults(data.customers || []);
      }
    } catch(e) { console.error(e); }
  };

  const handleZohoContactSearch = async () => {
    if (!zohoSearchQuery.trim()) {
      setZohoSearchError("Please enter a name or GST number");
      return;
    }
    setIsSearchingZoho(true);
    setZohoSearchError("");
    setZohoSearchResults([]);
    try {
      const res = await fetch(`/api/integrations/zoho/search-contact?q=${encodeURIComponent(zohoSearchQuery.trim())}`);
      const data = await res.json();
      if (data.success) {
        setZohoSearchResults(data.contacts || []);
        if (data.contacts.length === 0) {
          setZohoSearchError("No contacts found in Zoho for this query");
        }
      } else {
        setZohoSearchError(data.error || "Failed to search Zoho contacts");
      }
    } catch (e: any) {
      console.error(e);
      setZohoSearchError("Network error searching Zoho contacts");
    } finally {
      setIsSearchingZoho(false);
    }
  };

  const handleSaveBilling = async () => {
    setIsSaving(true);
    try {
      let finalBillingCustomerId = selectedBillingCustomer?.id || null;

      // If the selected customer is a Zoho contact, create it locally first
      if (selectedBillingCustomer && selectedBillingCustomer.isZohoContact) {
        const createRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: selectedBillingCustomer.displayName,
            taxId: selectedBillingCustomer.taxId || null,
            addressLine1: selectedBillingCustomer.addressLine1 || null,
            state: selectedBillingCustomer.state || null,
            city: selectedBillingCustomer.city || null,
            postalCode: selectedBillingCustomer.postalCode || null,
            primaryMobile: selectedBillingCustomer.primaryMobile || null,
            email: selectedBillingCustomer.email || null,
            notes: `Synced from Zoho (ID: ${selectedBillingCustomer.zohoContactId})`
          })
        });

        if (createRes.ok) {
          const createData = await createRes.json();
          if (createData.customer?.id) {
            finalBillingCustomerId = createData.customer.id;
          } else {
            throw new Error("Failed to retrieve created customer ID");
          }
        } else {
          const errData = await createRes.json();
          throw new Error(errData.error || "Failed to save Zoho contact to local database");
        }
      }

      const res = await fetch(`/api/jobcards/${jobCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingCustomerId: finalBillingCustomerId,
          invoiceNumber: billingInvoiceNum || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.jobcard) setJobCard(data.jobcard);
        setIsBillingModalOpen(false);
        // Clear Zoho search state
        setZohoSearchQuery("");
        setZohoSearchResults([]);
        setZohoSearchError("");
      } else {
        alert("Failed to save billing info");
      }
    } catch(e: any) { 
      console.error(e);
      alert(e.message || "An error occurred while saving billing info");
    } finally {
      setIsSaving(false);
    }
  };
  
  const getLaborTotal = (l: any) => {
    const qty = l.quantity || 0;
    const price = l.sellingPrice || 0;
    const disc = l.discountType === 'percent' ? (price * (l.discountValue || 0) / 100) : (l.discountValue || 0);
    return Math.max(0, (price - disc) * qty);
  };

  const totalParts = parts.reduce((sum: number, p: any) => sum + getPartTotal(p), 0);
  const totalLabor = labor.reduce((sum: number, l: any) => sum + getLaborTotal(l), 0);
  const grandTotal = totalParts + totalLabor;
  const totalPartsBeforeDiscount = parts.reduce((sum: number, p: any) => sum + (p.quantityRequested || 0) * (p.sellingPrice || 0), 0);
  const totalLaborBeforeDiscount = labor.reduce((sum: number, l: any) => sum + (l.quantity || 0) * (l.sellingPrice || 0), 0);
  const totalBeforeDiscount = totalPartsBeforeDiscount + totalLaborBeforeDiscount;
  const totalDiscountAmount = totalBeforeDiscount - grandTotal;
  const discountPercentage = totalBeforeDiscount > 0 ? (totalDiscountAmount / totalBeforeDiscount) * 100 : 0;

  const isLocked = ["ready_for_delivery", "delivered", "closed", "ready"].includes(jobCard.status?.toLowerCase());
  
  const displayStatus = jobCard.status === "waiting_for_estimate" || jobCard.status === "open" ? "OPEN JOBCARD" : jobCard.status?.replace(/_/g, ' ') || "OPEN";

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-36 font-outfit">
      {/* Flat Teal Header */}
      <div className="bg-gray-900 text-white px-4 pt-6 pb-6 shadow-md relative">
        <div className="flex justify-between items-center mb-4">
          <Link href="/solo/jobcards" className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="bg-white/20 border border-white/40 px-3 py-1 rounded">
             <span className="text-xs font-bold uppercase tracking-wider">{jobCard.jobcardNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppButton phoneNumber={jobCard.customer?.primaryMobile || ""} message={`Hello ${jobCard.customer?.displayName}, your vehicle intake jobcard is ready. We will send the PDF shortly.`} />
            <div className="relative">
              <button onClick={() => setShowPrintDropdown(!showPrintDropdown)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <Printer className="w-5 h-5" />
              </button>
              {showPrintDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-50 text-gray-800 py-1 font-bold text-sm">
                  <Link href={`/solo/jobcards/${jobCard.id}/print?docType=INTAKE`} className="block px-4 py-2 hover:bg-gray-100 flex items-center">Print Intake</Link>
                  <Link href={`/solo/jobcards/${jobCard.id}/print?docType=JOBCARD`} className="block px-4 py-2 hover:bg-gray-100 flex items-center">Print Jobcard</Link>
                  {estimates && estimates.length > 0 && (
                    <Link href={`/solo/print/estimate/${jobCard.id}`} className="block px-4 py-2 hover:bg-gray-100 flex items-center">Print Estimate</Link>
                  )}
                  <div className="border-t border-gray-100 my-1"></div>
                  <Link href={`/solo/jobcards/${jobCard.id}/print?docType=INVOICE`} className="block px-4 py-2 hover:bg-gray-100 flex items-center">Print Final Invoice</Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <Link href={`/solo/settings/print`} className="block px-4 py-2 hover:bg-gray-100 flex items-center text-teal-600">Print Settings</Link>
                </div>
              )}
            </div>
            
            <div className="relative" ref={actionMenuRef}>
              <button 
                onClick={() => setShowActionMenu(!showActionMenu)} 
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
              </button>
              {showActionMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-50 text-gray-800 py-1 font-bold text-sm">
                <button
                  onClick={() => { setShowActionMenu(false); setIsEditModalOpen(true); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                </button>
                <button
                  onClick={() => { setShowActionMenu(false); handleCloneJobCard(); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                >
                  <Package className="w-4 h-4 mr-2" /> Clone Jobcard
                </button>
                <button
                  onClick={() => { setShowActionMenu(false); handleGenerateEstimate(); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                >
                  <Calculator className="w-4 h-4 mr-2" /> Generate Estimate
                </button>
                <Link
                  href={`/solo/jobcards/${jobCard.id}/print`}
                  onClick={() => setShowActionMenu(false)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                >
                  <Printer className="w-4 h-4 mr-2" /> Print Intake
                </Link>
                <button
                  onClick={() => { setShowActionMenu(false); handleDeleteJobCard(); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Jobcard
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
        
        <div className="text-center mt-2">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">{vehicleName}</h1>
          <p className="text-gray-400 font-semibold">{makeModel}</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="inline-flex items-center bg-gray-800 px-4 py-2 rounded shadow-inner">
               <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-3 font-bold text-white border border-orange-300">
                  {customerName.charAt(0).toUpperCase()}
               </div>
               <div className="text-left">
                  <p className="text-sm font-bold">{customerName}</p>
                  <button onClick={() => setShowContactModal(true)} className="text-xs text-blue-400 font-bold hover:text-blue-300 flex items-center transition-colors">
                    +91 {mobile} <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>
               </div>
               <button 
                 onClick={() => saveContact({ name: customerName, phone: mobile })}
                 className="ml-4 p-1.5 bg-gray-900 hover:bg-gray-700 rounded-md transition-colors"
                 title="Save to Contacts"
               >
                 <Contact className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Flat Action Tabs */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-40">
        <div className="flex overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
              activeTab === "details" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("parts")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center whitespace-nowrap ${
              activeTab === "parts" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            <Package className="w-4 h-4 mr-1.5" /> Parts
          </button>
          <button
            onClick={() => setActiveTab("labor")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center whitespace-nowrap ${
              activeTab === "labor" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            <Wrench className="w-4 h-4 mr-1.5" /> Labor
          </button>
          <button
            onClick={() => setActiveTab("pictures")}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center whitespace-nowrap ${
              activeTab === "pictures" ? "text-orange-500 border-b-4 border-orange-500 bg-orange-50" : "text-gray-500"
            }`}
          >
            <Camera className="w-4 h-4 mr-1.5" /> Pictures
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pt-4 pb-4">
        {activeTab === "details" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Complaint</h3>
                 <button className="text-orange-500"><PenLine className="w-4 h-4" /></button>
              </div>
              
              {complaints.length > 0 ? (
                <ul className="list-disc pl-5">
                    {complaints.map((c: any) => (
                        <li key={c.id} className="text-gray-800 font-semibold">{c.customerComplaintText}</li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No complaints recorded</p>
              )}
              
              {jobCard.internalNotes && (
                 <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Observations / Notes</h3>
                    <p className="text-gray-800 text-sm">{jobCard.internalNotes}</p>
                 </div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
              <div className="flex space-x-2">
                <span className={`flex-1 text-center py-2 text-white rounded font-bold uppercase tracking-wider text-sm shadow-sm ${isLocked ? 'bg-emerald-500' : 'bg-amber-400'}`}>
                  {displayStatus}
                </span>
                {isLocked ? (
                  <button 
                    onClick={() => handleUpdateStatus("open")}
                    className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-orange-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Mark Open
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateStatus("ready_for_delivery")}
                    className="flex-1 text-center py-2 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider text-sm hover:bg-gray-900 hover:text-white transition-colors cursor-pointer"
                  >
                    Mark Ready
                  </button>
                )}
              </div>
              
              {/* WhatsApp Quick Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {profile?.whatsappJobcardIntakeTemplate && (
                  <WhatsAppButton 
                    label="Send Intake"
                    phoneNumber={jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile}
                    method={profile.whatsappMethod}
                    message={profile.whatsappJobcardIntakeTemplate
                      .replace('{{customer_name}}', jobCard.currentCustomer?.displayName || jobCard.customer?.displayName || 'Customer')
                      .replace('{{vehicle_no}}', vehicleName)
                      .replace('{{jobcard_no}}', jobCard.jobcardNumber)}
                  />
                )}
                {profile?.whatsappEstimateApprovalTemplate && (
                  <WhatsAppButton 
                    label="Request Approval"
                    phoneNumber={jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile}
                    method={profile.whatsappMethod}
                    message={profile.whatsappEstimateApprovalTemplate
                      .replace('{{customer_name}}', jobCard.currentCustomer?.displayName || jobCard.customer?.displayName || 'Customer')
                      .replace('{{vehicle_no}}', vehicleName)
                      .replace('{{amount}}', `₹${grandTotal.toFixed(2)}`)}
                  />
                )}
                {profile?.whatsappReadyForDeliveryTemplate && (
                  <WhatsAppButton 
                    label="Send Ready"
                    phoneNumber={jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile}
                    method={profile.whatsappMethod}
                    message={profile.whatsappReadyForDeliveryTemplate
                      .replace('{{customer_name}}', jobCard.currentCustomer?.displayName || jobCard.customer?.displayName || 'Customer')
                      .replace('{{vehicle_no}}', vehicleName)}
                  />
                )}
                {profile?.whatsappInvoiceTemplate && (
                  <WhatsAppButton 
                    label="Send Invoice"
                    phoneNumber={jobCard.currentCustomer?.primaryMobile || jobCard.customer?.primaryMobile}
                    method={profile.whatsappMethod}
                    message={profile.whatsappInvoiceTemplate
                      .replace('{{customer_name}}', jobCard.currentCustomer?.displayName || jobCard.customer?.displayName || 'Customer')
                      .replace('{{vehicle_no}}', vehicleName)
                      .replace('{{amount}}', `₹${grandTotal.toFixed(2)}`)}
                  />
                )}
              </div>
            </div>

            {/* Fresh JobCard Notes Block */}
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mt-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">JobCard Notes</h3>
                 {!isLocked && (
                   <button 
                     onClick={async () => {
                       const currentNotes = jobCard.internalNotes || "";
                       const newNotes = prompt("Enter notes for this JobCard:", currentNotes);
                       if (newNotes !== null && newNotes !== currentNotes) {
                         try {
                           const res = await fetch(`/api/jobcards/${jobCard.id}`, {
                             method: "PUT",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ internalNotes: newNotes })
                           });
                           if (res.ok) {
                             const data = await res.json();
                             setJobCard(data.jobcard);
                           }
                         } catch (err) {
                           console.error("Failed to save notes:", err);
                         }
                       }
                     }}
                     className="text-orange-500 hover:text-orange-600 transition-colors"
                   >
                     <Edit2 className="w-4 h-4" />
                   </button>
                 )}
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {jobCard.internalNotes || <span className="text-gray-400 italic">No notes added.</span>}
              </div>
            </div>

            {/* Billing Details Block */}
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Billing Details</h3>
                 {!isLocked && (
                   <button onClick={() => setIsBillingModalOpen(true)} className="text-blue-500 hover:text-blue-600 transition-colors">
                     <Edit2 className="w-4 h-4" />
                   </button>
                 )}
              </div>
              <div className="text-sm text-gray-800 space-y-1">
                {jobCard.billingCustomer ? (
                  <>
                    <p className="font-bold">{jobCard.billingCustomer.displayName}</p>
                    <p>{jobCard.billingCustomer.taxId ? `GST: ${jobCard.billingCustomer.taxId}` : 'No GSTIN provided'}</p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">Same as vehicle owner</p>
                )}
                {jobCard.invoiceNumber && (
                  <p className="mt-2 text-blue-600 font-mono font-semibold">Inv: {jobCard.invoiceNumber}</p>
                )}
              </div>
            </div>

            {/* Zoho Integration Actions */}
            {isLocked && (
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Invoice & Accounting</h3>
                {jobCard.zohoInvoiceId ? (
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-emerald-600 font-bold flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> Synced to Zoho Books
                      </div>
                      <button
                        onClick={handleDeleteZohoEstimate}
                        disabled={isPushingToZoho}
                        className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors flex items-center"
                        title="Delete this Estimate from Zoho Books and unlink this Job Card"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </button>
                    </div>
                    {jobCard.zohoInvoiceNumber && <div className="text-sm text-gray-700">Estimate #: <span className="font-mono">{jobCard.zohoInvoiceNumber}</span></div>}
                    <div className="flex gap-2 pt-1">
                      {jobCard.zohoInvoiceUrl && (
                        <a 
                          href={jobCard.zohoInvoiceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 text-center py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          View Estimate ↗
                        </a>
                      )}
                      {jobCard.zohoInvoiceUrl && (
                        <a 
                          href={jobCard.zohoInvoiceUrl.replace('/quotes/', '/quotes/')} // Zoho's estimate URL allows direct viewing and editing
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 text-center py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit in Zoho
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handlePushToZoho}
                    disabled={isPushingToZoho}
                    className="w-full bg-[#0d87e1] text-white py-3 rounded-lg font-bold shadow hover:bg-[#0b74c2] transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {isPushingToZoho ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Generate Estimate in Zoho
                  </button>
                )}
              </div>
            )}

            {/* Customer Details Panel */}
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Details</h3>
<button onClick={() => setIsCustomerEditModalOpen(true)} className="p-1 text-gray-400 hover:text-teal-600 rounded"><Edit2 className="w-3 h-3" /></button></div>
              <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700">
                 <div className="font-medium text-gray-500">Address</div>
                 <div>{jobCard.currentCustomer?.addressLine1 || jobCard.customer?.addressLine1 || "-"}</div>
                 <div className="font-medium text-gray-500">Driver Name</div>
                 <div>{jobCard.currentCustomer?.driverName || jobCard.customer?.driverName || "-"}</div>
                 <div className="font-medium text-gray-500">Driver Mobile</div>
                 <div>{jobCard.currentCustomer?.driverMobile || jobCard.customer?.driverMobile || "-"}</div>
              </div>
            </div>

            {/* Vehicle Extra Info Panel */}
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vehicle Extended Details</h3>
<button onClick={() => setIsVehicleEditModalOpen(true)} className="p-1 text-gray-400 hover:text-teal-600 rounded"><Edit2 className="w-3 h-3" /></button></div>
              <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700">
                 <div className="font-medium text-gray-500">Color</div>
                 <div>{jobCard.vehicle?.color || "-"}</div>
                 <div className="font-medium text-gray-500">Year</div>
                 <div>{jobCard.vehicle?.manufactureYear || "-"}</div>
                 <div className="font-medium text-gray-500">Odometer</div>
                 <div>{jobCard.intakeOdometer ? `${jobCard.intakeOdometer} KM` : (jobCard.vehicle?.currentOdometer ? `${jobCard.vehicle.currentOdometer} KM` : "-")}</div>
                 <div className="font-medium text-gray-500">Battery</div>
                 <div className="text-xs">
                   {jobCard.vehicle?.batteryDetails ? jobCard.vehicle.batteryDetails : "-"}
                   {jobCard.vehicle?.batteryMake && ` | Make: ${jobCard.vehicle.batteryMake}`}
                   {jobCard.vehicle?.batterySerialNumber && ` | S/N: ${jobCard.vehicle.batterySerialNumber}`}
                   {jobCard.vehicle?.batteryInstallationDate && ` | Installed: ${new Date(jobCard.vehicle.batteryInstallationDate).toLocaleDateString()}`}
                 </div>
                 <div className="font-medium text-gray-500">Next Service Date</div>
                 <div>{jobCard.vehicle?.nextServiceDate ? new Date(jobCard.vehicle.nextServiceDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Next Oil Change (KM)</div>
                 <div>{jobCard.vehicle?.nextOilChangeDistance ? `${jobCard.vehicle.nextOilChangeDistance} KM` : "-"}</div>
                 <div className="font-medium text-gray-500">Next Oil Change Date</div>
                 <div>{jobCard.vehicle?.nextOilChangeDate ? new Date(jobCard.vehicle.nextOilChangeDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Next PUC Date</div>
                 <div>{jobCard.vehicle?.emissionInspectionExpiryDate ? new Date(jobCard.vehicle.emissionInspectionExpiryDate).toLocaleDateString() : "-"}</div>
                 <div className="font-medium text-gray-500">Insurance Details</div>
                 <div>{jobCard.vehicle?.insuranceDetails || "-"}</div>
                 <div className="font-medium text-gray-500">Fuel Qty</div>
                 <div>{jobCard.fuelLevel || "-"}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "parts" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {parts.length === 0 && <div className="text-center py-8 text-gray-500">No parts added</div>}
            {parts.map((p: any) => (
              <div key={p.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 flex justify-between items-center group">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-gray-800 text-sm">{p.partName}</h4>
                  <p className="text-xs text-gray-500 mt-1">Qty: {p.quantityRequested} × ₹{p.sellingPrice?.toFixed(2) || '0.00'}</p>
                  {p.discountValue > 0 && (
                    <p className="text-xs text-orange-500 mt-0.5 font-semibold">
                      Discount: {p.discountType === 'percent' ? `${p.discountValue}%` : `₹${p.discountValue}`}
                    </p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-gray-900 mb-2">₹{getPartTotal(p).toFixed(2)}</p>
                  {!isLocked && (
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditPart(p)} className="p-1.5 text-gray-400 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => handleDeletePart(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingPartId(null);
                  setNewPartName("");
                  setNewPartQty(1);
                  setNewPartPrice("");
                  setNewPartDiscountType("percent");
                  setNewPartDiscountValue("");
                  setSelectedSerialNumberId(null);
                  setAvailableSerialNumbers([]);
                  setIsPartModalOpen(true);
                }}
                className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
                Add Part
              </button>
            )}
          </div>
        )}

        {activeTab === "labor" && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            {labor.length === 0 && <div className="text-center py-8 text-gray-500">No labor added</div>}
            {labor.map((l: any) => (
              <div key={l.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 flex justify-between items-center group">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-gray-800 text-sm">{l.labourName}</h4>
                  <p className="text-xs text-gray-500 mt-1">Qty: {l.quantity} × ₹{l.sellingPrice?.toFixed(2) || '0.00'}</p>
                  {l.discountValue > 0 && (
                    <p className="text-xs text-orange-500 mt-0.5 font-semibold">
                      Discount: {l.discountType === 'percent' ? `${l.discountValue}%` : `₹${l.discountValue}`}
                    </p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-gray-900 mb-2">₹{getLaborTotal(l).toFixed(2)}</p>
                  {!isLocked && (
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditLabor(l)} className="p-1.5 text-gray-400 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => handleDeleteLabor(l.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingLaborId(null);
                  setNewLaborName("");
                  setNewLaborQty(1);
                  setNewLaborPrice("");
                  setNewLaborDiscountType("percent");
                  setNewLaborDiscountValue("");
                  setIsLaborModalOpen(true);
                }}
                className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
                Add Labor
              </button>
            )}
          </div>
        )}

        {activeTab === "pictures" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            {/* Hidden file inputs */}
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <input type="file" accept="image/*" className="hidden" ref={galleryInputRef} onChange={handleFileUpload} />

            {/* Quota bar */}
            {(() => {
              const pct     = Math.min(100, Math.round((quotaUsed / QUOTA_BYTES) * 100));
              const usedKB  = Math.round(quotaUsed / 1024);
              const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-teal-500';
              return (
                <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
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

            {/* Upload button */}
            <button
              onClick={() => setIsPhotoModalOpen(true)}
              disabled={isUploading}
              className="w-full py-5 bg-white border-2 border-dashed border-orange-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex flex-col items-center justify-center text-sm uppercase tracking-wide"
            >
              {isUploading ? <Loader2 className="w-7 h-7 mb-1.5 animate-spin" /> : <Camera className="w-7 h-7 mb-1.5" />}
              {isUploading ? 'Compressing & Saving…' : 'Take / Upload Photo'}
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
              <div className="grid grid-cols-2 gap-3">
                {vehiclePhotos.map((p: any) => (
                  <div key={p.id} className="relative group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={p.fileUrl}
                      alt={p.captureLabel || 'Vehicle photo'}
                      className="w-full h-36 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                      onClick={() => setLightboxUrl(p.fileUrl)}
                    />
                    {/* Overlay on hover (pointer-events-none allows clicks to pass through to the image) */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Footer bar */}
                    <div className="flex items-center justify-between px-2 py-1.5 bg-white">
                      <div>
                        {p.captureLabel && <span className="text-xs font-semibold text-gray-600 capitalize">{p.captureLabel}</span>}
                        <p className="text-xs text-gray-400">{Math.round(p.fileSizeBytes / 1024)} KB · {p.width ? `${p.width}px` : ''}</p>
                      </div>
                      <button
                        onClick={() => handleDeletePhoto(p.id)}
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
        )}

        {/* ESTIMATES TAB */}
        {activeTab === "estimates" && (
          <div className="p-4 sm:p-5 animate-in fade-in space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Saved Estimates</h2>
              <button 
                onClick={handleGenerateEstimate}
                disabled={isGeneratingEstimate}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-bold flex items-center transition-colors disabled:opacity-50"
              >
                {isGeneratingEstimate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Generate New Estimate
              </button>
            </div>
            
            {estimates.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
                <Calculator className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No estimates have been generated for this job card yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {estimates.map((est) => (
                  <div key={est.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{est.estimateNumber}</h3>
                      <p className="text-xs text-gray-500">Generated: {new Date(est.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-2 sm:mt-0 text-left sm:text-right">
                      <div className="font-bold text-lg text-gray-800">₹{est.grandTotal?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Disc: ₹{est.discountAmount?.toFixed(2)}</div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex gap-2 w-full sm:w-auto border-t sm:border-0 pt-3 sm:pt-0">
                      <button 
                        onClick={() => window.open(`/solo/print/estimate/${est.id}`, '_blank')}
                        className="flex-1 sm:flex-none flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded font-bold transition-colors text-sm"
                      >
                        <Printer className="w-4 h-4 mr-2" /> Print
                      </button>
                      <button 
                        onClick={() => {
                          const text = `Hello ${jobCard.customer?.displayName}, please find the estimate for your vehicle attached.`;
                          const phone = jobCard.customer?.primaryMobile || '';
                          let formattedNum = phone.replace(/\D/g, "");
                          if (formattedNum.length === 10) formattedNum = "91" + formattedNum;
                          window.open(`https://wa.me/${formattedNum}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded font-bold transition-colors text-sm"
                      >
                        <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg> Share
                      </button>
                      <button 
                        onClick={() => {
                          setEditingEstimate(est);
                          setFlexibleCost(est.flexibleCost || "");
                          setEstimatedTime(est.estimatedTime || "");
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded font-bold transition-colors text-sm"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteEstimate(est.id)}
                        className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded font-bold transition-colors"
                        title="Delete Estimate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        {/* Contact Modal */}
        {showContactModal && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm" onClick={() => setShowContactModal(false)}>
            <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 pb-8 transform transition-transform shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Contact Customer</h3>
                <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <a href={`tel:${mobile}`} className="flex items-center justify-center w-full py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition-colors">
                  <Phone className="w-5 h-5 mr-3" /> Call +91 {mobile}
                </a>
                <a href={`https://wa.me/91${mobile}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full py-4 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl border border-green-200 transition-colors">
                  <MessageCircle className="w-5 h-5 mr-3" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parts Modal */}
      {isPartModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center"><Package className="w-5 h-5 mr-2 text-orange-500"/> Add Part</h3>
              <button onClick={() => setIsPartModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Part Name</label>
                <input 
                  type="text" 
                  value={newPartName}
                  onChange={handlePartNameChange}
                  className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  placeholder="e.g. Engine Oil"
                />
                {showPartResults && partSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {partSearchResults.map(p => (
                      <div 
                        key={p.id} 
                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-800"
                        onClick={() => handleSelectPart(p)}
                      >
                        <div className="font-bold">{p.partName}</div>
                        <div className="text-xs text-gray-500">₹{p.defaultSellingPrice || "0.00"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={newPartQty}
                    onChange={e => setNewPartQty(parseFloat(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={newPartPrice}
                    onChange={e => setNewPartPrice(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Discount Type</label>
                  <select
                    value={newPartDiscountType}
                    onChange={e => setNewPartDiscountType(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900 bg-white"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="amount">Amount (₹)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Discount Value</label>
                  <input 
                    type="number" 
                    value={newPartDiscountValue}
                    onChange={e => setNewPartDiscountValue(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                    placeholder="0"
                  />
                </div>
              </div>
              {availableSerialNumbers.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Select Serial Number (Optional)</label>
                  <select
                    value={selectedSerialNumberId || ""}
                    onChange={e => setSelectedSerialNumberId(e.target.value || null)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900 bg-white"
                  >
                    <option value="">-- None Selected --</option>
                    {availableSerialNumbers.map(sn => (
                      <option key={sn.id} value={sn.id}>{sn.serialNumber}</option>
                    ))}
                  </select>
                </div>
              )}
              <button 
                onClick={handleSavePart}
                disabled={isSaving || !newPartName || !newPartPrice}
                className="w-full bg-gray-800 text-white font-bold py-3.5 rounded-md mt-2 hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Part"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labor Modal */}
      {isLaborModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center"><Wrench className="w-5 h-5 mr-2 text-orange-500"/> Add Labor</h3>
              <button onClick={() => setIsLaborModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Labor Description</label>
                <input 
                  type="text" 
                  value={newLaborName}
                  onChange={handleLaborNameChange}
                  className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  placeholder="e.g. General Service"
                />
                {showLaborResults && laborSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {laborSearchResults.map(l => (
                      <div 
                        key={l.id} 
                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-800"
                        onClick={() => handleSelectLabor(l)}
                      >
                        <div className="font-bold">{l.labourName}</div>
                        <div className="text-xs text-gray-500">₹{l.defaultSellingPrice || "0.00"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={newLaborQty}
                    onChange={e => setNewLaborQty(parseFloat(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={newLaborPrice}
                    onChange={e => setNewLaborPrice(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Discount Type</label>
                  <select
                    value={newLaborDiscountType}
                    onChange={e => setNewLaborDiscountType(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900 bg-white"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="amount">Amount (₹)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Discount Value</label>
                  <input 
                    type="number" 
                    value={newLaborDiscountValue}
                    onChange={e => setNewLaborDiscountValue(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-md p-3 focus:border-orange-500 focus:ring-0 outline-none font-medium text-gray-900"
                    placeholder="0"
                  />
                </div>
              </div>
              <button 
                onClick={handleSaveLabor}
                disabled={isSaving || !newLaborName || !newLaborPrice}
                className="w-full bg-gray-800 text-white font-bold py-3.5 rounded-md mt-2 hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Labor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Total Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 md:hidden z-30">
        <div className="flex justify-between items-center mb-2">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Subtotal</p>
            <p className="text-sm font-semibold text-gray-700">₹{totalBeforeDiscount.toFixed(2)}</p>
          </div>
          {totalDiscountAmount > 0 && (
            <div className="text-center">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Discount ({discountPercentage.toFixed(1)}%)</p>
              <p className="text-sm font-bold text-orange-500">- ₹{totalDiscountAmount.toFixed(2)}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Est. Total</p>
            <p className="text-xl font-black text-gray-900">₹{grandTotal.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Link href={`/solo/jobcards/${jobCard.id}/billing`} className="bg-gray-900 text-white w-full text-center px-6 py-3 rounded font-bold shadow-md hover:bg-gray-800 transition-colors">
            Pay Now
          </Link>
        </div>
          {/* Billing Modal */}
        {isBillingModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800">Edit Billing Details</h3>
                <button onClick={() => setIsBillingModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Header */}
              <div className="flex border-b border-gray-200 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setBillingModalTab("local")}
                  className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
                    billingModalTab === "local" ? "border-orange-500 text-orange-600 font-extrabold" : "border-transparent text-gray-500"
                  }`}
                >
                  Local Database
                </button>
                <button
                  type="button"
                  onClick={() => setBillingModalTab("zoho")}
                  className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
                    billingModalTab === "zoho" ? "border-orange-500 text-orange-600 font-extrabold" : "border-transparent text-gray-500"
                  }`}
                >
                  Zoho Books Registry
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto space-y-4">
                {billingModalTab === "local" ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Entity (Local)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={billingSearchQuery}
                        onChange={(e) => handleBillingSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-medium"
                      />
                      {billingSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                          {billingSearchResults.map((cust: any) => (
                            <div 
                              key={cust.id}
                              onClick={() => {
                                setSelectedBillingCustomer(cust);
                                setBillingSearchQuery(cust.displayName);
                                setBillingSearchResults([]);
                              }}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                            >
                              <div className="font-bold text-gray-800 text-sm">{cust.displayName}</div>
                              <div className="text-xs text-gray-500">{cust.primaryMobile || 'No phone'} {cust.taxId ? `• GST: ${cust.taxId}` : ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Verify GST / Search Zoho</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={zohoSearchQuery}
                        onChange={(e) => setZohoSearchQuery(e.target.value)}
                        placeholder="Enter GSTIN or Company Name..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-medium text-sm"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleZohoContactSearch(); }}
                      />
                      <button
                        type="button"
                        onClick={handleZohoContactSearch}
                        disabled={isSearchingZoho}
                        className="px-4 bg-orange-500 text-white font-bold text-sm rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center min-w-[80px]"
                      >
                        {isSearchingZoho ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                      </button>
                    </div>

                    {zohoSearchError && (
                      <p className="text-xs text-red-600 font-medium mt-1.5">{zohoSearchError}</p>
                    )}

                    {zohoSearchResults.length > 0 && (
                      <div className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                        {zohoSearchResults.map((contact: any) => (
                          <div 
                            key={contact.zohoContactId}
                            onClick={() => {
                              setSelectedBillingCustomer({
                                isZohoContact: true,
                                zohoContactId: contact.zohoContactId,
                                displayName: contact.name,
                                taxId: contact.gstin,
                                addressLine1: contact.address,
                                state: contact.state,
                                city: contact.city,
                                postalCode: contact.zip,
                                primaryMobile: contact.phone,
                                email: contact.email
                              });
                              setZohoSearchResults([]);
                            }}
                            className="p-3 hover:bg-orange-50 cursor-pointer transition-colors"
                          >
                            <div className="font-bold text-gray-800 text-sm">{contact.name}</div>
                            {contact.gstin && (
                              <div className="text-xs text-orange-600 font-bold mt-0.5">GSTIN: {contact.gstin}</div>
                            )}
                            {(contact.state || contact.address) && (
                              <div className="text-xs text-gray-500 mt-0.5 truncate">{[contact.address, contact.state].filter(Boolean).join(', ')}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Display Current/Selected Billing Customer details */}
                {selectedBillingCustomer && (
                  <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-teal-600 uppercase tracking-wide">Selected Billing Details</div>
                        <div className="text-sm font-extrabold text-gray-800 mt-1 flex items-center gap-1.5">
                          {selectedBillingCustomer.displayName}
                          {selectedBillingCustomer.isZohoContact && (
                            <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">Zoho</span>
                          )}
                        </div>
                        {selectedBillingCustomer.taxId && (
                          <div className="text-xs font-bold text-gray-700 mt-1">GSTIN: <span className="font-mono">{selectedBillingCustomer.taxId}</span></div>
                        )}
                        {selectedBillingCustomer.state && (
                          <div className="text-xs text-gray-500 mt-0.5">Place of Supply: {selectedBillingCustomer.state}</div>
                        )}
                      </div>
                      <button 
                        onClick={() => { setSelectedBillingCustomer(null); setBillingSearchQuery(""); setZohoSearchQuery(""); }} 
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice Number (Optional)</label>
                  <input
                    type="text"
                    value={billingInvoiceNum}
                    onChange={(e) => setBillingInvoiceNum(e.target.value)}
                    placeholder="e.g. INV-2023-001"
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50">
                <button 
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveBilling}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Billing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Estimate Edit Modal */}
      {editingEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Edit Estimate Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flexible Cost / Quote (optional)</label>
                <input 
                  type="text" 
                  value={flexibleCost} 
                  onChange={e => setFlexibleCost(e.target.value)} 
                  placeholder="e.g. 5000-6000 or TBD"
                  className="w-full border rounded p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use calculated total from parts/labor.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time</label>
                <input 
                  type="text" 
                  value={estimatedTime} 
                  onChange={e => setEstimatedTime(e.target.value)} 
                  placeholder="e.g. 2-3 Days or Tomorrow evening"
                  className="w-full border rounded p-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setEditingEstimate(null)}
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEstimateDetails}
                disabled={isSavingEstimate}
                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center disabled:opacity-50"
              >
                {isSavingEstimate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Selection Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center"><Camera className="w-5 h-5 mr-2 text-orange-500"/> Add Photo</h3>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setIsPhotoModalOpen(false); fileInputRef.current?.click(); }}
                className="py-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all flex flex-col items-center justify-center text-sm">
                <Camera className="w-8 h-8 mb-2" />
                Camera
              </button>
              <button 
                onClick={() => { setIsPhotoModalOpen(false); galleryInputRef.current?.click(); }}
                className="py-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 transition-all flex flex-col items-center justify-center text-sm">
                <UploadCloud className="w-8 h-8 mb-2" />
                Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERAL EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Edit General Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Intake Odometer</label>
                <input
                  type="number"
                  value={editOdometer}
                  onChange={(e) => setEditOdometer(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fuel Level</label>
                <select
                  value={editFuel}
                  onChange={(e) => setEditFuel(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded outline-none focus:border-blue-500"
                >
                  <option value="">Select Fuel Level</option>
                  <option value="Empty">Empty</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="Full">Full</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={editExpectedDate}
                  onChange={(e) => setEditExpectedDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded">
                Cancel
              </button>
              <button onClick={handleSaveGeneralDetails} disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VEHICLE EDIT MODAL */}
      
      {isCustomerEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">Edit Customer</h3>
              <button onClick={() => setIsCustomerEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label><input type="text" className="w-full border p-2 rounded-md" value={editCustomerName} onChange={e=>setEditCustomerName(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label><input type="text" className="w-full border p-2 rounded-md" value={editCustomerMobile} onChange={e=>setEditCustomerMobile(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Address</label><input type="text" className="w-full border p-2 rounded-md" value={editCustomerAddress} onChange={e=>setEditCustomerAddress(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Driver Name</label><input type="text" className="w-full border p-2 rounded-md" value={editDriverName} onChange={e=>setEditDriverName(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Driver Mobile</label><input type="text" className="w-full border p-2 rounded-md" value={editDriverMobile} onChange={e=>setEditDriverMobile(e.target.value)} /></div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setIsCustomerEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm">Cancel</button>
              <button onClick={handleSaveCustomer} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm flex items-center">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isComplaintEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">Edit Complaints</h3>
              <button onClick={() => setIsComplaintEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {editComplaints.map((c: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <input type="text" className="w-full border p-2 rounded-md text-sm" value={c.customerComplaintText || c.complaintText || ''} onChange={e => {
                    const newC = [...editComplaints];
                    newC[i].customerComplaintText = e.target.value;
                    setEditComplaints(newC);
                  }} />
                  <button onClick={() => setEditComplaints(editComplaints.filter((_, idx) => idx !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
              <button onClick={() => setEditComplaints([...editComplaints, { customerComplaintText: "", isActive: true }])} className="w-full py-2 border border-dashed border-gray-300 rounded-md text-teal-600 hover:bg-teal-50 text-sm font-medium flex justify-center items-center gap-2">
                <Plus className="w-4 h-4"/> Add Complaint
              </button>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setIsComplaintEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm">Cancel</button>
              <button onClick={handleSaveComplaints} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm flex items-center">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Complaints"}
              </button>
            </div>
          </div>
        </div>
      )}

{isVehicleEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Edit Vehicle Details</h3>
              <button onClick={() => setIsVehicleEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h4 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wider flex items-center">
                  <Wrench className="w-4 h-4 mr-2 text-gray-500" /> Service Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Next Oil Date</label>
                    <input type="date" value={editNextOilDate} onChange={(e) => setEditNextOilDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Next Oil KM</label>
                    <input type="number" value={editNextOilDistance} onChange={(e) => setEditNextOilDistance(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" placeholder="e.g. 50000" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h4 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wider flex items-center">
                  <BadgeCheck className="w-4 h-4 mr-2 text-gray-500" /> Battery Details
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Make</label>
                      <input type="text" value={editBatteryMake} onChange={(e) => setEditBatteryMake(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" placeholder="e.g. Exide" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Install Date</label>
                      <input type="date" value={editBatteryDate} onChange={(e) => setEditBatteryDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serial Number</label>
                    <input type="text" value={editBatterySN} onChange={(e) => setEditBatterySN(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" placeholder="e.g. SN123456789" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h4 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wider flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-gray-500" /> Insurance Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Insurer Name</label>
                    <input type="text" value={editInsurerName} onChange={(e) => setEditInsurerName(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" placeholder="e.g. ICICI Lombard" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Policy No.</label>
                      <input type="text" value={editInsurancePolicy} onChange={(e) => setEditInsurancePolicy(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                      <input type="date" value={editInsuranceExpiry} onChange={(e) => setEditInsuranceExpiry(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50">
              <button onClick={() => setIsVehicleEditModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded">
                Cancel
              </button>
              <button onClick={handleSaveVehicleDetails} disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
