const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

async function sendBuyerEmail({ buyerEmail, buyerName, agentName, botName, clickToTalkUrl }) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0A0A0A;padding:24px 36px;">
  <h1 style="color:#C9A84C;font-size:20px;margin:0;font-family:Georgia,serif;">${botName || agentName + ' AI'}</h1>
  <p style="color:#666;font-size:11px;margin:4px 0 0;">Powered by DoorBot AI</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <h2 style="color:#111;font-size:18px;margin:0 0 14px;">Hi${buyerName ? ' ' + buyerName : ''}! 👋</h2>
  <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 14px;">
    Thanks for your interest! <strong>${agentName}</strong> has an AI assistant ready to help you 24/7.
  </p>
  <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 24px;">
    Click below for a quick call — the AI will understand your needs and book a time with ${agentName}.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
    <tr><td style="background:#C9A84C;border-radius:4px;">
      <a href="${clickToTalkUrl}" style="display:block;padding:14px 32px;color:#0A0A0A;font-size:14px;font-weight:bold;text-decoration:none;">
        📞 Talk to ${botName || agentName + "'s AI"}
      </a>
    </td></tr>
  </table>
  <p style="color:#888;font-size:12px;text-align:center;">Responds in under 60 seconds • Available 24/7</p>
</td></tr>
<tr><td style="background:#f9f9f9;padding:16px 36px;border-top:1px solid #eee;">
  <p style="color:#bbb;font-size:11px;margin:0;text-align:center;">
    Sent on behalf of ${agentName} via DoorBot AI — We open the door, you close the deal.
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    await getTransporter().sendMail({
      from: `"${agentName} AI" <${process.env.GMAIL_USER}>`,
      to: buyerEmail,
      subject: `${buyerName ? buyerName + ', ' : ''}Talk to ${botName || agentName + "'s AI"}`,
      html,
    });
    return true;
  } catch (err) {
    console.error('Buyer email error:', err.message);
    return false;
  }
}

async function sendAgentAlert({ agentEmail, agentName, leadData }) {
  const { name, phone, email, budget, city, propertyType, appointmentDate, callOutcome, callReason, source } = leadData;

  const statusColor = callOutcome === 'appointment_booked' ? '#4CAF7D' : callOutcome === 'not_interested' ? '#E05252' : '#C9A84C';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0A0A0A;padding:24px 36px;">
  <h1 style="color:#C9A84C;font-size:18px;margin:0;font-family:Georgia,serif;">
    ${callOutcome === 'appointment_booked' ? '🔥 Hot Lead Booked!' : callOutcome === 'not_interested' ? '❌ Lead Not Interested' : '📞 Lead Update'}
  </h1>
  <p style="color:#666;font-size:11px;margin:4px 0 0;">DoorBot AI — ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
</td></tr>
<tr><td style="padding:28px 36px;">
  <p style="margin:0 0 20px;color:#444;font-size:14px;">Hi <strong>${agentName}</strong>,</p>
  <table width="100%" cellpadding="10" cellspacing="0" style="background:#f9f9f9;border-radius:6px;margin-bottom:20px;">
    <tr><td style="border-bottom:1px solid #eee;"><small style="color:#888;text-transform:uppercase;font-size:11px;">Outcome</small><br/><span style="color:${statusColor};font-size:14px;font-weight:bold;">${callOutcome?.replace(/_/g, ' ').toUpperCase() || 'N/A'}</span></td></tr>
    <tr><td style="border-bottom:1px solid #eee;"><small style="color:#888;text-transform:uppercase;font-size:11px;">Reason</small><br/><span style="color:#111;font-size:14px;">${callReason || 'N/A'}</span></td></tr>
    <tr><td style="border-bottom:1px solid #eee;"><small style="color:#888;text-transform:uppercase;font-size:11px;">Name</small><br/><span style="color:#111;font-size:14px;">${name || 'N/A'}</span></td></tr>
    <tr><td style="border-bottom:1px solid #eee;"><small style="color:#888;text-transform:uppercase;font-size:11px;">Phone</small><br/><span style="color:#C9A84C;font-size:14px;">${phone || 'N/A'}</span></td></tr>
    <tr><td style="border-bottom:1px solid #eee;"><small style="color:#888;text-transform:uppercase;font-size:11px;">Budget</small><br/><span style="color:#111;font-size:14px;">${budget || 'N/A'}</span></td></tr>
    <tr><td style="border-bottom:1px solid #eee;"><small style="color:#888;text-transform:uppercase;font-size:11px;">City</small><br/><span style="color:#111;font-size:14px;">${city || 'N/A'}</span></td></tr>
    <tr><td style="border-bottom:1px solid #eee;"><small style="color:#888;text-transform:uppercase;font-size:11px;">Source</small><br/><span style="color:#111;font-size:14px;">${source || 'N/A'}</span></td></tr>
    ${appointmentDate ? `<tr><td><small style="color:#888;text-transform:uppercase;font-size:11px;">Appointment</small><br/><span style="color:#C9A84C;font-size:16px;font-weight:bold;">${appointmentDate}</span></td></tr>` : ''}
  </table>
</td></tr>
<tr><td style="background:#f9f9f9;padding:14px 36px;border-top:1px solid #eee;">
  <p style="color:#bbb;font-size:11px;margin:0;text-align:center;">DoorBot AI — We open the door, you close the deal.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    await getTransporter().sendMail({
      from: `"DoorBot AI" <${process.env.GMAIL_USER}>`,
      to: agentEmail,
      subject: callOutcome === 'appointment_booked'
        ? `🔥 Booked! ${name} — ${budget} — ${appointmentDate}`
        : `📞 Lead Update: ${name} — ${callOutcome?.replace(/_/g, ' ')}`,
      html,
    });
    return true;
  } catch (err) {
    console.error('Agent alert error:', err.message);
    return false;
  }
}

async function sendWelcomeEmail({ agentEmail, agentName, agentId, dashboardUrl, plan }) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0A0A0A;padding:24px 36px;">
  <h1 style="color:#C9A84C;font-size:22px;margin:0;font-family:Georgia,serif;">Welcome to DoorBot AI! 🚀</h1>
  <p style="color:#666;font-size:11px;margin:4px 0 0;">We open the door, you close the deal.</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <h2 style="color:#111;font-size:18px;margin:0 0 14px;">Hi ${agentName}! 👋</h2>
  <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 14px;">
    Your <strong>${plan}</strong> plan is active! Set up your AI bot in 10 minutes:
  </p>
  <ol style="color:#444;font-size:14px;line-height:2;margin:0 0 24px;padding-left:20px;">
    <li>Open your dashboard</li>
    <li>Give your bot a name (e.g. "James AI")</li>
    <li>Fill in your city, property types, price range</li>
    <li>Add your Calendly link</li>
    <li>Choose your lead source</li>
    <li>Your bot goes live instantly!</li>
  </ol>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
    <tr><td style="background:#C9A84C;border-radius:4px;">
      <a href="${dashboardUrl}" style="display:block;padding:14px 32px;color:#0A0A0A;font-size:14px;font-weight:bold;text-decoration:none;">
        Open My Dashboard →
      </a>
    </td></tr>
  </table>
  <p style="color:#888;font-size:12px;text-align:center;">Your Agent ID: <strong>${agentId}</strong> — save this!</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    await getTransporter().sendMail({
      from: `"DoorBot AI" <${process.env.GMAIL_USER}>`,
      to: agentEmail,
      subject: `Welcome to DoorBot AI — Your bot is ready! 🚀`,
      html,
    });
    return true;
  } catch (err) {
    console.error('Welcome email error:', err.message);
    return false;
  }
}

module.exports = { sendBuyerEmail, sendAgentAlert, sendWelcomeEmail };
