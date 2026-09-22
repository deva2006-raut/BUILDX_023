import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Zap } from 'lucide-react';

export default function AICoordinator({ socket, onAction }) {
  const [messages, setMessages] = useState([{ sender: 'ai', text: 'I am MEDNEXUS AI. How can I assist your mission today?' }]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    socket.on('ai_response', (data) => {
      setMessages(prev => [...prev, { sender: 'ai', text: data.text, action: data.action, payload: data.payload, buttons: data.buttons }]);
    });
    return () => socket.off('ai_response');
  }, [socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendPrompt = (e) => {
    e.preventDefault();
    if(!input.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    socket.emit('ai_chat', { prompt: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center gap-2">
        <Bot className="text-blue-400 w-5 h-5" />
        <h3 className="text-white font-bold text-sm">MEDNEXUS AI</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${m.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
              <div className="flex items-center gap-2 mb-1 opacity-70">
                {m.sender === 'user' ? <User className="w-3 h-3"/> : <Bot className="w-3 h-3"/>}
                <span className="text-[10px] uppercase font-bold">{m.sender}</span>
              </div>
              <p>{m.text}</p>
              {m.buttons && m.buttons.map((btn, bIdx) => (
                <button key={bIdx} onClick={() => onAction(m.action, m.payload)} className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 text-white py-1 px-3 rounded flex items-center gap-1 border border-slate-600 transition">
                  <Zap className="w-3 h-3 text-yellow-400"/> {btn}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={sendPrompt} className="p-3 border-t border-slate-700 bg-slate-800 flex gap-2">
        <input 
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask AI to find resources or create SOS..."
          className="flex-1 bg-slate-900 text-white border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded transition">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
