import React, { useState, useEffect } from 'react';
import { Settings, X, Brain, Trash2, Check, Save } from 'lucide-react';
import { apiFetch } from '../../api/client';

// NOVÝ SEZNAM 8 SUPER-AGENTŮ (ID se přesně shodují s databází a nodes.py)
const AGENT_LIST = [
  {id:"MANAŽER", label:"Manažer"},
  {id:"PLÁNOVAČ", label:"Plánovač"},
  {id:"SPECIALISTA", label:"Specialista (Výzkum & DIAdem)"},
  {id:"VÝVOJÁŘ", label:"Vývojář (Kód & Architektura)"},
  {id:"QA", label:"QA Inženýr (Testy & Audit)"},
  {id:"SYSADMIN", label:"SysAdmin (Linux & Server)"},
  {id:"ANALYTIK", label:"Analytik (Reflexe)"},
  {id:"FINALIZÉR", label:"Finalizér"}
];

export const PromptEditor = ({ isOpen, onClose }) => {
  // Výchozí agent změněn na nového MANAŽER
  const [selectedAgent, setSelectedAgent] = useState("MANAŽER");
  const [prompts, setPrompts] = useState({});
  const [baseIdentity, setBaseIdentity] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/prompts').then(r=>r.json()).then(d=>{
      setPrompts(d.agent_prompts||{});
      setBaseIdentity(d.base_identity||"");
    }).catch(()=>{});
  }, [isOpen]);

  useEffect(() => {
    setDraft(prompts[selectedAgent] || "");
    setSaved(false);
  }, [selectedAgent, prompts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/prompts', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({agent_id: selectedAgent, prompt: draft}) });
      setPrompts(prev => ({...prev, [selectedAgent]: draft}));
      setSaved(true); setTimeout(()=>setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!prompts[selectedAgent]) return;
    await apiFetch(`/api/prompts/${selectedAgent}`, {method:'DELETE'});
    setPrompts(prev => {const n={...prev}; delete n[selectedAgent]; return n;});
    setDraft("");
  };

  const hasCustom = !!prompts[selectedAgent];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="theme-card-bg border theme-border-cls rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b theme-border-cls">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl"><Settings size={18} className="text-purple-400"/></div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white">Editor promptů agentů</h2>
              <p className="text-[10px] theme-text-sm-cls font-mono mt-0.5">Vlastní instrukce se přidají k systémové identitě</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl theme-text-sm-cls hover:text-white"><X size={18}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Agent seznam */}
          <div className="w-56 border-r theme-border-cls overflow-y-auto custom-scrollbar p-2 shrink-0">
            {AGENT_LIST.map(a => (
              <button key={a.id} onClick={() => setSelectedAgent(a.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 mb-1 ${selectedAgent===a.id?'bg-purple-500/20 text-purple-300 border border-purple-500/30':'theme-text-sm-cls hover:bg-white/5 hover:text-gray-300'}`}>
                <span className="truncate">{a.label}</span>
                {!!prompts[a.id] && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"/>}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Základní identita (readonly) */}
            <div className="p-4 border-b theme-border-cls">
              <div className="text-[9px] font-black uppercase tracking-widest theme-text-xs-cls mb-2 flex items-center gap-2">
                <Brain size={11}/> Základní systémová identita (sdílená, read-only)
              </div>
              <pre className="text-[10px] font-mono theme-text-xs-cls bg-black/20 rounded-xl p-3 max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                {baseIdentity}
              </pre>
            </div>

            {/* Vlastní prompt */}
            <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Settings size={11}/> Vlastní instrukce — {AGENT_LIST.find(a=>a.id===selectedAgent)?.label}
                  {hasCustom && <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-md text-[8px]">Aktivní</span>}
                </div>
                {hasCustom && (
                  <button onClick={handleDelete} className="flex items-center gap-1 text-[9px] text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={11}/> Smazat
                  </button>
                )}
              </div>
              <textarea
                value={draft}
                onChange={e=>setDraft(e.target.value)}
                placeholder={`Přidej vlastní instrukce pro agenta ${AGENT_LIST.find(a=>a.id===selectedAgent)?.label}...\n\nPříklady:\n• "Vždy generuj unit testy ke každému kódu."\n• "Preferuj asyncio a type hints."\n• "Odpovídej ve formátu JSON kdykoli je to možné."`}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl p-4 flex-1 theme-input-bg border theme-border-cls rounded-2xl p-4 text-sm theme-text-cls font-mono resize-none focus:outline-none focus:border-purple-500/50 theme-placeholder leading-relaxed custom-scrollbar"
              />
              <button onClick={handleSave} disabled={saving}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${saved?'bg-green-600/20 border border-green-500/30 text-green-400':'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300'}`}>
                {saved ? <><Check size={13}/> Uloženo!</> : saving ? <><div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"/> Ukládám...</> : <><Save size={13}/> Uložit prompt</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};