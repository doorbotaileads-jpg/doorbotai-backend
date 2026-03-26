const axios = require('axios');

// DNC Check using free lookup
async function checkDNC(phone) {
  try {
    // Clean phone number
    const cleaned = phone.replace(/\D/g, '');
    // Basic DNC check via public API
    const res = await axios.get(`https://api.donotcall.gov/api/?phone=${cleaned}`, {
      timeout: 3000
    });
    return res.data?.onRegistry || false;
  } catch (err) {
    // If DNC check fails, allow call but log
    console.log('[DoorBot AI] DNC check skipped:', err.message);
    return false;
  }
}

async function makeVoiceCall({ phone, agentConfig, leadData }) {
  const {
    agentId, agentName, botName, city, propertyTypes,
    priceRange, tone, calendlyLink, language,
    about, faqs, situationalScripts, objectionHandling, offDays
  } = agentConfig;

  // DNC Check first
  const isOnDNC = await checkDNC(phone);
  if (isOnDNC) {
    console.log('[DoorBot AI] Number on DNC list — skipping:', phone);
    return { success: false, reason: 'DNC_LIST', message: 'Number is on Do Not Call registry' };
  }

  const toneMap = {
    'Friendly & Approachable': 'warm, friendly, and conversational. Use natural language, occasional light humor.',
    'Professional & Formal': 'professional, formal, and courteous. Maintain business-like tone throughout.',
    'Luxury & Exclusive': 'sophisticated, premium, and exclusive. Speak as if serving high-net-worth clients.',
    'Direct & No-nonsense': 'direct, concise, and efficient. Get to the point quickly without small talk.',
  };

  const offDayText = offDays && offDays.length > 0
    ? `IMPORTANT: Agent is NOT available on: ${offDays.join(', ')}. Never book appointments on these days. If lead requests one of these days, politely explain availability and offer the next working day instead.`
    : 'Agent is available Monday through Saturday, 9 AM to 6 PM.';

  const systemPrompt = `You are ${botName || agentName + "'s AI Assistant"}, an AI real estate assistant representing ${agentName}.

IDENTITY:
- Your name: ${botName || agentName + ' AI'}
- You represent: ${agentName}, a real estate agent
- Specialization: ${propertyTypes || 'residential properties'} in ${city || 'the local area'}
- Price range: ${priceRange || 'all ranges'}
- Your tone: ${toneMap[tone] || 'warm and professional'}
- Language: ${language || 'English'}

${about ? `ABOUT ${agentName.toUpperCase()}: ${about}` : ''}

TCPA COMPLIANCE — MANDATORY:
- Always identify yourself as an AI assistant at the start of the call
- Say: "Hi, this is ${botName || agentName + ' AI'}, an AI assistant for ${agentName}."
- If asked if you are AI or human, always confirm you are AI
- Always offer opt-out: "If you'd like to be removed from our contact list, just say so"
- Never call outside 8 AM - 9 PM local time
- Respect all opt-out requests immediately

CALENDAR:
${offDayText}
Calendly link: ${calendlyLink || 'our website'}

${faqs ? `FREQUENTLY ASKED QUESTIONS:\n${faqs}` : ''}
${situationalScripts ? `SITUATIONAL SCRIPTS:\n${situationalScripts}` : ''}
${objectionHandling ? `OBJECTION HANDLING:\n${objectionHandling}` : ''}

YOUR CONVERSATION GOALS:
1. Introduce yourself as AI assistant
2. Ask ONE question at a time — never multiple questions
3. Qualify the lead:
   - Buying, selling, or both?
   - Property type preference?
   - Budget range?
   - Preferred city/neighborhood?
   - Timeline? (1-3 months, 3-6 months, 6+ months)
4. Book appointment via Calendly if interested
5. If not interested: ask to send listings by email
6. If on DNC or wants to opt out: "No problem, I've removed you. Have a great day!"

END OF CALL — provide summary:
- call_outcome: "appointment_booked" / "not_interested" / "callback_requested" / "opted_out" / "wrong_number" / "already_has_agent" / "voicemail"
- call_reason: Brief explanation e.g. "Interested in 3BR condo, budget $600K, booked Tuesday 2pm"
- appointment_date: if booked
- budget: if mentioned
- preferred_city: if mentioned
- property_type: if mentioned

Keep total call under 8 minutes. Be natural and human-sounding.`;

  try {
    // Create Retell agent dynamically
    const agentRes = await axios.post('https://api.retellai.com/v2/create-agent', {
      agent_name: `${agentId}_agent`,
      voice_id: 'openai-Alloy',
      response_engine: {
        type: 'retell-llm',
        llm_id: await getOrCreateLLM(agentId, systemPrompt),
      },
      language: language === 'Spanish' ? 'es-US' : language === 'French (Canada)' ? 'fr-CA' : 'en-US',
      max_call_duration_ms: 480000,
      enable_backchannel: true,
      backchannel_frequency: 0.7,
      reminder_trigger_ms: 10000,
      end_call_after_silence_ms: 15000,
      webhook_url: `${process.env.BASE_URL}/webhook/retell`,
    }, {
      headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` }
    });

    const retellAgentId = agentRes.data.agent_id;

    // Make the call
    const callRes = await axios.post('https://api.retellai.com/v2/create-phone-call', {
      agent_id: retellAgentId,
      to_number: phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`,
      from_number: process.env.RETELL_PHONE_NUMBER || '+15105551234',
      metadata: {
        agentId,
        leadPhone: phone,
        leadName: leadData.name || '',
        source: leadData.source || 'website',
      },
      retell_llm_dynamic_variables: {
        lead_name: leadData.name || 'there',
        agent_name: agentName,
        bot_name: botName || agentName + ' AI',
        city: city || '',
      }
    }, {
      headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` }
    });

    console.log('[DoorBot AI] Retell call initiated:', callRes.data.call_id, 'for', phone);
    return { success: true, callId: callRes.data.call_id, provider: 'retell' };

  } catch (err) {
    console.error('[DoorBot AI] Retell error:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

async function getOrCreateLLM(agentId, systemPrompt) {
  try {
    // Create a new LLM for this agent
    const res = await axios.post('https://api.retellai.com/v2/create-retell-llm', {
      model: 'gpt-4o-mini',
      general_prompt: systemPrompt,
      general_tools: [],
    }, {
      headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` }
    });
    return res.data.llm_id;
  } catch (err) {
    console.error('LLM create error:', err.message);
    throw err;
  }
}

module.exports = { makeVoiceCall, checkDNC };
