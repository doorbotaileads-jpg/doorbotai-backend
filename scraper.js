const axios = require('axios');

async function scrapeLeads(city, agentId) {
  const leads = [];

  // Craigslist housing wanted
  try {
    const citySlug = city.toLowerCase().replace(/[,\s]+/g, '');
    const url = `https://craigslist.org/${citySlug}/search/rea?query=looking+for+home&sort=date`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000,
    });

    const phoneRegex = /(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phones = res.data.match(phoneRegex) || [];
    const emails = res.data.match(emailRegex) || [];

    phones.slice(0, 20).forEach((phone, i) => {
      leads.push({
        phone: phone.replace(/\s/g, ''),
        email: emails[i] || '',
        source: `Craigslist ${city}`,
        agentId,
        status: 'new',
      });
    });

    console.log(`[DoorBot AI] Craigslist ${city}: ${leads.length} leads`);
  } catch (err) {
    console.log(`[DoorBot AI] Craigslist scrape skip: ${err.message}`);
  }

  // Remove duplicates
  const seen = new Set();
  return leads.filter(l => {
    if (!l.phone || seen.has(l.phone)) return false;
    seen.add(l.phone);
    return true;
  });
}

module.exports = { scrapeLeads };
