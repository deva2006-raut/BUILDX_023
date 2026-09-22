// Offline-first helpers for the Network Blackout twist.
const KEY = 'mednexus_offline_queue';

export const loadQueue = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};
export const saveQueue = (q) => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* noop */ } };
export const enqueue = (action) => { const q = loadQueue(); q.push(action); saveQueue(q); return q; };
export const clearQueue = () => { saveQueue([]); };
export const queueLength = () => loadQueue().length;
