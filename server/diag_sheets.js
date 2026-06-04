const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

async function diag() {
  const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

  try {
    await doc.loadInfo();
    console.log('--- Spreadsheet Info ---');
    console.log('Title:', doc.title);
    console.log('Worksheets:', Object.keys(doc.sheetsByTitle).join(', '));
    
    const requiredSheets = ['Students', 'Teacher', 'Logs'];
    for (const sheetName of requiredSheets) {
        const sheet = doc.sheetsByTitle[sheetName];
        if (sheet) {
            console.log(`\n[${sheetName}] Found`);
            const rows = await sheet.getRows();
            console.log(`Rows: ${rows.length}`);
            if (rows.length > 0) {
                console.log('Sample data:', JSON.stringify(rows[0].toObject(), null, 2));
            }
        } else {
            console.log(`\n[${sheetName}] MISSING!`);
        }
    }
  } catch (e) {
    console.error('DIAG ERROR:', e.message);
  }
}

diag();
