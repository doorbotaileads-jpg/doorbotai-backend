const axios = require('axios');

async function makeVoiceCall({ phone, agentConfig, leadData }) {
  const {
    agentId, agentName, botName, city, propertyTypes,
    priceRange, tone, calendlyLink, language,
    about, faqs, situationalScripts, objectionHandling, offDays
  } = agentConfig;

  const toneMap = {
    'Friendly & Approachable': 'warm, friendly, and conversational',
    'Professional & Formal': 'professional and formal',
    'Luxury & Exclusive': 'sophisticated, premium, and exclusive',
    'Direct & No-nonsense': 'direct, concise, and efficient',
  };

  const offDayText = offDays && offDays.length > 0
    ? `Agent is NOT available on: ${offDays.join(', ')}. If lead wants to book on those days, offer the next available day.`
    : 'Agent is available Monday to Saturday.';

  const task = `You are ${botName || agentName + "'s AI Assistant"}, representing ${agentName} — a real estate agent specializing in ${propertyTypes || 'residential properties'} in ${city || 'the local area'}, price range: ${priceRange || 'all ranges'}.

Your tone: ${toneMap[tone] || 'warm and professional'}.
Language: ${language || 'English'}.

${about ? `About ${agentName}: ${about}` : ''}
${faqs ? `Common FAQs: ${faqs}` : ''}
${situationalScripts ? `Special situations: ${situationalScripts}` : ''}
${objectionHandling ? `Handle objections: ${objectionHandling}` : ''}
${offDayText}

YOUR GOAL:
1. Greet lead warmly using their name if available: ${leadData.name || 'the caller'}
2. Confirm they are looking for a property
3. Ask ONE question at a time:
   - Buying or selling?
   - Property type? (house/condo/townhome)
   - Budget range?
   - Preferred city/neighborhood?
   - Timeline? (1 month/3 months/6 months)
4. Book appointment via: ${calendlyLink || 'our website'}
5. If not interested: ask if you can send listings by email
6. If wrong number: apologize and end politely

IMPORTANT — After each call, summarize:
- call_outcome: "appointment_booked" / "not_interested" / "no_answer" / "wrong_number" / "callback_requested" / "already_has_agent"
- call_reason: Brief reason e.g. "Already bought a home" / "Not looking right now" / "Interested — booked for Tuesday 2pm"
- appointment_date: if booked
- budget: if mentioned
- city: if mentioned

Keep call under 8 minutes. Be natural, never robotic.`;

  try {
    const res = await axios.post('https://api.bland.ai/v1/calls', {
      phone_number: phone,
      task,
      voice: 'maya',
      language: language === 'French (Canada)' ? 'fr' : 'en',
      max_duration: 8,
      answered_by_enabled: true,
      wait_for_greeting: true,
      record: true,
      amd: true,
      webhook: `${process.env.BASE_URL}/webhook/bland`,
      metadata: { agentId, leadPhone: phone, leadName: leadData.name || '', source: leadData.source || 'website' },
    }, {
      headers: { authorization: process.env.BLAND_API_KEY, 'Content-Type': 'application/json' },
    });

    console.log('[DoorBot AI] Call initiated:', res.data.call_id, 'for', phone);
    return { success: true, callId: res.data.call_id };
  } catch (err) {
    console.error('[DoorBot AI] Bland error:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { makeVoiceCall };
