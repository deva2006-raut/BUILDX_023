import React from 'react';

// Red degraded-mode banner shown during Network Blackout twist.
export default function OfflineBanner({ blackout }) {
  if (!blackout || !blackout.active) return null;
  return (
    <div className="bg-red-700 text-white px-4 py-2 flex items-center justify-between text-sm font-bold shadow-lg z-[60]">
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse inline-block" />
        🔴 NETWORK OFFLINE — Emergency Operations: DEGRADED MODE
        {blackout.since && <span className="text-red-200 font-normal text-xs ml-2">since {new Date(blackout.since).toLocaleTimeString()}</span>}
      </span>
      <span className="text-red-100 text-xs">DEMO SMS FALLBACK ACTIVE · cached data · {blackout.syncQueue.length} pending sync</span>
    </div>
  );
}
