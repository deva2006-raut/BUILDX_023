import React from 'react';
import { useNavigate } from 'react-router-dom';
import CommandCenter from '../components/CommandCenter';

export default function CommandApp({ user, state, socket }) {
  const navigate = useNavigate();
  if(!user || user.role !== 'COMMAND_CENTER') return <div className="text-white p-4">Unauthorized</div>;

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 p-2 flex justify-between items-center z-50">
        <div className="text-white font-bold px-2">EOC - COMMAND CENTER</div>
        <button onClick={() => navigate('/')} className="text-xs text-slate-400 mr-2">Logout</button>
      </header>
      <div className="flex-1 relative">
        <CommandCenter state={state} socket={socket} />
      </div>
    </div>
  );
}
