import React, { useState } from 'react';
import MapComponent from './MapComponent';
import AICoordinator from './AICoordinator';
import { Activity, ShieldAlert, Users, Droplet, Navigation, Crosshair, BarChart, FileText } from 'lucide-react';

export default function CommandCenter({ state, socket }) {
  const [activeTab, setActiveTab] = useState('MAP'); // MAP, CRISIS, ANALYTICS, AUDIT
  const [selectedHospital, setSelectedHospital] = useState(null);

  const renderDigitalTwin = () => {
    if(!selectedHospital) return null;
    return (
      <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto z-10 shadow-2xl">
        <div className="p-6 bg-slate-800 border-b border-slate-700">
           <button onClick={()=>setSelectedHospital(null)} className="text-blue-400 text-xs font-bold uppercase mb-4 hover:underline">← Close Twin</button>
           <h2 className="text-2xl font-black text-white mb-1">{selectedHospital.name}</h2>
           <p className="text-sm text-slate-400">{selectedHospital.address}</p>
        </div>
        <div className="p-6 space-y-6">
           <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Live Resource Capacity</h3>
             <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                 <div className="text-[10px] text-slate-400 uppercase">ICU Beds</div>
                 <div className="text-xl font-bold text-white">{selectedHospital.icu.total - selectedHospital.icu.used} <span className="text-sm font-normal text-slate-500">avail</span></div>
               </div>
               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                 <div className="text-[10px] text-slate-400 uppercase">ER Beds</div>
                 <div className="text-xl font-bold text-white">{selectedHospital.er.total - selectedHospital.er.used} <span className="text-sm font-normal text-slate-500">avail</span></div>
               </div>
               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                 <div className="text-[10px] text-slate-400 uppercase">Ventilators</div>
                 <div className="text-xl font-bold text-white">{selectedHospital.ventilators.total - selectedHospital.ventilators.used} <span className="text-sm font-normal text-slate-500">avail</span></div>
               </div>
               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                 <div className="text-[10px] text-slate-400 uppercase">ER Load</div>
                 <div className="text-xl font-bold text-white">{selectedHospital.load}%</div>
               </div>
             </div>
           </div>

           <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Specialist Availability</h3>
             <div className="flex gap-2 flex-wrap">
               {Object.entries(selectedHospital.specialists).filter(([k,v])=>v).map(([k]) => (
                 <span key={k} className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded text-xs font-bold uppercase">{k}</span>
               ))}
               {selectedHospital.trauma && <span className="bg-red-900/50 text-red-300 px-3 py-1 rounded text-xs font-bold uppercase">Trauma Center</span>}
             </div>
           </div>

           <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Blood Inventory</h3>
             <div className="grid grid-cols-4 gap-2">
               {Object.entries(selectedHospital.blood).map(([type, amt]) => (
                 <div key={type} className="bg-slate-800 p-2 text-center rounded border border-slate-700">
                   <div className="text-lg font-bold text-red-400">{type}</div>
                   <div className="text-xs text-white">{amt}U</div>
                 </div>
               ))}
             </div>
           </div>
           
           <div className="pt-4 border-t border-slate-700">
             <button onClick={()=>socket.emit('hosp_update', { id: selectedHospital.id, icuUsed: selectedHospital.icu.total })} className="w-full bg-red-900/30 hover:bg-red-900/60 border border-red-800 text-red-400 py-3 rounded font-bold text-sm transition">
               SIMULATE ICU FAILURE (CRASH TO 0)
             </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-slate-950">
      
      {/* EOC SIDEBAR */}
      <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
         <button onClick={()=>setActiveTab('MAP')} className={`p-3 rounded-xl transition ${activeTab==='MAP'?'bg-blue-600 text-white':'text-slate-500 hover:bg-slate-800'}`}><Map/></button>
         <button onClick={()=>setActiveTab('CRISIS')} className={`p-3 rounded-xl transition ${activeTab==='CRISIS'?'bg-red-600 text-white':'text-slate-500 hover:bg-slate-800'}`}><ShieldAlert/></button>
         <button onClick={()=>setActiveTab('ANALYTICS')} className={`p-3 rounded-xl transition ${activeTab==='ANALYTICS'?'bg-purple-600 text-white':'text-slate-500 hover:bg-slate-800'}`}><BarChart/></button>
         <button onClick={()=>setActiveTab('AUDIT')} className={`p-3 rounded-xl transition ${activeTab==='AUDIT'?'bg-slate-600 text-white':'text-slate-500 hover:bg-slate-800'}`}><FileText/></button>
      </div>

      {activeTab === 'MAP' && (
        <>
          <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
             <div className="p-4 bg-slate-950 border-b border-slate-800">
               <h2 className="text-sm font-bold text-slate-400 uppercase mb-2">Live EOC Stats</h2>
               <div className="grid grid-cols-2 gap-2">
                 <div className="bg-slate-800 p-2 rounded"><div className="text-[10px] text-slate-400">EMERGENCIES</div><div className="font-bold text-red-400">{state.emergencies.filter(e=>e.status!=='COMPLETED').length}</div></div>
                 <div className="bg-slate-800 p-2 rounded"><div className="text-[10px] text-slate-400">MISSIONS</div><div className="font-bold text-blue-400">{state.missions.filter(e=>e.status!=='COMPLETED').length}</div></div>
               </div>
             </div>
             <div className="flex-1 overflow-hidden p-4 flex flex-col">
               <h2 className="text-sm font-bold text-slate-400 uppercase mb-2">AI Orchestrator</h2>
               <div className="flex-1 border border-slate-700 rounded-lg overflow-hidden">
                 <AICoordinator socket={socket} onAction={(a,p) => { if(a==='CREATE_SOS') socket.emit('create_emergency', p); }} />
               </div>
             </div>
          </div>
          <div className="flex-1 relative">
             <MapComponent state={state} onMapClick={()=>{}} onHospitalClick={setSelectedHospital} />
          </div>
          {renderDigitalTwin()}
        </>
      )}

      {activeTab === 'CRISIS' && (
        <div className="flex-1 overflow-y-auto p-10">
           <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-2"><ShieldAlert className="text-red-500"/> Crisis Simulator</h1>
           <p className="text-slate-400 mb-10">Trigger macro-level crisis events to test network resilience and dynamic routing.</p>
           
           <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <Users className="w-10 h-10 text-orange-500 mb-4" />
               <h2 className="text-xl font-bold text-white mb-2">Mass Casualty Event</h2>
               <p className="text-sm text-slate-400 mb-6">Spawns multiple trauma emergencies across the central zone simultaneously. Tests parallel assignment and hospital overload limits.</p>
               <button onClick={()=>socket.emit('simulate_mass_casualty')} className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded">TRIGGER EVENT</button>
             </div>
             
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <Activity className="w-10 h-10 text-red-500 mb-4" />
               <h2 className="text-xl font-bold text-white mb-2">Targeted ICU Failure</h2>
               <p className="text-sm text-slate-400 mb-6">Use the Map tab to click a specific hospital and trigger ICU failure to test dynamic rerouting mid-transit.</p>
               <button onClick={()=>setActiveTab('MAP')} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 px-6 rounded">GO TO MAP</button>
             </div>
           </div>
        </div>
      )}

      {activeTab === 'ANALYTICS' && (
        <div className="flex-1 overflow-y-auto p-10">
           <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-2"><BarChart className="text-purple-500"/> Network Analytics</h1>
           <p className="text-slate-400 mb-10">Live simulated platform metrics.</p>
           <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <div className="text-slate-400 text-sm font-bold uppercase mb-2">Total Emergencies</div>
               <div className="text-5xl font-black text-white">{state.analytics.totalEmergencies}</div>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <div className="text-slate-400 text-sm font-bold uppercase mb-2">Dynamic Reroutes</div>
               <div className="text-5xl font-black text-orange-400">{state.analytics.reroutes}</div>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <div className="text-slate-400 text-sm font-bold uppercase mb-2">Avg AI Response</div>
               <div className="text-5xl font-black text-blue-400">12<span className="text-2xl text-slate-500">ms</span></div>
             </div>
           </div>
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div className="flex-1 overflow-y-auto p-10">
           <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-2"><FileText className="text-slate-400"/> System Audit Log</h1>
           <p className="text-slate-400 mb-10">Immutable timeline of all state changes across the network.</p>
           <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-w-5xl">
             <table className="w-full text-left text-sm text-slate-300">
               <thead className="bg-slate-950 border-b border-slate-800 text-slate-500 uppercase text-xs">
                 <tr><th className="p-4">Time</th><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Ref</th></tr>
               </thead>
               <tbody>
                 {state.auditLogs.map(l => (
                   <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/50">
                     <td className="p-4 text-slate-500">{new Date(l.time).toLocaleTimeString()}</td>
                     <td className="p-4 font-bold text-blue-400">{l.who}</td>
                     <td className="p-4">{l.what}</td>
                     <td className="p-4 text-xs font-mono text-purple-400">{l.missionId || '-'}</td>
                   </tr>
                 ))}
                 {state.auditLogs.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-500">No logs yet.</td></tr>}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
}
