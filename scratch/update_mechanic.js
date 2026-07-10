const fs = require('fs');
const pagePath = 'src/app/mechanic/page.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

// 1. Add voice-to-text state variables after existing state declarations
const voiceStateBlock = `
  // Voice-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'note' | 'labour' | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingChunks, setRecordingChunks] = useState<Blob[]>([]);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

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
    return h > 0 ? \`\${h}h \${m}m\` : \`\${m}m \${sec}s\`;
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

`;

// Insert after existing syncing state around line 82
content = content.replace(
  '  const [syncing, setSyncing] = useState(false);',
  '  const [syncing, setSyncing] = useState(false);' + voiceStateBlock
);

// 2. Replace the mobile jobs list with a card-based design
const oldJobsList = `            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No jobs currently assigned. Go to Admin to seed or Advisor to create new job cards.
                </div>
              ) : (
                jobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="glass-card" 
                    onClick={() => selectJob(job.id)}
                    style={{ cursor: 'pointer', padding: '1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <h4 style={{ fontSize: '1rem', color: '#fff' }}>{job.snapshot?.vehicleManufacturer} {job.snapshot?.vehicleModel}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        No: <strong style={{ color: 'var(--secondary)' }}>{job.jobcardNumber}</strong> | Plate: {job.snapshot?.vehicleRegistrationNumber}
                      </p>
                    </div>
                    <span className="role-badge role-advisor" style={{ fontSize: '0.65rem' }}>
                      {job.status}
                    </span>
                  </div>
                ))
              )}
            </div>`;

const newJobsList = `            {/* Mobile-First Job Cards */}
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
                        border: \`1px solid \${statusColor}40\`,
                        borderLeft: \`4px solid \${statusColor}\`,
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
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: \`radial-gradient(circle at top right, \${statusColor}15, transparent)\`, borderRadius: '0 12px 0 0' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                            {job.snapshot?.vehicleManufacturer} {job.snapshot?.vehicleModel}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: statusColor, letterSpacing: '0.05em' }}>
                            {job.snapshot?.vehicleRegistrationNumber}
                          </div>
                        </div>
                        <span style={{ background: \`\${statusColor}20\`, color: statusColor, fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                          <button onClick={() => selectJob(job.id)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: \`\${statusColor}20\`, border: \`1px solid \${statusColor}\`, color: statusColor, borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                            Open →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>`;

if (content.includes(oldJobsList)) {
  content = content.replace(oldJobsList, newJobsList);
  console.log('Mobile job cards replaced.');
} else {
  console.log('Old jobs list NOT found exactly. Checking partial...');
}

// 3. Add voice recording UI to the mechanic note section (inside active job panel)
// Find the mechanicNote input and add a voice button after it
const oldNoteInput = `onChange={(e) => setMechanicNote(e.target.value)}`;
const voiceButton = `onChange={(e) => setMechanicNote(e.target.value)}`;

// Add voice panel before the part/labour request submit buttons
const voiceUIBlock = `
            {/* Voice Recording Panel */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6366f1' }}>🎙️ Voice Note / Voice-to-Text</span>
                {!isRecording ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startVoiceRecording('note')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', color: '#6366f1', borderRadius: '6px', cursor: 'pointer' }}>
                      🎙️ Record Note
                    </button>
                    <button onClick={() => startVoiceRecording('labour')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}>
                      📝 Dictate Task
                    </button>
                  </div>
                ) : (
                  <button onClick={stopVoiceRecording} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', animation: 'pulse 1s infinite' }}>
                    ⏹ Stop Recording
                  </button>
                )}
              </div>
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#ef4444' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                  Recording for: {voiceTarget === 'note' ? 'Mechanic Note' : 'Task/Labour'}...
                </div>
              )}
              {isTranscribing && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transcribing...</div>}
              {voiceTranscript && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Transcript preview:</div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', color: '#fff', fontStyle: 'italic' }}>"{voiceTranscript}"</div>
                  <button onClick={applyVoiceTranscript} style={{ marginTop: '0.5rem', padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}>
                    ✅ Apply to {voiceTarget === 'note' ? 'Mechanic Note' : 'Task Name'}
                  </button>
                </div>
              )}
            </div>`;

// Insert voice UI before the part request section heading
if (content.includes('New Part Request Form')) {
  content = content.replace('New Part Request Form', 'Voice Recording UI */}\n' + voiceUIBlock + '\n            {/* New Part Request Form');
  console.log('Voice UI inserted.');
} else {
  console.log('Part request section not found for voice UI insertion');
}

fs.writeFileSync(pagePath, content);
console.log('Mechanic page updated successfully.');
