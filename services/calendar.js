const { google } = require('googleapis');

function getCalendar() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

async function bookAppointment({ agentEmail, leadName, leadPhone, budget, city, appointmentDate }) {
  try {
    const start = new Date(appointmentDate);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const calendar = getCalendar();

    const event = {
      summary: `🔥 DoorBot Lead — ${leadName}`,
      description: `Lead: ${leadName}\nPhone: ${leadPhone}\nBudget: ${budget}\nCity: ${city}\n\nBooked via DoorBot AI`,
      start: { dateTime: start.toISOString(), timeZone: 'America/New_York' },
      end: { dateTime: end.toISOString(), timeZone: 'America/New_York' },
      attendees: [{ email: agentEmail }],
      reminders: {
        useDefault: false,
        overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 30 }],
      },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
    });

    console.log('[DoorBot AI] Calendar event created:', res.data.htmlLink);
    return { success: true, eventLink: res.data.htmlLink };
  } catch (err) {
    console.error('Calendar error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { bookAppointment };
