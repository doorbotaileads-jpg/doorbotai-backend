const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const cache = {};

async function createAgent(data) {
  const agentId = uuidv4().split('-')[0];
  const agent = {
    agentId,
    agentName: data.agentName || 'Your Agent',
    botName: data.botName || (data.agentName + ' AI'),
    email: data.email || '',
    phone: data.phone || '',
    city: data.city || '',
    propertyTypes: data.propertyTypes || 'residential',
    priceRange: data.priceRange || 'all ranges',
    tone: data.tone || 'Friendly & Approachable',
    language: data.language || 'English',
    calendlyLink: data.calendlyLink || '',
    googleSheetId: data.googleSheetId || process.env.GOOGLE_SHEETS_ID,
    notificationEmail: data.notificationEmail || data.email,
    about: data.about || '',
    faqs: data.faqs || '',
    situationalScripts: data.situationalScripts || '',
    objectionHandling: data.objectionHandling || '',
    offDays: data.offDays || [],
    plan: data.plan || 'starter',
    active: true,
    createdAt: new Date().toISOString(),
  };
  cache[agentId] = agent;
  await db.saveAgent(agent);
  console.log('[DoorBot AI] Agent created:', agentId, agent.agentName);
  return agent;
}

async function getAgent(agentId) {
  if (cache[agentId]) return cache[agentId];
  const agent = await db.findAgent(agentId);
  if (agent) cache[agentId] = agent;
  return agent;
}

async function updateAgent(agentId, updates) {
  const agent = await getAgent(agentId);
  if (!agent) return null;
  const updated = { ...agent, ...updates, updatedAt: new Date().toISOString() };
  cache[agentId] = updated;
  await db.saveAgent(updated);
  return updated;
}

async function deactivateAgent(agentId) {
  return updateAgent(agentId, { active: false });
}

module.exports = { createAgent, getAgent, updateAgent, deactivateAgent };
