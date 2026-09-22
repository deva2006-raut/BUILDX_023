const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { processAIPrompt } = require('./aiCoordinator');
const {
  generateSurgePatient, selectHospitalForPatient, generateAlternatives,
  computeSurgeMetrics, AMBULANCE_TYPE_BY_SEVERITY, TRIAGE_CODE, SEVERITY_ORDER,
} = require('./twistEngine');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const GOLDEN_HOUR_MS = 60 * 60 * 1000;

const buildInitialState = () => ({
  users: [
    { id: 'u1', username: 'patient', role: 'PATIENT', name: 'John Doe' },
    { id: 'u2', username: 'admin', role: 'COMMAND_CENTER', name: 'Commander Shepard' },
    { id: 'u3', username: 'hospital', role: 'HOSPITAL', name: 'Dr. Strange', hospitalId: 'h1' },
    { id: 'u4', username: 'ambulance', role: 'AMBULANCE', name: 'Driver Dan', ambulanceId: 'a1' },
    { id: 'u5', username: 'bloodbank', role: 'BLOOD_BANK', name: 'Nurse Joy', bloodBankId: 'bb1' },
  ],
  hospitals: [
    {
      id: 'h1', name: 'AIIMS Nagpur', lat: 21.0664, lng: 79.0345, address: 'MIHAN, Nagpur',
      icu: { total: 12, used: 8 }, er: { total: 25, used: 15 },
      ventilators: { total: 10, used: 5 },
      trauma: true, specialists: { cardiology: true, neurology: true, emergency: true },
      blood: { 'O-': 5, 'A+': 10 }, load: 65, status: 'ONLINE', receiving: true
    },
    {
      id: 'h2', name: 'GMC Nagpur', lat: 21.1278, lng: 79.0967, address: 'Medical Square, Nagpur',
      icu: { total: 10, used: 10 }, er: { total: 20, used: 18 },
      ventilators: { total: 15, used: 14 },
      trauma: true, specialists: { cardiology: true, neurology: false, emergency: true },
      blood: { 'O-': 0, 'A+': 30 }, load: 95, status: 'ONLINE', receiving: true
    }
  ],
  ambulances: [
    { id: 'a1', name: 'AMB-01 (ALS)', lat: 21.135, lng: 79.075, status: 'AVAILABLE', type: 'ALS' },
    { id: 'a2', name: 'AMB-02 (BLS)', lat: 21.070, lng: 79.040, status: 'AVAILABLE', type: 'BLS' },
    { id: 'a3', name: 'AMB-03 (ALS)', lat: 21.140, lng: 79.090, status: 'AVAILABLE', type: 'ALS' }
  ],
  bloodBanks: [
    { id: 'bb1', name: 'GSB Blood Bank', lat: 21.130, lng: 79.085, status: 'ONLINE', inventory: { 'O-': 12, 'A+': 50, 'B+': 30, 'AB+': 10 } }
  ],
  emergencies: [], missions: [], notifications: [], auditLogs: [], bloodRequests: [], alerts: [],
  surge: { active: false, patients: [] },
  blackout: { active: false, since: null, syncQueue: [], restoredAt: null, syncedCount: 0 },
  overflow: { active: false, overflowedHospitalIds: [], dismissedIds: [], alternatives: [] },
  goldenHour: { active: false },
  twist: { running: null },
  analytics: { totalEmergencies: 0, reroutes: 0, avgResponseTime: 5, hospitalLoad: [65, 95] },
  metrics: null,
});

let state = buildInitialState();
let breachTimer = null;
let ultimateRunning = false;

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; const dLat = (lat2-lat1)*(Math.PI/180); const dLon = (lon2-lon1)*(Math.PI/180);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180))*Math.cos(lat2*(Math.PI/180))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const logAudit = (who, what, missionId = null) => {
  state.auditLogs.unshift({ id: Date.now() + Math.random(), who, what, missionId, time: new Date() });
};

const addAlert = (icon, text, level = 'info') => {
  state.alerts.unshift({ id: Date.now() + Math.random(), icon, text, level, time: new Date() });
  if (state.alerts.length > 40) state.alerts.pop();
};

const notify = (msg, type='info', target=null) => {
  const notif = { id: Date.now() + Math.random(), msg, type, target, time: new Date(), read: false };
  state.notifications.unshift(notif);
  io.emit('notification', notif);
  broadcast();
};

const broadcast = () => {
  state.metrics = computeSurgeMetrics(state);
  io.emit('state_update', state);
};

// ---------- Blood coordination ----------

const allocateBlood = (emgId, bloodType) => {
  const donors = [
    ...state.hospitals.map(h => ({ kind: 'Hospital', id: h.id, name: h.name, inv: h.blood })),
    ...state.bloodBanks.map(b => ({ kind: 'Blood Bank', id: b.id, name: b.name, inv: b.inventory })),
  ].filter(d => d.inv && (d.inv[bloodType] || 0) > 0)
   .sort((a, b) => (b.inv[bloodType] || 0) - (a.inv[bloodType] || 0));
  if (!donors.length) return null;
  const donor = donors[0];
  donor.inv[bloodType] -= 1;
  const rec = { id: 'BR-' + Date.now(), emergencyId: emgId, bloodType, from: donor.name, kind: donor.kind, time: new Date() };
  state.bloodRequests.unshift(rec);
  return rec;
};

// ---------- Golden Hour ----------

const attachGoldenHour = (obj) => {
  obj.goldenHourStart = Date.now();
  obj.goldenHourMs = GOLDEN_HOUR_MS;
  return obj;
};

// ---------- Dispatch pipelines ----------

// Surge patient assignment: severity-priority, ambulance type preference,
// fastest SUITABLE hospital (golden hour scoring), blood coordination.
const assignSurgePatient = (patient) => {
  const preferred = AMBULANCE_TYPE_BY_SEVERITY[patient.severity] || 'BLS';
  const pool = state.ambulances.filter(a => a.status === 'AVAILABLE');
  const amb = pool.find(a => a.type === preferred) || pool[0];
  if (!amb) return false;

  const { selected, reasons } = selectHospitalForPatient(patient, state.hospitals);
  if (!selected) return false;

  amb.status = 'DISPATCHED';
  const mission = {
    id: 'M-' + Date.now() + '-' + Math.floor(Math.random() * 100),
    surgePatientId: patient.tempId,
    emergencyId: null,
    ambulanceId: amb.id, hospitalId: selected.id,
    severity: patient.severity, triageCode: patient.triageCode,
    status: 'EN_ROUTE_TO_PATIENT',
    route: [[amb.lat, amb.lng], [patient.lat, patient.lng], [selected.lat, selected.lng]],
    match: { selected, alts: [], reasons },
    timeline: [
      { time: new Date(), event: `Triage ${patient.triageCode} (${patient.severity}) — ${patient.injury}` },
      { time: new Date(), event: `Ambulance ${amb.name} assigned` },
      { time: new Date(), event: `Destination ${selected.name} — ETA ${selected.eta} min` },
    ],
  };
  attachGoldenHour(mission);
  if (patient.bloodNeeded) {
    const rec = allocateBlood(patient.tempId, patient.bloodNeeded);
    if (rec) {
      mission.timeline.push({ time: new Date(), event: `Blood ${patient.bloodNeeded} reserved from ${rec.from}` });
      addAlert('🩸', `Blood ${patient.bloodNeeded} unit moved to ${selected.name} (${rec.from}) for ${patient.tempId}`, 'warn');
    } else {
      mission.timeline.push({ time: new Date(), event: `Blood ${patient.bloodNeeded} UNAVAILABLE — alerting network` });
      addAlert('🩸', `No ${patient.bloodNeeded} stock! Network-wide blood alert for ${patient.tempId}`, 'crit');
    }
  }
  state.missions.push(mission);
  patient.status = 'ALLOCATED';
  patient.assignment = { ambulanceId: amb.id, ambulanceName: amb.name, hospitalId: selected.id, hospitalName: selected.name, missionId: mission.id, eta: selected.eta };
  logAudit('Surge Engine', `${patient.triageCode} patient ${patient.tempId} (${patient.severity}) → ${amb.name} → ${selected.name} ETA ${selected.eta}m`, mission.id);
  addAlert('🚨', `${patient.triageCode} ${patient.tempId}: ${amb.name} dispatched → ${selected.name} (ETA ${selected.eta}m)`, patient.severity === 'CRITICAL' ? 'crit' : 'warn');
  return true;
};

const assignAllSurgePatients = () => {
  const waiting = state.surge.patients
    .filter(p => p.status === 'WAITING')
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.goldenHourStart - b.goldenHourStart);
  for (const p of waiting) assignSurgePatient(p);
};

// Shared dispatch pipeline: assigns an available ambulance, runs hospital
// matching, and creates the mission. Used by patient SOS and AI Coordinator.
const dispatchForEmergency = (socket, payload, existing = null) => {
  const src = existing || payload;
  const emg = existing || {
    id: 'EMG-' + Math.floor(Math.random()*10000), ...payload, status: 'PENDING',
    timeline: [{ time: new Date(), event: 'SOS Created via Workflow' }]
  };
  if (!existing) {
    state.emergencies.push(emg);
    state.analytics.totalEmergencies++;
  }
  logAudit('System', `Emergency ${emg.id} created`, emg.id);

  const amb = state.ambulances.find(a => a.status === 'AVAILABLE');
  if (amb) {
    amb.status = 'DISPATCHED';
    // Match Hospital
    let cands = state.hospitals.filter(h => h.status === 'ONLINE' && h.receiving).map(h => {
      let score = 100;
      const dist = getDistance(src.lat, src.lng, h.lat, h.lng);
      let reasons = [`+ ETA: ${(dist*2.5).toFixed(0)} min`];
      score -= dist * 2;
      if(src.reqAssist === 'Trauma' && !h.trauma) { score -= 100; reasons.push('- No Trauma'); }
      else if (src.reqAssist === 'Trauma') { score += 20; reasons.push('+ Trauma Unit'); }
      if (h.icu.total - h.icu.used <= 0) { score -= 50; reasons.push('- No ICU'); }
      else { score += 20; reasons.push('+ ICU Available'); }
      return { ...h, dist: dist.toFixed(1), eta: (dist*2.5).toFixed(0), score, reasons };
    }).sort((a,b)=>b.score - a.score);

    const mission = {
      id: 'M-' + Date.now(), emergencyId: emg.id, ambulanceId: amb.id, hospitalId: cands[0]?.id,
      status: 'EN_ROUTE_TO_PATIENT', route: [[amb.lat, amb.lng], [src.lat, src.lng]],
      match: { selected: cands[0], alts: cands.slice(1) },
      timeline: [...emg.timeline, { time: new Date(), event: `Ambulance ${amb.name} Assigned` }]
    };
    if (cands[0]) mission.route.push([cands[0].lat, cands[0].lng]);
    state.missions.push(mission);
    emg.status = 'ASSIGNED';

    logAudit('System', `Mission ${mission.id} dispatched to ${amb.name} for ${cands[0]?.name}`, mission.id);
    notify(`SOS ${emg.id}: ${amb.name} dispatched. Dest: ${cands[0]?.name}`, 'error');
  } else {
    // No ambulance free: queue the SOS instead of silently dropping it.
    emg.status = 'QUEUED';
    logAudit('System', `Emergency ${emg.id} queued - no ambulances available`, emg.id);
    notify(`SOS ${emg.id}: All ambulances are currently deployed. Your emergency is in the dispatch queue.`, 'warning');
  }
  broadcast();
  return emg;
};

// When an ambulance becomes free, dispatch the oldest queued SOS (if any).
const promoteQueuedEmergency = () => {
  const queued = state.emergencies.filter(e => e.status === 'QUEUED');
  if (!queued.length) return;
  const freeAmb = state.ambulances.find(a => a.status === 'AVAILABLE');
  if (!freeAmb) return;
  const next = queued[0];
  next.timeline.push({ time: new Date(), event: 'Promoted from queue - ambulance available' });
  dispatchForEmergency(null, null, next);
  notify(`SOS ${next.id}: Ambulance now available. Dispatch resumed.`, 'info');
};

// ---------- Golden Hour breach watcher ----------

const startBreachWatcher = () => {
  if (breachTimer) clearInterval(breachTimer);
  breachTimer = setInterval(() => {
    const all = [
      ...state.surge.patients.filter(p => p.status !== 'DELIVERED'),
      ...state.missions.filter(m => m.status !== 'COMPLETED' && m.goldenHourStart),
    ];
    let changed = false;
    for (const p of all) {
      if (!p.goldenHourStart || p.goldenHourBreached) continue;
      if (Date.now() - p.goldenHourStart > (p.goldenHourMs || GOLDEN_HOUR_MS)) {
        p.goldenHourBreached = true;
        changed = true;
        const id = p.tempId || p.id;
        addAlert('⏱️', `GOLDEN HOUR BREACHED for ${id} — outcome risk critical`, 'crit');
        logAudit('Golden Hour', `Golden Hour breached for ${id}`, p.missionId || null);
      }
    }
    if (changed) broadcast();
  }, 5000);
};

const stopBreachWatcher = () => { if (breachTimer) { clearInterval(breachTimer); breachTimer = null; } };

// ---------- Blackout / sync ----------

const offlineLabel = () => state.blackout.active ? ' [OFFLINE-CACHED]' : '';

const applySyncedAction = (action) => {
  switch (action.type) {
    case 'create_emergency':
      dispatchForEmergency(null, action.payload);
      return `Emergency ${action.label.replace('Emergency ', '').replace(' created', '')} dispatched`;
    case 'amb_status': {
      const m = state.missions.find(x => x.id === action.payload.missionId);
      if (m) {
        m.status = action.payload.status;
        m.timeline.push({ time: new Date(), event: action.payload.status + ' (synced from offline queue)' });
        const a = state.ambulances.find(x => x.id === m.ambulanceId);
        if (a && action.payload.status === 'COMPLETED') a.status = 'AVAILABLE';
        return `Mission ${m.id} → ${action.payload.status}`;
      }
      return `Mission ${action.payload.missionId} not found (skipped)`;
    }
    case 'blood_request': {
      const rec = allocateBlood(action.payload.emergencyId, action.payload.bloodType);
      return rec ? `Blood ${action.payload.bloodType} allocated from ${rec.from}` : `Blood ${action.payload.bloodType} unavailable`;
    }
    default:
      return 'Applied';
  }
};

const restoreNetwork = () => {
  const b = state.blackout;
  if (!b.active) return;
  b.active = false;
  b.restoredAt = new Date();
  addAlert('📡', 'NETWORK RESTORED — sync engine engaged', 'ok');
  logAudit('Sync Engine', `Network restored; ${b.syncQueue.length} pending action(s) queued for sync`);
  let synced = 0;
  const results = [];
  for (const action of b.syncQueue) {
    results.push(`${action.label} → ${applySyncedAction(action)}`);
    synced++;
  }
  b.syncedCount = synced;
  b.syncQueue = [];
  addAlert('✅', `SYNC COMPLETE — ${synced} offline action(s) merged into realtime state`, 'ok');
  logAudit('Sync Engine', `Local queue → SYNC ENGINE → BACKEND → REALTIME: ${results.join(' | ')}`);
  notify(`Network restored: ${synced} offline action(s) synchronized.`, 'info');
  broadcast();
};

// ---------- Overflow ----------

const startOverflow = () => {
  const targets = state.hospitals.filter(h => h.status === 'ONLINE');
  state.overflow = { active: true, overflowedHospitalIds: targets.map(h => h.id), dismissedIds: [], alternatives: [] };
  targets.forEach(h => {
    h.status = 'CRITICAL';
    h.receiving = false;
    h.load = 100;
    addAlert('🏥', `${h.name} FULL / CRITICAL — not receiving`, 'crit');
    logAudit('Overflow', `${h.name} set FULL/CRITICAL — searching alternatives`);
  });
  const anchor = { lat: 21.10, lng: 79.07 };
  state.overflow.alternatives = generateAlternatives(state.hospitals, anchor);
  addAlert('🧭', `Matching engine found ${state.overflow.alternatives.length} alternative facilities`, 'warn');

  // Reroute every active mission targeting an overflowed hospital.
  let rerouted = 0;
  for (const m of state.missions.filter(x => x.status !== 'COMPLETED' && state.overflow.overflowedHospitalIds.includes(x.hospitalId))) {
    const patientLoc = m.route?.[1] ? { lat: m.route[1][0], lng: m.route[1][1] } : anchor;
    const { selected } = selectHospitalForPatient({ severity: m.severity || 'SERIOUS', location: patientLoc }, [...state.hospitals.filter(h => h.receiving), ...state.overflow.alternatives]);
    const dest = selected || state.overflow.alternatives[0];
    if (dest) {
      m.hospitalId = dest.id;
      m.route = [m.route[0], m.route[1], [dest.lat, dest.lng]];
      m.timeline.push({ time: new Date(), event: `REROUTED: ${dest.name} (primary FULL) — ETA ${dest.eta} min` });
      addAlert('🚑', `Mission ${m.id} rerouted → ${dest.name} (ETA ${dest.eta}m)`, 'warn');
      rerouted++;
    }
  }
  state.analytics.reroutes += rerouted;
  notify(`HOSPITAL OVERFLOW: ${targets.length} hospital(s) FULL. ${state.overflow.alternatives.length} alternatives online. ${rerouted} mission(s) rerouted.`, 'error');
};

// ---------- Reset ----------

const resetAll = () => {
  stopBreachWatcher();
  ultimateRunning = false;
  const users = state.users;
  state = buildInitialState();
  state.users = users;
  addAlert('♻️', 'All scenarios reset — realtime coordination restored', 'ok');
  logAudit('System', 'Twist scenarios reset to baseline');
  broadcast();
};

app.post('/api/login', (req, res) => {
  const user = state.users.find(u => u.username === req.body.username);
  if(user) {
    logAudit(user.username, `User logged in as ${user.role}`);
    res.json({ user, token: 'token' });
  } else res.status(401).json({ error: 'Invalid user' });
});

io.on('connection', (socket) => {
  socket.emit('state_update', state);

  socket.on('create_emergency', (payload) => {
    dispatchForEmergency(socket, payload);
  });

  socket.on('ai_chat', ({ prompt, context } = {}) => {
    const response = processAIPrompt(prompt, state, context || {});
    socket.emit('ai_response', response);
  });

  socket.on('amb_status', ({ missionId, status }) => {
    const m = state.missions.find(x => x.id === missionId);
    if (m) {
      m.status = status; m.timeline.push({ time: new Date(), event: status + offlineLabel() });
      const a = state.ambulances.find(x => x.id === m.ambulanceId);
      if (a) a.status = status === 'COMPLETED' ? 'AVAILABLE' : status;
      logAudit(`Ambulance ${a?.name}`, `Updated mission ${m.id} to ${status}${offlineLabel()}`, m.id);
      notify(`Mission ${m.id}: Status changed to ${status}${offlineLabel()}`);

      // Golden Hour milestones
      if (m.goldenHourStart) {
        const mins = ((Date.now() - m.goldenHourStart) / 60000).toFixed(1);
        if (status === 'PATIENT_PICKED_UP') m.timeline.push({ time: new Date(), event: `⏱ Patient secured at T+${mins} min of Golden Hour` });
        if (status === 'COMPLETED') {
          m.timeline.push({ time: new Date(), event: `⏱ Hospital arrival at T+${mins} min of Golden Hour` });
          addAlert('⏱️', `Golden Hour cycle complete for ${m.surgePatientId || m.id}: T+${mins} min total`, mins < 60 ? 'ok' : 'crit');
        }
      }

      if(status === 'COMPLETED') {
        if (m.surgePatientId) {
          const p = state.surge.patients.find(x => x.tempId === m.surgePatientId);
          if (p) { p.status = 'DELIVERED'; p.assignment = { ...p.assignment, missionCompleted: true }; }
        }
        const e = state.emergencies.find(x => x.id === m.emergencyId);
        if (e) e.status = 'COMPLETED';
        promoteQueuedEmergency();
        assignAllSurgePatients();
      }
      broadcast();
    }
  });

  socket.on('hosp_update', ({ id, icuUsed, load, val }) => {
    const h = state.hospitals.find(x => x.id === id);
    if(h) {
      if(icuUsed !== undefined) {
         const old = h.icu.total - h.icu.used;
         h.icu.used = icuUsed;
         const now = h.icu.total - h.icu.used;
         if (old > 0 && now <= 0) {
            // REROUTE
            notify(`CRITICAL: ${h.name} ICU Full! Rerouting active missions...`, 'warning');
            state.missions.filter(m => m.hospitalId === id && m.status !== 'COMPLETED').forEach(m => {
               // Reroute logic
               const alt = state.hospitals.find(ah => ah.id !== id && ah.icu.total - ah.icu.used > 0);
               if(alt) {
                 m.hospitalId = alt.id;
                 m.timeline.push({ time: new Date(), event: `REROUTED TO ${alt.name} (ICU FULL)` });
                 logAudit('Matching Engine', `Rerouted mission ${m.id} to ${alt.name}`, m.id);
                 notify(`Mission ${m.id} rerouted to ${alt.name}`, 'warning');
               }
            });
         }
      }
      if(load !== undefined) h.load = load;
      broadcast();
    }
  });

  // ---------- TWIST 1: Emergency Surge ----------
  socket.on('twist_surge_start', ({ count } = {}) => {
    const n = Math.min(Math.max(count || 12, 1), 40);
    if (!state.surge.active) {
      state.surge = { active: true, patients: [] };
      addAlert('🚨', 'HIGHWAY MASS CASUALTY — multi-vehicle collision on Wardha Road', 'crit');
      notify(`MASS CASUALTY EVENT: Highway pile-up reported. ${n} patients inbound. Triage active.`, 'error');
      logAudit('Twist: Surge', `Highway mass casualty started (${n} patients)`);
      startBreachWatcher();
    }
    for (let i = 0; i < n; i++) {
      const p = generateSurgePatient(state.surge.patients.length + i);
      p.status = 'WAITING';
      p.assignment = null;
      state.surge.patients.push(p);
      if (p.severity === 'CRITICAL') addAlert('🔴', `CRITICAL ${p.tempId}: ${p.injury}${p.bloodNeeded ? ` — needs ${p.bloodNeeded} blood` : ''} — Golden Hour engaged`, 'crit');
    }
    assignAllSurgePatients();
    broadcast();
  });

  socket.on('twist_surge_assign', ({ patientId }) => {
    const p = state.surge.patients.find(x => x.tempId === patientId);
    if (p && p.status === 'WAITING') {
      const ok = assignSurgePatient(p);
      if (!ok) notify(`${patientId}: no ambulance or no suitable hospital right now — kept in queue by priority.`, 'warning');
      broadcast();
    }
  });

  // ---------- TWIST 2: Network Blackout ----------
  socket.on('twist_blackout_start', () => {
    if (!state.blackout.active) {
      state.blackout = { active: true, since: new Date(), syncQueue: [], restoredAt: null, syncedCount: 0 };
      addAlert('📡', 'NETWORK OFFLINE — Emergency operations: DEGRADED MODE', 'crit');
      addAlert('短信', 'DEMO SMS FALLBACK ACTIVE (simulated — no real telecom integration)', 'warn');
      notify('NETWORK BLACKOUT: MEDNEXUS switched to offline/degraded mode. Cached resources active. Demo SMS fallback engaged.', 'error');
      logAudit('Twist: Blackout', 'Network blackout started — degraded mode');
      broadcast();
    }
  });

  socket.on('twist_blackout_restore', () => restoreNetwork());

  socket.on('blackout_local_action', ({ type, payload, label } = {}) => {
    if (!state.blackout.active) return;
    const entry = { id: 'QA-' + Date.now() + '-' + Math.floor(Math.random() * 100), ts: new Date(), type, payload, label: label || type };
    state.blackout.syncQueue.push(entry);
    logAudit('Offline Cache', `Stored locally: ${entry.label}`, payload?.missionId || null);
    if (type === 'create_emergency') {
      addAlert('短信', `DEMO SMS: ${payload.severity || 'Critical trauma'} | Loc: Highway | Ambulance pending sync`, 'warn');
    }
    broadcast();
  });

  // ---------- TWIST 3: Hospital Overflow ----------
  socket.on('twist_overflow_start', () => {
    if (!state.overflow.active) startOverflow();
    broadcast();
  });

  socket.on('twist_overflow_dismiss', ({ altId }) => {
    state.overflow.dismissedIds.push(altId);
    state.overflow.alternatives = state.overflow.alternatives.filter(a => a.id !== altId);
    addAlert('🏥', `Alternative ${altId} dismissed by coordinator`, 'info');
    broadcast();
  });

  socket.on('twist_overflow_select', ({ altId }) => {
    const alt = state.overflow.alternatives.find(a => a.id === altId);
    if (!alt) return;
    const waiting = state.surge.patients
      .filter(p => p.status === 'WAITING')
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])[0];
    if (waiting) {
      const { selected } = selectHospitalForPatient(waiting, [...state.hospitals.filter(h => h.receiving), alt]);
      const dest = selected || alt;
      const pool = state.ambulances.filter(a => a.status === 'AVAILABLE');
      const amb = pool[0];
      if (amb) {
        amb.status = 'DISPATCHED';
        const mission = {
          id: 'M-' + Date.now() + '-OV', surgePatientId: waiting.tempId, emergencyId: null,
          ambulanceId: amb.id, hospitalId: dest.id, severity: waiting.severity, triageCode: waiting.triageCode,
          status: 'EN_ROUTE_TO_PATIENT',
          route: [[amb.lat, amb.lng], [waiting.lat, waiting.lng], [dest.lat, dest.lng]],
          match: { selected: { ...dest }, alts: [], reasons: ['Coordinator-selected alternative'] },
          timeline: [{ time: new Date(), event: `Overflow routing → ${dest.name} (ETA ${dest.eta} min)` }],
        };
        attachGoldenHour(mission);
        state.missions.push(mission);
        waiting.status = 'ALLOCATED';
        waiting.assignment = { ambulanceId: amb.id, ambulanceName: amb.name, hospitalId: dest.id, hospitalName: dest.name, missionId: mission.id, eta: dest.eta };
        addAlert('🏥', `${waiting.tempId} → ${dest.name} via coordinator selection`, 'warn');
        logAudit('Overflow', `${waiting.tempId} assigned to alternative ${dest.name}`, mission.id);
      } else {
        notify(`${waiting.tempId} staged for ${dest.name} — awaiting free ambulance`, 'warning');
      }
    } else {
      const m = state.missions.find(x => x.status !== 'COMPLETED' && state.overflow.overflowedHospitalIds.includes(x.hospitalId));
      if (m) {
        m.hospitalId = alt.id;
        m.route = [m.route[0], m.route[1], [alt.lat, alt.lng]];
        m.timeline.push({ time: new Date(), event: `Coordinator override → ${alt.name}` });
        addAlert('🚑', `Mission ${m.id} → ${alt.name} (coordinator override)`, 'warn');
      } else {
        notify(`${alt.name} noted as preferred destination — no waiting patients right now.`, 'info');
      }
    }
    broadcast();
  });

  // ---------- TWIST 4: Golden Hour Mode ----------
  socket.on('twist_goldenhour_start', ({ emergencyId } = {}) => {
    state.goldenHour.active = true;
    let count = 0;
    for (const e of state.emergencies) {
      if (e.status === 'COMPLETED' || e.goldenHourStart) continue;
      if (emergencyId && e.id !== emergencyId) continue;
      attachGoldenHour(e);
      count++;
    }
    for (const m of state.missions) {
      if (m.status !== 'COMPLETED' && !m.goldenHourStart) attachGoldenHour(m);
    }
    addAlert('⏱️', `GOLDEN HOUR MODE — ${count || 'all active'} emergency(s) under countdown`, 'warn');
    notify('GOLDEN HOUR MODE: countdown timers engaged. Matching engine now optimizes for fastest SUITABLE destination.', 'error');
    logAudit('Twist: GoldenHour', `Golden hour mode engaged for ${count || 'all active'} emergencies`);
    startBreachWatcher();
    broadcast();
  });

  // ---------- TWIST 6: Ultimate Crisis ----------
  socket.on('twist_ultimate_start', () => {
    if (ultimateRunning) return;
    ultimateRunning = true;
    state.twist.running = 'ULTIMATE';
    addAlert('☢️', 'ULTIMATE CRISIS MODE — cascading failure sequence initiated', 'crit');
    notify('ULTIMATE CRISIS: highway collision + hospital overflow + network blackout + golden hour.', 'error');
    logAudit('Twist: Ultimate', 'Ultimate crisis sequence started');
    broadcast();

    setTimeout(() => {
      addAlert('📡', 'Phase 1: Internet backbone failure — DEGRADED MODE', 'crit');
      state.blackout = { active: true, since: new Date(), syncQueue: [], restoredAt: null, syncedCount: 0 };
      broadcast();
    }, 1500);

    setTimeout(() => {
      addAlert('🏥', 'Phase 2: Hospitals saturating — overflow protocol', 'crit');
      startOverflow();
      broadcast();
    }, 4000);

    setTimeout(() => {
      addAlert('🚨', 'Phase 3: Highway mass casualty — patients flooding in', 'crit');
      if (!state.surge.active) { state.surge = { active: true, patients: [] }; startBreachWatcher(); }
      for (let i = 0; i < 12; i++) {
        const p = generateSurgePatient(i);
        p.status = 'WAITING'; p.assignment = null;
        state.surge.patients.push(p);
      }
      assignAllSurgePatients();
      broadcast();
    }, 6500);

    setTimeout(() => {
      addAlert('⏱️', 'Phase 4: GOLDEN HOUR countdowns engaged for all criticals', 'warn');
      state.goldenHour.active = true;
      for (const p of state.surge.patients) if (!p.goldenHourStart) attachGoldenHour(p);
      for (const m of state.missions) if (m.status !== 'COMPLETED' && !m.goldenHourStart) attachGoldenHour(m);
      broadcast();
    }, 9000);

    setTimeout(() => {
      addAlert('📡', 'Phase 5: Network restored — syncing offline queue', 'ok');
      restoreNetwork();
      state.twist.running = null;
      ultimateRunning = false;
      addAlert('✅', 'ULTIMATE CRISIS sequence complete — system stabilized in realtime mode', 'ok');
      logAudit('Twist: Ultimate', 'Ultimate crisis sequence complete — recovery verified');
      broadcast();
    }, 12000);
  });

  // ---------- Reset ----------
  socket.on('twist_reset', () => resetAll());

  socket.on('simulate_mass_casualty', () => {
    socket.emit('twist_surge_start', { count: 3 });
  });
});

server.listen(4001, () => console.log('Backend on 4001'));
