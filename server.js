require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { createAgent, getAgent, updateAgent, deactivateAgent } = require('./services/agents');
const { addLead, updateLead } = require('./services/sheets');
const { sendBuyerEmail, sendAgentAlert, sendWelcomeEmail } = require('./services/email');
const { makeVoiceCall, checkDNC } = require('./services/retell');
const { bookAppointment } = require('./services/calendar');
const { getStats, findLeads } = require('./services/database');
const { findFSBOLeads, processExpiredListings } = require('./services/mode3');
const { getTermsOfService, getPrivacyPolicy, getCSVDisclaimer } = require('./services/legal');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'DoorBot AI v4.0 — Live! 🚀',
    tagline: 'We open the door, you close the deal.',
    compliance: 'TCPA & CASL Compliant',
    voice: 'Powered by Retell AI',
    modes: ['Mode 1: Ads leads (100% legal)', 'Mode 2: CSV upload (with consent)', 'Mode 3: FSBO & Expired listings (legal)'],
  });
});

// Legal endpoints
app.get('/api/legal/tos', (req, res) => res.json({ content: getTermsOfService() }));
app.get('/api/legal/privacy', (req, res) => res.json({ content: getPrivacyPolicy() }));
app.get('/api/legal/csv-disclaimer', (req, res) => res.json({ content: getCSVDisclaimer() }));

// ============================================================
// ONBOARDING
// ============================================================
app.post('/api/onboard', async (req, res) => {
  try {
    if (!req.body.agentName || !req.body.email) {
      return res.status(400).json({ error: 'agentName and email required' });
    }
    const agent = await createAgent(req.body);
    const dashboardUrl = `${process.env.BASE_URL}/dashboard/${agent.agentId}`;

    await sendWelcomeEmail({
      agentEmail: agent.email,
      agentName: agent.agentName,
      agentId: agent.agentId,
      dashboardUrl,
      plan: agent.plan,
    });

    res.json({
      success: true,
      agentId: agent.agentId,
      dashboardUrl,
      landingPage: `${process.env.BASE_URL}/agent/${agent.agentId}`,
      embedCode: `<script src="${process.env.BASE_URL}/widget.js" data-agent="${agent.agentId}" defer></script>`,
      message: 'Welcome email sent! Bot is live.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/train/:agentId', async (req, res) => {
  try {
    const agent = await updateAgent(req.params.agentId, req.body);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true, message: 'Bot updated!', agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/:agentId', async (req, res) => {
  try {
    const agent = await getAgent(req.params.agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const stats = await getStats(req.params.agentId);
    const leads = await findLeads(req.params.agentId);
    res.json({
      success: true,
      agent: {
        ...agent,
        embedCode: `<script src="${process.env.BASE_URL}/widget.js" data-agent="${agent.agentId}" defer></script>`,
        landingPage: `${process.env.BASE_URL}/agent/${agent.agentId}`,
        facebookWebhook: `${process.env.BASE_URL}/webhook/facebook/${agent.agentId}`,
      },
      stats,
      leads,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LANDING PAGE
// ============================================================
app.get('/agent/:agentId', async (req, res) => {
  try {
    const agent = await getAgent(req.params.agentId);
    if (!agent) return res.status(404).send('Agent not found');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Find Your Dream Home — ${agent.agentName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#080808;color:#F0EDE8;font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;}
.card{background:#101010;border:1px solid rgba(201,168,76,0.2);max-width:480px;width:100%;padding:44px 36px;}
.logo{font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;margin-bottom:28px;}
h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;line-height:1.2;margin-bottom:10px;}
h1 em{font-style:normal;color:#C9A84C;}
.sub{color:#777770;font-size:13px;margin-bottom:24px;line-height:1.7;}
.form-group{margin-bottom:12px;}
label{display:block;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#777770;margin-bottom:4px;}
input,select{width:100%;background:#181818;border:1px solid rgba(201,168,76,0.2);color:#F0EDE8;padding:10px 13px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.2s;}
input:focus,select:focus{border-color:#C9A84C;}
.btn{width:100%;background:#C9A84C;color:#080808;border:none;padding:14px;font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;margin-top:6px;}
.btn:hover{background:#E8C97A;}
.consent{font-size:10px;color:#444;margin-top:10px;line-height:1.6;}
.consent a{color:#C9A84C;}
.trust{font-size:11px;color:#555;margin-top:12px;display:flex;align-items:center;gap:6px;}
.trust::before{content:'';width:6px;height:6px;border-radius:50%;background:#4CAF7D;flex-shrink:0;}
.success{display:none;text-align:center;padding:20px 0;}
.success h2{font-family:'Cormorant Garamond',serif;font-size:26px;color:#C9A84C;margin-bottom:10px;}
.success p{color:#777770;font-size:13px;line-height:1.7;}
.ai-notice{background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.15);padding:8px 12px;font-size:10px;color:#777770;margin-bottom:16px;letter-spacing:0.04em;}
</style>
</head>
<body>
<div class="card">
  <div class="logo">${agent.botName || agent.agentName + ' AI'}</div>
  <div id="form-wrap">
    <div class="ai-notice">🤖 This service uses AI — you may be contacted by an automated voice assistant</div>
    <h1>Find Your <em>Dream Home</em> in ${agent.city || 'Your Area'}</h1>
    <p class="sub">Our AI matches you with the perfect property and connects you with ${agent.agentName}.</p>
    <div class="form-group"><label>Your Name</label><input type="text" id="f-name" placeholder="John Smith" required/></div>
    <div class="form-group"><label>Phone Number</label><input type="tel" id="f-phone" placeholder="+1 (305) 555-0100" required/></div>
    <div class="form-group"><label>Email</label><input type="email" id="f-email" placeholder="john@email.com"/></div>
    <div class="form-group"><label>Budget</label>
      <select id="f-budget"><option>Under $300K</option><option>$300K–$500K</option><option selected>$500K–$800K</option><option>$800K–$1.2M</option><option>$1.2M+</option></select>
    </div>
    <div class="form-group"><label>I am looking to</label>
      <select id="f-type"><option>Buy a home</option><option>Sell my home</option><option>Both buy and sell</option><option>Investment property</option></select>
    </div>
    <button class="btn" onclick="submitForm()">Connect with ${agent.agentName}'s AI →</button>
    <p class="consent">By submitting, you give <strong>${agent.agentName}</strong> express written consent to contact you via automated AI calls about real estate services. Message frequency varies. Reply STOP to opt out. See <a href="#">Terms</a> & <a href="#">Privacy Policy</a>.</p>
    <p class="trust">AI responds in under 60 seconds • 24/7 availability</p>
  </div>
  <div class="success" id="success-wrap">
    <h2>You're all set!</h2>
    <p>Check your phone — ${agent.botName || agent.agentName + "'s AI"} will call you in the next 60 seconds!</p>
    <p style="margin-top:8px;font-size:11px;color:#555;">This is an automated AI call from ${agent.agentName}'s team.</p>
  </div>
</div>
<script>
async function submitForm() {
  const name = document.getElementById('f-name').value;
  const phone = document.getElementById('f-phone').value;
  if (!phone || !name) { alert('Please fill in your name and phone number'); return; }
  const btn = document.querySelector('.btn');
  btn.textContent = 'Connecting...'; btn.disabled = true;
  try {
    const res = await fetch('${process.env.BASE_URL}/api/lead/new', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        agentId: '${agent.agentId}', name, phone,
        email: document.getElementById('f-email').value,
        budget: document.getElementById('f-budget').value,
        buyerSeller: document.getElementById('f-type').value,
        source: 'landing_page', consentGiven: true,
      }),
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('form-wrap').style.display='none';
      document.getElementById('success-wrap').style.display='block';
    }
  } catch(e) { btn.textContent='Try Again'; btn.disabled=false; }
}
</script>
</body></html>`);
  } catch (err) { res.status(500).send('Error'); }
});

// ============================================================
// MODE 1 — NEW LEAD
// ============================================================
app.post('/api/lead/new', async (req, res) => {
  try {
    const { agentId, name, phone, email, budget, timeline, city, propertyType, buyerSeller, source, consentGiven } = req.body;
    if (!agentId || !phone) return res.status(400).json({ error: 'agentId and phone required' });

    const agent = await getAgent(agentId);
    if (!agent || !agent.active) return res.status(404).json({ error: 'Agent not found' });

    // DNC Check
    const isOnDNC = await checkDNC(phone);
    const leadData = { name, phone, email, budget, timeline, city, propertyType, buyerSeller, status: isOnDNC ? 'dnc_blocked' : 'new', source: source || 'website', agentId, googleSheetId: agent.googleSheetId, dncChecked: true, dncBlocked: isOnDNC, consentGiven: consentGiven || false };

    await addLead(leadData);

    if (isOnDNC) {
      console.log('[DoorBot AI] Lead on DNC — blocked:', phone);
      return res.json({ success: true, message: 'Lead received (DNC blocked)' });
    }

    if (email && consentGiven) {
      const clickUrl = `${process.env.BASE_URL}/talk/${agentId}?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name||'')}`;
      await sendBuyerEmail({ buyerEmail: email, buyerName: name, agentName: agent.agentName, botName: agent.botName, clickToTalkUrl: clickUrl });
    }

    if (!email) {
      await makeVoiceCall({ phone, agentConfig: agent, leadData: { name, source } });
    }

    res.json({ success: true, message: 'Lead received!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Click to Talk
app.get('/talk/:agentId', async (req, res) => {
  try {
    const agent = await getAgent(req.params.agentId);
    if (!agent) return res.status(404).send('Not found');
    const { phone, name } = req.query;
    await makeVoiceCall({ phone, agentConfig: agent, leadData: { name, source: 'email_click' } });
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>body{font-family:Arial,sans-serif;background:#080808;color:#F0EDE8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;}
.b{max-width:340px;padding:40px 20px;}.p{width:50px;height:50px;border-radius:50%;background:#C9A84C;margin:0 auto 20px;animation:p 1.5s infinite;}
@keyframes p{0%,100%{transform:scale(1);}50%{transform:scale(1.2);}}</style></head>
<body><div class="b"><div class="p"></div>
<h2 style="color:#C9A84C;font-family:Georgia,serif;">${agent.botName}</h2>
<p>Calling you now! Answer your phone.</p>
<p style="font-size:11px;color:#444;margin-top:16px;">Powered by DoorBot AI</p>
</div></body></html>`);
  } catch (err) { res.status(500).send('Error'); }
});

// ============================================================
// MODE 2 — CSV UPLOAD
// ============================================================
app.post('/api/leads/upload/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { leads } = req.body;
    const agent = await getAgent(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    let processed = 0, called = 0, dncBlocked = 0;

    for (const lead of leads) {
      if (!lead.phone) continue;

      // DNC Check
      const isOnDNC = await checkDNC(lead.phone);
      if (isOnDNC) { dncBlocked++; continue; }

      await addLead({ ...lead, agentId, source: lead.source || 'csv_upload', status: 'new', dncChecked: true, googleSheetId: agent.googleSheetId });

      if (lead.email) {
        const clickUrl = `${process.env.BASE_URL}/talk/${agentId}?phone=${encodeURIComponent(lead.phone)}&name=${encodeURIComponent(lead.name||'')}`;
        await sendBuyerEmail({ buyerEmail: lead.email, buyerName: lead.name, agentName: agent.agentName, botName: agent.botName, clickToTalkUrl: clickUrl });
      } else {
        const result = await makeVoiceCall({ phone: lead.phone, agentConfig: agent, leadData: { name: lead.name, source: 'csv_upload' } });
        if (result.success) called++;
      }

      processed++;
      await new Promise(r => setTimeout(r, 800));
    }

    res.json({ success: true, processed, called, dncBlocked, message: `${processed} processed, ${called} calls, ${dncBlocked} DNC blocked` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODE 3 — FSBO FINDER
// ============================================================
app.post('/api/fsbo/:agentId', async (req, res) => {
  try {
    const agent = await getAgent(req.params.agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    res.json({ success: true, message: 'FSBO finder started! Leads will appear in dashboard.' });

    findFSBOLeads(agent.city, agent.agentId).then(async leads => {
      let processed = 0;
      for (const lead of leads.slice(0, 20)) {
        const isOnDNC = await checkDNC(lead.phone);
        if (isOnDNC) continue;
        await addLead({ ...lead, googleSheetId: agent.googleSheetId });
        await makeVoiceCall({ phone: lead.phone, agentConfig: agent, leadData: { name: lead.name, source: 'fsbo' } });
        processed++;
        await new Promise(r => setTimeout(r, 1200));
      }
      console.log(`[DoorBot AI] FSBO done: ${processed} leads for ${agent.agentName}`);
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// RETELL WEBHOOK (replaces Bland webhook)
// ============================================================
app.post('/webhook/retell', async (req, res) => {
  try {
    const { event, call } = req.body;
    if (event !== 'call_ended') return res.sendStatus(200);

    const meta = call?.metadata || {};
    const { agentId, leadPhone, leadName, source } = meta;
    if (!agentId || !leadPhone) return res.sendStatus(200);

    const agent = await getAgent(agentId);
    if (!agent) return res.sendStatus(200);

    const vars = call?.call_analysis || {};
    const callOutcome = vars.call_outcome || 'completed';
    const callReason = vars.call_reason || vars.call_summary || '';
    const appointmentDate = vars.appointment_date || '';
    const budget = vars.budget || '';
    const city = vars.preferred_city || '';
    const leadStatus = callOutcome === 'appointment_booked' ? 'hot' : callOutcome === 'opted_out' ? 'cold' : 'warm';

    await updateLead(leadPhone, agentId, { status: leadStatus, callOutcome, callReason, appointmentDate, budget, city, dncChecked: true });

    if (appointmentDate && callOutcome === 'appointment_booked') {
      await bookAppointment({ agentEmail: agent.email, leadName, leadPhone, budget, city, appointmentDate });
    }

    await sendAgentAlert({
      agentEmail: agent.notificationEmail || agent.email,
      agentName: agent.agentName,
      leadData: { name: leadName, phone: leadPhone, budget, city, appointmentDate, callOutcome, callReason, source },
    });

    res.sendStatus(200);
  } catch (err) { res.sendStatus(500); }
});

// Facebook Webhook
app.get('/webhook/facebook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'doorbotai_verify') {
    res.status(200).send(req.query['hub.challenge']);
  } else res.sendStatus(403);
});

app.post('/webhook/facebook/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const body = req.body;
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const lead = { agentId, name: change.value.name || '', phone: change.value.phone || '', email: change.value.email || '', source: 'facebook_ads', consentGiven: true };
            if (lead.phone) {
              const agent = await getAgent(agentId);
              if (agent) {
                const isOnDNC = await checkDNC(lead.phone);
                if (!isOnDNC) {
                  await addLead({ ...lead, googleSheetId: agent.googleSheetId, dncChecked: true });
                  if (lead.email) {
                    const clickUrl = `${process.env.BASE_URL}/talk/${agentId}?phone=${encodeURIComponent(lead.phone)}`;
                    await sendBuyerEmail({ buyerEmail: lead.email, buyerName: lead.name, agentName: agent.agentName, botName: agent.botName, clickToTalkUrl: clickUrl });
                  } else {
                    await makeVoiceCall({ phone: lead.phone, agentConfig: agent, leadData: { name: lead.name, source: 'facebook_ads' } });
                  }
                }
              }
            }
          }
        }
      }
      res.sendStatus(200);
    } else res.sendStatus(404);
  } catch { res.sendStatus(500); }
});

// Payment webhook
app.post('/webhook/payment', async (req, res) => {
  try {
    const event = req.body;
    if (event.meta?.event_name === 'subscription_created') {
      const attrs = event.data?.attributes;
      const custom = attrs?.custom_data || {};
      await createAgent({ agentName: custom.agentName || attrs?.user_name || 'New Agent', email: attrs?.user_email || '', plan: custom.plan || 'starter' });
    }
    if (event.meta?.event_name === 'subscription_cancelled') {
      const agentId = event.data?.attributes?.custom_data?.agentId;
      if (agentId) await deactivateAgent(agentId);
    }
    res.sendStatus(200);
  } catch { res.sendStatus(500); }
});

// Widget
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){
var id=document.currentScript&&document.currentScript.getAttribute('data-agent');
if(!id)return;
var b=document.createElement('div');
b.innerHTML='💬 Talk to AI';
b.style.cssText='position:fixed;bottom:20px;right:20px;background:#C9A84C;color:#000;padding:12px 18px;border-radius:50px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;cursor:pointer;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,0.2);';
b.onclick=function(){window.open('${process.env.BASE_URL}/agent/'+id,'_blank','width=460,height=680');};
document.body.appendChild(b);
})();`);
});

app.get('/dashboard/:agentId', (req, res) => {
  res.redirect(`https://doorbotaileads-jpg.github.io/doorbotai-backend/dashboard.html?agent=${req.params.agentId}`);
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   DoorBot AI v4.0 — Live! 🚀                ║
║   TCPA & CASL Compliant                     ║
║   Voice: Retell AI | DNC: Auto Check        ║
║   Port: ${PORT}                                 ║
╚══════════════════════════════════════════════╝`);
});

module.exports = app;
