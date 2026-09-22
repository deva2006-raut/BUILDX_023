import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Login({ users, setUser }) {
  const navigate = useNavigate();

  const handleLogin = async (username) => {
    const res = await fetch('http://localhost:4001/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      if(data.user.role === 'PATIENT') navigate('/app/patient');
      if(data.user.role === 'COMMAND_CENTER') navigate('/app/command');
      if(data.user.role === 'HOSPITAL') navigate('/app/hospital');
      if(data.user.role === 'AMBULANCE') navigate('/app/ambulance');
      if(data.user.role === 'BLOOD_BANK') navigate('/app/bloodbank');
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
        <div className="flex justify-center mb-8">
          <Activity className="text-red-500 w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-white text-center mb-2">MEDNEXUS LOGIN</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Select your role to access the network</p>
        
        <div className="space-y-3">
          {users?.map(u => (
            <button 
              key={u.id} onClick={() => handleLogin(u.username)}
              className="w-full p-4 bg-slate-800 hover:bg-blue-900 border border-slate-700 hover:border-blue-500 rounded text-left transition flex justify-between items-center"
            >
              <div>
                <div className="font-bold text-white">{u.name}</div>
                <div className="text-xs text-slate-400">{u.role.replace('_', ' ')}</div>
              </div>
              <div className="text-blue-400 text-sm font-semibold">LOGIN →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
