import React from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import GoldenHourTimer from '../components/GoldenHourTimer';

export default function AmbulanceApp({ user, state, socket }) {
  const navigate = useNavigate();
  if(!user || user.role !== 'AMBULANCE') return <div className="text-white">Unauthorized</div>;

  const amb = state.ambulances.find(a => a.id === user.ambulanceId);
  const mission = state.missions.find(m => m.ambulanceId === amb.id && m.status !== 'COMPLETED');
  const hosp = mission ? state.hospitals.find(h => h.id === mission.hospitalId) : null;

  const setStatus = (status) => socket.emit('amb_status', { missionId: mission.id, status });

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <header className="bg-blue-900 border-b border-blue-800 p-4 flex justify-between items-center z-50">
        <div>
          <div className="text-blue-300 text-xs font-bold uppercase">Ambulance Terminal</div>
          <h1 className="font-bold text-white text-xl">{amb.name}</h1>
        </div>
        <button onClick={() => navigate('/')} className="text-xs text-blue-200">Logout</button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row relative">
        <div className="w-full md:w-96 bg-slate-900 border-r border-slate-800 p-6 flex flex-col z-10 shadow-2xl">
          <div className="bg-slate-800 p-4 rounded border border-slate-700 mb-6">
            <div className="text-xs text-slate-400 uppercase">Unit Status</div>
            <div className="text-2xl font-bold text-green-400">{amb.status.replace(/_/g, ' ')}</div>
          </div>

          {mission && mission.goldenHourStart && (
            <div className="bg-slate-800 p-4 rounded border border-yellow-700 mb-6">
              <GoldenHourTimer start={mission.goldenHourStart} ms={mission.goldenHourMs} />
            </div>
          )}

          {mission ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-blue-900/20 border border-blue-800 p-4 rounded mb-6">
                <h3 className="text-blue-400 font-bold mb-2">Active Dispatch</h3>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Mission:</span><span className="text-white">{mission.id}</span></div>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Destination:</span><span className="text-purple-400 font-bold">{hosp?.name || 'Wait'}</span></div>
                {mission.match?.selected && <div className="flex justify-between text-sm"><span className="text-slate-400">ETA:</span><span className="text-white">{mission.match.selected.eta} min</span></div>}
              </div>

              <div className="space-y-3 mt-auto">
                {mission.status === 'EN_ROUTE_TO_PATIENT' && <button onClick={()=>setStatus('PATIENT_PICKED_UP')} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 rounded font-bold text-white">PATIENT SECURED</button>}
                {mission.status === 'PATIENT_PICKED_UP' && <button onClick={()=>setStatus('EN_ROUTE_TO_HOSPITAL')} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded font-bold text-white">EN ROUTE TO HOSPITAL</button>}
                {mission.status === 'EN_ROUTE_TO_HOSPITAL' && <button onClick={()=>setStatus('COMPLETED')} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded font-bold text-white">ARRIVED & HANDOVER COMPLETE</button>}
              </div>
            </div>
          ) : (
             <div className="text-slate-500 text-center py-10 flex-1">Standby for dispatch...</div>
          )}
        </div>
        
        <div className="flex-1 bg-slate-950">
          <MapComponent state={state} onMapClick={()=>{}} />
        </div>
      </div>
    </div>
  );
}
