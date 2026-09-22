import React, { useEffect, useState } from 'react';

// Visible countdown for Golden Hour. red > amber > green by time left.
export default function GoldenHourTimer({ start, ms = 3600000, compact = false, onBreached }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, (ms || 3600000) - (now - (start || now)));
  const breached = left <= 0;
  useEffect(() => { if (breached && onBreached) onBreached(); }, [breached]); // eslint-disable-line
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const color = breached ? 'text-red-500' : left < 15 * 60000 ? 'text-red-400' : left < 30 * 60000 ? 'text-yellow-400' : 'text-green-400';
  if (compact) return <span className={`font-mono font-bold ${color}`}>{breached ? 'BREACHED' : `${mm}:${ss}`}</span>;
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Golden Hour</div>
      <div className={`text-2xl font-black font-mono ${color}`}>{breached ? 'BREACHED' : `${mm}:${ss} LEFT`}</div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
        <div className={`h-1.5 rounded-full ${breached ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.max(0, Math.min(100, (left / (ms || 3600000)) * 100))}%` }} />
      </div>
    </div>
  );
}
