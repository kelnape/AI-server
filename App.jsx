import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Play, RotateCcw, Check, Copy, Download, Square,
  Library, FileText, X, Image as ImageIcon, Paperclip, File,
  Cpu, HardDrive, Thermometer, Activity, Box, Terminal,
  History, ShieldAlert, Brain, Database, GitCommit, Globe,
  ListChecks, ArrowRight, Code, MessageSquare, Bot,
  ChevronDown, Settings, Trash2, Save, Zap, Sparkles
} from 'lucide-react';

// =============================================================================
// SYNTAX HIGHLIGHTER — Python, Bash, HTML, CSS
// =============================================================================
const highlight = (text, lang = "python") => {
  if (!text) return '';
  let s = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const tok = {}; let c = 0;
  const save = (html, cls) => { const id=`__T${c++}__`; tok[id]=`<span class="${cls}">${html}</span>`; return id; };
  const flush = (str) => {
    let r = str, prev;
    do { prev=r; for(const [id,html] of Object.entries(tok)) r=r.replaceAll(id,html); } while(r!==prev);
    return r;
  };

  if (lang === "bash") {
    s = s.replace(/(#[^\n]*)/g, m => save(m,'text-gray-500 italic'));
    s = s.replace(/\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|find|sudo|apt|pip|git|docker|systemctl|chmod|chown|export|source|if|then|fi|for|do|done|while|case|esac|function|return|exit)\b/g, m => save(m,'text-pink-400 font-bold'));
    s = s.replace(/(\$\w+|\$\{[^}]+\})/g, m => save(m,'text-yellow-300'));
    s = s.replace(/(".*?"|'.*?')/g, m => save(m,'text-green-400'));
    s = s.replace(/\b(\d+)\b/g, m => save(m,'text-orange-300'));
    return flush(s);
  }

  if (lang === "html") {
    s = s.replace(/(<!--[\s\S]*?-->)/g, m => save(m,'text-gray-500 italic'));
    s = s.replace(/(&lt;\/?)([\w-]+)/g, (_, lt, tag) => lt + save(tag,'text-pink-400 font-bold'));
    s = s.replace(/([\w-]+)(=)/g, (_, attr, eq) => save(attr,'text-blue-300') + eq);
    s = s.replace(/(".*?"|'.*?')/g, m => save(m,'text-green-400'));
    return flush(s);
  }

  if (lang === "css") {
    s = s.replace(/(\/\*[\s\S]*?\*\/)/g, m => save(m,'text-gray-500 italic'));
    s = s.replace(/([.#]?[\w-]+)(?=\s*\{)/g, m => save(m,'text-yellow-300 font-bold'));
    s = s.replace(/([\w-]+)(?=\s*:)/g, m => save(m,'text-blue-300'));
    s = s.replace(/(".*?"|'.*?'|#[0-9a-fA-F]{3,6}|\d+(?:px|em|rem|%|vh|vw)?)/g, m => save(m,'text-green-400'));
    return flush(s);
  }

  // Python (default)
  s = s.replace(/(&quot;[\s\S]*?&quot;|&#39;[\s\S]*?&#39;|"[^"]*"|'[^']*')/g, m => save(m,'text-green-400'));
  s = s.replace(/(#[^\n]*)/g, m => save(m,'text-gray-500 italic'));
  s = s.replace(/\b(def|class)\s+([a-zA-Z_]\w*)/g, (_,p1,p2) => save(p1,'text-pink-400 font-bold')+' '+save(p2,'text-blue-400 font-bold'));
  s = s.replace(/\b(import|from|return|if|else|elif|for|while|try|except|finally|with|as|pass|break|continue|yield|lambda|global|nonlocal|assert|del|async|await|True|False|None|and|or|not|in|is)\b/g, m => save(m,'text-pink-400 font-bold'));
  s = s.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, m => save(m,'text-blue-300'));
  s = s.replace(/\b(\d+(\.\d+)?)\b/g, m => save(m,'text-orange-300'));
  return flush(s);
};

const LANG_LABELS = { python: 'Python', bash: 'Bash/Shell', html: 'HTML', css: 'CSS', javascript: 'JavaScript', json: 'JSON' };
const LANG_COLORS = { python: 'text-blue-400', bash: 'text-green-400', html: 'text-orange-400', css: 'text-pink-400', javascript: 'text-yellow-400', json: 'text-cyan-400' };

const CodeEditor = ({ code, lang = "python" }) => (
  <pre
    className="flex-1 bg-[#1e1e1e]/50 p-6 font-mono text-[13px] text-blue-100/90 overflow-auto custom-scrollbar whitespace-pre-wrap leading-relaxed m-0 border-0"
    dangerouslySetInnerHTML={{ __html: highlight(code, lang) }}
  />
);

// =============================================================================
// SERVER METRIKY
// =============================================================================
const ServerMetrics = () => {
  const [metrics, setMetrics] = useState({ cpu:"...", ram:"...", temp:"...", docker:"...", uptime:"..." });
  const [online, setOnline] = useState(false);
  useEffect(() => {
    const fetch_ = async () => {
      try { const r=await fetch('/api/metrics'); if(r.ok){setMetrics(await r.json());setOnline(true);}else setOnline(false); }
      catch { setOnline(false); }
    };
    fetch_(); const i=setInterval(fetch_,3000); return ()=>clearInterval(i);
  }, []);
  const S = ({icon:Icon, color, val, label}) => (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className={online ? color : "text-gray-600"} />
      <span>{label}: <span className={online ? "text-gray-200" : "text-gray-600"}>{val}</span></span>
    </div>
  );
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 sm:gap-5 text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 bg-[#070b15]/50 backdrop-blur-sm z-10">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${online?'bg-green-500 animate-pulse':'bg-red-500'}`} />
        <span className={online?"text-gray-300 font-bold":"text-red-400 font-bold"}>{online?'RPi Node 01':'OFFLINE'}</span>
      </div>
      <div className="hidden sm:block w-px h-3 bg-white/10"/>
      <S icon={Cpu}         color="text-blue-400"   val={metrics.cpu}    label="CPU"/>
      <S icon={HardDrive}   color="text-purple-400" val={metrics.ram}    label="RAM"/>
      <S icon={Thermometer} color="text-red-400"    val={metrics.temp}   label="Temp"/>
      <div className="hidden sm:flex items-center gap-1.5">
        <Box size={12} className={online?"text-cyan-400":"text-gray-600"} />
        <span>Docker: <span className={metrics.docker==="ACTIVE"?"text-cyan-200":"text-red-400"}>{metrics.docker}</span></span>
      </div>
      <div className="hidden md:flex items-center gap-1.5">
        <Activity size={12} className={online?"text-green-400":"text-gray-600"} />
        <span>Uptime: <span className={online?"text-green-200":"text-gray-600"}>{metrics.uptime}</span></span>
      </div>
    </div>
  );
};

// =============================================================================
// SYSTÉMOVÉ ALERTY
// =============================================================================
const SysAdminAlerts = ({ alerts, onResolve }) => {
  if (!alerts?.length) return null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 z-10 relative">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 animate-pulse"/>
        <div className="flex items-center gap-4 pl-2">
          <div className="p-2.5 bg-red-500/20 rounded-xl"><ShieldAlert className="text-red-500 animate-bounce" size={20}/></div>
          <div>
            <h3 className="text-red-400 font-black tracking-widest uppercase text-[10px]">SysAdmin Alert</h3>
            <p className="text-red-200/80 text-xs mt-0.5">{alerts.join(" | ")}</p>
          </div>
        </div>
        <button onClick={() => onResolve(`Alerty: ${alerts.join(", ")}. Analyzuj a navrhni řešení.`)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-full sm:w-auto justify-center">
          <Terminal size={13}/> Vyřešit
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MODEL SELEKTOR
// =============================================================================
const MODEL_ICONS = { openai: Zap, anthropic: Sparkles };
const MODEL_COLORS = { openai: 'text-green-400', anthropic: 'text-orange-400' };

const ModelSelector = ({ activeModel, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    fetch('/api/models').then(r=>r.json()).then(d=>setModels(d.available||[])).catch(()=>{});
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
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest">
        <Icon size={13} className={color}/>
        <span className="hidden sm:block text-gray-300">{current?.label || 'Model'}</span>
        <ChevronDown size={12} className={`text-gray-500 transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#0d1426] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 text-[9px] font-mono text-gray-600 uppercase tracking-widest px-3 pt-3">Zvol model</div>
          {models.map(m => {
            const MIcon = MODEL_ICONS[m.provider] || Zap;
            const mColor = MODEL_COLORS[m.provider] || 'text-gray-400';
            return (
              <button key={m.id} onClick={() => { if(m.available){onSelect(m.id);setOpen(false);} }}
                disabled={!m.available}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-all text-xs ${m.id===activeModel?'bg-blue-500/20 text-white':'text-gray-400 hover:bg-white/5 hover:text-white'} ${!m.available?'opacity-30 cursor-not-allowed':''}`}>
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

// =============================================================================
// EDITOR PROMPTŮ AGENTŮ
// =============================================================================
const AGENT_LIST = [
  {id:"MANAZER",label:"Manažer"},{id:"PLANNER",label:"Plánovač"},
  {id:"VYZKUMNIK",label:"Výzkumník"},{id:"EXPERT",label:"Expert"},
  {id:"SYSADMIN",label:"SysAdmin"},{id:"ARCHITEKT",label:"Architekt"},
  {id:"AUDITOR",label:"Auditor"},{id:"TESTER",label:"Tester"},
  {id:"KODER",label:"Kodér"},{id:"REFLEKTOR",label:"Reflektor"},
  {id:"FINALIZER",label:"Finalizér"},
];

const PromptEditor = ({ isOpen, onClose }) => {
  const [selectedAgent, setSelectedAgent] = useState("MANAZER");
  const [prompts, setPrompts] = useState({});
  const [baseIdentity, setBaseIdentity] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/prompts').then(r=>r.json()).then(d=>{
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
      await fetch('/api/prompts', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({agent_id: selectedAgent, prompt: draft}) });
      setPrompts(prev => ({...prev, [selectedAgent]: draft}));
      setSaved(true); setTimeout(()=>setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!prompts[selectedAgent]) return;
    await fetch(`/api/prompts/${selectedAgent}`, {method:'DELETE'});
    setPrompts(prev => {const n={...prev}; delete n[selectedAgent]; return n;});
    setDraft("");
  };

  const hasCustom = !!prompts[selectedAgent];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0f1d] border border-white/10 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl"><Settings size={18} className="text-purple-400"/></div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white">Editor promptů agentů</h2>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Vlastní instrukce se přidají k systémové identitě</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white"><X size={18}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Agent seznam */}
          <div className="w-44 border-r border-white/5 overflow-y-auto custom-scrollbar p-2 shrink-0">
            {AGENT_LIST.map(a => (
              <button key={a.id} onClick={() => setSelectedAgent(a.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 mb-1 ${selectedAgent===a.id?'bg-purple-500/20 text-purple-300 border border-purple-500/30':'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}>
                <span>{a.label}</span>
                {!!prompts[a.id] && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"/>}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Základní identita (readonly) */}
            <div className="p-4 border-b border-white/5">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-2">
                <Brain size={11}/> Základní systémová identita (sdílená, read-only)
              </div>
              <pre className="text-[10px] font-mono text-gray-600 bg-black/20 rounded-xl p-3 max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
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
                className="flex-1 bg-black/30 border border-white/8 rounded-2xl p-4 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-purple-500/50 placeholder:text-gray-700 leading-relaxed custom-scrollbar"
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

// =============================================================================
// AGENTI VIZUALIZACE
// =============================================================================
const AGENTS = [
  {id:'MANAZER',label:'Manažer',icon:User},{id:'PLANNER',label:'Plánovač',icon:ListChecks},
  {id:'VYZKUMNIK',label:'Výzkumník',icon:Globe},{id:'EXPERT',label:'Expert',icon:Library},
  {id:'SYSADMIN',label:'SysAdmin',icon:Terminal},{id:'ARCHITEKT',label:'Architekt',icon:Box},
  {id:'AUDITOR',label:'Auditor',icon:ShieldAlert},{id:'TESTER',label:'Tester',icon:Activity},
  {id:'KODER',label:'Kodér',icon:FileText},{id:'REFLEKTOR',label:'Analytik',icon:Brain},
];
const AGENT_COLORS = {
  MANAZER:'text-yellow-400', PLANNER:'text-indigo-400', VYZKUMNIK:'text-cyan-400',
  EXPERT:'text-violet-400', SYSADMIN:'text-orange-400', ARCHITEKT:'text-blue-400',
  AUDITOR:'text-red-400', TESTER:'text-green-400', KODER:'text-pink-400',
  REFLEKTOR:'text-purple-400', FINALIZER:'text-emerald-400', SYSTEM:'text-gray-400',
};

const AgentVisualizer = ({ activeAgent }) => (
  <div className="flex flex-wrap gap-1.5 p-3 bg-[#0a0f1d] rounded-2xl border border-white/5">
    {AGENTS.map(({id, label, icon: Icon}) => {
      const isActive = activeAgent === id;
      return (
        <div key={id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-500 ${isActive?'bg-blue-500/20 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.3)] scale-105':'bg-white/5 border-white/5 opacity-30 grayscale'}`}>
          <Icon size={12} className={isActive?"text-blue-400 animate-pulse":"text-gray-400"}/>
          <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block ${isActive?"text-blue-300":"text-gray-500"}`}>{label}</span>
        </div>
      );
    })}
  </div>
);

// =============================================================================
// KANBAN PLÁNOVAČ
// =============================================================================
const ProjectPlanner = ({ plan, currentStep }) => {
  if (!plan?.length) return null;
  return (
    <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-white/5 animate-in fade-in duration-500">
      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4 flex items-center gap-2"><ListChecks size={13}/> Operační Plán</h3>
      <div className="space-y-2.5">
        {plan.map((step, idx) => (
          <div key={idx} className={`flex items-start gap-3 text-xs transition-all duration-300 ${idx<currentStep?'opacity-30':idx===currentStep?'translate-x-1':'opacity-50'}`}>
            <div className="mt-0.5 shrink-0">
              {idx<currentStep ? <Check size={12} className="text-green-500"/>
               : idx===currentStep ? <div className="relative flex h-4 w-4 items-center justify-center"><div className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75"/><div className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"/></div>
               : <div className="h-4 w-4 border border-white/10 rounded-full flex items-center justify-center text-[8px] font-mono">{idx+1}</div>}
            </div>
            <span className={idx===currentStep?'text-white font-bold':'text-gray-400'}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// CHAT ZPRÁVY
// =============================================================================
const ChatMessage = ({ msg }) => {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const agentInfo = AGENTS.find(a => a.id === msg.agent);
  const AgentIcon = agentInfo?.icon || Bot;
  const agentColor = AGENT_COLORS[msg.agent] || 'text-blue-400';

  if (isSystem) return (
    <div className="flex items-center gap-3 py-1 px-1 opacity-40">
      <div className="h-px flex-1 bg-white/5"/><span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest whitespace-nowrap">{msg.content}</span><div className="h-px flex-1 bg-white/5"/>
    </div>
  );

  if (isUser) return (
    <div className="flex justify-end gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%]">
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-br-md px-4 py-3 text-sm text-blue-100/90 leading-relaxed">{msg.content}</div>
        <div className="text-[9px] text-gray-600 font-mono mt-1 text-right">{msg.time}</div>
      </div>
      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1"><User size={13} className="text-blue-400"/></div>
    </div>
  );

  return (
    <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
        <AgentIcon size={13} className={agentColor}/>
      </div>
      <div className="max-w-[85%] flex-1">
        {msg.agent && <div className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${agentColor}`}>{agentInfo?.label||msg.agent}</div>}
        <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {msg.content}{msg.streaming && <span className="inline-block w-1.5 h-4 bg-blue-400 ml-1 animate-pulse rounded-sm"/>}
        </div>
        {msg.time && <div className="text-[9px] text-gray-600 font-mono mt-1">{msg.time}</div>}
      </div>
    </div>
  );
};

const ThinkingIndicator = ({ activeAgent }) => {
  const agentInfo = AGENTS.find(a => a.id === activeAgent);
  const AgentIcon = agentInfo?.icon || Bot;
  const color = AGENT_COLORS[activeAgent] || 'text-blue-400';
  return (
    <div className="flex gap-3 animate-in fade-in duration-300">
      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><AgentIcon size={13} className={`${color} animate-pulse`}/></div>
      <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
        <span className={`text-[9px] font-black uppercase tracking-widest ${color}`}>{agentInfo?.label||activeAgent||'Systém'}</span>
        <div className="flex gap-1">
          {[0,1,2].map(i=><div key={i} className={`w-1.5 h-1.5 rounded-full ${color.replace('text-','bg-')} opacity-60`} style={{animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DRAWERY
// =============================================================================
const Overlay = ({ onClick }) => <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClick}/>;

const LibraryDrawer = ({ isOpen, onClose, onIndex }) => {
  const manuals = [
    {name:"DIADEM_2024_User_Manual.pdf",size:"12.4 MB",date:"2024-01-15"},
    {name:"LabVIEW_FPGA_Handbook.pdf",size:"8.1 MB",date:"2023-11-20"},
    {name:"NI_DAQmx_Technical_Guide.pdf",size:"4.2 MB",date:"2024-02-05"},
    {name:"System_Architecture_V8.pdf",size:"2.8 MB",date:"2024-03-01"},
  ];
  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-80 bg-[#0a0f1d] border-l border-white/10 z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3"><Library className="text-blue-400" size={20}/><h2 className="text-base font-black tracking-tighter uppercase italic text-white">Knihovna</h2></div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white"><X size={17}/></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {manuals.map((m,i) => (
              <div key={i} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer">
                <div className="flex items-start gap-3">
                  <FileText size={14} className="text-blue-400 mt-0.5"/>
                  <div className="flex-1 min-w-0"><h3 className="text-xs font-bold truncate text-gray-300 group-hover:text-white">{m.name}</h3><div className="text-[9px] text-gray-600 font-mono mt-1">{m.size} • {m.date}</div></div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onIndex} className="mt-6 w-full py-3.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <Database size={13} className="text-cyan-400"/> Nahrát manuál
          </button>
        </div>
      </div>
    </>
  );
};

const HistoryDrawer = ({ isOpen, onClose, history, onLoadTask }) => (
  <>
    {isOpen && <Overlay onClick={onClose}/>}
    <div className={`fixed inset-y-0 right-0 w-96 max-w-[90vw] bg-[#0a0f1d] border-l border-white/10 z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3"><History className="text-blue-400" size={20}/><h2 className="text-base font-black tracking-tighter uppercase italic text-white">Historie</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white"><X size={17}/></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
          {history.length===0 ? <p className="text-xs text-gray-600 italic">Zatím žádná historie.</p>
           : history.map((task,i) => (
            <div key={i} onClick={()=>{onLoadTask(task);onClose();}} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer relative">
              <p className="text-xs font-bold text-gray-300 line-clamp-2 leading-relaxed mb-2 pr-6">{task.query}</p>
              <div className="flex items-center justify-between text-[9px] font-mono text-gray-600">
                <span>{task.date}</span>
                <div className="flex items-center gap-2">
                  {task.model && <span className="text-purple-400/60">{task.model}</span>}
                  {task.hasCode && <span className="text-blue-400 flex items-center gap-1"><Box size={9}/> Kód</span>}
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100"><ArrowRight size={13} className="text-blue-500"/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

// =============================================================================
// HLAVNÍ APLIKACE
// =============================================================================
export default function App() {
  const [input, setInput] = useState("");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [sysAlerts, setSysAlerts] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [code, setCode] = useState("# Vítejte ve Workspace.\n# Systém čeká na vaše zadání...");
  const [codeLang, setCodeLang] = useState("python");
  const [activeAgent, setActiveAgent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [projectPlan, setProjectPlan] = useState([]);
  const [currentPlanStep, setCurrentPlanStep] = useState(-1);
  const [activeModel, setActiveModel] = useState("gpt-4o-mini");
  const [mobileTab, setMobileTab] = useState('chat');
  const [chatMessages, setChatMessages] = useState([
    {id:0, role:'system', content:'Inženýrský systém v9.2 online — Authenticated: Kelnape'}
  ]);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const indexInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const msgIdRef = useRef(1);
  const nextId = () => msgIdRef.current++;

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages, isProcessing]);

  useEffect(() => {
    fetch('/api/history').then(r=>r.json()).then(setTaskHistory).catch(()=>{});
    fetch('/api/models').then(r=>r.json()).then(d=>{ if(d.active) setActiveModel(d.active); }).catch(()=>{});
    const i = setInterval(async()=>{ try{ const r=await fetch('/api/alerts'); if(r.ok) setSysAlerts((await r.json()).alerts||[]); }catch{} },5000);
    return ()=>clearInterval(i);
  }, []);

  const addMessage = useCallback((msg) => {
    setChatMessages(prev => [...prev, {id:nextId(), time:new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'}), ...msg}]);
  }, []);

  const handleFileSelect = async (e, type) => {
    const files = Array.from(e.target.files);
    const res = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve({id:Math.random().toString(36).substr(2,9), name:file.name, type, mime:file.type, data:ev.target.result, preview:type==='image'?URL.createObjectURL(file):null});
      reader.readAsDataURL(file);
    })));
    setAttachments(prev => [...prev, ...res]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => { const r=prev.find(a=>a.id===id); if(r?.preview) URL.revokeObjectURL(r.preview); return prev.filter(a=>a.id!==id); });
  };

  const handleLearn = async () => {
    const last = taskHistory[0];
    if (!last) { addMessage({role:'system',content:'❌ Historie je prázdná.'}); return; }
    addMessage({role:'system',content:'📚 Indexace do ChromaDB...'});
    setIsProcessing(true); setActiveAgent("REFLEKTOR");
    try {
      const r = await fetch('/api/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:last.query,code:last.code})});
      addMessage({role:'ai',agent:'REFLEKTOR',content:r.ok?'✅ Zlaté pravidlo uloženo do ChromaDB.':'❌ Chyba indexace.'});
    } catch { addMessage({role:'ai',agent:'REFLEKTOR',content:'❌ Chyba komunikace.'}); }
    finally { setIsProcessing(false); setActiveAgent(null); }
  };

  const handleModelSelect = async (modelId) => {
    try {
      const r = await fetch('/api/model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model_id:modelId})});
      const d = await r.json();
      if(r.ok){ setActiveModel(modelId); addMessage({role:'system',content:`🤖 Model přepnut na: ${d.label}`}); }
      else addMessage({role:'system',content:`❌ Chyba: ${d.detail}`});
    } catch { addMessage({role:'system',content:'❌ Chyba při přepínání modelu.'}); }
  };

  const handleStop = () => {
    if(abortControllerRef.current){ abortControllerRef.current.abort(); addMessage({role:'system',content:'🛑 Úloha zastavena uživatelem.'}); setIsProcessing(false); setActiveAgent(null); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(code); setIsCopied(true); setTimeout(()=>setIsCopied(false),2000); };

  const executeTask = async (msg) => {
    if (!msg && attachments.length===0) return;
    if (msg.toLowerCase().trim()==='tohle se nauč') { handleLearn(); return; }
    setMobileTab('chat');
    addMessage({role:'user',content:msg});
    setProjectPlan([]); setCurrentPlanStep(-1);
    setIsProcessing(true); setActiveAgent("MANAZER");
    abortControllerRef.current = new AbortController();
    const filesToUpload = attachments.map(a=>({name:a.name,type:a.type,mime:a.mime,data:a.data}));
    setAttachments([]);

    try {
      const response = await fetch('/api/chat',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,files:filesToUpload,model_id:activeModel}),
        signal:abortControllerRef.current.signal
      });
      const reader = response.body.getReader(); const decoder = new TextDecoder();
      let partialLine = "", agentsSeen = [];

      while(true) {
        const {done,value} = await reader.read(); if(done) break;
        const lines = (partialLine + decoder.decode(value)).split('\n'); partialLine = lines.pop();
        for(const line of lines) {
          if(!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if(data.type==='plan'){ setProjectPlan(data.tasks); setCurrentPlanStep(0); addMessage({role:'system',content:`📋 Plánovač: ${data.tasks.length} kroků`}); }
            else if(data.type==='plan_progress'){ setCurrentPlanStep(data.step_index); }
            else if(data.type==='progress'){ const id=data.node.toUpperCase(); setActiveAgent(id); if(!agentsSeen.includes(id)){agentsSeen.push(id);const a=AGENTS.find(x=>x.id===id);if(a)addMessage({role:'system',content:`→ ${a.label}`});} }
            else if(data.type==='final'){
              setActiveAgent(null);
              addMessage({role:'ai',agent:'FINALIZER',content:data.response});
              if(data.code){ setCode(data.code); setCodeLang(data.lang||'python'); addMessage({role:'system',content:`💾 Kód (${LANG_LABELS[data.lang]||data.lang}) uložen do editoru`}); }
              setTaskHistory(prev=>[{query:msg,response:data.response,code:data.code,date:data.date||new Date().toLocaleTimeString(),model:data.model,hasCode:!!data.code},...prev]);
            } else if(data.type==='error'){ addMessage({role:'system',content:`❌ ${data.message}`}); }
          } catch {}
        }
      }
    } catch(e) {
      if(e.name!=='AbortError') addMessage({role:'system',content:'❌ Kritická chyba komunikace.'});
    } finally { setIsProcessing(false); setActiveAgent(null); }
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="min-h-screen bg-[#070b15] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10 pointer-events-none"/>

      {/* HEADER */}
      <header className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25"/>
            <div className="relative p-2.5 bg-[#0a0f1d] rounded-xl border border-white/10 shadow-xl"><User size={22} className="text-blue-400"/></div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black italic tracking-tight uppercase leading-none mb-0.5 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Engineering AI System</h1>
            <p className="text-[9px] text-blue-500 font-mono tracking-[0.3em] uppercase font-bold">Authenticated: Kelnape</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model selektor */}
          <ModelSelector activeModel={activeModel} onSelect={handleModelSelect}/>
          {/* Editor promptů */}
          <button onClick={()=>setIsPromptEditorOpen(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all" title="Editor promptů agentů">
            <Settings size={15} className="text-purple-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 hidden lg:block">Prompty</span>
          </button>
          <button onClick={handleLearn} className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
            <Brain size={15} className="text-pink-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 hidden sm:block">Naučit se</span>
          </button>
          <button onClick={()=>setIsHistoryOpen(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
            <History size={15} className="text-gray-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 hidden sm:block">Historie</span>
          </button>
          <button onClick={()=>setIsLibraryOpen(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
            <Library size={15} className="text-blue-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 hidden sm:block">Knihovna</span>
          </button>
        </div>
      </header>

      <ServerMetrics/>
      <SysAdminAlerts alerts={sysAlerts} onResolve={executeTask}/>

      {/* MODÁLY & DRAWERY */}
      <PromptEditor isOpen={isPromptEditorOpen} onClose={()=>setIsPromptEditorOpen(false)}/>
      <LibraryDrawer isOpen={isLibraryOpen} onClose={()=>setIsLibraryOpen(false)} onIndex={()=>indexInputRef.current?.click()}/>
      <HistoryDrawer isOpen={isHistoryOpen} onClose={()=>setIsHistoryOpen(false)} history={taskHistory}
        onLoadTask={t=>{setCode(t.code||"");setCodeLang('python');addMessage({role:'system',content:`📂 Obnoven: ${t.query}`.substring(0,60)});}}/>
      <input type="file" ref={indexInputRef} className="hidden"/>
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={e=>handleFileSelect(e,'image')}/>
      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e=>handleFileSelect(e,'file')}/>

      {/* MOBILNÍ TABY */}
      <div className="lg:hidden flex max-w-7xl mx-auto w-full px-4 pt-4 gap-2">
        <button onClick={()=>setMobileTab('chat')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab==='chat'?'bg-blue-600/20 border border-blue-500/40 text-blue-300':'bg-white/5 border border-white/5 text-gray-500'}`}>
          <MessageSquare size={13}/> Chat
        </button>
        <button onClick={()=>setMobileTab('code')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab==='code'?'bg-blue-600/20 border border-blue-500/40 text-blue-300':'bg-white/5 border border-white/5 text-gray-500'}`}>
          <Code size={13}/> {LANG_LABELS[codeLang]||'Kód'}
          {code.split('\n').length>3 && <span className="bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-md text-[8px]">{code.split('\n').length}L</span>}
        </button>
      </div>

      {/* HLAVNÍ OBSAH */}
      <main className="relative flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid lg:grid-cols-2 gap-6 lg:gap-10 overflow-hidden" style={{height:'calc(100vh - 160px)'}}>

        {/* LEVÝ SLOUPEC */}
        <div className={`flex flex-col gap-3 overflow-hidden h-full ${mobileTab!=='chat'?'hidden lg:flex':'flex'}`}>
          <AgentVisualizer activeAgent={activeAgent}/>
          <ProjectPlanner plan={projectPlan} currentStep={currentPlanStep}/>

          {/* CHAT */}
          <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              {chatMessages.map(msg=><ChatMessage key={msg.id} msg={msg}/>)}
              {isProcessing && activeAgent && <ThinkingIndicator activeAgent={activeAgent}/>}
              <div ref={chatEndRef}/>
            </div>
          </div>

          {/* PŘÍLOHY */}
          {attachments.length>0 && (
            <div className="flex flex-wrap gap-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {attachments.map(file=>(
                <div key={file.id} className="bg-[#0a0f1d] border border-white/10 rounded-xl p-2 flex items-center gap-2">
                  {file.preview ? <img src={file.preview} alt="" className="w-7 h-7 rounded-lg object-cover"/> : <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center"><File size={13} className="text-blue-400"/></div>}
                  <span className="text-[10px] font-mono text-gray-400 max-w-[70px] truncate">{file.name}</span>
                  <button onClick={()=>removeAttachment(file.id)} className="text-gray-600 hover:text-red-400"><X size={11}/></button>
                </div>
              ))}
            </div>
          )}

          {/* INPUT */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"/>
            <div className="relative flex items-center bg-[#0a0f1d] border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden">
              <div className="absolute left-4 flex items-center gap-1">
                <button onClick={()=>imageInputRef.current.click()} className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><ImageIcon size={16}/></button>
                <button onClick={()=>fileInputRef.current.click()} className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Paperclip size={16}/></button>
              </div>
              <input
                className="w-full bg-transparent px-8 py-4 pl-24 pr-16 text-sm focus:outline-none placeholder:text-gray-700 text-white"
                placeholder={isProcessing?"Tým agentů pracuje...":"Zadejte úkol nebo nahrajte dokumentaci..."}
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!isProcessing&&(executeTask(input),setInput(""))}
                disabled={isProcessing}
              />
              <div className="absolute right-3">
                {isProcessing
                  ? <button onClick={handleStop} className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl active:scale-90"><Square size={14} fill="currentColor"/></button>
                  : <button onClick={()=>{executeTask(input);setInput("");}} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-90"><Play size={16} fill="currentColor"/></button>
                }
              </div>
            </div>
          </div>
        </div>

        {/* PRAVÝ SLOUPEC — EDITOR */}
        <div className={`flex flex-col bg-[#0a0f1d] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl h-full ${mobileTab!=='code'?'hidden lg:flex':'flex'}`}>
          {/* Toolbar */}
          <div className="px-5 py-3.5 bg-[#0d1426] flex items-center justify-between border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
              <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">output_workspace</span>
              {/* Jazykový badge */}
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/5 ${LANG_COLORS[codeLang]||'text-blue-400'}`}>
                {LANG_LABELS[codeLang]||codeLang}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={()=>executeTask("Aktualizuj kód v gitu (git add, commit a push).")}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 text-[10px] font-black">
                <GitCommit size={13}/><span className="hidden xl:block">Git</span>
              </button>
              <button onClick={handleCopy} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl" title="Kopírovat">
                {isCopied?<Check size={14} className="text-green-400"/>:<Copy size={14}/>}
              </button>
              <button onClick={()=>{const b=new Blob([code],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`solution.${codeLang==='python'?'py':codeLang==='bash'?'sh':codeLang}`;a.click();}}
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl" title="Stáhnout">
                <Download size={14}/>
              </button>
              <button onClick={()=>executeTask("Proveď re-audit aktuálního kódu a oprav případné chyby.")}
                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 text-[10px] font-black active:scale-95">
                <RotateCcw size={13}/> Re-Audit
              </button>
            </div>
          </div>

          <CodeEditor code={code} lang={codeLang}/>

          {/* Status bar */}
          <div className="px-5 py-2.5 bg-[#0d1426]/50 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-gray-600">
            <div className="flex items-center gap-3">
              <span>UTF-8</span>
              <span className={LANG_COLORS[codeLang]||'text-blue-400/50'}>{LANG_LABELS[codeLang]||codeLang}</span>
              <span className="text-blue-500/40">LSP: Connected</span>
            </div>
            <div className="flex items-center gap-1"><Box size={9}/> <span>{code.split('\n').length} lines</span></div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .custom-scrollbar::-webkit-scrollbar{width:4px;height:4px}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05);border-radius:10px}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:rgba(59,130,246,0.3)}
      `}}/>
    </div>
  );
}
