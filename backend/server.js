const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { processAIPrompt } = require('./aiCoordinator');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Massive Data Store
let state = {
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
  emergencies: [], missions: [], notifications: [], auditLogs: [], bloodRequests: [],
  analytics: { totalEmergencies: 0, reroutes: 0, avgResponseTime: 5, hospitalLoad: [65, 95] }
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; const dLat = (lat2-lat1)*(Math.PI/180); const dLon = (lon2-lon1)*(Math.PI/180);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180))*Math.cos(lat2*(Math.PI/180))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const logAudit = (who, what, missionId = null) => {
  state.auditLogs.unshift({ id: Date.now(), who, what, missionId, time: new Date() });
};

const notify = (msg, type='info', target=null) => {
  const notif = { id: Date.now(), msg, type, target, time: new Date(), read: false };
  state.notifications.unshift(notif);
  io.emit('notification', notif);
  io.emit('state_update', state);
};

// Shared dispatch pipeline: assigns an available ambulance, runs hospital
// matching, and creates the mission. Used by patient SOS and AI Coordinator.
const dispatchForEmergency = (socket, payload) => {
  const emg = {
    id: 'EMG-' + Math.floor(Math.random()*10000), ...payload, status: 'PENDING',
    timeline: [{ time: new Date(), event: 'SOS Created via Workflow' }]
  };
  state.emergencies.push(emg);
  state.analytics.totalEmergencies++;
  logAudit('System', `Emergency ${emg.id} created`, emg.id);

  const amb = state.ambulances.find(a => a.status === 'AVAILABLE');
  if (amb) {
    amb.status = 'DISPATCHED';
    // Match Hospital
    let cands = state.hospitals.filter(h => h.status === 'ONLINE' && h.receiving).map(h => {
      let score = 100;
      const dist = getDistance(payload.lat, payload.lng, h.lat, h.lng);
      let reasons = [`+ ETA: ${(dist*2.5).toFixed(0)} min`];
      score -= dist * 2;
      if(payload.reqAssist === 'Trauma' && !h.trauma) { score -= 100; reasons.push('- No Trauma'); }
      else if (payload.reqAssist === 'Trauma') { score += 20; reasons.push('+ Trauma Unit'); }
      if (h.icu.total - h.icu.used <= 0) { score -= 50; reasons.push('- No ICU'); }
      else { score += 20; reasons.push('+ ICU Available'); }
      return { ...h, dist: dist.toFixed(1), eta: (dist*2.5).toFixed(0), score, reasons };
    }).sort((a,b)=>b.score - a.score);

    const mission = {
      id: 'M-' + Date.now(), emergencyId: emg.id, ambulanceId: amb.id, hospitalId: cands[0]?.id,
      status: 'EN_ROUTE_TO_PATIENT', route: [[amb.lat, amb.lng], [payload.lat, payload.lng]],
      match: { selected: cands[0], alts: cands.slice(1) },
      timeline: [...emg.timeline, { time: new Date(), event: `Ambulance ${amb.name} Assigned` }]
    };
    if (cands[0]) mission.route.push([cands[0].lat, cands[0].lng]);
    state.missions.push(mission);
    emg.status = 'ASSIGNED';

    logAudit('System', `Mission ${mission.id} dispatched to ${amb.name} for ${cands[0]?.name}`, mission.id);
    notify(`SOS ${emg.id}: ${amb.name} dispatched. Dest: ${cands[0]?.name}`, 'error');
  }
  io.emit('state_update', state);
  return emg;
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
      m.status = status; m.timeline.push({ time: new Date(), event: status });
      const a = state.ambulances.find(x => x.id === m.ambulanceId);
      if (a) a.status = status === 'COMPLETED' ? 'AVAILABLE' : status;
      logAudit(`Ambulance ${a?.name}`, `Updated mission ${m.id} to ${status}`, m.id);
      notify(`Mission ${m.id}: Status changed to ${status}`);
      if(status === 'COMPLETED') state.emergencies.find(e => e.id === m.emergencyId).status = 'COMPLETED';
      io.emit('state_update', state);
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
      io.emit('state_update', state);
    }
  });
  
  socket.on('simulate_mass_casualty', () => {
    notify('MASS CASUALTY EVENT TRIGGERED', 'error');
    for(let i=0; i<3; i++) {
       setTimeout(() => {
         socket.emit('create_emergency', { lat: 21.14 + (Math.random()*0.02), lng: 79.08 + (Math.random()*0.02), reqAssist: 'Trauma' });
       }, i * 1500);
    }
  });
});

server.listen(4001, () => console.log('Backend on 4001'));
