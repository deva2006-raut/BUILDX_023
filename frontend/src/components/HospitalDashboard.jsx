import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function HospitalDashboard({ state, socket }) {
  const { id } = useParams();
  const hospital = state.hospitals.find(h => h.id === id);

  if (!hospital) return <div className="text-white p-4">Hospital not found</div>;

  // Find incoming missions
  const incomingMissions = state.missions.filter(m => m.hospitalId === id && m.status !== 'COMPLETED');

  const handleCapacityUpdate = (type, value) => {
    let newIcu = hospital.icu_availability;
    let newLoad = hospital.current_load;
    
    if (type === 'icu') newIcu = Math.max(0, newIcu + value);
    if (type === 'load') newLoad = Math.max(0, Math.min(100, newLoad + value));

    socket.emit('hospital_update_capacity', {
      hospitalId: id,
      icu: newIcu,
      load: newLoad
    });
  };

  return (
    <div className="flex h-full w-full bg-slate-900 p-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div>
            <Link to="/" className="text-blue-400 hover:underline text-sm mb-2 inline-block">← Back to Command Center</Link>
            <h1 className="text-3xl font-bold text-white">{hospital.name}</h1>
            <p className="text-slate-400">Hospital Control Panel</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 uppercase font-semibold">Status</div>
            <div className="text-xl font-bold text-green-400">{hospital.status}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Capacity Controls */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">Capacity Management</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300">Available ICU Beds</span>
                  <span className="text-white font-bold text-xl">{hospital.icu_availability}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleCapacityUpdate('icu', -1)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white">-1 Bed</button>
                  <button onClick={() => handleCapacityUpdate('icu', 1)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white">+1 Bed</button>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300">Current ER Load</span>
                  <span className="text-white font-bold text-xl">{hospital.current_load}%</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleCapacityUpdate('load', -10)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white">-10%</button>
                  <button onClick={() => handleCapacityUpdate('load', 10)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white">+10%</button>
                </div>
              </div>
            </div>
          </div>

          {/* Incoming Emergencies */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">Incoming Missions ({incomingMissions.length})</h2>
            
            <div className="space-y-4">
              {incomingMissions.map(m => {
                const amb = state.ambulances.find(a => a.id === m.ambulanceId);
                return (
                  <div key={m.id} className="bg-slate-900 border border-slate-700 rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-blue-400">{amb?.name}</span>
                      <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{m.status.replace(/_/g, ' ')}</span>
                    </div>
                    {m.matchDetails?.selected && (
                      <div className="text-sm text-slate-400">
                        ETA: <span className="text-white font-medium">{m.matchDetails.selected.eta} mins</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {incomingMissions.length === 0 && (
                <div className="text-slate-500 text-center py-8">No incoming emergencies at this time.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
