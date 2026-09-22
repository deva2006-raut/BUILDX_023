import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Bot, ShieldAlert, HeartPulse, Stethoscope, Navigation, Map, AlertTriangle, Users } from 'lucide-react';

export default function Landing() {
  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <header className="sticky top-0 z-50 flex justify-between items-center p-4 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-2 text-2xl font-black tracking-tighter text-white">
          <Activity className="text-red-500 w-8 h-8" /> MEDNEXUS <span className="text-red-500">360</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-bold text-slate-300">
          <a href="#hero" className="hover:text-white transition">Home</a>
          <a href="#network" className="hover:text-white transition">Network</a>
          <a href="#ai" className="hover:text-white transition">AI Intelligence</a>
          <a href="#digital-twin" className="hover:text-white transition">Digital Twin</a>
        </nav>
        <div className="flex gap-4">
          <Link to="/login" className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full font-bold text-sm transition">Demo Login</Link>
          <Link to="/login" className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-red-900/50 transition flex items-center gap-2">
            <ShieldAlert className="w-4 h-4"/> SOS
          </Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section id="hero" className="py-24 px-6 text-center max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
            AI-Powered Emergency<br/>Intelligence & Coordination
          </h1>
          <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            "Right Resource. Right Route. Right Time." <br/>
            An integrated smart-city platform coordinating patients, ambulances, hospitals, and blood banks via explainable AI.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link to="/login" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg font-black text-lg flex justify-center items-center gap-2 shadow-lg shadow-blue-900/50">
              <Bot /> LAUNCH AI COORDINATOR
            </Link>
            <Link to="/login" className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-lg font-black text-lg flex justify-center items-center gap-2 border border-slate-700">
              <Map /> COMMAND CENTER EOC
            </Link>
          </div>
        </section>

        {/* NETWORK STATS */}
        <section id="network" className="py-16 bg-slate-900 border-y border-slate-800">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
             <div><div className="text-4xl font-black text-blue-400 mb-2">12ms</div><div className="text-xs text-slate-400 uppercase font-bold">Matching Latency</div></div>
             <div><div className="text-4xl font-black text-purple-400 mb-2">100%</div><div className="text-xs text-slate-400 uppercase font-bold">ICU Sync Rate</div></div>
             <div><div className="text-4xl font-black text-red-400 mb-2">24/7</div><div className="text-xs text-slate-400 uppercase font-bold">Blood Network</div></div>
             <div><div className="text-4xl font-black text-green-400 mb-2">Live</div><div className="text-xs text-slate-400 uppercase font-bold">Ambulance Telemetry</div></div>
          </div>
        </section>

        {/* FEATURE CARDS - CLICKABLE TO LOGIN */}
        <section id="features" className="py-24 max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
           <Link to="/login" className="group bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-blue-500 transition cursor-pointer">
              <div className="bg-blue-900/50 w-12 h-12 flex items-center justify-center rounded-xl mb-6 group-hover:scale-110 transition"><Bot className="text-blue-400" /></div>
              <h3 className="text-2xl font-bold text-white mb-3">AI Intelligence</h3>
              <p className="text-slate-400 text-sm mb-6">Natural language processing identifies emergencies, runs the matching engine, and coordinates resources instantly.</p>
              <div className="text-blue-400 font-bold text-sm">TRY AI WORKFLOW →</div>
           </Link>

           <Link to="/login" className="group bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-purple-500 transition cursor-pointer">
              <div className="bg-purple-900/50 w-12 h-12 flex items-center justify-center rounded-xl mb-6 group-hover:scale-110 transition"><Stethoscope className="text-purple-400" /></div>
              <h3 className="text-2xl font-bold text-white mb-3">Hospital Digital Twin</h3>
              <p className="text-slate-400 text-sm mb-6">Real-time simulated tracking of ICU beds, ventilators, specialists, and ER load to prevent ambulance diversion.</p>
              <div className="text-purple-400 font-bold text-sm">EXPLORE DIGITAL TWIN →</div>
           </Link>

           <Link to="/login" className="group bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-red-500 transition cursor-pointer">
              <div className="bg-red-900/50 w-12 h-12 flex items-center justify-center rounded-xl mb-6 group-hover:scale-110 transition"><AlertTriangle className="text-red-400" /></div>
              <h3 className="text-2xl font-bold text-white mb-3">Dynamic Rerouting</h3>
              <p className="text-slate-400 text-sm mb-6">If a destination hospital fails or drops ICU capacity mid-transit, the system instantly recalculates a new route.</p>
              <div className="text-red-400 font-bold text-sm">SIMULATE CRISIS →</div>
           </Link>
        </section>

      </main>
    </div>
  );
}
