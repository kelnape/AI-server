import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Zap, Sparkles } from 'lucide-react';
import { apiFetch } from '../../api/client';

const MODEL_ICONS = { openai: Zap, anthropic: Sparkles };
const MODEL_COLORS = { openai: 'text-green-400', anthropic: 'text-orange-400' };

export const ModelSelector = ({ activeModel, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    apiFetch('/api/models').then(r=>r.json()).then(d=>setModels(d.available||[])).catch(()=>{});
  }, []);

  useEffect(() => {
    const close = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const current = models.find(m=>m.id===activeModel);
  const Icon = current ? (MODEL_ICONS[current.provider] || Zap) : Zap;
  const color = current ? (MODEL_COLORS[current.provider] || 'text-gray-400') : 'text-gray-400';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${color.replace('text-','bg-').replace('400','500/10')} hover:opacity-80 border-current/20`}
        style={{borderColor: 'var(--border)'}}>
        <Icon size={13} className={color}/>
        <span className={`hidden sm:block ${color}`}>{current?.label || 'Model'}</span>
        <ChevronDown size={12} className={`${color} transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 theme-toolbar-bg border theme-border-cls rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 text-[9px] font-mono theme-text-xs-cls uppercase tracking-widest px-3 pt-3">Zvol model</div>
          {models.map(m => {
            const MIcon = MODEL_ICONS[m.provider] || Zap;
            const mColor = MODEL_COLORS[m.provider] || 'text-gray-400';
            return (
              <button key={m.id} onClick={() => { if(m.available){onSelect(m.id);setOpen(false);} }}
                disabled={!m.available}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-all text-xs ${m.id===activeModel?'bg-blue-500/20 text-white':'text-gray-400 hover:bg-[var(--bg-item)] hover:text-white'} ${!m.available?'opacity-30 cursor-not-allowed':''}`}>
                <MIcon size={14} className={mColor}/>
                <div className="flex-1">
                  <div className="font-bold">{m.label}</div>
                  {!m.available && <div className="text-[9px] text-red-400 mt-0.5">Chybí API klíč</div>}
                </div>
                {m.id===activeModel && <Check size={13} className="text-blue-400"/>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
