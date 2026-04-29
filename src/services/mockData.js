export const RFID_MOCK_DATA = [
  {
    rfid: '0001234567',
    name: 'Karl Jasper',
    email: 'karl.jasper@example.com',
    id_number: '2023-0001',
    photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1587&auto=format&fit=crop',
    department: 'Engineering',
    section: 'BS-ECE 4A',
    teacher_name: 'Dr. Emily Watson',
    teacher_email: 'e.watson@university.edu'
  },
  {
    rfid: '0007654321',
    name: 'Sarah Smith',
    email: 'sarah.smith@example.com',
    id_number: '2023-0002',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1587&auto=format&fit=crop',
    department: 'Architecture',
    section: 'BS-ARCH 3B',
    teacher_name: 'Ar. Julian Reyes',
    teacher_email: 'j.reyes@university.edu'
  },
  {
    rfid: '12345',
    name: 'Test Student',
    email: 'test@example.com',
    id_number: 'S-001',
    photo: '',
    department: 'Testing',
    section: 'A',
    teacher_name: 'Mr. Smith',
    teacher_email: 'smith@example.com'
  }
];

export const MOCK_ATTENDANCE_LOGS = [
  { id: 1, student: 'Karl Jasper', rfid: '0001234567', time: '08:00 AM', date: '2026-04-24', status: 'IN', section: 'BS-ECE 4A' },
  { id: 2, student: 'Sarah Smith', rfid: '0007654321', time: '08:15 AM', date: '2026-04-24', status: 'IN', section: 'BS-ARCH 3B' },
  { id: 3, student: 'Karl Jasper', rfid: '0001234567', time: '05:00 PM', date: '2026-04-24', status: 'OUT', section: 'BS-ECE 4A' },
];

export const WEEKLY_DATA = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  datasets: [
    {
      label: 'Attendance Rate %',
      data: [95, 92, 88, 97, 90],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      tension: 0.4,
      fill: true
    }
  ]
};
