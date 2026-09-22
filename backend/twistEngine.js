// MEDNEXUS Twist Engine — shared logic for hackathon crisis scenarios.
// Pure functions over the app state; server.js owns mutations + broadcasts.

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; const dLat = (lat2 - lat1) * (Math.PI / 180); const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ---------- Mass Casualty Surge ----------

const SEVERITY_ORDER = { CRITICAL: 0, SERIOUS: 1, MODERATE: 2, MINOR: 3 };

const GOLDEN_HOUR_MS = 60 * 60 * 1000;

const SEVERITY_PROFILES = [
  { severity: 'CRITICAL', bloodTypes: ['O-', 'O+', 'AB+', 'A+'], weight: 0.35 },
  { severity: 'SERIOUS', bloodTypes: ['O+', 'A+', 'B+'], weight: 0.30 },
  { severity: 'MODERATE', bloodTypes: ['A+', 'B+', 'O+'], weight: 0.20 },
  { severity: 'MINOR', bloodTypes: ['O+', 'A+'], weight: 0.15 },
];

const TRIAGE_CODE = { CRITICAL: 'RED', SERIOUS: 'ORANGE', MODERATE: 'YELLOW', MINOR: 'GREEN' };

const pickSeverity = () => {
  const r = Math.random();
  let acc = 0;
  for (const prof of SEVERITY_PROFILES) {
    acc += prof.weight;
    if (r <= acc) return prof;
  }
  return SEVERITY_PROFILES[SEVERITY_PROFILES.length - 1];
};

const INJURY_BY_SEVERITY = {
  CRITICAL: ['Polytrauma', 'Head injury', 'Internal bleeding', 'Chest trauma', 'Spinal injury'],
  SERIOUS: ['Fracture (open)', 'Deep lacerations', 'Burns 20-40%', 'Abdominal trauma'],
  MODERATE: ['Fracture (closed)', 'Concussion', 'Burns <20%', 'Severe bruising'],
  MINOR: ['Lacerations', 'Sprains', 'Superficial burns', 'Shock (mild)'],
};

const AMBULANCE_TYPE_BY_SEVERITY = { CRITICAL: 'ALS', SERIOUS: 'ALS', MODERATE: 'BLS', MINOR: 'BLS' };

// Highway corridor south-east of central Nagpur.
const SURGE_CENTER = { lat: 21.10, lng: 79.09 };
const SURGE_SPREAD = 0.018;

const generateSurgePatient = (i) => {
  const prof = pickSeverity();
  return {
    tempId: `TEMP-${Date.now()}-${i}`,
    kind: 'SURGE_PATIENT',
    lat: SURGE_CENTER.lat + (Math.random() - 0.5) * SURGE_SPREAD,
    lng: SURGE_CENTER.lng + (Math.random() - 0.5) * SURGE_SPREAD,
    severity: prof.severity,
    triageCode: TRIAGE_CODE[prof.severity],
    injury: INJURY_BY_SEVERITY[prof.severity][Math.floor(Math.random() * INJURY_BY_SEVERITY[prof.severity].length)],
    reqAssist: prof.severity === 'CRITICAL' || prof.severity === 'SERIOUS' ? 'Trauma' : 'Basic',
    bloodNeeded: Math.random() < 0.55 ? prof.bloodTypes[Math.floor(Math.random() * prof.bloodTypes.length)] : null,
    goldenHourStart: Date.now(),
    goldenHourMs: GOLDEN_HOUR_MS,
  };
};

// ---------- Golden Hour scoring: fastest SUITABLE destination ----------

const icuAvail = (h) => h.icu.total - h.icu.used;
const bedAvail = (h) => h.er.total - h.er.used;

const capabilityScore = (h, req) => {
  let score = 0;
  if (req.severity === 'CRITICAL' || req.severity === 'SERIOUS') {
    if (!h.trauma) return { ok: false, reasons: ['- No Trauma Unit'] };
    score += 25;
    if (icuAvail(h) > 0) score += 20;
    if (h.specialists && (h.specialists.cardiology || h.specialists.neurology || h.specialists.emergency)) score += 10;
  } else if (icuAvail(h) > 0) score += 5;
  if (bedAvail(h) <= 0) return { ok: false, reasons: ['- ER Full'] };
  if (h.load >= 100) return { ok: false, reasons: ['- At Capacity'] };
  return { ok: true, score, reasons: [] };
};

const selectHospitalForPatient = (patient, hospitals) => {
  const lat = patient.location ? patient.location.lat : patient.lat;
  const lng = patient.location ? patient.location.lng : patient.lng;
  const req = { severity: patient.severity || 'MODERATE' };
  const cands = hospitals
    .filter(h => h.status === 'ONLINE' && h.receiving)
    .map(h => {
      const dist = getDistance(lat, lng, h.lat, h.lng);
      const eta = dist * 2.5;
      const cap = capabilityScore(h, req);
      return { h, dist, eta, cap, score: cap.ok ? (100 - eta * 1.5) + cap.score - h.load * 0.3 : -Infinity };
    })
    .filter(c => c.cap.ok)
    .sort((a, b) => b.score - a.score);
  const best = cands[0] || null;
  return {
    selected: best ? { ...best.h, dist: best.dist.toFixed(1), eta: Math.round(best.eta) } : null,
    reasons: best ? best.cap.reasons.concat([`+ ETA ${Math.round(best.eta)} min`, `+ Load ${best.h.load}%`]) : ['No suitable facility'],
  };
};

// ---------- Alternative facilities (Hospital Overflow) ----------

const generateAlternatives = (hospitals, patientLoc) => {
  const templates = [
    { suffix: 'Trauma Center', trauma: true, icu: { total: 6, used: 2 }, er: { total: 12, used: 4 }, specialists: { emergency: true } },
    { suffix: 'Healthcare Center', trauma: false, icu: { total: 4, used: 1 }, er: { total: 15, used: 6 }, specialists: { emergency: true } },
    { suffix: 'Partner Hospital', trauma: true, icu: { total: 8, used: 3 }, er: { total: 18, used: 7 }, specialists: { cardiology: true, emergency: true } },
    { suffix: 'Emergency Camp (Temp)', trauma: false, icu: { total: 2, used: 0 }, er: { total: 30, used: 8 }, specialists: {} },
  ];
  return templates.map((t, i) => {
    const ang = (i / templates.length) * Math.PI * 2;
    const lat = patientLoc.lat + Math.sin(ang) * 0.02;
    const lng = patientLoc.lng + Math.cos(ang) * 0.02;
    const dist = getDistance(patientLoc.lat, patientLoc.lng, lat, lng);
    return {
      id: `ALT-${i + 1}`,
      name: `Nagpur ${t.suffix}`,
      kind: t.suffix,
      lat, lng,
      trauma: t.trauma,
      icu: t.icu,
      er: t.er,
      specialists: t.specialists,
      load: 40 + i * 8,
      status: 'ONLINE',
      receiving: true,
      dist: dist.toFixed(1),
      eta: Math.round(dist * 2.5),
    };
  });
};

// ---------- Surge demand metrics ----------

const computeSurgeMetrics = (state) => {
  const surge = state.surge || { patients: [] };
  const patients = surge.patients || [];
  const ambulances = state.ambulances || [];
  const hospitals = state.hospitals || [];
  return {
    criticalCount: patients.filter(p => p.severity === 'CRITICAL').length,
    waitingCount: patients.filter(p => p.status === 'WAITING').length,
    ambulancesAvailable: ambulances.filter(a => a.status === 'AVAILABLE').length,
    icuDemand: patients.filter(p => p.severity === 'CRITICAL' || p.severity === 'SERIOUS').length,
    bedDemand: patients.length,
    bloodDemand: patients.filter(p => p.bloodNeeded).length,
    hospitalsAvailable: hospitals.filter(h => h.status === 'ONLINE' && h.receiving && bedAvail(h) > 0).length,
    unallocatedCount: patients.filter(p => p.status === 'WAITING' && !p.assignment).length,
    goldenHourBreached: patients.filter(p => Date.now() - p.goldenHourStart > p.goldenHourMs).length,
  };
};

module.exports = {
  getDistance, SEVERITY_ORDER, GOLDEN_HOUR_MS, TRIAGE_CODE, AMBULANCE_TYPE_BY_SEVERITY,
  generateSurgePatient, selectHospitalForPatient, generateAlternatives, computeSurgeMetrics,
  icuAvail, bedAvail,
};
