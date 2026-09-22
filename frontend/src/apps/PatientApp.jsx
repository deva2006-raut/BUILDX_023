import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import AICoordinator from '../components/AICoordinator';
import GoldenHourTimer from '../components/GoldenHourTimer';
import { AlertCircle, User, Map, Clock, ArrowRight, CheckCircle, Bot } from 'lucide-react';

export default function PatientApp({ user, state, socket }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('HOME');
  const [sosStep, setSosStep] = useState(0); // 0: off, 1: type, 2: loc, 3: details, 4: confirm
  const [sosData, setSosData] = useState({ type: 'Medical', reqAssist: 'Basic', blood: 'Unknown' });

  if(!user || user.role !== 'PATIENT') return <div className="text-white p-4">Unauthorized</div>;

  const myEmergency = state.emergencies[state.emergencies.length - 1];
  const myMission = myEmergency ? state.missions.find(m => m.emergencyId === myEmergency.id) : null;
  const queued = myEmergency && myEmergency.status === 'QUEUED' && !myMission;
  const ghTimer = myMission && myMission.goldenHourStart ? <GoldenHourTimer start={myMission.goldenHourStart} ms={myMission.goldenHourMs} /> : null;

  const startSOS = () => setSosStep(1);
  const cancelSOS = () => setSosStep(0);
  const nextSOS = () => setSosStep(s => s + 1);
  
  const confirmSOS = () => {
    socket.emit('create_emergency', { lat: 21.11, lng: 79.08, ...sosData }); // Simulated user loc
    setSosStep(0);
    setActiveTab('MISSION');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="font-black text-white text-xl">MEDNEXUS <span className="text-blue-500">PATIENT</span></div>
        <div className="flex gap-4 items-center">
           <button onClick={()=>setActiveTab('HOME')} className={`text-sm font-bold ${activeTab==='HOME'?'text-white':'text-slate-500'}`}>HOME</button>
           <button onClick={()=>setActiveTab('AI')} className={`text-sm font-bold ${activeTab==='AI'?'text-white':'text-slate-500'}`}>AI CHAT</button>
           <button onClick={()=>setActiveTab('MISSION')} className={`text-sm font-bold ${activeTab==='MISSION'?'text-white':'text-slate-500'}`}>MISSION</button>
           <button onClick={() => navigate('/')} className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded">Logout</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 relative">
           
           {activeTab === 'HOME' && sosStep === 0 && (
             <div className="max-w-2xl mx-auto mt-10">
                <h1 className="text-3xl font-bold text-white mb-2">Hello, {user.name}</h1>
                <p className="text-slate-400 mb-10">You have no active emergencies. Are you safe?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button onClick={startSOS} className="bg-red-600 hover:bg-red-500 text-white p-8 rounded-2xl shadow-xl shadow-red-900/20 text-left transition group">
                    <AlertCircle className="w-12 h-12 mb-4 group-hover:scale-110 transition" />
                    <h2 className="text-2xl font-black mb-2">REQUEST SOS</h2>
                    <p className="text-red-200 text-sm">Start emergency multi-step workflow for precise resource allocation.</p>
                  </button>
                  <button onClick={()=>setActiveTab('AI')} className="bg-blue-900 border border-blue-800 hover:border-blue-500 text-white p-8 rounded-2xl text-left transition group">
                    <Bot className="w-12 h-12 mb-4 text-blue-400 group-hover:scale-110 transition" />
                    <h2 className="text-2xl font-black mb-2">ASK AI</h2>
                    <p className="text-blue-200 text-sm">Explain symptoms, find blood, or locate hospitals nearby via chat.</p>
                  </button>
                </div>
             </div>
           )}

           {/* SOS WORKFLOW */}
           {sosStep > 0 && (
             <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
               <div className="bg-red-900/30 border-b border-red-900 p-4 flex justify-between items-center">
                 <h2 className="text-red-400 font-bold flex items-center gap-2"><AlertCircle/> EMERGENCY SOS - STEP {sosStep}/4</h2>
                 <button onClick={cancelSOS} className="text-slate-500 hover:text-white text-xs">CANCEL</button>
               </div>
               <div className="p-8">
                 {sosStep === 1 && (
                   <div className="space-y-4">
                     <h3 className="text-white text-xl font-bold mb-4">What type of emergency?</h3>
                     {['Medical', 'Trauma/Accident', 'Fire', 'Security'].map(t => (
                       <button key={t} onClick={()=>{setSosData({...sosData, type: t}); nextSOS();}} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left text-white font-bold rounded flex justify-between">
                         {t} <ArrowRight className="w-4 h-4 text-slate-500" />
                       </button>
                     ))}
                   </div>
                 )}
                 {sosStep === 2 && (
                   <div className="space-y-4">
                     <h3 className="text-white text-xl font-bold mb-4">Required Assistance?</h3>
                     {['Basic Life Support (BLS)', 'Advanced ICU/Trauma (ALS)', 'Blood Required'].map(t => (
                       <button key={t} onClick={()=>{setSosData({...sosData, reqAssist: t.includes('Trauma')?'Trauma':'Basic'}); nextSOS();}} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left text-white font-bold rounded flex justify-between">
                         {t} <ArrowRight className="w-4 h-4 text-slate-500" />
                       </button>
                     ))}
                   </div>
                 )}
                 {sosStep === 3 && (
                   <div className="space-y-4">
                     <h3 className="text-white text-xl font-bold mb-4">Confirm Location</h3>
                     <div className="bg-slate-800 p-4 rounded text-slate-300 text-sm mb-4 border border-slate-700">
                       Using GPS Device Location: Lat 21.110, Lng 79.080 (Nagpur South)
                     </div>
                     <button onClick={nextSOS} className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex justify-center items-center gap-2">
                       CONFIRM LOCATION <ArrowRight className="w-4 h-4" />
                     </button>
                   </div>
                 )}
                 {sosStep === 4 && (
                   <div className="space-y-6">
                     <h3 className="text-white text-xl font-bold mb-2">Review & Submit</h3>
                     <div className="bg-slate-800 p-4 rounded text-sm text-slate-300 space-y-2 border border-slate-700">
                       <div className="flex justify-between"><span>Type:</span> <span className="font-bold text-white">{sosData.type}</span></div>
                       <div className="flex justify-between"><span>Needs:</span> <span className="font-bold text-white">{sosData.reqAssist}</span></div>
                       <div className="flex justify-between"><span>Location:</span> <span className="font-bold text-white">Verified</span></div>
                     </div>
                     <button onClick={confirmSOS} className="w-full p-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-xl shadow-lg shadow-red-900/50 flex justify-center items-center gap-2">
                       <AlertCircle className="w-6 h-6"/> BROADCAST EMERGENCY NOW
                     </button>
                   </div>
                 )}
               </div>
             </div>
           )}

           {activeTab === 'AI' && (
             <div className="h-full max-w-3xl mx-auto">
               <AICoordinator socket={socket} onAction={(a,p) => { if(a==='CREATE_SOS') { setSosData(p); setSosStep(4); setActiveTab('HOME'); } }} />
             </div>
           )}

           {activeTab === 'MISSION' && (
             <div className="h-full flex flex-col md:flex-row gap-6">
               <div className="w-full md:w-1/3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                 <div className="bg-blue-900/50 p-4 border-b border-blue-800">
                   <h2 className="text-blue-400 font-bold uppercase text-xs">Mission Control</h2>
                   <div className={`text-xl font-black ${queued ? 'text-yellow-400' : 'text-white'}`}>{queued ? 'IN DISPATCH QUEUE' : myMission ? myMission.status.replace(/_/g, ' ') : 'NO ACTIVE MISSION'}</div>
                   {ghTimer}
                 </div>
                 {queued && (
                   <div className="p-4">
                     <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded">
                       <div className="text-yellow-300 font-bold text-sm mb-1">SOS {myEmergency.id} received</div>
                       <div className="text-slate-300 text-sm">All ambulances are currently deployed. You are next in line — dispatch resumes automatically the moment a unit becomes available.</div>
                     </div>
                   </div>
                 )}
                 {myMission ? (
                   <div className="p-4 space-y-4 overflow-y-auto">
                      <div className="bg-slate-800 p-4 rounded border border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Ambulance Assigned</div>
                        <div className="text-white font-bold">{state.ambulances.find(a=>a.id===myMission.ambulanceId)?.name}</div>
                      </div>
                      <div className="bg-slate-800 p-4 rounded border border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Destination Hospital</div>
                        <div className="text-purple-400 font-bold">{state.hospitals.find(h=>h.id===myMission.hospitalId)?.name || 'Matching...'}</div>
                        {myMission.match?.selected && <div className="text-sm text-slate-300">ETA: {myMission.match.selected.eta} mins</div>}
                      </div>
                      <div className="bg-slate-800 p-4 rounded border border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Live Timeline</div>
                        <ul className="space-y-3">
                          {myMission.timeline.map((t, i) => (
                            <li key={i} className="flex gap-3 items-start">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-xs text-slate-500">{new Date(t.time).toLocaleTimeString()}</div>
                                <div className="text-sm text-white">{t.event}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                   </div>
                 ) : (
                   <div className="p-8 text-center text-slate-500">Request SOS to start mission.</div>
                 )}
               </div>
               <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
                 <MapComponent state={state} onMapClick={()=>{}} />
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
