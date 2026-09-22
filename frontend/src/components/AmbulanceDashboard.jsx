import React from 'react';
import { useParams, Link } from 'react-router-dom';
import MapComponent from './MapComponent';

export default function AmbulanceDashboard({ state, socket }) {
  const { id } = useParams();
  
  // Find current mission for this ambulance
  const mission = state.missions.find(m => m.ambulanceId === id && m.status !== 'COMPLETED');
  const ambulance = state.ambulances.find(a => a.id === id);

  if (!ambulance) return <div className="text-white p-4">Ambulance not found</div>;

  const updateStatus = (status) => {
    socket.emit('ambulance_update_status', { missionId: mission.id, status });
  };

  return (
    <div className="flex h-full w-full flex-col lg:flex-row">
      <div className="lg:w-96 bg-slate-900 border-r border-slate-700 p-6 flex flex-col h-full overflow-y-auto">
        <div className="mb-6">
          <Link to="/" className="text-blue-400 hover:underline text-sm mb-2 inline-block">← Back to Command Center</Link>
          <h2 className="text-2xl font-bold text-white">{ambulance.name}</h2>
          <div className="text-sm text-slate-400">Ambulance Dashboard</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase mb-2">Current Status</h3>
          <div className={`text-xl font-bold ${mission ? 'text-blue-400' : 'text-green-400'}`}>
            {mission ? mission.status.replace(/_/g, ' ') : 'AVAILABLE'}
          </div>
        </div>

        {mission ? (
          <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">Active Mission Details</h3>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Mission ID</span>
                <span className="text-slate-200 font-medium">{mission.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Destination</span>
                <span className="text-purple-400 font-bold text-right">
                  {state.hospitals.find(h => h.id === mission.hospitalId)?.name || 'Pending'}
                </span>
              </div>
              {mission.matchDetails?.selected && (
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">ETA</span>
                  <span className="text-slate-200 font-medium">{mission.matchDetails.selected.eta} mins</span>
                </div>
              )}
            </div>

            <div className="mt-auto space-y-3">
              {mission.status === 'EN_ROUTE_TO_PATIENT' && (
                <button 
                  onClick={() => updateStatus('PATIENT_PICKED_UP')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg transition"
                >
                  Mark Patient Picked Up
                </button>
              )}
              {mission.status === 'PATIENT_PICKED_UP' && (
                <button 
                  onClick={() => updateStatus('EN_ROUTE_TO_HOSPITAL')}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-lg transition"
                >
                  En Route to Hospital
                </button>
              )}
              {mission.status === 'EN_ROUTE_TO_HOSPITAL' && (
                <button 
                  onClick={() => updateStatus('COMPLETED')}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg transition"
                >
                  Mission Completed (Arrived)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Waiting for dispatch...
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-slate-950">
        {/* Only show map relevant to this ambulance context if needed, otherwise normal map */}
        <MapComponent state={state} onMapClick={() => {}} selectedLocation={null} />
      </div>
    </div>
  );
}
