const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

async function updateHeaders() {
  const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

  try {
    await doc.loadInfo();
    const studentSheet = doc.sheetsByTitle['Students'];
    await studentSheet.loadHeaderRow();
    
    const currentHeaders = studentSheet.headerValues;
    if (!currentHeaders.includes('Teacher_ID')) {
      await studentSheet.setHeaderRow([...currentHeaders, 'Teacher_ID']);
      console.log('Added Teacher_ID to Students sheet');
    } else {
      console.log('Teacher_ID already exists in Students sheet');
    }

  } catch (e) {
    console.error('Error:', e.message);
  }
}

updateHeaders();
