function getDistance(lat1, lon1, lat2, lon2) {
  var R = 6371; var dLat = (lat2-lat1)*(Math.PI/180); var dLon = (lon2-lon1)*(Math.PI/180); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180)) * Math.cos(lat2*(Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function matchHospital(lat, lng, hospitals, req = {}) {
  let cands = hospitals.filter(h => h.status === 'ONLINE' && h.receiving);
  if (!cands.length) return { selected: null, alts: [] };

  cands = cands.map(h => {
    let score = 100;
    const dist = getDistance(lat, lng, h.lat, h.lng);
    const eta = dist * 2.5;
    let reasons = [`+ ETA: ${eta.toFixed(0)} min`];
    score -= dist * 2;

    const icuAvail = h.icu.total - h.icu.used;
    if (req.icu) {
      if (icuAvail <= 0) { score -= 100; reasons.push('- No ICU'); }
      else { score += 20; reasons.push('+ ICU Available'); }
    }
    if (req.trauma) {
      if (!h.trauma) { score -= 100; reasons.push('- No Trauma Unit'); }
      else { score += 20; reasons.push('+ Trauma Unit'); }
    }
    if (h.load > 85) { score -= 20; reasons.push('- High Load'); }

    return { ...h, dist: dist.toFixed(1), eta: eta.toFixed(0), score, reasons };
  });

  cands.sort((a, b) => b.score - a.score);
  return { selected: cands[0], alts: cands.slice(1) };
}

module.exports = { getDistance, matchHospital };
