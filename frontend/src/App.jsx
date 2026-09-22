import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import PatientApp from './apps/PatientApp';
import CommandApp from './apps/CommandApp';
import HospitalApp from './apps/HospitalApp';
import AmbulanceApp from './apps/AmbulanceApp';
import BloodBankApp from './apps/BloodBankApp';

import 'leaflet/dist/leaflet.css';

const socket = io('http://localhost:4001');

export default function App() {
  const [state, setState] = useState({ users: [], hospitals: [], ambulances: [], emergencies: [], missions: [], bloodBanks: [], analytics: {}, notifications: [] });
  const [user, setUser] = useState(null);

  useEffect(() => {
    socket.on('state_update', (newState) => setState(newState));
    return () => socket.off('state_update');
  }, []);

  return (
    <BrowserRouter>
      <div className="h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login users={state.users} setUser={setUser} />} />
          <Route path="/app/patient" element={<PatientApp user={user} state={state} socket={socket} />} />
          <Route path="/app/command" element={<CommandApp user={user} state={state} socket={socket} />} />
          <Route path="/app/hospital" element={<HospitalApp user={user} state={state} socket={socket} />} />
          <Route path="/app/ambulance" element={<AmbulanceApp user={user} state={state} socket={socket} />} />
          <Route path="/app/bloodbank" element={<BloodBankApp user={user} state={state} socket={socket} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
