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

const HOME_BY_ROLE = {
  PATIENT: '/app/patient',
  COMMAND_CENTER: '/app/command',
  HOSPITAL: '/app/hospital',
  AMBULANCE: '/app/ambulance',
  BLOOD_BANK: '/app/bloodbank',
};

// Guards role-scoped routes: no session -> /login; wrong role -> user's own app.
function RequireRole({ user, role, children }) {
  const navigate = useNavigate();
  const authorized = user && user.role === role;

  useEffect(() => {
    if (!authorized) {
      navigate(user ? (HOME_BY_ROLE[user.role] || '/login') : '/login', { replace: true });
    }
  }, [authorized, user, navigate]);

  return authorized ? children : null;
}

export default function App() {
  const [state, setState] = useState({ users: [], hospitals: [], ambulances: [], emergencies: [], missions: [], bloodBanks: [], analytics: {}, notifications: [] });
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mednexus_user')) || null; } catch { return null; }
  });

  const handleSetUser = (u) => {
    setUser(u);
    try {
      if (u) localStorage.setItem('mednexus_user', JSON.stringify(u));
      else localStorage.removeItem('mednexus_user');
    } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    socket.on('state_update', (newState) => setState(newState));
    return () => socket.off('state_update');
  }, []);

  return (
    <BrowserRouter>
      <div className="h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login users={state.users} setUser={handleSetUser} />} />
          <Route path="/app/patient" element={<RequireRole user={user} role="PATIENT"><PatientApp user={user} state={state} socket={socket} /></RequireRole>} />
          <Route path="/app/command" element={<RequireRole user={user} role="COMMAND_CENTER"><CommandApp user={user} state={state} socket={socket} /></RequireRole>} />
          <Route path="/app/hospital" element={<RequireRole user={user} role="HOSPITAL"><HospitalApp user={user} state={state} socket={socket} /></RequireRole>} />
          <Route path="/app/ambulance" element={<RequireRole user={user} role="AMBULANCE"><AmbulanceApp user={user} state={state} socket={socket} /></RequireRole>} />
          <Route path="/app/bloodbank" element={<RequireRole user={user} role="BLOOD_BANK"><BloodBankApp user={user} state={state} socket={socket} /></RequireRole>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
