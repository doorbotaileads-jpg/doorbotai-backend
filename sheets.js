const { google } = require('googleapis');
const db = require('./database');

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function addLead(leadData) {
  const { name, phone, email, budget, timeline, city, propertyType, buyerSeller, status, source, agentId, callOutcome, callReason } = leadData;

  // Save to MongoDB
  await db.saveLead({ name, phone, email, budget, timeline, city, propertyType, buyerSeller, status: status || 'new', source, agentId, callOutcome, callReason });

  // Save to Google Sheets
  try {
    const sheets = getSheets();
    const sheetId = leadData.googleSheetId || process.env.GOOGLE_SHEETS_ID;
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:N',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          name || '', phone || '', email || '',
          budget || '', timeline || '', city || '',
          propertyType || '', buyerSeller || '',
          status || 'new', callOutcome || '', callReason || '',
          source || '', agentId || '',
          new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
        ]]
      },
    });
    console.log('[DoorBot AI] Lead added to Sheets:', name);
  } catch (err) {
    console.error('Sheets error:', err.message);
  }
}

async function updateLead(phone, agentId, updates) {
  await db.updateLead(phone, agentId, updates);

  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:N',
    });

    const rows = res.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === phone) {
        const updateValues = [
          rows[i][0], rows[i][1], rows[i][2], rows[i][3], rows[i][4],
          updates.city || rows[i][5], rows[i][6], rows[i][7],
          updates.status || rows[i][8],
          updates.callOutcome || rows[i][9],
          updates.callReason || rows[i][10],
          rows[i][11], rows[i][12],
          updates.appointmentDate || rows[i][13]
        ];
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEETS_ID,
          range: `Sheet1!A${i + 1}:N${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [updateValues] },
        });
        break;
      }
    }
  } catch (err) {
    console.error('Sheets update error:', err.message);
  }
}

module.exports = { addLead, updateLead };
