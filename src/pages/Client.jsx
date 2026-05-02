import React, { useState, useEffect, useRef } from 'react';
import { Scan, User, CheckCircle, XCircle, LogIn, LogOut, Clock } from 'lucide-react';
import { getStudents, logAttendance, getConfig } from '../services/api';
import { prefetchImages } from '../services/imageCache';

const Client = () => {
  const [scanValue, setScanValue] = useState('');
  const [students, setStudents] = useState([]);
  const [student, setStudent] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [recentScans, setRecentScans] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({}); // Tracking IN/OUT per student
  const [isSyncingImages, setIsSyncingImages] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/school-logo.png');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const idleTimerRef = useRef(null);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      const [studentData, configData] = await Promise.all([
        getStudents(),
        getConfig().catch(() => ({ schoolLogo: '/school-logo.png' }))
      ]);
      
      if (configData?.schoolLogo) {
        setLogoUrl(configData.schoolLogo);
      }
      
      setStudents(studentData);
      
      // Start prefetching images once students are loaded
      if (studentData && studentData.length > 0) {
        setIsSyncingImages(true);
        prefetchImages(studentData, configData?.schoolLogo).finally(() => setIsSyncingImages(false));
      }
    };
    fetchInitialData();

    // Refresh data every 5 minutes
    const interval = setInterval(fetchInitialData, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Clock timer
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Keep input focused at all times
    const focusInterval = setInterval(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
    
    return () => {
      clearInterval(timer);
      clearInterval(focusInterval);
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

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanValue) return;

    const foundStudent = students.find(s => s.rfid === scanValue);
    
    if (foundStudent) {
      setStudent(foundStudent);
      setStatus('loading'); // Optional: add a loading state if needed

      // Log to backend and get the calculated status
      logAttendance({
        student_id: foundStudent.id_number,
        teacher_id: foundStudent.teacher_id
      }).then(response => {
        const finalStatus = response.status || 'IN';
        
        // Update local status tracker
        setStudentStatuses(prev => ({
          ...prev,
          [foundStudent.id_number]: finalStatus
        }));

        const scanEntry = {
          ...foundStudent,
          status: finalStatus,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        setRecentScans(prev => [scanEntry, ...prev].slice(0, 12));
        setStatus('success');

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setStatus('idle');
          setStudent(null);
        }, 500); // Show success for 0.5 seconds
      }).catch(err => {
        console.error('Attendance Log Error:', err);
        setStatus('error');
        
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setStatus('idle');
          setStudent(null);
        }, 500); // Show error for 0.5 seconds
      });

    } else {
      setStatus('error');
      
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStatus('idle');
        setStudent(null);
      }, 500); // Show error for 0.5 seconds
    }

    setScanValue('');
  };

  return (
    <div className="client-container w-screen bg-bg-dark text-text-main overflow-hidden flex flex-col font-['Inter']" style={{ height: '100vh' }}>
      
      {/* ----------------- HEADER ----------------- */}
      <div className="w-full bg-[#00253a] border-b border-surface-border px-8 flex items-center justify-between z-30 shadow-lg" style={{ height: '12%' }}>
        {/* Left: Logo Only */}
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
        </div>

        {/* Center: Title (School Name) */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <span className="brand font-extrabold text-3xl lg:text-4xl tracking-widest uppercase text-white drop-shadow-md">
            Calinog National
          </span>
          <span className="brand font-extrabold text-3xl lg:text-4xl tracking-widest uppercase text-primary drop-shadow-md">
            High School
          </span>
        </div>

        {/* Right: Clock & Sync */}
        <div className="flex flex-col items-end">
          <span className="brand font-bold text-2xl text-accent tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          {isSyncingImages && (
            <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <span className="font-bold tracking-widest uppercase">Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {/* ----------------- MAIN CONTENT (60%) ----------------- */}
      <div className="w-full relative flex flex-col items-center justify-center p-8 overflow-hidden" style={{ height: '58%' }}>
        {/* Background Gradients */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(247,127,0,0.08)_0%,transparent_70%)]"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(to_bottom,transparent,rgba(0,48,73,0.4))]"></div>
        </div>

        <form onSubmit={handleScan} className="opacity-0 absolute">
          <input ref={inputRef} type="text" value={scanValue} onChange={(e) => setScanValue(e.target.value)} autoFocus />
        </form>

        {status === 'idle' && (
          <div className="text-center animate-fade-in py-10 px-16 glass border-surface-border rounded-[40px] w-full max-w-lg">
            <div className="w-28 h-28 glass flex items-center justify-center mx-auto mb-8 border-primary/30 shadow-[0_0_40px_rgba(247,127,0,0.2)] rounded-full">
              <Scan size={56} className="text-primary animate-pulse" />
            </div>
            <h1 className="text-5xl font-black mb-4 tracking-tight text-white uppercase italic">READY TO SCAN</h1>
            <p className="text-text-muted text-xl font-medium mb-8">Please tap your RFID card</p>
            
            <form onSubmit={handleScan} className="w-full mb-8">
              <input
                ref={inputRef}
                type="text"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                placeholder="Awaiting scan..."
                className="w-full bg-black/20 border border-white/10 text-white text-center rounded-2xl px-6 py-4 text-2xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-white/10 font-bold"
                autoFocus
              />
            </form>

            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-primary/40 animate-[ping_2s_infinite]"></div>
            </div>
          </div>
        )}

        {status === 'success' && student && (
          <div className="w-full max-w-4xl glass p-10 flex items-center gap-12 animate-fade-in border-accent/30 shadow-[0_0_80px_rgba(247,127,0,0.1)] rounded-[40px] relative overflow-hidden">
            {/* Status Indicator */}
            <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[40px] font-black text-xl tracking-wider uppercase flex items-center gap-2 ${
              studentStatuses[student.id_number] === 'IN' ? 'bg-primary text-white' : 'bg-primary-dark text-white'
            }`}>
              {studentStatuses[student.id_number] === 'IN' ? <LogIn size={24} /> : <LogOut size={24} />}
              {studentStatuses[student.id_number] === 'IN' ? 'ENTRY ACCEPTED' : 'EXIT LOGGED'}
            </div>

            {/* Left: Student Profile */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className={`w-56 h-56 rounded-full overflow-hidden border-8 shadow-2xl bg-[#00253a] ${
                  studentStatuses[student.id_number] === 'IN' ? 'border-primary/40 shadow-primary/20' : 'border-primary-dark/40 shadow-primary-dark/20'
                }`}>
                  {student.photo ? (
                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#00253a] flex items-center justify-center">
                      <User size={120} className="text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className={`absolute -bottom-2 -right-2 rounded-full p-3 text-white shadow-xl ${
                  studentStatuses[student.id_number] === 'IN' ? 'bg-primary' : 'bg-primary-dark'
                }`}>
                  <CheckCircle size={40} />
                </div>
              </div>
            </div>

            {/* Right: Info Area */}
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-6xl font-black mb-2 tracking-tight text-white uppercase leading-none">{student.name}</h2>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-2xl font-bold text-accent uppercase tracking-wider">{student.section || 'Grade 11-A'}</span>
                <span className="w-2 h-2 rounded-full bg-white/10"></span>
                <span className="text-2xl font-medium text-text-muted">ID: {student.id_number}</span>
              </div>
              
              <div className="h-px w-full bg-white/5 mb-6"></div>
              
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Status Update</span>
                <span className="text-4xl font-bold text-white uppercase italic">
                  {studentStatuses[student.id_number] === 'IN' ? 'LOGGED IN AT' : 'LOGGED OUT AT'} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className="text-xl text-accent/80 font-medium mt-2 italic">
                  Have a great day, {student.name.split(' ')[0]}!
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="max-w-xl w-full glass p-10 text-center animate-fade-in border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.2)] rounded-[40px]">
            <div className="w-28 h-28 glass flex items-center justify-center mx-auto mb-8 border-red-500/30 rounded-full">
              <XCircle size={64} className="text-red-500" />
            </div>
            <h2 className="text-5xl font-black mb-2 text-white italic uppercase">ACCESS DENIED</h2>
            <p className="text-red-400 font-bold text-2xl uppercase tracking-widest">Unregistered Card</p>
          </div>
        )}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {recentScans.map((scan, i) => (
              <div key={`${scan.id_number}-${i}`} className="flex items-center gap-4 animate-fade-in glass py-3 px-5 border-white/10 hover:border-primary/40 transition-all bg-black/30 rounded-2xl group">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 bg-zinc-900 group-hover:border-primary/50 transition-colors">
                    {scan.photo ? (
                      <img src={scan.photo} alt={scan.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <User size={20} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#0d0d12] ${
                    scan.status === 'IN' ? 'bg-accent' : 'bg-red-500'
                  }`}></div>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-black text-white truncate uppercase">{scan.name}</span>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold">
                    <span>{scan.timestamp}</span>
                    <span className="opacity-30">|</span>
                    <span className={`font-black ${scan.status === 'IN' ? 'text-accent' : 'text-red-400'}`}>
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
    </div>
  );
};

export default Client;

