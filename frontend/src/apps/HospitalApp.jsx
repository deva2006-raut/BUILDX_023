import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import { Activity, Thermometer, ShieldPlus } from 'lucide-react';

export default function HospitalApp({ user, state, socket }) {
  const navigate = useNavigate();
  if(!user || user.role !== 'HOSPITAL') return <div className="text-white">Unauthorized</div>;

  const hospital = state.hospitals.find(h => h.id === user.hospitalId);
  const incoming = state.missions.filter(m => m.hospitalId === hospital.id && m.status !== 'COMPLETED');

  const updateCapacity = (field, amt) => {
    let newUsed = hospital.icu.used;
    let newLoad = hospital.load;
    if(field === 'icu') newUsed = Math.max(0, Math.min(hospital.icu.total, newUsed + amt));
    if(field === 'load') newLoad = Math.max(0, Math.min(100, newLoad + amt));
    
    socket.emit('hosp_update', { id: hospital.id, icuUsed: newUsed, load: newLoad });
  };

  return (
    <div className="flex h-full bg-slate-950">
      <div className="w-1/3 bg-slate-900 border-r border-slate-800 flex flex-col">
        <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-purple-900/20">
          <div>
            <div className="text-purple-400 text-xs font-bold uppercase">Hospital Operator</div>
            <h1 className="font-bold text-white text-xl">{hospital.name}</h1>
          </div>
          <button onClick={() => navigate('/')} className="text-xs text-slate-400 hover:text-white">Logout</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400"/> Digital Twin Controls</h2>
            
            <div className="bg-slate-800 p-4 rounded border border-slate-700 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">ICU Capacity Used</span>
                <span className="text-white font-bold">{hospital.icu.used} / {hospital.icu.total}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>updateCapacity('icu', -1)} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded py-1 text-white text-sm">-1</button>
                <button onClick={()=>updateCapacity('icu', 1)} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded py-1 text-white text-sm">+1</button>
                <button onClick={()=>updateCapacity('icu', hospital.icu.total)} className="flex-1 bg-red-900/50 hover:bg-red-800 rounded py-1 text-red-200 text-xs border border-red-700 font-bold">FULL</button>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Emergency Load</span>
                <span className="text-white font-bold">{hospital.load}%</span>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>updateCapacity('load', -10)} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded py-1 text-white text-sm">-10%</button>
                <button onClick={()=>updateCapacity('load', 10)} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded py-1 text-white text-sm">+10%</button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-white font-bold mb-4 flex items-center gap-2"><ShieldPlus className="w-4 h-4 text-red-400"/> Incoming Emergencies</h2>
            <div className="space-y-3">
              {incoming.map(m => {
                const amb = state.ambulances.find(a => a.id === m.ambulanceId);
                return (
                  <div key={m.id} className="bg-slate-800 border border-slate-700 rounded p-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-blue-400">{amb?.name}</span>
                      <span className="text-xs bg-slate-700 px-1 rounded text-slate-300">{m.status.replace(/_/g, ' ')}</span>
                    </div>
                    {m.match?.selected && <div className="text-xs text-slate-400 mt-1">ETA: {m.match.selected.eta} mins</div>}
                  </div>
                )
              })}
              {incoming.length === 0 && <div className="text-slate-500 text-sm">No incoming missions.</div>}
            </div>
          </section>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <MapComponent state={state} onMapClick={()=>{}} highlights={{ hospitals: [hospital.id] }} />
      </div>
    </div>
  );
}
