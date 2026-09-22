function processAIPrompt(prompt, state) {
  const p = prompt.toLowerCase();
  
  if (p.includes('accident') || p.includes('emergency') || p.includes('ambulance')) {
    if (p.includes('wardha road') || p.includes('near')) {
      return {
        text: 'I have detected an emergency request near Wardha Road. I recommend deploying an ALS ambulance and checking trauma capacity.',
        action: 'CREATE_SOS',
        payload: { lat: 21.110, lng: 79.080, requirements: { trauma: true } },
        buttons: ['CONFIRM & DISPATCH AMBULANCE']
      };
    }
  }

  if (p.includes('trauma')) {
    const traumaHospitals = state.hospitals.filter(h => h.trauma_capability && h.status === 'ONLINE');
    if (traumaHospitals.length > 0) {
      return {
        text: `I found ${traumaHospitals.length} hospitals with trauma capabilities. ${traumaHospitals[0].name} is the best option right now with ${traumaHospitals[0].icu_availability} ICU beds available.`,
        action: 'HIGHLIGHT_HOSPITALS',
        payload: traumaHospitals.map(h => h.id)
      };
    }
  }

  if (p.includes('blood') || p.includes('o-')) {
    return {
      text: 'O- Negative blood is available at AIIMS Nagpur (5 units) and KIMS Kingsway (8 units). I have highlighted them on the map.',
      action: 'HIGHLIGHT_BLOOD',
      payload: null
    };
  }

  if (p.includes('reroute') || p.includes('full')) {
    return {
      text: 'If a hospital becomes full, the Smart Matching Engine will automatically re-evaluate all incoming missions in real-time. If an ambulance requires an ICU and the destination drops to 0, it will instantly recalculate the ETA to the next best alternative and redirect the crew.',
      action: null,
      payload: null
    };
  }

  return {
    text: "I am MEDNEXUS AI. I can coordinate ambulances, find hospital capacities, locate blood banks, or explain routing decisions. How can I assist your mission?",
    action: null,
    payload: null
  };
}

module.exports = { processAIPrompt };
