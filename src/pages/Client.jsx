import React, { useState, useEffect, useRef } from 'react';
import { Scan, User, CheckCircle, XCircle, LogIn, LogOut, Clock } from 'lucide-react';
import { getStudents, logAttendance, getConfig } from '../services/api';
import { prefetchImages, getCachedImageUrl } from '../services/imageCache';

const Client = () => {
  const [scanValue, setScanValue] = useState('');
  const [students, setStudents] = useState([]);
  const [student, setStudent] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [recentScans, setRecentScans] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({}); // Tracking IN/OUT per student
  const [isSyncingImages, setIsSyncingImages] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [logoUrl, setLogoUrl] = useState('/school-logo.png');
  const [localLogo, setLocalLogo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => {
    const pending = localStorage.getItem('pending_logs');
    return pending ? JSON.parse(pending).length : 0;
  });
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('device_id', id);
    }
    return id;
  });
  
  // Audio context for beep sounds
  const playBeep = (type = 'success') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'in') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'out') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        // Error beep
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };
  
  
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const idleTimerRef = useRef(null);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [studentData, configData] = await Promise.all([
          getStudents(),
          getConfig().catch(() => ({ schoolLogo: '/school-logo.png' }))
        ]);
        
        if (configData?.schoolLogo) {
          setLogoUrl(configData.schoolLogo);
        }
        
        if (studentData && studentData.length > 0) {
          setStudents(studentData);
          localStorage.setItem('cached_students', JSON.stringify(studentData));
          
          // Start prefetching images
          setIsSyncingImages(true);
          prefetchImages(studentData, configData?.schoolLogo, (progress) => {
            setSyncProgress(progress);
          }).finally(async () => {
            if (configData?.schoolLogo) {
              const local = await getCachedImageUrl(configData.schoolLogo);
              setLocalLogo(local);
            }
            setIsSyncingImages(false);
            setIsInitialLoad(false);
          });
        } else {
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.warn('Initial fetch failed, loading from cache...', error);
        const cached = localStorage.getItem('cached_students');
        if (cached) {
          const studentList = JSON.parse(cached);
          setStudents(studentList);
          
          // Try to resolve logo from cache even if offline
          const config = await getConfig().catch(() => null);
          if (config?.schoolLogo) {
            const local = await getCachedImageUrl(config.schoolLogo);
            setLocalLogo(local);
          }
        }
      }
    };
    fetchInitialData();

    // Sync listener
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingLogs();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Refresh data every 5 minutes
    const interval = setInterval(fetchInitialData, 300000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncPendingLogs = async () => {
    const pending = JSON.parse(localStorage.getItem('pending_logs') || '[]');
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} pending logs...`);
    const successfulSyncs = [];
    
    for (const log of pending) {
      try {
        await logAttendance({
          student_id: log.id_number,
          teacher_id: log.teacher_id,
          timestamp: log.timestamp,
          status: log.status,
          device_id: log.device_id
        });
        successfulSyncs.push(log.id_number + log.timestamp);
      } catch (err) {
        console.error('Failed to sync log, will try again later', err);
        break; // Stop syncing if connection is still shaky
      }
    }

    const remaining = pending.filter(log => !successfulSyncs.includes(log.id_number + log.timestamp));
    localStorage.setItem('pending_logs', JSON.stringify(remaining));
    setPendingSyncCount(remaining.length);
  };

  useEffect(() => {
    // Clock timer
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Keep input focused if user clicks anywhere
    const handleGlobalClick = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    
    // Initial focus
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 500);
    
    return () => {
      clearInterval(timer);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  // Handle 2-minute idle time
  useEffect(() => {
    if (recentScans.length > 0) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setRecentScans([]);
      }, 120000); // 2 minutes
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [recentScans]);

  const resolveLocalImage = async (studentObj) => {
    if (studentObj.photo) {
      const localUrl = await getCachedImageUrl(studentObj.photo);
      return { ...studentObj, photo: localUrl };
    }
    return studentObj;
  };

  const handleScan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!scanValue) return;

    const cleanScan = scanValue.trim();
    const foundStudent = students.find(s => String(s.rfid).trim() === cleanScan);
    
    if (foundStudent) {
      setStudent(foundStudent);
      setStatus('loading'); // Optional: add a loading state if needed

      // Log to backend and get the calculated status
      const logData = {
        student_id: foundStudent.id_number,
        teacher_id: foundStudent.teacher_id,
        device_id: deviceId
      };

      const handleSuccessfulLog = (finalStatus) => {
        setStudentStatuses(prev => ({
          ...prev,
          [foundStudent.id_number]: finalStatus
        }));

        const scanEntry = {
          ...foundStudent,
          status: finalStatus,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        // Resolve local path for immediate display
        resolveLocalImage(scanEntry).then(resolved => {
          setRecentScans(prev => [resolved, ...prev].slice(0, 15));
        });
        
        playBeep(finalStatus === 'IN' ? 'in' : 'out');
      };

      if (navigator.onLine) {
        logAttendance(logData).then(response => {
          handleSuccessfulLog(response.status || 'IN');
        }).catch(err => {
          console.error('Online log failed, queuing...', err);
          queueLogLocally(foundStudent);
        });
      } else {
        queueLogLocally(foundStudent);
      }
    } else {
      playBeep('error');
    }

    setScanValue('');
  };

  const queueLogLocally = (studentInfo) => {
    const lastStatus = studentStatuses[studentInfo.id_number] || 'OUT';
    const nextStatus = lastStatus === 'IN' ? 'OUT' : 'IN';
    
    const scanEntry = {
      ...studentInfo,
      status: nextStatus,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isOffline: true
    };

    // Update UI immediately
    setStudentStatuses(prev => ({ ...prev, [studentInfo.id_number]: nextStatus }));
    
    resolveLocalImage(scanEntry).then(resolved => {
      setRecentScans(prev => [resolved, ...prev].slice(0, 15));
    });
    
    playBeep(nextStatus === 'IN' ? 'in' : 'out');

    // Save to queue
    const pending = JSON.parse(localStorage.getItem('pending_logs') || '[]');
    pending.push({
      id_number: studentInfo.id_number,
      teacher_id: studentInfo.teacher_id,
      timestamp: new Date().toISOString(),
      status: nextStatus,
      device_id: deviceId
    });
    localStorage.setItem('pending_logs', JSON.stringify(pending));
    setPendingSyncCount(pending.length);
  };

  return (
    <div className="client-container w-screen bg-navy text-cream overflow-hidden flex flex-col font-['Inter']" style={{ height: '100vh' }}>
      
      {/* ----------------- HEADER ----------------- */}
      <div className="w-full bg-surface border-b-4 border-primary px-8 flex items-center justify-between z-30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden" style={{ height: '14%' }}>
        
        {/* Left: Logo Placeholder */}
        <div className="flex items-center gap-4 z-10 w-32">
        </div>

        {/* Center: Title (School Name) & Date/Time */}
        <div className="hidden md:flex flex-col items-center justify-center z-10 flex-1">
          <div className="flex flex-col items-center leading-none">
            <span className="brand font-extrabold text-4xl lg:text-6xl tracking-tighter uppercase text-white drop-shadow-lg text-center whitespace-nowrap">
              Calinog National
            </span>
            <span className="brand font-extrabold text-4xl lg:text-6xl tracking-tighter uppercase text-primary drop-shadow-lg text-center whitespace-nowrap">
              High School
            </span>
          </div>
          <div className="mt-1 text-base lg:text-lg font-bold tracking-[0.2em] text-accent/80 uppercase drop-shadow-md tabular-nums bg-black/30 px-4 py-1 rounded-full border border-white/5 backdrop-blur-sm text-center">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} 
            <span className="mx-3 text-white/20">|</span> 
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Right: Sync Indicator */}
        <div className="flex flex-col items-end z-10 w-32 gap-2">
          {!isOnline && (
            <div className="flex items-center gap-2 text-[10px] text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
              <span className="font-bold tracking-widest uppercase">Offline Mode</span>
            </div>
          )}
          {pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">
              <span className="font-bold tracking-widest uppercase">{pendingSyncCount} Pending Sync</span>
            </div>
          )}
          {isSyncingImages && (
            <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="font-bold tracking-widest uppercase">Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {/* ----------------- MAIN CONTENT (60%) ----------------- */}
      <div className="w-full relative flex flex-col items-center justify-center p-8 overflow-hidden" style={{ height: '58%' }}>
        
        {/* Logo Watermark Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03] p-8">
          <img src={localLogo || logoUrl} alt="Watermark" className="max-w-full max-h-full w-auto h-auto object-contain grayscale" />
        </div>

        {/* Background Gradients */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(247,127,0,0.08)_0%,transparent_70%)]"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(to_bottom,transparent,rgba(0,48,73,0.4))]"></div>
        </div>


        {/* Persistent Scan Area */}
        <div className="text-center animate-fade-in py-8 px-10 glass border-surface-border rounded-[32px] w-full max-w-md z-10 relative bg-black/40 backdrop-blur-md">
          <div className="w-20 h-20 glass flex items-center justify-center mx-auto mb-6 border-primary/30 shadow-[0_0_30px_rgba(247,127,0,0.2)] rounded-full">
            <Scan size={40} className="text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight text-red-500 uppercase italic">READY TO SCAN</h1>
          <p className="text-text-muted text-lg font-medium mb-6">Please tap your RFID card</p>
          
          <form onSubmit={handleScan} className="w-full mb-6 flex justify-center">
            <input
              ref={inputRef}
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onBlur={(e) => setTimeout(() => e.target.focus(), 10)}
              placeholder="SCAN RFID"
              inputMode="none"
              autoComplete="off"
              className="w-48 bg-transparent border-b-2 border-white/20 text-white text-center px-4 py-2 text-xl focus:outline-none focus:border-primary transition-all placeholder:text-white/20 tracking-[0.2em] font-black"
              autoFocus
            />
          </form>

          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-primary/40 animate-[ping_2s_infinite]"></div>
          </div>
        </div>
      </div>

      {/* ----------------- RECENT LOGS (30%) ----------------- */}
      <div className="w-full glass border-x-0 border-b-0 rounded-none z-10 flex flex-col p-8 animate-fade-in bg-black/40" style={{ height: '30%' }}>
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3 opacity-60">
            <Clock size={18} className="text-primary" />
            <span className="brand font-bold text-xs tracking-[0.3em] uppercase text-white">RECENT LOGS</span>
          </div>
          {recentScans.length > 0 && (
            <span className="text-xs text-text-muted italic font-medium">Clears after 2m of inactivity</span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-5 gap-2 pb-4">
            {recentScans.map((scan, i) => (
              <div key={`${scan.id_number}-${i}`} className={`flex items-center gap-2 animate-fade-in glass py-1.5 px-3 hover:border-primary/40 transition-all bg-black/30 rounded-2xl group border-l-4 ${scan.status === 'IN' ? 'border-l-accent border-y-white/5 border-r-white/5' : 'border-l-red-500 border-y-white/5 border-r-white/5'}`}>
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full overflow-hidden border-2 bg-zinc-900 group-hover:border-primary/50 transition-colors ${scan.status === 'IN' ? 'border-accent/30' : 'border-red-500'}`}>
                    {scan.photo ? (
                      <img src={scan.photo} alt={scan.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${scan.status === 'IN' ? 'bg-accent/10' : 'bg-red-500'}`}>
                        {scan.status === 'IN' ? <LogIn size={16} className="text-accent" /> : <LogOut size={16} className="text-white" />}
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-4 border-[#0d0d12] ${
                    scan.status === 'IN' ? 'bg-accent' : 'bg-red-500'
                  }`}></div>
                </div>
                   <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-white truncate uppercase">{scan.name}</span>
                    {scan.isOffline && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" title="Pending Sync"></div>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-text-muted font-bold">
                    <span>{scan.timestamp}</span>
                    <span className="opacity-30">|</span>
                    <span className={`font-black ${scan.status === 'IN' ? 'text-accent' : 'text-red-500'}`}>
                      {scan.status === 'IN' ? 'IN' : 'OUT'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentScans.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-full opacity-10 italic text-xl font-bold py-10 uppercase tracking-widest">
                Waiting for scan activity...
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ----------------- INITIAL SYNC LOADER ----------------- */}
      {isInitialLoad && (
        <div className="fixed inset-0 z-[100] bg-[#001e2e] flex flex-col items-center justify-center p-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(247,127,0,0.1),transparent)]"></div>
            <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
            <div className="w-24 h-24 mb-8 relative">
              <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                style={{ clipPath: `conic-gradient(from 0deg, #f77f00 ${syncProgress}%, transparent 0deg)` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="brand text-xl font-black text-white">{syncProgress}%</span>
              </div>
            </div>
            
            <h2 className="brand text-2xl font-black text-white tracking-widest uppercase mb-2">Initializing System</h2>
            <p className="text-text-muted text-sm text-center mb-8 font-medium">Synchronizing student records and media for offline use. This may take a moment...</p>
            
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest text-white/30">
              <span>{syncProgress === 100 ? 'Sync Complete' : 'Downloading Assets'}</span>
              <span>{syncProgress}%</span>
            </div>
          </div>
          
          <div className="absolute bottom-10 text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
            Sentinel Attendance System v1.0
          </div>
        </div>
      )}
    </div>
  );
};

export default Client;

