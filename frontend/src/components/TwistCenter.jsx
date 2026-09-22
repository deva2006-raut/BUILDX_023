import React, { useState } from 'react';
import GoldenHourTimer from './GoldenHourTimer';
import { enqueue, loadQueue, clearQueue } from '../lib/offline';

const Metric = ({ label, value, tone = 'text-white' }) => (
  <div className="bg-slate-800 p-3 rounded border border-slate-700 text-center">
    <div className={`text-2xl font-black ${tone}`}>{value}</div>
    <div className="text-[10px] uppercase text-slate-400 font-bold mt-1">{label}</div>
  </div>
);

const ScenarioCard = ({ icon, title, desc, active, steps, onStart, onReset, startLabel, accent = 'red' }) => (
  <div className={`bg-slate-900 border rounded-xl p-5 flex flex-col ${active ? 'border-red-500 shadow-lg shadow-red-900/30' : 'border-slate-800'}`}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {active && <span className="ml-auto text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">RUNNING</span>}
    </div>
    <p className="text-xs text-slate-400 mb-3 flex-1">{desc}</p>
    <div className="text-[10px] text-slate-500 space-y-1 mb-4">
      <div className="font-bold uppercase text-slate-400">Pipeline:</div>
      <div>{steps}</div>
    </div>
    <div className="flex gap-2">
      <button onClick={onStart} disabled={active} className={`flex-1 py-2 rounded font-bold text-sm transition ${active ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : `bg-${accent}-600 hover:bg-${accent}-500 text-white`}`}>
        {active ? 'RUNNING…' : startLabel || 'START SIMULATION'}
      </button>
      {active && <button onClick={onReset} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm text-white">RESET</button>}
    </div>
  </div>
);

export default function TwistCenter({ state, socket }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAlt, setSelectedAlt] = useState(null);
  const blackout = state.blackout || { active: false, syncQueue: [] };
  const surge = state.surge || { active: false, patients: [] };
  const overflow = state.overflow || { active: false, alternatives: [] };
  const gh = state.goldenHour || { active: false };
  const m = state.metrics || {};
  const [localQueue, setLocalQueue] = useState(loadQueue());

  const startSurge = () => socket.emit('twist_surge_start', { count: 12 });
  const startBlackout = () => {
    socket.emit('twist_blackout_start');
    // Seed a few offline local actions to demonstrate the queue + DEMO SMS.
    const seeds = [
      { type: 'create_emergency', label: `Emergency EMG-${Math.floor(Math.random() * 9000 + 1000)} created`, payload: { lat: 21.1, lng: 79.09, severity: 'Critical trauma' } },
      { type: 'amb_status', label: 'Ambulance A-04 status updated', payload: { missionId: 'local', status: 'PATIENT_PICKED_UP' } },
      { type: 'blood_request', label: 'Blood request created (O-)', payload: { emergencyId: 'local', bloodType: 'O-' } },
    ];
    let q = loadQueue();
    seeds.forEach(s => { q = enqueue({ ...s, ts: Date.now() }); socket.emit('blackout_local_action', s); });
    setLocalQueue(q);
  };
  const restore = () => { clearQueue(); setLocalQueue([]); socket.emit('twist_blackout_restore'); };
  const startOverflow = () => socket.emit('twist_overflow_start');
  const startGH = () => socket.emit('twist_goldenhour_start', {});
  const startUltimate = () => socket.emit('twist_ultimate_start');
  const reset = () => { clearQueue(); setLocalQueue([]); socket.emit('twist_reset'); setSelectedPatient(null); setSelectedAlt(null); };

  const patient = (p) => p && (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedPatient(null)}>
      <div className="bg-slate-900 border border-slate-600 rounded-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className={`inline-block px-2 py-0.5 rounded text-xs font-black text-white mb-1 ${p.triageCode === 'RED' ? 'bg-red-600' : p.triageCode === 'ORANGE' ? 'bg-orange-500' : p.triageCode === 'YELLOW' ? 'bg-yellow-500 text-slate-900' : 'bg-green-600'}`}>{p.triageCode} · {p.severity}</div>
            <h3 className="text-xl font-black text-white">{p.tempId}</h3>
            <p className="text-sm text-slate-400">{p.injury} · Highway Wardha Rd (DEMO)</p>
          </div>
          <GoldenHourTimer start={p.goldenHourStart} ms={p.goldenHourMs} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-slate-800 p-3 rounded border border-slate-700"><div className="text-[10px] uppercase text-slate-500 font-bold">Priority</div><div className="text-white font-bold">{p.severity}{p.bloodNeeded ? ` · Blood ${p.bloodNeeded}` : ''}</div></div>
          <div className="bg-slate-800 p-3 rounded border border-slate-700"><div className="text-[10px] uppercase text-slate-500 font-bold">Status</div><div className="text-white font-bold">{p.status}</div></div>
          <div className="bg-slate-800 p-3 rounded border border-slate-700"><div className="text-[10px] uppercase text-slate-500 font-bold">Ambulance</div><div className="text-blue-400 font-bold">{p.assignment?.ambulanceName || 'Queued'}</div></div>
          <div className="bg-slate-800 p-3 rounded border border-slate-700"><div className="text-[10px] uppercase text-slate-500 font-bold">Hospital</div><div className="text-purple-400 font-bold">{p.assignment?.hospitalName || 'Matching…'}</div></div>
        </div>
        {p.assignment ? (
          <div className="text-xs text-slate-300 bg-slate-800 border border-slate-700 p-3 rounded mb-4">
            🚑 Route: scene → {p.assignment.hospitalName} · ETA <b className="text-white">{p.assignment.eta} min</b> · Mission {p.assignment.missionId}
          </div>
        ) : (
          <button onClick={() => { socket.emit('twist_surge_assign', { patientId: p.tempId }); setSelectedPatient(null); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded mb-4">FORCE ALLOCATE NOW</button>
        )}
        <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-white text-sm">Close</button>
      </div>
    </div>
  );

  const altModal = selectedAlt && (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedAlt(null)}>
      <div className="bg-slate-900 border border-slate-600 rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-white mb-1">{selectedAlt.name}</h3>
        <p className="text-xs text-slate-400 mb-4">{selectedAlt.kind} · DEMO/SIMULATED facility</p>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="bg-slate-800 p-2 rounded border border-slate-700"><span className="text-slate-500 text-xs">Distance</span><div className="text-white font-bold">{selectedAlt.dist} km</div></div>
          <div className="bg-slate-800 p-2 rounded border border-slate-700"><span className="text-slate-500 text-xs">ETA</span><div className="text-white font-bold">{selectedAlt.eta} min</div></div>
          <div className="bg-slate-800 p-2 rounded border border-slate-700"><span className="text-slate-500 text-xs">ICU free</span><div className="text-white font-bold">{selectedAlt.icu.total - selectedAlt.icu.used}/{selectedAlt.icu.total}</div></div>
          <div className="bg-slate-800 p-2 rounded border border-slate-700"><span className="text-slate-500 text-xs">ER beds</span><div className="text-white font-bold">{selectedAlt.er.total - selectedAlt.er.used}/{selectedAlt.er.total}</div></div>
        </div>
        <p className="text-xs text-slate-400 mb-4">Trauma: {selectedAlt.trauma ? '✅' : '—'} · Specialists: {Object.keys(selectedAlt.specialists || {}).join(', ') || 'general'}</p>
        <button onClick={() => { socket.emit('twist_overflow_select', { altId: selectedAlt.id }); setSelectedAlt(null); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded mb-2">SELECT DESTINATION & ROUTE</button>
        <button onClick={() => { socket.emit('twist_overflow_dismiss', { altId: selectedAlt.id }); setSelectedAlt(null); }} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded">Dismiss facility</button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex justify-between items-center mb-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">☢️ CRISIS / TWIST SIMULATOR</h1>
          <p className="text-slate-400 text-sm">Live hackathon scenarios — every action mutates realtime backend state. All operational data is DEMO/SIMULATED.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={startUltimate} className="bg-gradient-to-r from-red-700 to-purple-700 hover:from-red-600 hover:to-purple-600 text-white font-black px-5 py-3 rounded-lg shadow-lg">☢️ ULTIMATE CRISIS MODE</button>
          <button onClick={reset} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-3 rounded-lg">♻️ RESET ALL</button>
        </div>
      </div>

      {/* Live demand metrics */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6 max-w-6xl mx-auto">
        <Metric label="Critical" value={m.criticalCount ?? 0} tone="text-red-400" />
        <Metric label="Waiting" value={m.waitingCount ?? 0} tone="text-yellow-400" />
        <Metric label="Ambulances" value={m.ambulancesAvailable ?? 0} tone="text-blue-400" />
        <Metric label="ICU Demand" value={m.icuDemand ?? 0} tone="text-purple-400" />
        <Metric label="Bed Demand" value={m.bedDemand ?? 0} />
        <Metric label="Blood Demand" value={m.bloodDemand ?? 0} tone="text-rose-400" />
        <Metric label="Hospitals" value={m.hospitalsAvailable ?? 0} tone="text-green-400" />
        <Metric label="Unallocated" value={m.unallocatedCount ?? 0} tone="text-orange-400" />
      </div>

      {/* Scenario cards */}
      <div className="grid md:grid-cols-2 gap-4 max-w-6xl mx-auto mb-6">
        <ScenarioCard icon="🚨" title="EMERGENCY SURGE" desc="Highway pile-up: dozens of victims, severity triage (RED/ORANGE/YELLOW/GREEN), priority allocation, blood coordination, golden hour tracking." active={surge.active} steps="SOS wave → Triage → Priority queue → Ambulance + fastest suitable hospital → Blood coord → Live map" onStart={startSurge} onReset={reset} startLabel="SIMULATE HIGHWAY MASS CASUALTY" />
        <ScenarioCard icon="📡" title="NETWORK BLACKOUT" desc="MEDNEXUS drops to OFFLINE/DEGRADED mode: cached hospitals, ambulances, missions; local emergency creation; pending-action sync queue; DEMO SMS fallback." active={blackout.active} steps="Offline mode → Local queue → Sync engine → Backend → Realtime" onStart={startBlackout} onReset={restore} startLabel="SIMULATE NETWORK BLACKOUT" accent="blue" />
        <ScenarioCard icon="🏥" title="HOSPITAL OVERFLOW" desc="Major hospitals hit FULL/CRITICAL. Matching engine auto-searches trauma centers, healthcare centers, partner hospitals & temporary camps — click to route." active={overflow.active} steps="HOSPITAL FULL → Matching engine → Alternatives → Recommended destination → New route" onStart={startOverflow} onReset={reset} startLabel="SIMULATE HOSPITAL OVERFLOW" accent="orange" />
        <ScenarioCard icon="⏱️" title="GOLDEN HOUR CHALLENGE" desc="Visible 60:00 countdowns on every critical case. Matching optimizes time+severity+ETA+capability+ICU+blood — never just the nearest hospital." active={gh.active} steps="Created → Priority → Dispatch → Hospital select → Notify → Route → Pickup → Arrival" onStart={startGH} onReset={reset} startLabel="ENGAGE GOLDEN HOUR MODE" accent="yellow" />
      </div>

      {/* Blackout: sync queue + SMS feed */}
      {blackout.active && (
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900 border border-red-800 rounded-xl p-4">
            <h3 className="font-bold text-white mb-2">📡 SYNC QUEUE — {blackout.syncQueue.length + localQueue.length} pending actions</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {blackout.syncQueue.map(a => (
                <div key={a.id} className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 flex justify-between">
                  <span>{a.label}</span><span className="text-slate-500">{new Date(a.ts).toLocaleTimeString()}</span>
                </div>
              ))}
              {localQueue.length === 0 && blackout.syncQueue.length === 0 && <div className="text-xs text-slate-500">Queue empty — create emergencies while offline.</div>}
            </div>
            <button onClick={restore} className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded text-sm">🌐 RESTORE NETWORK & SYNC</button>
          </div>
          <div className="bg-slate-900 border border-yellow-800 rounded-xl p-4">
            <h3 className="font-bold text-white mb-2">短信 DEMO SMS FALLBACK <span className="text-[10px] text-yellow-500 font-normal">(simulated — no real telecom)</span></h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {state.alerts.filter(a => a.text.includes('SMS')).map(a => (
                <div key={a.id} className="text-xs bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1 text-yellow-200 font-mono">{a.text}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overflow alternatives */}
      {overflow.active && (
        <div className="max-w-6xl mx-auto bg-slate-900 border border-orange-800 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-white mb-1">🏥 ALTERNATIVE FACILITIES (click for details)</h3>
          <p className="text-[11px] text-slate-500 mb-3">HOSPITAL A — FULL → Matching Engine → Alternatives → Recommended destination → New route · DEMO facilities</p>
          <div className="grid md:grid-cols-4 gap-3">
            {overflow.alternatives.map(a => (
              <button key={a.id} onClick={() => setSelectedAlt(a)} className="bg-slate-800 border border-slate-700 hover:border-orange-500 rounded p-3 text-left transition">
                <div className="font-bold text-white text-sm">{a.name}</div>
                <div className="text-xs text-slate-400">{a.kind} · {a.dist} km · ETA {a.eta}m</div>
                <div className="text-xs mt-1"><span className="text-green-400">ICU {a.icu.total - a.icu.used}</span> · <span className="text-blue-400">Beds {a.er.total - a.er.used}</span> · Load {a.load}%</div>
              </button>
            ))}
            {overflow.alternatives.length === 0 && <div className="text-sm text-slate-500">All alternatives dismissed.</div>}
          </div>
        </div>
      )}

      {/* Surge patient table */}
      {surge.active && (
        <div className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="font-bold text-white mb-3">🚨 SURGE PATIENTS — click any patient ({surge.patients.length})</h3>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                <tr><th className="p-2">Triage</th><th className="p-2">Patient</th><th className="p-2">Injury</th><th className="p-2">Blood</th><th className="p-2">Status</th><th className="p-2">Ambulance</th><th className="p-2">Hospital</th><th className="p-2">Golden Hour</th></tr>
              </thead>
              <tbody>
                {[...surge.patients].sort((a, b) => (a.status === 'DELIVERED') - (b.status === 'DELIVERED')).map(p => (
                  <tr key={p.tempId} onClick={() => setSelectedPatient(p)} className="border-b border-slate-800/50 hover:bg-slate-800/50 cursor-pointer">
                    <td className="p-2"><span className={`px-1.5 rounded text-[10px] font-black text-white ${p.triageCode === 'RED' ? 'bg-red-600' : p.triageCode === 'ORANGE' ? 'bg-orange-500' : p.triageCode === 'YELLOW' ? 'bg-yellow-500 text-slate-900' : 'bg-green-600'}`}>{p.triageCode}</span></td>
                    <td className="p-2 font-mono text-xs text-white">{p.tempId}</td>
                    <td className="p-2 text-slate-300 text-xs">{p.injury}</td>
                    <td className="p-2 text-xs text-rose-300">{p.bloodNeeded || '—'}</td>
                    <td className="p-2 text-xs"><span className={p.status === 'WAITING' ? 'text-yellow-400' : p.status === 'DELIVERED' ? 'text-slate-500' : 'text-green-400'}>{p.status}</span></td>
                    <td className="p-2 text-xs text-blue-300">{p.assignment?.ambulanceName || '—'}</td>
                    <td className="p-2 text-xs text-purple-300">{p.assignment?.hospitalName || '—'}</td>
                    <td className="p-2">{p.status !== 'DELIVERED' ? <GoldenHourTimer start={p.goldenHourStart} ms={p.goldenHourMs} compact /> : <span className="text-xs text-slate-600">done</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {patient(selectedPatient)}
      {altModal}
    </div>
  );
}
