import React, { useState, useEffect, useRef } from 'react';
import { Scan, User, CheckCircle, XCircle, LogIn, LogOut, Clock } from 'lucide-react';
import { getStudents, logAttendance } from '../services/api';

const Client = () => {
  const [scanValue, setScanValue] = useState('');
  const [students, setStudents] = useState([]);
  const [student, setStudent] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [recentScans, setRecentScans] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({}); // Tracking IN/OUT per student
  
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const idleTimerRef = useRef(null);

  // Initial data fetch
  useEffect(() => {
    const fetchStudents = async () => {
      const data = await getStudents();
      setStudents(data);
    };
    fetchStudents();

    // Refresh student list every 5 minutes
    const interval = setInterval(fetchStudents, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Keep input focused at all times
    const interval = setInterval(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Handle 1-minute idle time
  useEffect(() => {
    if (recentScans.length > 0) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setRecentScans([]);
      }, 60000); // 1 minute
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [recentScans]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanValue) return;

    const foundStudent = students.find(s => s.rfid === scanValue);
    
    if (foundStudent) {
      // Toggle status logic
      const currentStatus = studentStatuses[foundStudent.id_number] || 'OUT';
      const newStatus = currentStatus === 'IN' ? 'OUT' : 'IN';
      
      setStudentStatuses(prev => ({
        ...prev,
        [foundStudent.id_number]: newStatus
      }));

      const scanEntry = {
        ...foundStudent,
        status: newStatus,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setRecentScans(prev => [scanEntry, ...prev].slice(0, 5));
      setStudent(foundStudent);
      setStatus('success');
      
      // Log to backend
      logAttendance({
        rfid: foundStudent.rfid,
        student_id: foundStudent.id_number,
        name: foundStudent.name,
        status: newStatus,
        teacher_id: foundStudent.teacher_id
      });

      console.log(`Logging attendance for: ${foundStudent.name} (${newStatus})`);
    } else {
      setStatus('error');
    }

    setScanValue('');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus('idle');
      setStudent(null);
    }, 2000); // Show success/error for 2 seconds
  };

  return (
    <div className="client-container h-screen flex flex-col items-center relative overflow-hidden bg-[#0a0a0c]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(59,130,246,0.05)_0%,transparent_70%)]"></div>
      </div>

      {/* Main Content Area (Centered) */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full px-6">
        {/* Hidden input for RFID capturing */}
        <form onSubmit={handleScan} className="opacity-0 absolute">
          <input
            ref={inputRef}
            type="text"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            autoFocus
          />
        </form>

        {status === 'idle' && (
          <div className="text-center animate-fade-in">
            <div className="w-24 h-24 glass flex items-center justify-center mx-auto mb-6 border-primary/30">
              <Scan size={48} className="text-primary animate-pulse" />
            </div>
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">READY TO SCAN</h1>
            <p className="text-text-muted text-lg">Please tap your RFID card</p>
          </div>
        )}

        {status === 'success' && student && (
          <div className="max-w-sm w-full glass p-6 text-center animate-fade-in border-accent/50 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-accent shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                {student.photo ? (
                  <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <User size={64} className="text-zinc-600" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-1.5 text-white shadow-lg">
                <CheckCircle size={24} />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-1">{student.name}</h2>
            <p className="text-accent font-semibold text-base mb-3">{student.id_number}</p>
            <div className={`py-1.5 px-4 glass rounded-full inline-flex items-center gap-2 font-bold text-sm ${
              studentStatuses[student.id_number] === 'IN' ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-400'
            }`}>
              {studentStatuses[student.id_number] === 'IN' ? <LogIn size={16} /> : <LogOut size={16} />}
              {studentStatuses[student.id_number] === 'IN' ? 'LOGGED IN' : 'LOGGED OUT'}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="max-w-sm w-full glass p-6 text-center animate-fade-in border-red-500/50">
            <div className="w-24 h-24 glass flex items-center justify-center mx-auto mb-6 border-red-500/30">
              <XCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-1">ACCESS DENIED</h2>
            <p className="text-red-400 font-semibold mb-4 text-sm">Unregistered Card</p>
          </div>
        )}
      </div>

      {/* Bottom Panel: Recent Line Up */}
      <div className="w-full h-24 glass border-x-0 border-b-0 rounded-none z-10 flex flex-col p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2 opacity-50">
            <Clock size={14} className="text-primary" />
            <span className="brand font-bold text-[10px] tracking-widest">RECENT LINE-UP</span>
          </div>
          {recentScans.length > 0 && (
            <span className="text-[9px] text-text-muted italic">Clears after 1m of inactivity</span>
          )}
        </div>
        
        <div className="flex justify-center gap-6 flex-wrap">
          {recentScans.map((scan, i) => (
            <div key={`${scan.id_number}-${i}`} className="flex items-center gap-3 animate-fade-in glass py-2 px-4 border-white/10 hover:border-primary/30 transition-all">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                  {scan.photo ? (
                    <img src={scan.photo} alt={scan.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <User size={14} className="text-zinc-500" />
                    </div>
                  )}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0c] ${
                  scan.status === 'IN' ? 'bg-accent' : 'bg-red-500'
                }`}></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold truncate max-w-[100px]">{scan.name}</span>
                <div className="flex items-center gap-2 text-[8px] text-text-muted">
                  <span>{scan.timestamp}</span>
                  <span className="opacity-30">|</span>
                  <span className={`font-bold ${scan.status === 'IN' ? 'text-accent' : 'text-red-400'}`}>
                    {scan.status === 'IN' ? 'IN' : 'OUT'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {recentScans.length === 0 && (
            <div className="flex items-center justify-center h-10 opacity-10 italic text-xs">
              Waiting for activity...
            </div>
          )}
        </div>
      </div>

      {/* Brand Watermark */}
      <div className="absolute top-6 right-8 opacity-10 flex items-center gap-2 pointer-events-none">
        <span className="brand font-bold text-sm tracking-[0.3em]">SENTINEL CORE</span>
      </div>
    </div>
  );
};

export default Client;

