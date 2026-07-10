'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  Plus, 
  Wifi, 
  WifiOff, 
  RotateCw,
  Info,
  Car,
  Package,
  ListTodo,
  Calendar,
  Truck,
  Camera,
  Upload,
  Trash2
} from 'lucide-react';

export default function MechanicPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState('');
  const [assignedPickups, setAssignedPickups] = useState<any[]>([]);
  const [pickupsLoading, setPickupsLoading] = useState(false);

  const fetchAssignedPickups = async (driverId: string) => {
    if (!driverId) return;
    setPickupsLoading(true);
    try {
      const res = await fetch(`/api/reservations?driverId=${driverId}`);
      const data = await res.json();
      if (data.success) {
        setAssignedPickups(data.bookings);
      }
    } catch (err) {}
    finally {
      setPickupsLoading(false);
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
      if (!session || !['admin', 'mechanic'].includes(session.primaryRole)) {
        router.push('/');
      } else {
        setCurrentUserId(session.userId);
        fetchAssignedPickups(session.userId);
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
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>('');
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  // Voice-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'note' | 'labour' | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingChunks, setRecordingChunks] = useState<Blob[]>([]);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // AI Tools State
  const [showAiDiagnostic, setShowAiDiagnostic] = useState(false);
  const [diagnosticImage, setDiagnosticImage] = useState<string | null>(null);
  const [diagnosticContext, setDiagnosticContext] = useState('');
  const [isAnalyzingDiagnostic, setIsAnalyzingDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  const [showBatteryScanner, setShowBatteryScanner] = useState(false);
  const [isAnalyzingBattery, setIsAnalyzingBattery] = useState(false);
  const [batteryResult, setBatteryResult] = useState<any>(null);

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  const handleDiagnosticUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setDiagnosticImage(ev.target?.result as string);
        setShowAiDiagnostic(true);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const analyzeDiagnostic = async () => {
    if (!diagnosticImage) return;
    setIsAnalyzingDiagnostic(true);
    setDiagnosticResult(null);
    try {
      const res = await fetch('/api/vision/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: diagnosticImage, context: diagnosticContext })
      });
      const data = await res.json();
      if (data.success) {
        setDiagnosticResult(data.analysis);
      } else {
        alert('Analysis failed: ' + data.error);
      }
    } catch (e) {
      alert('Error connecting to AI');
    } finally {
      setIsAnalyzingDiagnostic(false);
    }
  };

  const handleBatteryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setShowBatteryScanner(true);
        setIsAnalyzingBattery(true);
        try {
          const res = await fetch('/api/vision/battery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: ev.target?.result })
          });
          const data = await res.json();
          if (data.success) {
            setBatteryResult(data.batteryData);
          } else {
            alert('Failed to scan battery: ' + data.error);
            setShowBatteryScanner(false);
          }
        } catch (err) {
          alert('Error scanning battery');
          setShowBatteryScanner(false);
        } finally {
          setIsAnalyzingBattery(false);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };


  // Work Timer State
  const [timers, setTimers] = useState<Record<string, {start: number, elapsed: number, running: boolean}>>({});

  const startTimer = (jobId: string) => {
    setTimers(prev => ({
      ...prev,
      [jobId]: { start: Date.now(), elapsed: prev[jobId]?.elapsed || 0, running: true }
    }));
  };

  const stopTimer = (jobId: string) => {
    setTimers(prev => {
      const t = prev[jobId];
      if (!t || !t.running) return prev;
      return { ...prev, [jobId]: { ...t, elapsed: t.elapsed + (Date.now() - t.start), running: false } };
    });
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
  };

  const startVoiceRecording = async (target: 'note' | 'labour') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        // Try Web Speech API transcription first
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          // Already done via recognition below
        }
        setRecordingChunks(chunks);
        setIsTranscribing(false);
      };
      mr.start();
      setMediaRecorder(mr);
      setIsRecording(true);
      setVoiceTarget(target);
      setVoiceTranscript('');

      // Parallel: Web Speech API for live transcription
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceTranscript(transcript);
        };
        recognition.start();
        (mr as any)._recognition = recognition;
      }
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder) {
      (mediaRecorder as any)._recognition?.stop();
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      setIsTranscribing(true);
      // After a moment the transcript is set via onresult
      setTimeout(() => setIsTranscribing(false), 1000);
    }
  };

  const applyVoiceTranscript = () => {
    if (voiceTarget === 'note') setMechanicNote(prev => prev + ' ' + voiceTranscript.trim());
    if (voiceTarget === 'labour') setNewLabourName(prev => prev + ' ' + voiceTranscript.trim());
    setVoiceTranscript('');
    setVoiceTarget(null);
  };


  
  // Offline pending actions queue
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [mechanicNote, setMechanicNote] = useState('');
  const [partLogType, setPartLogType] = useState('requested');
  const [isScanningPart, setIsScanningPart] = useState(false);
  const [scanSourceInfo, setScanSourceInfo] = useState<{source: string, msg: string} | null>(null);
  const [scannedPartsList, setScannedPartsList] = useState<any[]>([]);
  const [scannedMediaUrl, setScannedMediaUrl] = useState<string>('');

  // New Labour Request Form
  const [newLabourName, setNewLabourName] = useState('');
  const [newLabourQty, setNewLabourQty] = useState(1);
  const [labourNote, setLabourNote] = useState('');
  const [labourStatus, setLabourStatus] = useState('pending');
  const [selectedLabourMasterId, setSelectedLabourMasterId] = useState<string | null>(null);
  
  // Autocomplete suggestions
  const [labourSuggestions, setLabourSuggestions] = useState<any[]>([]);
  const [showLabourSuggestions, setShowLabourSuggestions] = useState(false);

  // 1. Monitor online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem('mechanic_offline_queue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Fetch mechanics list (Ramesh Singh seeded)
  useEffect(() => {
    const fetchMechanics = async () => {
      try {
        const res = await fetch('/api/import'); // Importer endpoint returns stats, let's fetch jobs directly
        // Fetch jobs directly to find mechanics or hardcode Ramesh
        setSelectedMechanicId('ramesh-singh-seeded-id'); // We'll query jobs below
      } catch (err) {}
    };
    fetchMechanics();
  }, []);

  // 3. Fetch jobs assigned to mechanic
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobcards');
      const data = await res.json();
      if (data.success) {
        // Filter jobs assigned to mechanic or show all open jobs for pilot convenience
        setJobs(data.jobcards.filter((jc: any) => jc.status !== 'closed'));
        
        // Cache jobs in localStorage for offline access
        localStorage.setItem('mechanic_cached_jobs', JSON.stringify(data.jobcards));
      }
    } catch (err) {
      console.log('Error fetching jobs, loading from offline cache...');
      const cached = localStorage.getItem('mechanic_cached_jobs');
      if (cached) {
        setJobs(JSON.parse(cached).filter((jc: any) => jc.status !== 'closed'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [selectedMechanicId]);

  // Autocomplete effect for labor search
  useEffect(() => {
    if (!newLabourName.trim()) {
      setLabourSuggestions([]);
      return;
    }
    
    if (!isOnline) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/labour?q=${encodeURIComponent(newLabourName)}`);
        const data = await res.json();
        if (data.success) {
          setLabourSuggestions(data.labour || []);
        }
      } catch (err) {
        console.error('Failed to fetch labour suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [newLabourName, isOnline]);

  // Load a job card details
  const selectJob = async (jobId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobcards/${jobId}`);
      const data = await res.json();
      if (data.success) {
        setActiveJob(data.jobcard);
        localStorage.setItem(`jobcard_cache_${jobId}`, JSON.stringify(data.jobcard));
      }
    } catch (err) {
      console.log('Offline: Loading job detail from cache...');
      const cached = localStorage.getItem(`jobcard_cache_${jobId}`);
      if (cached) {
        setActiveJob(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  // Update Labor Line Status
  const toggleLabourStatus = async (labourId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    
    // Optimistic Update
    const updatedJob = { ...activeJob };
    updatedJob.labourLines = updatedJob.labourLines.map((l: any) => 
      l.id === labourId ? { ...l, status: newStatus } : l
    );
    setActiveJob(updatedJob);

    if (labourId.startsWith('temp-')) {
      // If it's a temp ID, update in-flight LABOUR_REQUEST action in the queue.
      const updatedQueue = offlineQueue.map((a: any) => {
        if (a.type === 'LABOUR_REQUEST' && a.data.id === labourId) {
          return { ...a, data: { ...a.data, status: newStatus } };
        }
        return a;
      });
      setOfflineQueue(updatedQueue);
      localStorage.setItem('mechanic_offline_queue', JSON.stringify(updatedQueue));
      return;
    }

    if (isOnline) {
      try {
        await fetch(`/api/jobcards/${activeJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labour: [{ id: labourId, status: newStatus }]
          })
        });
      } catch (err) {
        queueOfflineAction({ type: 'LABOUR_UPDATE', jobcardId: activeJob.id, data: { id: labourId, status: newStatus } });
      }
    } else {
      queueOfflineAction({ type: 'LABOUR_UPDATE', jobcardId: activeJob.id, data: { id: labourId, status: newStatus } });
    }
  };

  // Add Labour Request
  const handleLabourRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabourName.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newLabour = {
      id: tempId,
      labourName: newLabourName.trim(),
      quantity: newLabourQty,
      status: labourStatus,
      mechanicNote: labourNote || null,
      labourMasterId: selectedLabourMasterId
    };

    // Optimistic Update
    const updatedJob = { ...activeJob };
    updatedJob.labourLines = [...(updatedJob.labourLines || []), newLabour];
    setActiveJob(updatedJob);

    // Reset Form
    setNewLabourName('');
    setNewLabourQty(1);
    setLabourNote('');
    setLabourStatus('pending');
    setSelectedLabourMasterId(null);
    setShowLabourSuggestions(false);

    if (isOnline) {
      try {
        const res = await fetch(`/api/jobcards/${activeJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labour: [{ 
              labourName: newLabour.labourName, 
              quantity: newLabour.quantity, 
              status: newLabour.status, 
              mechanicNote: newLabour.mechanicNote,
              labourMasterId: newLabour.labourMasterId || undefined
            }]
          })
        });
        const data = await res.json();
        if (data.success) {
          selectJob(activeJob.id);
        }
      } catch (err) {
        queueOfflineAction({ type: 'LABOUR_REQUEST', jobcardId: activeJob.id, data: newLabour });
      }
    } else {
      queueOfflineAction({ type: 'LABOUR_REQUEST', jobcardId: activeJob.id, data: newLabour });
    }
  };

  // Handle AI Part Scan
  const handlePartScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOnline) return;

    setIsScanningPart(true);
    setScannedPartsList([]);
    setScannedMediaUrl('');
    try {
      // 1. Upload file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) throw new Error('Upload failed');

      // 2. Call Vision API
      const visionRes = await fetch('/api/vision/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: uploadData.fileUrl })
      });
      const visionData = await visionRes.json();
      
      if (!visionData.success) throw new Error(visionData.error || 'AI analysis failed');

      // 3. Add identified parts to jobcard
      if (visionData.parts && visionData.parts.length > 0) {
        setScannedMediaUrl(uploadData.fileUrl);
        setScannedPartsList(visionData.parts.map((p: any) => ({
          partName: p.partName,
          quantityRequested: p.quantityRequested || 1,
          status: p.status || 'requested',
          mechanicNote: p.mechanicNote || 'AI Scanned',
          partMasterId: p.partMasterId || null,
          mediaUrl: uploadData.fileUrl // Attach the image to the part
        })));
        
        let msg = "Scanned via Gemini AI";
        if (visionData.source === 'local_hash_cache') msg = "Instant Cache Hit (0 API Calls)";
        else if (visionData.source === 'local_ocr_mapping') msg = "Local OCR Heuristic (0 API Calls)";
        else if (visionData.source === 'cloud_gemini') msg = "Gemini AI Fallback (1 API Call)";
        
        setScanSourceInfo({ source: visionData.source || 'unknown', msg });
        setTimeout(() => setScanSourceInfo(null), 5000);
      } else {
        alert("AI could not identify any parts in the image.");
      }
    } catch (error: any) {
      console.error("Scanning Error:", error);
      alert(error.message || "Error scanning part. Please enter manually.");
    } finally {
      setIsScanningPart(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleSubmitScannedParts = async () => {
    if (scannedPartsList.length === 0) return;
    try {
      const res = await fetch(`/api/jobcards/${activeJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: scannedPartsList })
      });
      const updateData = await res.json();
      if (updateData.success) {
        selectJob(activeJob.id); // refresh
        alert(`Added ${scannedPartsList.length} part(s) via AI scan!`);
        setScannedPartsList([]);
        setScannedMediaUrl('');
      }
    } catch (error) {
      alert('Failed to submit parts');
    }
  };

  // Add Part Request
  const handlePartRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newPart = {
      id: tempId,
      partName: newPartName.trim(),
      quantityRequested: newPartQty,
      status: partLogType,
      mechanicNote: mechanicNote || null
    };

    // Optimistic Update
    const updatedJob = { ...activeJob };
    updatedJob.partLines = [...updatedJob.partLines, newPart];
    setActiveJob(updatedJob);

    // Reset Form
    setNewPartName('');
    setNewPartQty(1);
    setMechanicNote('');
    setPartLogType('requested');

    if (isOnline) {
      try {
        const res = await fetch(`/api/jobcards/${activeJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [{ partName: newPart.partName, quantityRequested: newPart.quantityRequested, status: newPart.status, mechanicNote: newPart.mechanicNote }]
          })
        });
        const data = await res.json();
        if (data.success) {
          // Refresh details to get proper DB IDs
          selectJob(activeJob.id);
        }
      } catch (err) {
        queueOfflineAction({ type: 'PART_REQUEST', jobcardId: activeJob.id, data: newPart });
      }
    } else {
      queueOfflineAction({ type: 'PART_REQUEST', jobcardId: activeJob.id, data: newPart });
    }
  };

  // Mark Part as Installed / Used
  const markPartAsUsed = async (partId: string) => {
    if (!activeJob) return;

    // Optimistic Update
    const updatedJob = { ...activeJob };
    updatedJob.partLines = updatedJob.partLines.map((p: any) => 
      p.id === partId ? { ...p, status: 'used' } : p
    );
    setActiveJob(updatedJob);

    if (partId.startsWith('temp-')) {
      // If it's a temp ID, update in-flight PART_REQUEST action in the queue.
      const updatedQueue = offlineQueue.map((a: any) => {
        if (a.type === 'PART_REQUEST' && a.data.id === partId) {
          return { ...a, data: { ...a.data, status: 'used' } };
        }
        return a;
      });
      setOfflineQueue(updatedQueue);
      localStorage.setItem('mechanic_offline_queue', JSON.stringify(updatedQueue));
      return;
    }

    if (isOnline) {
      try {
        await fetch(`/api/jobcards/${activeJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [{ id: partId, status: 'used' }]
          })
        });
      } catch (err) {
        queueOfflineAction({ type: 'PART_UPDATE', jobcardId: activeJob.id, data: { id: partId, status: 'used' } });
      }
    } else {
      queueOfflineAction({ type: 'PART_UPDATE', jobcardId: activeJob.id, data: { id: partId, status: 'used' } });
    }
  };

  // Queue Action for Offline Sync
  const queueOfflineAction = (action: any) => {
    const newQueue = [...offlineQueue, action];
    setOfflineQueue(newQueue);
    localStorage.setItem('mechanic_offline_queue', JSON.stringify(newQueue));
  };

  // Trigger Background Sync
  const triggerAutoSync = async () => {
    if (offlineQueue.length === 0 || !navigator.onLine) return;
    setSyncing(true);
    console.log('Online detected. Syncing offline changes...');
    
    try {
      // Group queue by jobcard ID
      const jobsToSync = Array.from(new Set(offlineQueue.map(q => q.jobcardId)));

      for (const jId of jobsToSync) {
        const jobActions = offlineQueue.filter(q => q.jobcardId === jId);
        
        const partsToCreate = jobActions
          .filter(a => a.type === 'PART_REQUEST')
          .map(a => ({
            partName: a.data.partName,
            quantityRequested: a.data.quantityRequested,
            status: a.data.status || 'requested',
            mechanicNote: a.data.mechanicNote
          }));

        const partsToUpdate = jobActions
          .filter(a => a.type === 'PART_UPDATE')
          .map(a => ({
            id: a.data.id,
            status: a.data.status
          }));

        const labourToCreate = jobActions
          .filter(a => a.type === 'LABOUR_REQUEST')
          .map(a => ({
            labourName: a.data.labourName,
            quantity: a.data.quantity,
            status: a.data.status || 'pending',
            mechanicNote: a.data.mechanicNote,
            labourMasterId: a.data.labourMasterId || undefined
          }));

        const labourToUpdate = jobActions
          .filter(a => a.type === 'LABOUR_UPDATE')
          .map(a => ({
            id: a.data.id,
            status: a.data.status
          }));

        const mergedParts = [
          ...partsToCreate,
          ...partsToUpdate
        ];

        const mergedLabour = [
          ...labourToCreate,
          ...labourToUpdate
        ];

        await fetch(`/api/jobcards/${jId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: mergedParts.length > 0 ? mergedParts : undefined,
            labour: mergedLabour.length > 0 ? mergedLabour : undefined
          })
        });
      }

      // Clear Queue on Success
      setOfflineQueue([]);
      localStorage.removeItem('mechanic_offline_queue');
      fetchJobs();
      if (activeJob) selectJob(activeJob.id);
    } catch (err) {
      console.error('Offline Sync failed, will retry later:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="glass-container">
      
      {/* Navigation Header */}
      <div className="navbar" style={{ padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="/" onClick={handleLogout} style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={20} /></a>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={20} className="role-mechanic" style={{ padding: '2px', border: 'none', background: 'transparent' }} />
            Mechanic bay
          </h2>
        </div>
        
        {/* Connection Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {offlineQueue.length > 0 && (
            <button 
              className="btn btn-secondary pulse-glow" 
              onClick={triggerAutoSync}
              disabled={syncing || !isOnline}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center', borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)' }}
            >
              <RotateCw size={12} className={syncing ? 'spinner' : ''} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} /> 
              {offlineQueue.length} Sync Pending
            </button>
          )}
          
          {isOnline ? (
            <span className="status-tag status-approved" style={{ fontSize: '0.7rem' }}>
              <Wifi size={12} /> Connected
            </span>
          ) : (
            <span className="status-tag status-requested" style={{ fontSize: '0.7rem' }}>
              <WifiOff size={12} /> Offline Mode
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Jobs List (Left Panel) */}
        {!activeJob ? (
          <div className="glass-card" style={{ gridColumn: 'span 2' }}>
            
            {/* Assigned Vehicle Pickups */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(245,158,11,0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                <Truck size={18} /> My Assigned Vehicle Pick-ups
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 1rem 0' }}>
                You have been assigned to pick up the following vehicles for service.
              </p>
              
              {pickupsLoading ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem' }}>Loading pick-ups...</div>
              ) : assignedPickups.filter(p => p.status === 'pending' || p.status === 'confirmed').length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem' }}>No active vehicle pick-ups assigned to you.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {assignedPickups.filter(p => p.status === 'pending' || p.status === 'confirmed').map((p: any) => {
                    const bookingTimeStr = new Date(p.bookingDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                    return (
                      <div key={p.id} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>{p.bookingNumber}</span>
                            <span style={{ fontSize: '0.7rem', color: '#fff', background: 'rgba(245,158,11,0.2)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Pickup Schedule</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{p.customerName} (📞 {p.customerMobile})</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🚗 Vehicle: **{p.regNo}** - {p.make} {p.model}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} /> {bookingTimeStr}
                          </div>
                          {p.notes && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Note: {p.notes}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              const msg = `Hello ${p.customerName},\nI am your assigned Autobots driver for your vehicle pickup (${p.make} ${p.model} - ${p.regNo}) scheduled at ${bookingTimeStr}.\nI will be arriving shortly.`;
                              const cleanPhone = p.customerMobile.replace(/\D/g, '');
                              const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                              window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderColor: '#10b981', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Truck size={14} /> Send WhatsApp
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--primary)" /> Assigned Service Cards
            </h3>
            
            {/* Mobile-First Job Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔧</div>
                  <p>No active jobs assigned to you.</p>
                </div>
              ) : (
                jobs.map((job) => {
                  const statusColors: Record<string, string> = {
                    open: '#06b6d4', in_progress: '#8b5cf6', waiting_for_parts: '#f59e0b',
                    ready_for_review: '#6366f1', ready_for_delivery: '#10b981'
                  };
                  const statusColor = statusColors[job.status] || '#94a3b8';
                  const timer = timers[job.id];
                  const elapsed = timer ? timer.elapsed + (timer.running ? Date.now() - timer.start : 0) : 0;
                  return (
                    <div 
                      key={job.id} 
                      style={{ 
                        background: 'rgba(15,23,42,0.8)', 
                        border: `1px solid ${statusColor}40`,
                        borderLeft: `4px solid ${statusColor}`,
                        borderRadius: '12px', 
                        padding: '1.25rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => selectJob(job.id)}
                    >
                      {/* Status glow bg */}
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle at top right, ${statusColor}15, transparent)`, borderRadius: '0 12px 0 0' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                            {job.snapshot?.vehicleManufacturer} {job.snapshot?.vehicleModel}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: statusColor, letterSpacing: '0.05em' }}>
                            {job.snapshot?.vehicleRegistrationNumber}
                          </div>
                        </div>
                        <span style={{ background: `${statusColor}20`, color: statusColor, fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        📋 {job.jobcardNumber} &nbsp;·&nbsp; 
                        👤 {job.snapshot?.customerName || 'Customer'} &nbsp;·&nbsp;
                        🔩 {job.partLines?.length || 0} parts · {job.labourLines?.length || 0} tasks
                      </div>
                      
                      {/* Work Timer */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: timer?.running ? '#10b981' : 'var(--text-secondary)' }}>
                          ⏱ {elapsed > 0 ? formatTime(elapsed) : 'Not Started'}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!timer?.running ? (
                            <button onClick={() => startTimer(job.id)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}>
                              ▶ Start
                            </button>
                          ) : (
                            <button onClick={() => stopTimer(job.id)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>
                              ⏹ Stop
                            </button>
                          )}
                          <button onClick={() => selectJob(job.id)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: `${statusColor}20`, border: `1px solid ${statusColor}`, color: statusColor, borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                            Open →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Active Job Detail View (Full Panel split) */
          <>
            {/* Vehicle Details & Labor Window */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Back to list button */}
              <button className="btn btn-secondary" onClick={() => setActiveJob(null)} style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                &larr; Back to Service Cards
              </button>

              {/* Vehicle card */}
              <div className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(99,102,241,0.05)' }}>
                <Car size={32} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>{activeJob.snapshot?.vehicleManufacturer} {activeJob.snapshot?.vehicleModel}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Plate: <strong style={{ color: '#fff' }}>{activeJob.snapshot?.vehicleRegistrationNumber}</strong> | Odometer: {activeJob.intakeOdometer || 'N/A'} KM
                  </p>
                </div>
              </div>

              {/* AI Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderColor: '#8b5cf6', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🧠 AI Diagnostic Scan
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleDiagnosticUpload} />
                </label>
                <label className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderColor: '#10b981', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔋 Scan Battery Label
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleBatteryUpload} />
                </label>
                <button onClick={() => setShowBarcodeScanner(true)} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderColor: '#0ea5e9', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📷 Scan Part Barcode
                </button>
              </div>

              {/* Labor Window */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <ListTodo size={18} color="var(--secondary)" /> Labor Checklist
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeJob.labourLines?.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem', textAlign: 'center' }}>
                      No labor tasks registered yet.
                    </div>
                  ) : (
                    activeJob.labourLines.map((line: any) => (
                      <div key={line.id} className="checklist-item">
                        <input 
                          type="checkbox" 
                          className="checklist-checkbox"
                          checked={line.status === 'completed'}
                          onChange={() => toggleLabourStatus(line.id, line.status)}
                        />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 600,
                              textDecoration: line.status === 'completed' ? 'line-through' : 'none',
                              color: line.status === 'completed' ? 'var(--text-secondary)' : '#ffffff'
                            }}>
                              {line.labourName}
                            </span>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              color: line.status === 'completed' ? 'var(--accent-green)' : (line.status === 'in_progress' ? 'var(--accent-yellow)' : 'var(--text-secondary)')
                            }}>
                              {line.status === 'completed' ? 'DONE' : (line.status === 'in_progress' ? 'IN PROGRESS' : 'PENDING')}
                            </span>
                          </div>
                          {(line.quantity > 1 || line.mechanicNote) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {line.quantity > 1 ? `Qty/Hrs: ${line.quantity} ` : ''}
                              {line.mechanicNote ? `| Note: ${line.mechanicNote}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Log New Labour Form */}
                <form onSubmit={handleLabourRequest} className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', marginTop: '1.5rem', position: 'relative' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#fff' }}>Log Labor / Service Task</h4>
                  
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Labor Task Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Engine oil replacement"
                      value={newLabourName}
                      onChange={(e) => {
                        setNewLabourName(e.target.value);
                        setShowLabourSuggestions(true);
                      }}
                      onFocus={() => setShowLabourSuggestions(true)}
                      onBlur={() => {
                        // Delay closing suggestions slightly so that click on suggestion is registered
                        setTimeout(() => setShowLabourSuggestions(false), 200);
                      }}
                      required
                    />
                    
                    {/* Autocomplete Suggestions dropdown */}
                    {showLabourSuggestions && labourSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'rgba(30, 41, 59, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        zIndex: 50,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}>
                        {labourSuggestions.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setNewLabourName(item.labourName);
                              setSelectedLabourMasterId(item.id);
                              setShowLabourSuggestions(false);
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              fontSize: '0.85rem',
                              color: '#fff',
                              textAlign: 'left'
                            }}
                            className="suggestion-item"
                          >
                            <div style={{ fontWeight: 600 }}>{item.labourName}</div>
                            {item.defaultSellingPrice && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Std Price: ₹{item.defaultSellingPrice}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Qty/Hrs</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min={1} 
                        value={newLabourQty}
                        onChange={(e) => setNewLabourQty(parseInt(e.target.value, 10) || 1)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Task Status</label>
                      <select 
                        className="form-control"
                        value={labourStatus}
                        onChange={(e) => setLabourStatus(e.target.value)}
                        style={{ padding: '0.5rem' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Labor Note / Specification</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Cleared oil filter container"
                      value={labourNote}
                      onChange={(e) => setLabourNote(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-accent" style={{ display: 'flex', gap: '0.25rem', width: '100%', padding: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                    <Plus size={16} /> Log Labor Task
                  </button>
                </form>
              </div>
            </div>

            {/* Parts Window */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <Package size={18} color="var(--accent-yellow)" /> Parts Logging (No Pricing)
                </h3>

                {/* Parts status description help banner */}
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--primary)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <div>
                    ⏳ Requested: Waiting manager | 🟢 Approved: Collect from stores | 🔵 Ordered: Out of stock
                  </div>
                </div>

                {/* Logged Parts List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {activeJob.partLines?.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem', textAlign: 'center' }}>
                      No parts requested yet.
                    </div>
                  ) : (
                    activeJob.partLines.map((part: any) => (
                      <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{part.partName}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Qty: {part.quantityRequested} {part.brand ? `| Brand: ${part.brand}` : ''}
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {['approved', 'in_stock', 'dispatched'].includes(part.status) && (
                            <button 
                              onClick={() => markPartAsUsed(part.id)}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px', background: 'var(--accent-green)', color: '#fff', boxShadow: 'none' }}
                            >
                              Install
                            </button>
                          )}
                          
                          <span className={`status-tag status-${part.status}`}>
                            {part.status === 'requested' ? '⏳ Requested' : 
                             part.status === 'approved' ? '🟢 Approved' : 
                             part.status === 'in_stock' ? '📦 In Stock' : 
                             part.status === 'dispatched' ? '⚡ Issued' : 
                             part.status === 'used' ? '✅ Installed' : 
                             part.status === 'ordered' ? '🔵 Ordered' : 
                             part.status === 'rejected' ? '❌ Rejected' : part.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Request New Part Form */}
                <form onSubmit={handlePartRequest} className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.9rem', margin: 0, color: '#fff' }}>Log Component / Part</h4>
                    
                    {/* Camera Scan Button */}
                    <div style={{ position: 'relative' }}>
                      <label 
                        className={`btn btn-secondary ${isScanningPart ? 'pulse' : ''}`}
                        style={{ 
                          padding: '0.4rem 0.75rem', 
                          fontSize: '0.75rem', 
                          display: 'flex', 
                          gap: '0.3rem', 
                          alignItems: 'center',
                          cursor: isOnline && !isScanningPart ? 'pointer' : 'not-allowed',
                          opacity: isOnline ? 1 : 0.5,
                          borderColor: 'var(--accent-blue)',
                          color: 'var(--accent-blue)'
                        }}
                      >
                        {isScanningPart ? <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={14} />}
                        {isScanningPart ? 'Scanning...' : 'Scan Part'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={handlePartScan}
                          disabled={!isOnline || isScanningPart}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        />
                      </label>
                    </div>
                  </div>
                  
                  {scannedPartsList.length > 0 && (
                    <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid var(--accent-blue)', marginBottom: '1rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Review Scanned Parts</h5>
                      {scannedPartsList.map((sp, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                            value={sp.partName} 
                            onChange={(e) => {
                              const newList = [...scannedPartsList];
                              newList[idx].partName = e.target.value;
                              setScannedPartsList(newList);
                            }}
                          />
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ width: '60px', padding: '0.4rem', fontSize: '0.8rem' }}
                            value={sp.quantityRequested} 
                            onChange={(e) => {
                              const newList = [...scannedPartsList];
                              newList[idx].quantityRequested = parseInt(e.target.value, 10) || 1;
                              setScannedPartsList(newList);
                            }}
                            min="1"
                          />
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', color: 'var(--accent-red)' }}
                            onClick={() => {
                              const newList = scannedPartsList.filter((_, i) => i !== idx);
                              setScannedPartsList(newList);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button type="button" className="btn btn-primary" onClick={handleSubmitScannedParts} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                          Add {scannedPartsList.length} Parts
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => { setScannedPartsList([]); setScannedMediaUrl(''); }} style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                          Cancel
                        </button>
                      </div>
                      
                      {scanSourceInfo && (
                        <div style={{ padding: '0.25rem 0.5rem', marginTop: '0.5rem', background: scanSourceInfo.source.includes('local') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: scanSourceInfo.source.includes('local') ? '#22c55e' : '#a855f7', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${scanSourceInfo.source.includes('local') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(168, 85, 247, 0.2)'}` }}>
                          {scanSourceInfo.msg}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label className="form-label">Action / Log Mode</label>
                    <select 
                      className="form-control" 
                      value={partLogType}
                      onChange={(e) => setPartLogType(e.target.value)}
                      style={{ padding: '0.5rem' }}
                    >
                      <option value="requested">Request from Stores (Needs approval/ordering)</option>
                      <option value="used">Issue from Shelf (Already Installed / Changed)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Part Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. BMW Front brake pad set"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Qty</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min={1} 
                        value={newPartQty}
                        onChange={(e) => setNewPartQty(parseInt(e.target.value, 10) || 1)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Note / Specification</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Skoda 2.0 TDI engine sensor"
                        value={mechanicNote}
                        onChange={(e) => setMechanicNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-accent" style={{ display: 'flex', gap: '0.25rem', width: '100%', padding: '0.5rem' }}>
                    <Plus size={16} /> Log Component
                  </button>
                </form>

              </div>
            </div>
          </>
        )}

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
    
      {/* AI Diagnostic Modal */}
      {showAiDiagnostic && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #8b5cf6', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🧠 AI Diagnostic Analysis</h3>
            
            {diagnosticImage && (
              <img src={diagnosticImage} alt="Diagnostic Scan" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
            
            <textarea 
              className="form-control" 
              placeholder="Add symptoms or context (optional)..." 
              value={diagnosticContext}
              onChange={e => setDiagnosticContext(e.target.value)}
              rows={2}
              style={{ marginBottom: '1rem' }}
            />

            {!diagnosticResult && (
              <button onClick={analyzeDiagnostic} disabled={isAnalyzingDiagnostic} className="btn btn-primary" style={{ width: '100%', background: '#8b5cf6', borderColor: '#8b5cf6', color: 'white', padding: '0.75rem' }}>
                {isAnalyzingDiagnostic ? 'Analyzing Image...' : 'Run AI Analysis'}
              </button>
            )}

            {diagnosticResult && (
              <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '0.5rem' }}>AI Recommendations:</div>
                {diagnosticResult}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => { setShowAiDiagnostic(false); setDiagnosticImage(null); setDiagnosticResult(null); }} className="btn btn-secondary" style={{ flex: 1 }}>Close</button>
              {diagnosticResult && (
                <button onClick={() => {
                   setMechanicNote(prev => prev + '\n\nAI Diagnostic Note:\n' + diagnosticResult);
                   setShowAiDiagnostic(false);
                }} className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>Attach to Note</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Battery Scanner Modal */}
      {showBatteryScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #10b981', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🔋 Battery AI Vision</h3>
            
            {isAnalyzingBattery ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ borderTopColor: '#10b981', marginBottom: '1rem' }}></div>
                <p>Extracting Battery Specifications...</p>
              </div>
            ) : batteryResult ? (
              <div>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Brand & Model</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{batteryResult.brand || 'Unknown'} {batteryResult.model || ''}</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CCA</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.cca || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Capacity</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.ah || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Voltage</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.voltage || '12V'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Chemistry</div>
                      <div style={{ fontWeight: 600 }}>{batteryResult.chemistry || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setShowBatteryScanner(false)} className="btn btn-secondary" style={{ flex: 1 }}>Discard</button>
                  <button onClick={() => {
                    const note = `New Battery Installed:\nBrand: ${batteryResult.brand}\nModel: ${batteryResult.model}\nCCA: ${batteryResult.cca}\nCapacity: ${batteryResult.ah}\nVoltage: ${batteryResult.voltage}\nChemistry: ${batteryResult.chemistry}`;
                    setMechanicNote(prev => prev ? prev + '\n\n' + note : note);
                    setShowBatteryScanner(false);
                  }} className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>Update Vehicle</button>
                </div>
              </div>
            ) : (
               <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>Analysis Failed.</div>
            )}
          </div>
        </div>
      )}

      
      {/* Barcode Scanner Modal (Desktop/Mobile compatibility) */}
      {showBarcodeScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
            <h3 style={{ margin: 0, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📷 Scan Part Barcode</h3>
            <button onClick={() => setShowBarcodeScanner(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video 
              id="barcode-video"
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              ref={(ref) => {
                if (ref && !ref.srcObject) {
                  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    .then(stream => {
                      ref.srcObject = stream;
                      if ('BarcodeDetector' in window) {
                        const detector = new (window as any).BarcodeDetector();
                        const interval = setInterval(async () => {
                          if (!ref.srcObject) { clearInterval(interval); return; }
                          try {
                            const barcodes = await detector.detect(ref);
                            if (barcodes.length > 0) {
                               clearInterval(interval);
                               // handle barcode
                               const code = barcodes[0].rawValue;
                               alert('Scanned Part Code: ' + code);
                               setNewPartName(code);
                               setPartLogType('requested');
                               setShowBarcodeScanner(false);
                            }
                          } catch (e) {}
                        }, 500);
                      } else {
                        alert('Barcode Scanner not supported in this browser. Please enter manually.');
                        setShowBarcodeScanner(false);
                      }
                    })
                    .catch(e => {
                      alert('Camera access error');
                      setShowBarcodeScanner(false);
                    });
                }
              }}
            />
            
            {/* Viewfinder overlay */}
            <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
               <div style={{ width: '70%', height: '30%', border: '2px solid #0ea5e9', borderRadius: '12px', boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)' }}></div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
