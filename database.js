const { MongoClient } = require('mongodb');

let db = null;

async function connectDB() {
  if (db) return db;
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('doorbotai');
    await db.collection('agents').createIndex({ agentId: 1 }, { unique: true });
    await db.collection('leads').createIndex({ agentId: 1 });
    await db.collection('leads').createIndex({ phone: 1 });
    console.log('[DoorBot AI] MongoDB connected!');
    return db;
  } catch (err) {
    console.error('[DoorBot AI] MongoDB error:', err.message);
    return null;
  }
}

async function saveAgent(agent) {
  try {
    const database = await connectDB();
    if (!database) return false;
    await database.collection('agents').updateOne(
      { agentId: agent.agentId },
      { $set: { ...agent, updatedAt: new Date() } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error('saveAgent error:', err.message);
    return false;
  }
}

async function findAgent(agentId) {
  try {
    const database = await connectDB();
    if (!database) return null;
    return await database.collection('agents').findOne({ agentId });
  } catch (err) {
    return null;
  }
}

async function saveLead(lead) {
  try {
    const database = await connectDB();
    if (!database) return false;
    await database.collection('leads').insertOne({ ...lead, createdAt: new Date() });
    return true;
  } catch (err) {
    console.error('saveLead error:', err.message);
    return false;
  }
}

async function findLeads(agentId) {
  try {
    const database = await connectDB();
    if (!database) return [];
    return await database.collection('leads').find({ agentId }).sort({ createdAt: -1 }).toArray();
  } catch (err) {
    return [];
  }
}

async function updateLead(phone, agentId, updates) {
  try {
    const database = await connectDB();
    if (!database) return false;
    await database.collection('leads').updateOne(
      { phone, agentId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    return true;
  } catch (err) {
    return false;
  }
}

async function getStats(agentId) {
  try {
    const database = await connectDB();
    if (!database) return {};
    const leads = await database.collection('leads').find({ agentId }).toArray();
    return {
      totalLeads: leads.length,
      hotLeads: leads.filter(l => l.status === 'hot').length,
      warmLeads: leads.filter(l => l.status === 'warm').length,
      coldLeads: leads.filter(l => l.status === 'cold').length,
      appointmentsBooked: leads.filter(l => l.appointmentDate).length,
      conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.appointmentDate).length / leads.length) * 100) + '%' : '0%',
    };
  } catch (err) {
    return {};
  }
}

module.exports = { connectDB, saveAgent, findAgent, saveLead, findLeads, updateLead, getStats };
