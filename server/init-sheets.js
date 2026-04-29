const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

async function init() {
  const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

  try {
    await doc.loadInfo();
    console.log('Connected to:', doc.title);

    // Initialize Students Sheet
    let studentSheet = doc.sheetsByTitle['Students'];
    if (!studentSheet) {
      studentSheet = await doc.addSheet({ title: 'Students', headerValues: ['RFID_Code', 'Name', 'Email', 'Student_ID', 'Photo_URL', 'Department', 'Section', 'Teacher_Name', 'Teacher_Email'] });
      console.log('Created Students sheet');
    } else {
      await studentSheet.setHeaderRow(['RFID_Code', 'Name', 'Email', 'Student_ID', 'Photo_URL', 'Department', 'Section', 'Teacher_Name', 'Teacher_Email']);
      console.log('Updated Students headers');
    }

    // Initialize Attendance Sheet
    let attendanceSheet = doc.sheetsByTitle['Attendance'];
    if (!attendanceSheet) {
      attendanceSheet = await doc.addSheet({ title: 'Attendance', headerValues: ['Timestamp', 'Student_ID', 'Name', 'RFID_Code', 'Status'] });
      console.log('Created Attendance sheet');
    } else {
      await attendanceSheet.setHeaderRow(['Timestamp', 'Student_ID', 'Name', 'RFID_Code', 'Status']);
      console.log('Updated Attendance headers');
    }

    console.log('Initialization complete!');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

init();
