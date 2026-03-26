require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { createAgent, getAgent, updateAgent, deactivateAgent } = require('./services/agents');
const { addLead, updateLead } = require('./services/sheets');
const { sendBuyerEmail, sendAgentAlert, sendWelcomeEmail } = require('./services/email');
const { makeVoiceCall } = require('./services/bland');
const { bookAppointment } = require('./services/calendar');
const { getStats, findLeads } = require('./services/database');
const { scrapeLeads } = require('./services/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'DoorBot AI v3.0 — Live! 🚀',
    tagline: 'We open the door, you close the deal.',
    modes: ['Mode 1: Ads leads', 'Mode 2: CSV upload', 'Mode 3: Auto scraper'],
  });
});

// ============================================================
// AGENT ONBOARDING
// ============================================================
app.post('/api/onboard', async (req, res) => {
  try {
    if (!req.body.agentName || !req.body.email) {
      return res.status(400).json({ error: 'agentName and email required' });
    }
    const agent = await createAgent(req.body);
    const dashboardUrl = `${process.env.BASE_URL}/dashboard/${agent.agentId}`;

    // Send welcome email
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

// Update bot training
app.put('/api/train/:agentId', async (req, res) => {
  try {
    const agent = await updateAgent(req.params.agentId, req.body);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true, message: 'Bot updated instantly!', agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get agent + stats
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
// AGENT LANDING PAGE (Google Ads + Facebook)
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
body{background:#080808;color:#F0EDE8;font-family:'DM Sans',sans-serif;font-weight:300;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;}
.card{background:#101010;border:1px solid rgba(201,168,76,0.2);max-width:480px;width:100%;padding:44px 36px;}
.logo{font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;margin-bottom:28px;}
h1{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:300;line-height:1.2;margin-bottom:10px;}
h1 em{font-style:normal;color:#C9A84C;}
.sub{color:#777770;font-size:14px;margin-bottom:28px;line-height:1.7;}
.form-group{margin-bottom:14px;}
label{display:block;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#777770;margin-bottom:5px;}
input,select{width:100%;background:#181818;border:1px solid rgba(201,168,76,0.2);color:#F0EDE8;padding:11px 14px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.2s;}
input:focus,select:focus{border-color:#C9A84C;}
.btn{width:100%;background:#C9A84C;color:#080808;border:none;padding:15px;font-size:14px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Sans',sans-serif;cursor:pointer;margin-top:6px;transition:background 0.2s;}
.btn:hover{background:#E8C97A;}
.trust{display:flex;align-items:center;gap:8px;margin-top:16px;font-size:12px;color:#555;}
.trust::before{content:'';width:6px;height:6px;border-radius:50%;background:#4CAF7D;flex-shrink:0;}
.success{display:none;text-align:center;padding:20px 0;}
.success h2{font-family:'Cormorant Garamond',serif;font-size:26px;color:#C9A84C;margin-bottom:10px;}
.success p{color:#777770;font-size:14px;line-height:1.7;}
</style>
</head>
<body>
<div class="card">
  <div class="logo">${agent.botName || agent.agentName + ' AI'}</div>
  <div id="form-wrap">
    <h1>Find Your <em>Dream Home</em> in ${agent.city || 'Your Area'}</h1>
    <p class="sub">Our AI will match you with the perfect property and connect you with ${agent.agentName}.</p>
    <div class="form-group"><label>Your Name</label><input type="text" id="f-name" placeholder="John Smith" required/></div>
    <div class="form-group"><label>Phone Number</label><input type="tel" id="f-phone" placeholder="+1 (305) 555-0100" required/></div>
    <div class="form-group"><label>Email</label><input type="email" id="f-email" placeholder="john@email.com"/></div>
    <div class="form-group"><label>Budget</label>
      <select id="f-budget">
        <option>Under $300K</option><option>$300K–$500K</option>
        <option selected>$500K–$800K</option><option>$800K–$1.2M</option><option>$1.2M+</option>
      </select>
    </div>
    <div class="form-group"><label>Looking to</label>
      <select id="f-type">
        <option>Buy a home</option><option>Sell my home</option>
        <option>Both buy and sell</option><option>Investment property</option>
      </select>
    </div>
    <button class="btn" onclick="submitForm()">Talk to ${agent.agentName}'s AI →</button>
    <p class="trust">AI responds in under 60 seconds — any time of day</p>
  </div>
  <div class="success" id="success-wrap">
    <h2>You're all set!</h2>
    <p>Check your phone — ${agent.botName || agent.agentName + "'s AI"} will call you in the next 60 seconds!</p>
    <p style="margin-top:10px;font-size:13px;color:#555;">Make sure to answer — calling from a US number.</p>
  </div>
</div>
<script>
async function submitForm() {
  const phone = document.getElementById('f-phone').value;
  const name = document.getElementById('f-name').value;
  if (!phone || !name) { alert('Please fill in your name and phone number'); return; }
  const btn = document.querySelector('.btn');
  btn.textContent = 'Connecting...';
  btn.disabled = true;
  try {
    const res = await fetch('${process.env.BASE_URL}/api/lead/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: '${agent.agentId}',
        name, phone,
        email: document.getElementById('f-email').value,
        budget: document.getElementById('f-budget').value,
        buyerSeller: document.getElementById('f-type').value,
        source: 'landing_page',
      }),
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('form-wrap').style.display = 'none';
      document.getElementById('success-wrap').style.display = 'block';
    }
  } catch(e) {
    btn.textContent = 'Try Again';
    btn.disabled = false;
  }
}
</script>
</body>
</html>`);
  } catch (err) {
    res.status(500).send('Error loading page');
  }
});

// ============================================================
// MODE 1 — NEW LEAD (from any source)
// ============================================================
app.post('/api/lead/new', async (req, res) => {
  try {
    const { agentId, name, phone, email, budget, timeline, city, propertyType, buyerSeller, source } = req.body;
    if (!agentId || !phone) return res.status(400).json({ error: 'agentId and phone required' });

    const agent = await getAgent(agentId);
    if (!agent || !agent.active) return res.status(404).json({ error: 'Agent not found' });

    const leadData = { name, phone, email, budget, timeline, city, propertyType, buyerSeller, status: 'new', source: source || 'website', agentId, googleSheetId: agent.googleSheetId };

    // Save to Sheets + MongoDB
    await addLead(leadData);

    // Send email to buyer
    if (email) {
      const clickUrl = `${process.env.BASE_URL}/talk/${agentId}?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name || '')}`;
      await sendBuyerEmail({ buyerEmail: email, buyerName: name, agentName: agent.agentName, botName: agent.botName, clickToTalkUrl: clickUrl });
    }

    // If no email, call directly
    if (!email && phone) {
      await makeVoiceCall({ phone, agentConfig: agent, leadData: { name, source } });
    }

    res.json({ success: true, message: 'Lead received!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Click to Talk — buyer clicked email
app.get('/talk/:agentId', async (req, res) => {
  try {
    const agent = await getAgent(req.params.agentId);
    if (!agent) return res.status(404).send('Not found');

    const { phone, name } = req.query;
    await makeVoiceCall({ phone, agentConfig: agent, leadData: { name, source: 'email_click' } });

    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Connecting...</title>
<style>body{font-family:Arial,sans-serif;background:#080808;color:#F0EDE8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;}
.b{max-width:360px;padding:40px 24px;}h1{color:#C9A84C;font-size:24px;margin-bottom:14px;font-family:Georgia,serif;}
p{color:#888;font-size:15px;line-height:1.6;}.p{width:56px;height:56px;border-radius:50%;background:#C9A84C;margin:0 auto 24px;animation:p 1.5s infinite;}
@keyframes p{0%,100%{transform:scale(1);}50%{transform:scale(1.2);opacity:.7;}}</style></head>
<body><div class="b"><div class="p"></div><h1>${agent.botName}</h1>
<p>Calling you now!<br/>Answer your phone in 30 seconds.</p>
<p style="margin-top:20px;font-size:12px;color:#444;">Powered by DoorBot AI</p>
</div></body></html>`);
  } catch (err) {
    res.status(500).send('Error');
  }
});

// ============================================================
// MODE 2 — CSV UPLOAD (existing leads)
// ============================================================
app.post('/api/leads/upload/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { leads } = req.body;
    const agent = await getAgent(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    let processed = 0, called = 0;

    for (const lead of leads) {
      if (!lead.phone) continue;
      await addLead({ ...lead, agentId, source: 'csv_upload', status: 'new', googleSheetId: agent.googleSheetId });

      if (lead.email) {
        const clickUrl = `${process.env.BASE_URL}/talk/${agentId}?phone=${encodeURIComponent(lead.phone)}&name=${encodeURIComponent(lead.name || '')}`;
        await sendBuyerEmail({ buyerEmail: lead.email, buyerName: lead.name, agentName: agent.agentName, botName: agent.botName, clickToTalkUrl: clickUrl });
      } else {
        const result = await makeVoiceCall({ phone: lead.phone, agentConfig: agent, leadData: { name: lead.name, source: 'csv_upload' } });
        if (result.success) called++;
      }

      processed++;
      await new Promise(r => setTimeout(r, 800));
    }

    res.json({ success: true, processed, called, message: `${processed} leads processed, ${called} calls initiated` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODE 3 — AUTO SCRAPER
// ============================================================
app.post('/api/scrape/:agentId', async (req, res) => {
  try {
    const agent = await getAgent(req.params.agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    res.json({ success: true, message: 'Scraper started! Check dashboard for results.' });

    // Run in background
    scrapeLeads(agent.city, agent.agentId).then(async leads => {
      let processed = 0;
      for (const lead of leads.slice(0, 30)) {
        await addLead({ ...lead, googleSheetId: agent.googleSheetId });
        if (lead.email) {
          const clickUrl = `${process.env.BASE_URL}/talk/${agent.agentId}?phone=${encodeURIComponent(lead.phone)}`;
          await sendBuyerEmail({ buyerEmail: lead.email, buyerName: lead.name, agentName: agent.agentName, botName: agent.botName, clickToTalkUrl: clickUrl });
        } else if (lead.phone) {
          await makeVoiceCall({ phone: lead.phone, agentConfig: agent, leadData: { name: lead.name, source: lead.source } });
        }
        processed++;
        await new Promise(r => setTimeout(r, 1000));
      }
      console.log(`[DoorBot AI] Scraper done: ${processed} leads for ${agent.agentName}`);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// BLAND.AI CALLBACK — after call ends
// ============================================================
app.post('/webhook/bland', async (req, res) => {
  try {
    const { metadata, status, variables, corrected_duration } = req.body;
    const { agentId, leadPhone, leadName, source } = metadata || {};
    if (!agentId || !leadPhone) return res.sendStatus(200);

    const agent = await getAgent(agentId);
    if (!agent) return res.sendStatus(200);

    const callOutcome = variables?.call_outcome || (status === 'completed' ? 'completed' : 'no_answer');
    const callReason = variables?.call_reason || '';
    const appointmentDate = variables?.appointment_date || '';
    const budget = variables?.budget || '';
    const city = variables?.city || '';
    const leadStatus = callOutcome === 'appointment_booked' ? 'hot' : callOutcome === 'not_interested' ? 'cold' : 'warm';

    // Update lead
    await updateLead(leadPhone, agentId, { status: leadStatus, callOutcome, callReason, appointmentDate, budget, city });

    // Book calendar if appointment
    if (appointmentDate && callOutcome === 'appointment_booked') {
      await bookAppointment({ agentEmail: agent.email, leadName, leadPhone, budget, city, appointmentDate });
    }

    // Send agent alert
    await sendAgentAlert({
      agentEmail: agent.notificationEmail || agent.email,
      agentName: agent.agentName,
      leadData: { name: leadName, phone: leadPhone, budget, city, appointmentDate, callOutcome, callReason, source },
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// ============================================================
// FACEBOOK WEBHOOK
// ============================================================
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
            const lead = { agentId, name: change.value.name || '', phone: change.value.phone || '', email: change.value.email || '', source: 'facebook_ads' };
            if (lead.phone || lead.email) {
              await app.locals.processLead?.(lead) || console.log('Facebook lead:', lead);
            }
          }
        }
      }
      res.sendStatus(200);
    } else res.sendStatus(404);
  } catch (err) { res.sendStatus(500); }
});

// ============================================================
// LEMON SQUEEZY PAYMENT WEBHOOK
// ============================================================
app.post('/webhook/payment', async (req, res) => {
  try {
    const event = req.body;
    if (event.meta?.event_name === 'subscription_created') {
      const attrs = event.data?.attributes;
      const custom = attrs?.custom_data || {};
      await createAgent({
        agentName: custom.agentName || attrs?.user_name || 'New Agent',
        email: attrs?.user_email || '',
        plan: custom.plan || 'starter',
      });
    }
    if (event.meta?.event_name === 'subscription_cancelled') {
      const agentId = event.data?.attributes?.custom_data?.agentId;
      if (agentId) await deactivateAgent(agentId);
    }
    res.sendStatus(200);
  } catch (err) { res.sendStatus(500); }
});

// ============================================================
// WIDGET EMBED
// ============================================================
app.get('/widget.js', (req, res) => {
  const agentId = req.query.agent || document?.currentScript?.getAttribute('data-agent') || '';
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){
var id=document.currentScript&&document.currentScript.getAttribute('data-agent')||'${agentId}';
if(!id)return;
var b=document.createElement('div');
b.innerHTML='💬 Talk to AI Assistant';
b.style.cssText='position:fixed;bottom:24px;right:24px;background:#C9A84C;color:#000;padding:13px 20px;border-radius:50px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;cursor:pointer;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
b.onclick=function(){window.open('${process.env.BASE_URL}/agent/'+id,'_blank','width=460,height=680');};
document.body.appendChild(b);
})();`);
});

// ============================================================
// DASHBOARD HTML
// ============================================================
app.get('/dashboard/:agentId', (req, res) => {
  res.redirect(`https://propbotaileads-ai.github.io/doorbotai-backend/dashboard.html?agent=${req.params.agentId}`);
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   DoorBot AI v3.0 — Live! 🚀            ║
║   We open the door, you close the deal  ║
║   Port: ${PORT}                             ║
╚══════════════════════════════════════════╝`);
});

module.exports = app;
