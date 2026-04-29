const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

async function review() {
  const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

  try {
    await doc.loadInfo();
    console.log('--- Spreadsheet Review ---');
    console.log('Title:', doc.title);
    
    for (const sheetTitle of Object.keys(doc.sheetsByTitle)) {
      const sheet = doc.sheetsByTitle[sheetTitle];
      await sheet.loadHeaderRow();
      console.log(`\nSheet: ${sheetTitle}`);
      console.log(`Headers: ${sheet.headerValues.join(', ')}`);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

review();
