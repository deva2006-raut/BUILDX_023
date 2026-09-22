// MEDNEXUS AI Coordinator — answers prompts from real application state.
// Pure functions: takes the live state snapshot, returns a response object.

function processAIPrompt(prompt, state, context = {}) {
  const p = prompt.toLowerCase().trim();

  if (p.includes('accident') || p.includes('emergency') || p.includes('sos')) {
    const action = context.emergency ? 'CREATE_SOS_AT_CONTEXT' : 'CREATE_SOS';
    return {
      text: 'Emergency request registered. I recommend deploying an ALS ambulance and checking trauma capacity at the nearest capable hospital.',
      action,
      payload: context.emergency ? context.emergency : { lat: 21.110, lng: 79.080, reqAssist: 'Trauma' },
      buttons: ['CONFIRM & DISPATCH AMBULANCE'],
    };
  }

  if (p.includes('trauma')) {
    const traumaHospitals = state.hospitals.filter(h => h.trauma && h.status === 'ONLINE');
    if (traumaHospitals.length > 0) {
      const best = traumaHospitals
        .map(h => ({ ...h, icuAvail: h.icu.total - h.icu.used }))
        .sort((a, b) => b.icuAvail - a.icuAvail)[0];
      return {
        text: `I found ${traumaHospitals.length} hospitals with trauma capabilities. ${best.name} is the best option right now with ${best.icuAvail} ICU beds available.`,
        action: 'HIGHLIGHT_HOSPITALS',
        payload: traumaHospitals.map(h => h.id),
      };
    }
    return {
      text: 'No trauma-capable hospitals are currently online.',
      action: null,
      payload: null,
    };
  }

  if (p.includes('blood') || /\bo-?\b/.test(p) || /\ba\+?\b/.test(p) || /\bb\+?\b/.test(p) || /\bab\+?\b/.test(p)) {
    const lines = [];
    state.hospitals.forEach(h => {
      const types = Object.entries(h.blood || {}).filter(([, amt]) => amt > 0);
      if (types.length) {
        lines.push(`${h.name}: ${types.map(([t, amt]) => `${t} (${amt} units)`).join(', ')}`);
      }
    });
    state.bloodBanks.forEach(b => {
      const types = Object.entries(b.inventory || {}).filter(([, amt]) => amt > 0);
      if (types.length) {
        lines.push(`${b.name}: ${types.map(([t, amt]) => `${t} (${amt} units)`).join(', ')}`);
      }
    });
    const bloodLines = lines.length > 0
      ? lines.join('; ')
      : 'No blood inventory is currently available anywhere on the network.';
    return {
      text: `Live blood inventory across the network: ${bloodLines}.`,
      action: 'HIGHLIGHT_BLOOD',
      payload: null,
    };
  }

  if (p.includes('reroute') || p.includes('full')) {
    return {
      text: 'If a hospital becomes full, the Smart Matching Engine will automatically re-evaluate all incoming missions in real-time. If an ambulance requires an ICU and the destination drops to 0, it will instantly recalculate the ETA to the next best alternative and redirect the crew.',
      action: null,
      payload: null,
    };
  }

  if (p.includes('icu') || p.includes('capacity') || p.includes('hospital')) {
    const list = state.hospitals
      .map(h => `${h.name}: ${h.icu.total - h.icu.used}/${h.icu.total} ICU free, ${h.load}% load`)
      .join('; ');
    return {
      text: `Current hospital capacities: ${list}.`,
      action: null,
      payload: null,
    };
  }

  if (p.includes('ambulance')) {
    const avail = state.ambulances.filter(a => a.status === 'AVAILABLE');
    const dispatched = state.ambulances.filter(a => a.status === 'DISPATCHED');
    return {
      text: `${avail.length} ambulance(s) available right now (${avail.map(a => a.name).join(', ') || 'none'}) and ${dispatched.length} currently dispatched.`,
      action: null,
      payload: null,
    };
  }

  return {
    text: 'I am MEDNEXUS AI. I can coordinate ambulances, find hospital capacities, locate blood banks, or explain routing decisions. How can I assist your mission?',
    action: null,
    payload: null,
  };
}

module.exports = { processAIPrompt };
