const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Sheets
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
  scopes: SCOPES,
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

let isSheetInitialized = false;
let schoolLogoUrl = '';

async function initSheet() {
  try {
    await doc.loadInfo();
    isSheetInitialized = true;

    const configSheet = doc.sheetsByTitle['logo'] || doc.sheetsByTitle['Config'];
    if (configSheet) {
      console.log('Logo/Config sheet found.');
    }

    console.log('Successfully connected to Google Sheet:', doc.title);
  } catch (error) {
    console.error('Failed to connect to Google Sheet:', error.message);
    isSheetInitialized = false;
  }
}

// Health check and sheet status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    sheets_connected: isSheetInitialized,
    spreadsheet_title: isSheetInitialized ? doc.title : 'Not Connected'
  });
});

// Helper to check sheet initialization
const checkInit = (req, res, next) => {
    if (!isSheetInitialized) {
        return res.status(503).json({ error: 'Google Sheets not initialized. Please try again in a moment or check backend logs.' });
    }
    next();
};

app.get('/api/students', checkInit, async (req, res) => {
  try {
    const studentSheet = doc.sheetsByTitle['Students'];
    const teacherSheet = doc.sheetsByTitle['Teacher'];
    
    if (!studentSheet || !teacherSheet) {
        throw new Error(`Required worksheets missing. Found: ${Object.keys(doc.sheetsByTitle).join(', ')}`);
    }

    const [studentRows, teacherRows] = await Promise.all([
      studentSheet.getRows(),
      teacherSheet.getRows()
    ]);

    const teachers = teacherRows.reduce((acc, row) => {
      acc[row.get('Teacher_ID')] = {
        name: row.get('Teacher_Name'),
        email: row.get('Teacher_Email'),
        department: row.get('Department')
      };
      return acc;
    }, {});

    const students = studentRows.map(row => {
      const teacherId = row.get('Teacher_ID');
      const teacher = teachers[teacherId] || { name: 'Not Assigned', email: 'N/A', department: 'N/A' };
      
      return {
        rfid: row.get('RFID_Code'),
        name: row.get('Name'),
        email: row.get('Email'),
        id_number: row.get('Student_ID'),
        photo: row.get('Photo_URL'),
        section: row.get('Section'),
        department: teacher.department,
        teacher_name: teacher.name,
        teacher_email: teacher.email,
        teacher_id: teacherId
      };
    });
    res.json(students);
  } catch (error) {
    console.error('API Students Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', checkInit, async (req, res) => {
  try {
    const configSheet = doc.sheetsByTitle['logo'] || doc.sheetsByTitle['Config'];
    let currentLogo = schoolLogoUrl || null;
    
    if (configSheet) {
      await configSheet.loadCells('A1:A1');
      const cell = configSheet.getCell(0, 0);
      currentLogo = cell.value || null;
    }
    
    res.json({ schoolLogo: currentLogo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers', checkInit, async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['Teacher'];
    const rows = await sheet.getRows();
    const teachers = rows.map(row => ({
      teacher_id: row.get('Teacher_ID'),
      name: row.get('Teacher_Name'),
      email: row.get('Teacher_Email'),
      department: row.get('Department')
    }));
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance', checkInit, async (req, res) => {
  try {
    const { student_id, teacher_id } = req.body;
    const logsSheet = doc.sheetsByTitle['Logs'];
    const logRows = await logsSheet.getRows();

    const todayStr = new Date().toLocaleDateString();

    const todayLogs = logRows.filter(row => {
      const logTime = row.get('Logs_Time');
      return row.get('Student_ID') === student_id && 
             new Date(logTime).toLocaleDateString() === todayStr;
    });

    let nextStatus = 'IN';

    if (todayLogs.length > 0) {
      todayLogs.sort((a, b) => new Date(b.get('Logs_Time')) - new Date(a.get('Logs_Time')));
      const lastStatus = todayLogs[0].get('Log_Type');
      nextStatus = lastStatus === 'IN' ? 'OUT' : 'IN';
    }

    const timestamp = new Date().toLocaleString();
    await logsSheet.addRow({
      Transaction_ID: `TXN-${Date.now()}`,
      Student_ID: student_id,
      Logs_Time: timestamp,
      Teacher_ID: teacher_id || '',
      Log_Type: nextStatus
    });

    res.json({ success: true, status: nextStatus, timestamp });
  } catch (error) {
    console.error('Attendance Log Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics', checkInit, async (req, res) => {
  try {
    const studentSheet = doc.sheetsByTitle['Students'];
    const logsSheet = doc.sheetsByTitle['Logs'];
    
    const [studentRows, logRows] = await Promise.all([
      studentSheet.getRows(),
      logsSheet.getRows()
    ]);

    const studentMap = studentRows.reduce((acc, row) => {
      acc[row.get('Student_ID')] = { name: row.get('Name'), section: row.get('Section') };
      return acc;
    }, {});

    const sectionStats = {};
    const studentStats = {};

    logRows.forEach(log => {
      const studentId = log.get('Student_ID');
      const timeStr = log.get('Logs_Time');
      const logDate = new Date(timeStr).toLocaleDateString();
      const student = studentMap[studentId];

      if (student) {
        if (!sectionStats[student.section]) sectionStats[student.section] = {};
        sectionStats[student.section][logDate] = (sectionStats[student.section][logDate] || 0) + 1;

        if (!studentStats[studentId]) studentStats[studentId] = {};
        studentStats[studentId][logDate] = (studentStats[studentId][logDate] || 0) + 1;
      }
    });

    res.json({ sectionStats, studentStats, totalLogs: logRows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers', checkInit, async (req, res) => {
  try {
    const { teacher_id, name, email, department } = req.body;
    const sheet = doc.sheetsByTitle['Teacher'];
    await sheet.addRow({ Teacher_ID: teacher_id, Teacher_Name: name, Teacher_Email: email, Department: department });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', checkInit, async (req, res) => {
  try {
    const { name, email, id_number, rfid, section, teacher_id } = req.body;
    const sheet = doc.sheetsByTitle['Students'];
    await sheet.addRow({ RFID_Code: rfid, Name: name, Email: email, Student_ID: id_number, Section: section, Teacher_ID: teacher_id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

async function startServer() {
    await initSheet();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer();
