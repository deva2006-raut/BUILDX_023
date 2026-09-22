import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet } from 'lucide-react';

export default function BloodBankApp({ user, state, socket }) {
  const navigate = useNavigate();
  if(!user || user.role !== 'BLOOD_BANK') return <div className="text-white">Unauthorized</div>;

  const bb = state.bloodBanks.find(b => b.id === user.bloodBankId);

  const updateInventory = (type, change) => {
    const amt = Math.max(0, (bb.inventory[type] || 0) + change);
    socket.emit('bb_update', { id: bb.id, bloodType: type, amt });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <div className="text-red-400 text-xs font-bold uppercase">Blood Bank Terminal</div>
          <h1 className="font-bold text-white text-2xl flex items-center gap-2"><Droplet className="text-red-500" /> {bb.name}</h1>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-white">Logout</button>
      </header>
      
      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-white font-bold mb-4">Live Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(bb.inventory).map(([type, amt]) => (
            <div key={type} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className={`text-2xl font-black ${amt === 0 ? 'text-red-500' : 'text-red-300'}`}>{type}</div>
                <div className="text-xs text-slate-500 uppercase font-bold">Units</div>
              </div>
              <div className="text-4xl font-bold text-white mb-6">{amt}</div>
              <div className="flex gap-2">
                <button onClick={()=>updateInventory(type, -1)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">-1</button>
                <button onClick={()=>updateInventory(type, 1)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">+1</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
