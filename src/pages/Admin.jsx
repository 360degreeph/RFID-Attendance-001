import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addStudent, addTeacher, getTeachers } from '../services/api';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Plus, 
  Search,
  ArrowUpRight,
  Clock,
  UserPlus,
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react';
import { getAnalytics, getStudents } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { RFID_MOCK_DATA, MOCK_ATTENDANCE_LOGS, WEEKLY_DATA } from '../services/mockData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '', email: '', id_number: '', rfid: '', section: '', teacher_id: ''
  });
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    teacher_id: '',
    name: '',
    email: '',
    department: 'Engineering'
  });
  const [teacherList, setTeacherList] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({ sectionStats: {}, studentStats: {}, totalLogs: 0 });
  const [students, setStudents] = useState(RFID_MOCK_DATA);
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState('All');
  const [timeframe, setTimeframe] = useState('daily'); // daily, weekly, monthly

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [analytics, studentList, teachers] = await Promise.all([
          getAnalytics(),
          getStudents(),
          getTeachers()
        ]);
        if (analytics) setAnalyticsData(analytics);
        if (Array.isArray(studentList)) setStudents(studentList);
        if (Array.isArray(teachers)) setTeacherList(teachers);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    fetchData();
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await addStudent(newStudent);
      setIsModalOpen(false);
      setNewStudent({
        name: '', email: '', id_number: '', rfid: '', section: '', teacher_id: ''
      });
      alert('Student added successfully!');
    } catch (error) {
      alert('Failed to add student');
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await addTeacher(newTeacher);
      setIsTeacherModalOpen(false);
      setNewTeacher({ teacher_id: '', name: '', email: '', department: 'Engineering' });
      const teachers = await getTeachers();
      setTeacherList(teachers);
      alert('Teacher registered successfully!');
    } catch (error) {
      alert('Failed to register teacher');
    }
  };

  const getSectionChartData = () => {
    const stats = analyticsData?.sectionStats?.[selectedSection] || {};
    const labels = Object.keys(stats);
    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Attendance',
        data: labels.length > 0 ? Object.values(stats) : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  };

  const getStudentChartData = () => {
    const stats = analyticsData?.studentStats?.[selectedStudent] || {};
    const labels = Object.keys(stats);
    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Attendance',
        data: labels.length > 0 ? Object.values(stats) : [0],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c]">
      {/* Sidebar */}
      <div className="w-64 glass border-r-0 rounded-none border-y-0 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_15px_var(--primary-glow)]">
            <Clock className="text-white" size={24} />
          </div>
          <span className="brand font-bold text-xl">SENTINEL</span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarLink 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarLink 
            icon={<Users size={20} />} 
            label="Students" 
            active={activeTab === 'students'} 
            onClick={() => setActiveTab('students')}
          />
          <SidebarLink 
            icon={<UserPlus size={20} />} 
            label="Teachers" 
            active={activeTab === 'teachers'} 
            onClick={() => setActiveTab('teachers')}
          />
          <SidebarLink 
            icon={<BarChart3 size={20} />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
          />
          <SidebarLink 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        <button className="flex items-center gap-3 p-3 text-text-muted hover:text-red-400 transition-colors mt-auto">
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold capitalize">{activeTab}</h1>
            <p className="text-text-muted">Welcome back, Administrator</p>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search students..." 
                className="glass pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsTeacherModalOpen(true)}
                className="bg-accent/10 text-accent border border-accent/20 px-4 py-2 text-sm font-semibold hover:bg-accent/20 transition-all flex items-center gap-2 rounded-xl"
              >
                <Plus size={18} /> Register Teacher
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={20} /> Add Student
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass w-full max-w-2xl p-8 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">Register New Student</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-white">&times;</button>
                </div>

                <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary tracking-widest uppercase">Student Information</h3>
                    <div className="space-y-2">
                      <label className="text-xs text-text-muted">Full Name</label>
                      <input 
                        className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50" 
                        placeholder="John Doe" 
                        required
                        value={newStudent.name}
                        onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-text-muted">Email Address</label>
                      <input 
                        className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50" 
                        placeholder="john@example.com" 
                        type="email"
                        required
                        value={newStudent.email}
                        onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-text-muted">Student ID</label>
                        <input 
                          className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50" 
                          placeholder="2023-XXXX" 
                          required
                          value={newStudent.id_number}
                          onChange={e => setNewStudent({...newStudent, id_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-text-muted">Section</label>
                        <input 
                          className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50" 
                          placeholder="Section A" 
                          required
                          value={newStudent.section}
                          onChange={e => setNewStudent({...newStudent, section: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-text-muted">RFID Code</label>
                      <input 
                        className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50 font-mono" 
                        placeholder="Scan RFID Tag" 
                        required
                        value={newStudent.rfid}
                        onChange={e => setNewStudent({...newStudent, rfid: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-accent tracking-widest uppercase">Academic & Assignment</h3>
                    <div className="space-y-2 pt-2">
                      <label className="text-xs text-text-muted">Assigned Teacher</label>
                      <select 
                        className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50 appearance-none bg-zinc-900"
                        required
                        value={newStudent.teacher_id}
                        onChange={e => setNewStudent({...newStudent, teacher_id: e.target.value})}
                      >
                        <option value="">Select a Teacher</option>
                        {teacherList.map(teacher => (
                          <option key={teacher.teacher_id} value={teacher.teacher_id}>
                            {teacher.name} ({teacher.teacher_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-6">
                      <button type="submit" className="btn-primary w-full py-4 text-base">Register Student</button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {isTeacherModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass w-full max-w-md p-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">Register Teacher</h2>
                  <button onClick={() => setIsTeacherModalOpen(false)} className="text-text-muted hover:text-white">&times;</button>
                </div>

                <form onSubmit={handleAddTeacher} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs text-text-muted">Teacher ID</label>
                    <input 
                      className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50" 
                      placeholder="T-001" 
                      required
                      value={newTeacher.teacher_id}
                      onChange={e => setNewTeacher({...newTeacher, teacher_id: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-text-muted">Full Name</label>
                    <input 
                      className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50" 
                      placeholder="Prof. Smith" 
                      required
                      value={newTeacher.name}
                      onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-text-muted">Email Address</label>
                    <input 
                      className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50" 
                      placeholder="smith@example.com" 
                      type="email"
                      required
                      value={newTeacher.email}
                      onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-text-muted">Department</label>
                    <select 
                      className="w-full glass p-3 text-sm focus:outline-none focus:border-primary/50 appearance-none bg-zinc-900"
                      value={newTeacher.department}
                      onChange={e => setNewTeacher({...newTeacher, department: e.target.value})}
                    >
                      <option>Engineering</option>
                      <option>Architecture</option>
                      <option>Business</option>
                      <option>Science</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full py-4 text-base">Register Teacher</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Students" value={students.length.toLocaleString()} change="" icon={<Users className="text-primary" />} />
              <StatCard label="Total Logs" value={analyticsData.totalLogs.toLocaleString()} change="" icon={<UserPlus className="text-accent" />} />
              <StatCard label="Avg. Arrival" value="07:45 AM" change="" icon={<Clock className="text-amber-400" />} />
            </div>

            {/* Chart & Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Weekly Attendance</h3>
                  <select className="bg-transparent border-none text-text-muted text-sm focus:outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-64">
                  <Line 
                    data={WEEKLY_DATA} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                      },
                      plugins: { legend: { display: false } }
                    }} 
                  />
                </div>
              </div>

              <div className="glass p-6">
                <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {MOCK_ATTENDANCE_LOGS.map(log => (
                    <div key={log.id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm">
                        {log.student.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{log.student}</p>
                        <p className="text-[10px] text-text-muted">{log.time} • {log.status} • <span className="text-primary/70">{log.section || 'N/A'}</span></p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${log.status === 'IN' ? 'bg-accent' : 'bg-red-500'}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Section Analytics */}
              <div className="glass p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Filter size={20} className="text-accent" /> Section Dashboard
                    </h3>
                    <p className="text-xs text-text-muted">Daily attendance per section</p>
                  </div>
                  <select 
                    className="glass px-4 py-2 text-sm focus:outline-none"
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                  >
                    <option value="All">All Sections</option>
                    {[...new Set((Array.isArray(students) ? students : []).map(s => s.section))].filter(Boolean).map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div className="h-64">
                  <Line 
                    data={getSectionChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } }
                    }} 
                  />
                </div>
              </div>

              {/* Student Analytics */}
              <div className="glass p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Users size={20} className="text-primary" /> Student Trends
                    </h3>
                    <p className="text-xs text-text-muted">Weekly & Monthly patterns</p>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="glass px-4 py-2 text-sm focus:outline-none max-w-[150px]"
                      value={selectedStudent}
                      onChange={e => setSelectedStudent(e.target.value)}
                    >
                      <option value="All">All Students</option>
                      {(Array.isArray(students) ? students : []).map(s => (
                        <option key={s.id_number} value={s.id_number}>{s.name}</option>
                      ))}
                    </select>
                    <select 
                      className="glass px-4 py-2 text-sm focus:outline-none"
                      value={timeframe}
                      onChange={e => setTimeframe(e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="h-64">
                  <Line 
                    data={getStudentChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } }
                    }} 
                  />
                </div>
              </div>
            </div>
            
            <div className="glass p-6">
              <h3 className="text-xl font-bold mb-6">Summary Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-4 text-text-muted font-medium text-sm">Entity</th>
                      <th className="pb-4 text-text-muted font-medium text-sm">Attendance Count</th>
                      <th className="pb-4 text-text-muted font-medium text-sm">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(analyticsData.sectionStats).map(([section, stats]) => (
                      <tr key={section}>
                        <td className="py-4 font-medium">{section}</td>
                        <td className="py-4">{Object.values(stats).reduce((a, b) => a + b, 0)}</td>
                        <td className="py-4">
                          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: '85%' }}></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="glass overflow-hidden animate-fade-in">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="p-4 font-semibold text-text-muted">Teacher ID</th>
                  <th className="p-4 font-semibold text-text-muted">Name</th>
                  <th className="p-4 font-semibold text-text-muted">Email</th>
                  <th className="p-4 font-semibold text-text-muted">Department</th>
                  <th className="p-4 font-semibold text-text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teacherList.map((teacher, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-primary">{teacher.teacher_id}</td>
                    <td className="p-4 font-medium">{teacher.name}</td>
                    <td className="p-4 text-text-muted">{teacher.email}</td>
                    <td className="p-4">
                      <span className="glass py-1 px-3 text-[10px] font-bold text-accent">{teacher.department}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-text-muted hover:text-primary transition-colors p-2">
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="glass overflow-hidden animate-fade-in">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="p-4 font-semibold text-text-muted">Student</th>
                  <th className="p-4 font-semibold text-text-muted">Section</th>
                  <th className="p-4 font-semibold text-text-muted">ID Number</th>
                  <th className="p-4 font-semibold text-text-muted">Teacher</th>
                  <th className="p-4 font-semibold text-text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{student.name}</span>
                        <span className="text-xs text-text-muted">{student.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="glass py-1 px-3 text-xs font-bold text-primary">{student.section}</span>
                    </td>
                    <td className="p-4 font-mono text-text-muted text-sm">{student.id_number}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{student.teacher_name}</span>
                        <span className="text-[10px] text-accent font-semibold">{student.teacher_email}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-text-muted hover:text-primary transition-colors p-2">
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const SidebarLink = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
      active ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="font-semibold">{label}</span>
  </button>
);

const StatCard = ({ label, value, change, icon }) => (
  <div className="glass p-6">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 glass bg-white/5 rounded-xl">{icon}</div>
      <span className={`text-xs font-bold flex items-center gap-1 ${change.startsWith('+') ? 'text-accent' : 'text-red-400'}`}>
        {change} <ArrowUpRight size={14} />
      </span>
    </div>
    <p className="text-text-muted text-sm font-medium mb-1">{label}</p>
    <p className="text-3xl font-extrabold">{value}</p>
  </div>
);

export default Admin;
