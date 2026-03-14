import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Play, RotateCcw, Check, Copy, Download, Square,
  Library, FileText, X, Image as ImageIcon, Paperclip, File,
  Cpu, HardDrive, Thermometer, Activity, Box, Terminal,
  History, ShieldAlert, Brain, Database, GitCommit, Globe,
  ListChecks, ArrowRight, Code, MessageSquare, Bot,
  ChevronDown, Settings, Trash2, Save, Zap, Sparkles,
  BookOpen, Bookmark, BookmarkCheck, Lightbulb, Clock,
  BarChart2, DollarSign, TrendingUp, AlertTriangle,
  Monitor, Eye, EyeOff, Package, Wand2, Palette, Layers
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
const WEB_TRIGGER_WORDS = ['eshop','e-shop','web','website','stránk','stránky','landing','portfolio','blog','obchod','prodej','frontend','html','tailwind'];
const GIT_REPO_PATH = ''; // zobrazeno v Git drawer footeru — backend ho vyplní

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 sm:gap-5 text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 bg-[#070b15]/50 backdrop-blur-sm z-10 relative">
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
// INTAKE FORMULÁŘ — specifika webového projektu
// =============================================================================

const STYLE_OPTIONS = [
  {id:'modern',label:'Moderní / Tech',desc:'Tmavé pozadí, neon akcenty'},
  {id:'minimal',label:'Minimalistický',desc:'Bílý, čistý, hodně bílého místa'},
  {id:'colorful',label:'Barevný / Bold',desc:'Výrazné barvy, živý'},
  {id:'corporate',label:'Firemní / Trust',desc:'Modrá, seriózní'},
  {id:'nature',label:'Přírodní / Eco',desc:'Zelená, organické tvary'},
];

const SECTION_OPTIONS = [
  'Hero / Uvítací banner','Navigace s menu','Produkty / Katalog',
  'Nákupní košík','Kontaktní formulář','O nás / Team','Blog / Novinky',
  'Ceník / Tarify','FAQ / Otázky','Footer se social links',
];

const IntakeModal = ({ isOpen, initialMessage, onConfirm, onSkip }) => {
  const [specs, setSpecs] = useState({
    name: '', purpose: '', style: 'modern',
    sections: ['Hero / Uvítací banner','Navigace s menu','Produkty / Katalog','Footer se social links'],
    language: 'cs', colors: '', products_count: '', notes: '',
  });

  const toggleSection = (s) => setSpecs(prev => ({
    ...prev,
    sections: prev.sections.includes(s) ? prev.sections.filter(x=>x!==s) : [...prev.sections, s]
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0f1d] border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-xl"><Wand2 size={18} className="text-rose-400"/></div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white">Webový projekt — Intake</h2>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Zadej specifika → Designer dostane přesné instrukce</p>
            </div>
          </div>
          <button onClick={onSkip} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white" title="Přeskočit a spustit bez specifikací"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {/* Základní info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Název projektu</label>
              <input value={specs.name} onChange={e=>setSpecs(p=>({...p,name:e.target.value}))}
                placeholder="Např. TechShop, Portfolio..."
                className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500/40 placeholder:text-gray-700"/>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Jazyk obsahu</label>
              <select value={specs.language} onChange={e=>setSpecs(p=>({...p,language:e.target.value}))}
                className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500/40">
                <option value="cs">🇨🇿 Čeština</option>
                <option value="en">🇬🇧 Angličtina</option>
                <option value="sk">🇸🇰 Slovenština</option>
              </select>
            </div>
          </div>

          {/* Styl */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-3 flex items-center gap-2">
              <Palette size={11}/> Vizuální styl
            </label>
            <div className="grid grid-cols-5 gap-2">
              {STYLE_OPTIONS.map(s => (
                <button key={s.id} onClick={()=>setSpecs(p=>({...p,style:s.id}))}
                  className={`p-2.5 rounded-xl border text-center transition-all ${specs.style===s.id?'bg-rose-500/20 border-rose-500/40 text-rose-300':'bg-white/5 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}>
                  <div className="text-[10px] font-black leading-tight">{s.label}</div>
                  <div className="text-[8px] text-gray-600 mt-0.5 leading-tight">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sekce */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-3 flex items-center gap-2">
              <Layers size={11}/> Sekce stránky
            </label>
            <div className="flex flex-wrap gap-2">
              {SECTION_OPTIONS.map(s => (
                <button key={s} onClick={()=>toggleSection(s)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${specs.sections.includes(s)?'bg-rose-500/20 border-rose-500/30 text-rose-300':'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/20'}`}>
                  {specs.sections.includes(s) ? '✓ ' : ''}{s}
                </button>
              ))}
            </div>
          </div>

          {/* Detaily */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Počet produktů (e-shop)</label>
              <input value={specs.products_count} onChange={e=>setSpecs(p=>({...p,products_count:e.target.value}))}
                placeholder="Např. 12, 50, stovky..."
                className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500/40 placeholder:text-gray-700"/>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Barvy / Brand (volitelné)</label>
              <input value={specs.colors} onChange={e=>setSpecs(p=>({...p,colors:e.target.value}))}
                placeholder="Např. #ff6b35, modrá, tmavá..."
                className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500/40 placeholder:text-gray-700"/>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Specifické požadavky</label>
            <textarea value={specs.notes} onChange={e=>setSpecs(p=>({...p,notes:e.target.value}))}
              placeholder="Vše co Designer musí vědět — logo, funkce, speciální sekce..."
              rows={3}
              className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500/40 placeholder:text-gray-700 resize-none custom-scrollbar"/>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3 shrink-0">
          <button onClick={onSkip}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            Přeskočit
          </button>
          <button onClick={()=>onConfirm(specs)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Wand2 size={13}/> Spustit Designer s těmito specifikacemi
          </button>
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
  {id:'SYSADMIN',label:'SysAdmin',icon:Terminal},{id:'DESIGNER',label:'Designer',icon:Palette},
  {id:'ARCHITEKT',label:'Architekt',icon:Box},{id:'AUDITOR',label:'Auditor',icon:ShieldAlert},
  {id:'TESTER',label:'Tester',icon:Activity},{id:'KODER',label:'Kodér',icon:FileText},
  {id:'REFLEKTOR',label:'Analytik',icon:Brain},
];
const AGENT_COLORS = {
  MANAZER:'text-yellow-400', PLANNER:'text-indigo-400', VYZKUMNIK:'text-cyan-400',
  EXPERT:'text-violet-400', SYSADMIN:'text-orange-400', DESIGNER:'text-rose-400',
  ARCHITEKT:'text-blue-400', AUDITOR:'text-red-400', TESTER:'text-green-400',
  KODER:'text-pink-400', REFLEKTOR:'text-purple-400', FINALIZER:'text-emerald-400',
  SYSTEM:'text-gray-400',
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
const ChatMessage = ({ msg, onLearn, lastUserMsg }) => {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const agentInfo = AGENTS.find(a => a.id === msg.agent);
  const AgentIcon = agentInfo?.icon || Bot;
  const agentColor = AGENT_COLORS[msg.agent] || 'text-blue-400';
  const [learnState, setLearnState] = useState('idle'); // idle | saving | saved

  if (isSystem) return (
    <div className="flex items-center gap-3 py-1 px-1 opacity-40">
      <div className="h-px flex-1 bg-white/5"/>
      <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest whitespace-nowrap">{msg.content}</span>
      <div className="h-px flex-1 bg-white/5"/>
    </div>
  );

  if (isUser) return (
    <div className="flex justify-end gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%]">
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-br-md px-4 py-3 text-sm text-blue-100/90 leading-relaxed">{msg.content}</div>
        <div className="text-[9px] text-gray-600 font-mono mt-1 text-right">{msg.time}</div>
      </div>
      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
        <User size={13} className="text-blue-400"/>
      </div>
    </div>
  );

  const handleLearn = async () => {
    if (learnState !== 'idle') return;
    setLearnState('saving');
    await onLearn({ content: msg.content, query: lastUserMsg, agent: msg.agent });
    setLearnState('saved');
  };

  const canLearn = msg.agent === 'FINALIZER' || msg.agent === 'EXPERT' || msg.agent === 'SYSADMIN' || msg.agent === 'VYZKUMNIK';

  return (
    <div className="group flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
        <AgentIcon size={13} className={agentColor}/>
      </div>
      <div className="max-w-[85%] flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          {msg.agent && (
            <span className={`text-[9px] font-black uppercase tracking-widest ${agentColor}`}>
              {agentInfo?.label || msg.agent}
            </span>
          )}
          {/* Tlačítko učení — zobrazí se po hoveru u vhodných odpovědí */}
          {canLearn && (
            <button
              onClick={handleLearn}
              title="Zapamatovat tuto odpověď do trvalé paměti"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                learnState === 'saved'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : learnState === 'saving'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 cursor-wait'
                  : 'opacity-0 group-hover:opacity-100 bg-white/5 border border-white/10 text-gray-500 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400'
              }`}
            >
              {learnState === 'saved'
                ? <><BookmarkCheck size={11}/> Uloženo</>
                : learnState === 'saving'
                ? <><div className="w-2 h-2 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin"/></>
                : <><Bookmark size={11}/> Zapamatovat</>
              }
            </button>
          )}
        </div>
        <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {msg.content}
          {msg.streaming && <span className="inline-block w-1.5 h-4 bg-blue-400 ml-1 animate-pulse rounded-sm"/>}
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
// GIT DRAWER
// =============================================================================
const FILE_STATUS_COLORS = {
  modified:  { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'M' },
  added:     { color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'A' },
  deleted:   { color: 'text-red-400',    bg: 'bg-red-500/10',    label: 'D' },
  renamed:   { color: 'text-blue-400',   bg: 'bg-blue-500/10',   label: 'R' },
  untracked: { color: 'text-gray-400',   bg: 'bg-white/5',       label: '?' },
};

const GitDrawer = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/git/status');
      if (r.ok) setStatus(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (isOpen) { load(); setResult(null); } }, [isOpen]);

  const handleCommit = async () => {
    setPushing(true); setResult(null);
    try {
      const r = await fetch('/api/git/commit', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ message: commitMsg, push: true })
      });
      const d = await r.json();
      setResult(d);
      setCommitMsg('');
      await load();
    } catch(e) { setResult({ status: 'error', steps: [{step:'network', ok:false, out: e.message}] }); }
    setPushing(false);
  };

  const handlePull = async () => {
    setPulling(true); setResult(null);
    try {
      const r = await fetch('/api/git/pull', { method: 'POST' });
      const d = await r.json();
      setResult({ status: d.status, steps: [{step:'pull', ok: d.status==='ok', out: d.out}] });
      await load();
    } catch {}
    setPulling(false);
  };

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[32rem] max-w-[95vw] bg-[#0a0f1d] border-l border-white/10 z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col`}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-xl"><GitCommit size={18} className="text-orange-400"/></div>
            <div>
              <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Git</h2>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                {status ? `větev: ${status.branch}  •  ${status.changed.length} změn` : 'Načítám...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <div className="flex items-center gap-1.5">
                {status.ahead > 0 && <span className="text-[9px] font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">↑ {status.ahead} ahead</span>}
                {status.behind > 0 && <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg">↓ {status.behind} behind</span>}
                {status.clean && <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">✓ clean</span>}
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white"><X size={17}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-3 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin"/>
              <span className="text-xs font-mono">Načítám Git status...</span>
            </div>
          ) : status ? (
            <>
              {/* Remote info */}
              {status.remote && (
                <div className="bg-white/3 rounded-xl border border-white/5 px-4 py-3 flex items-center gap-3">
                  <Globe size={13} className="text-gray-600 shrink-0"/>
                  <span className="text-[10px] font-mono text-gray-500 truncate">{status.remote.split('\t')[1]?.split(' ')[0] || status.remote}</span>
                </div>
              )}

              {/* Změněné soubory */}
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-2">
                  <FileText size={11}/> Změněné soubory ({status.changed.length})
                </div>
                {status.changed.length === 0 ? (
                  <div className="text-[11px] text-gray-600 font-mono text-center py-4">Žádné změny — repozitář je čistý ✓</div>
                ) : (
                  <div className="space-y-1">
                    {status.changed.map((f, i) => {
                      const s = FILE_STATUS_COLORS[f.status] || FILE_STATUS_COLORS.untracked;
                      return (
                        <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/5 ${s.bg}`}>
                          <span className={`text-[9px] font-black w-4 text-center ${s.color}`}>{s.label}</span>
                          <span className="text-[11px] font-mono text-gray-300 truncate">{f.file}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Commit zpráva + akce */}
              <div className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-2">
                  <GitCommit size={11}/> Commit & Push
                </div>
                <textarea
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder={`feat: popis změn\n\nPrázdné = auto zpráva s časem`}
                  rows={3}
                  className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-orange-500/40 placeholder:text-gray-700 resize-none custom-scrollbar"
                />
                <div className="flex gap-2">
                  <button onClick={handlePull} disabled={pulling || pushing}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 rounded-xl text-[10px] font-black disabled:opacity-30 transition-all">
                    {pulling ? <div className="w-3 h-3 border-2 border-blue-700 border-t-blue-400 rounded-full animate-spin"/> : <ArrowRight size={12} className="rotate-180"/>}
                    Pull
                  </button>
                  <button onClick={handleCommit} disabled={pushing || pulling || status.clean}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 text-orange-300 rounded-xl text-[10px] font-black disabled:opacity-30 transition-all">
                    {pushing ? <div className="w-3 h-3 border-2 border-orange-700 border-t-orange-400 rounded-full animate-spin"/> : <GitCommit size={13}/>}
                    {pushing ? 'Odesílám...' : 'Commit + Push'}
                  </button>
                </div>
              </div>

              {/* Výsledek operace */}
              {result && (
                <div className={`rounded-xl border p-4 space-y-2 ${result.status==='ok'?'bg-emerald-500/10 border-emerald-500/20':'bg-red-500/10 border-red-500/20'}`}>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${result.status==='ok'?'text-emerald-400':'text-red-400'}`}>
                    {result.status==='ok' ? '✅ Úspěch' : result.status==='partial' ? '⚠️ Částečně' : '❌ Chyba'}
                  </div>
                  {result.steps?.map((s, i) => (
                    <div key={i} className="text-[10px] font-mono text-gray-400">
                      <span className={s.ok?'text-emerald-400':'text-red-400'}>{s.ok?'✓':'✗'} {s.step}:</span> {s.out?.split('\n')[0]}
                    </div>
                  ))}
                </div>
              )}

              {/* Historie commitů */}
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-2">
                  <Clock size={11}/> Poslední commity
                </div>
                <div className="space-y-1">
                  {status.commits.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-white/3 rounded-xl border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60 mt-1.5 shrink-0"/>
                      <span className="text-[10px] font-mono text-gray-400 leading-relaxed">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-600 text-sm">Git není dostupný nebo repozitář není inicializovaný</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between shrink-0">
          <button onClick={load} className="text-[9px] font-mono text-orange-500/60 hover:text-orange-400 transition-colors">↻ Obnovit</button>
          <span className="text-[9px] font-mono text-gray-700">{GIT_REPO_PATH || 'SysAdmin: git status, commit, push'}</span>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// TELEMETRIE DRAWER
// =============================================================================
const AGENT_COLORS_HEX = {
  MANAZER:'#facc15', PLANNER:'#818cf8', VYZKUMNIK:'#22d3ee', EXPERT:'#a78bfa',
  SYSADMIN:'#fb923c', ARCHITEKT:'#60a5fa', AUDITOR:'#f87171', TESTER:'#4ade80',
  KODER:'#f472b6', REFLEKTOR:'#c084fc', FINALIZER:'#34d399',
};

const TelemetryDrawer = ({ isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(0);
  const [clearing, setClearing] = useState(false);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/telemetry?limit=10');
      if (r.ok) setData(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (isOpen) { load(); setSelectedTask(0); } }, [isOpen]);

  // Nakresli graf po načtení dat
  useEffect(() => {
    if (!data?.tasks?.length || !canvasRef.current) return;
    const task = data.tasks[selectedTask];
    if (!task) return;

    // Zruš předchozí instanci
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const agents = task.agents.sort((a,b) => b.input_tokens+b.output_tokens - (a.input_tokens+a.output_tokens));
    const labels = agents.map(a => a.agent_id);
    const colors = labels.map(l => AGENT_COLORS_HEX[l] || '#64748b');

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Input tokeny',
            data: agents.map(a => a.input_tokens),
            backgroundColor: colors.map(c => c + '55'),
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            label: 'Output tokeny',
            data: agents.map(a => a.output_tokens),
            backgroundColor: colors.map(c => c + '99'),
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 6,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 10, family: 'monospace' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const agent = agents[ctx.dataIndex];
                return `Cena: $${agent.cost_usd.toFixed(5)} | ${agent.duration_ms}ms`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } }, grid: { color: '#ffffff08' } },
          y: { ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } }, grid: { color: '#ffffff08' } },
        }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, selectedTask]);

  const handleClear = async () => {
    setClearing(true);
    await fetch('/api/telemetry', { method: 'DELETE' });
    setData(null); setClearing(false);
  };

  const task = data?.tasks?.[selectedTask];

  // Výstražná hranice pro cenu
  const WARN_USD = 0.05;

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[32rem] max-w-[95vw] bg-[#0a0f1d] border-l border-white/10 z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col`}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl"><BarChart2 size={18} className="text-blue-400"/></div>
            <div>
              <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Telemetrie</h2>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">Tokeny & cena per agent / úkol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white"><X size={17}/></button>
        </div>

        {/* Celkové součty */}
        {data?.totals && (
          <div className="px-6 py-4 border-b border-white/5 grid grid-cols-3 gap-3 shrink-0">
            {[
              { label: 'Celkem vstup', val: data.totals.input_tokens.toLocaleString(), icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Celkem výstup', val: data.totals.output_tokens.toLocaleString(), icon: TrendingUp, color: 'text-purple-400' },
              { label: 'Celková cena', val: `$${data.totals.cost_usd.toFixed(4)}`, icon: DollarSign,
                color: data.totals.cost_usd > WARN_USD ? 'text-red-400' : 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <s.icon size={14} className={`${s.color} mx-auto mb-1`}/>
                <div className={`text-sm font-black ${s.color}`}>{s.val}</div>
                <div className="text-[9px] text-gray-600 font-mono mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Výběr úkolu */}
        {data?.tasks?.length > 0 && (
          <div className="px-6 py-3 border-b border-white/5 shrink-0">
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Výběr úkolu</div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {data.tasks.map((t, i) => (
                <button key={t.task_id} onClick={() => setSelectedTask(i)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-black transition-all border ${i===selectedTask?'bg-blue-500/20 border-blue-500/40 text-blue-300':'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'}`}>
                  <div>#{i+1}</div>
                  <div className="text-[8px] font-mono opacity-60 mt-0.5">${t.total_cost.toFixed(4)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-3 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
              <span className="text-xs font-mono">Načítám data...</span>
            </div>
          ) : !data?.tasks?.length ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
              <div className="p-4 bg-white/5 rounded-2xl"><BarChart2 size={28} className="text-gray-700"/></div>
              <div>
                <p className="text-sm font-bold text-gray-500">Žádná telemetrie</p>
                <p className="text-[10px] text-gray-700 mt-1">Data se začnou shromažďovat<br/>od příštího úkolu</p>
              </div>
            </div>
          ) : task ? (
            <>
              {/* Graf */}
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-2">
                  <BarChart2 size={11}/> Distribuce tokenů — Úkol #{selectedTask+1}
                </div>
                <div style={{height: '180px'}}>
                  <canvas ref={canvasRef}/>
                </div>
              </div>

              {/* Souhrn úkolu */}
              <div className="bg-white/3 rounded-2xl border border-white/5 p-4 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600 font-mono">Model</span>
                  <span className="text-gray-300 font-bold">{task.model}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600 font-mono">Celkem tokenů</span>
                  <span className="text-gray-300 font-bold">{(task.total_input+task.total_output).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600 font-mono">Celková cena</span>
                  <span className={`font-black ${task.total_cost > WARN_USD ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${task.total_cost.toFixed(5)}
                    {task.total_cost > WARN_USD && <AlertTriangle size={10} className="inline ml-1"/>}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600 font-mono">Celková doba</span>
                  <span className="text-gray-300 font-bold">{(task.total_ms/1000).toFixed(1)}s</span>
                </div>
              </div>

              {/* Tabulka agentů */}
              <div className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-600">
                  Detail per agent
                </div>
                <div className="divide-y divide-white/5">
                  {task.agents
                    .sort((a,b) => b.input_tokens+b.output_tokens - (a.input_tokens+a.output_tokens))
                    .map(a => {
                      const color = AGENT_COLORS_HEX[a.agent_id] || '#64748b';
                      const total = a.input_tokens + a.output_tokens;
                      const taskTotal = task.total_input + task.total_output || 1;
                      const pct = Math.round(total / taskTotal * 100);
                      return (
                        <div key={a.agent_id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black" style={{color}}>{a.agent_id}</span>
                            <div className="flex items-center gap-3 text-[9px] font-mono">
                              <span className="text-gray-500">{total.toLocaleString()} tok.</span>
                              <span className="text-emerald-400 font-bold">${a.cost_usd.toFixed(5)}</span>
                              <span className="text-gray-600">{a.duration_ms}ms</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{width:`${pct}%`, backgroundColor: color + 'aa'}}/>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between shrink-0">
          <button onClick={load} className="text-[9px] font-mono text-blue-500/60 hover:text-blue-400 transition-colors">↻ Obnovit</button>
          <button onClick={handleClear} disabled={clearing || !data?.tasks?.length}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-400 disabled:opacity-20 transition-colors">
            <Trash2 size={11}/> {clearing ? 'Mazání...' : 'Smazat vše'}
          </button>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// PAMĚŤ DRAWER — co se systém naučil
// =============================================================================
const MemoryDrawer = ({ isOpen, onClose, memoryCount, onCountChange }) => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/memory');
      if (r.ok) {
        const data = await r.json();
        setMemories(data);
        onCountChange(data.length);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (isOpen) loadMemories(); }, [isOpen]);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      setMemories(prev => {
        const updated = prev.filter(m => m.id !== id);
        onCountChange(updated.length);
        return updated;
      });
    } catch {}
    setDeleting(null);
  };

  const TYPE_STYLES = {
    golden_rule: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Zlaté pravidlo', icon: Lightbulb },
    reflection:  { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Reflexe', icon: Brain },
    user_learn:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Naučeno', icon: BookmarkCheck },
  };

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[28rem] max-w-[95vw] bg-[#0a0f1d] border-l border-white/10 z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><BookOpen size={18} className="text-emerald-400"/></div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Trvalá paměť</h2>
                <p className="text-[9px] text-gray-500 font-mono mt-0.5">{memories.length} záznamů v ChromaDB</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white"><X size={17}/></button>
          </div>

          {/* Legenda typů */}
          <div className="flex flex-wrap gap-2">
            {Object.values(TYPE_STYLES).map(t => (
              <div key={t.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.bg} border ${t.border} ${t.color}`}>
                <t.icon size={10}/> {t.label}
              </div>
            ))}
          </div>

          {/* Seznam */}
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-3 text-gray-600">
                <div className="w-4 h-4 border-2 border-gray-700 border-t-emerald-500 rounded-full animate-spin"/>
                <span className="text-xs font-mono">Načítám paměť...</span>
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <div className="p-4 bg-white/5 rounded-2xl"><BookOpen size={28} className="text-gray-700"/></div>
                <div>
                  <p className="text-sm font-bold text-gray-500">Paměť je prázdná</p>
                  <p className="text-[10px] text-gray-700 mt-1 leading-relaxed">Najeď na odpověď agenta<br/>a klikni na <span className="text-emerald-500">Zapamatovat</span></p>
                </div>
              </div>
            ) : memories.map(mem => {
              const typeKey = mem.type === 'rule' ? 'reflection' : mem.type || 'user_learn';
              const style = TYPE_STYLES[typeKey] || TYPE_STYLES.user_learn;
              const TypeIcon = style.icon;
              return (
                <div key={mem.id} className={`group p-4 rounded-2xl border ${style.bg} ${style.border} relative transition-all hover:brightness-110`}>
                  {/* Typ badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${style.color}`}>
                      <TypeIcon size={10}/> {style.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[9px] font-mono text-gray-600">
                        <Clock size={9}/> {mem.date ? new Date(mem.date).toLocaleDateString('cs-CZ') : '—'}
                      </div>
                      <button
                        onClick={() => handleDelete(mem.id)}
                        disabled={deleting === mem.id}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-gray-600 hover:text-red-400 rounded-lg transition-all"
                      >
                        {deleting === mem.id
                          ? <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin"/>
                          : <Trash2 size={11}/>
                        }
                      </button>
                    </div>
                  </div>
                  {/* Obsah */}
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-4 whitespace-pre-wrap">{mem.content}</p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {memories.length > 0 && (
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-gray-600">
              <span>ChromaDB · {memories.length} vektorů</span>
              <button onClick={loadMemories} className="text-emerald-500/60 hover:text-emerald-400 transition-colors">↻ Obnovit</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// =============================================================================
// HLAVNÍ APLIKACE
// =============================================================================
export default function App() {
  const [input, setInput] = useState("");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGitOpen, setIsGitOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
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
  const lastUserMsgRef = useRef(""); // sleduje poslední dotaz uživatele
  const nextId = () => msgIdRef.current++;

  // Načti Chart.js dynamicky
  useEffect(() => {
    if (window.Chart) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    document.head.appendChild(s);
  }, []);

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

  // Uložení konkrétní chat bubliny do trvalé paměti
  const handleLearnMessage = async ({ content, query, agent }) => {
    try {
      const r = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || lastUserMsgRef.current || "—",
          code: content,
          type: 'user_learn',
          agent: agent || 'FINALIZER',
        })
      });
      if (r.ok) {
        setMemoryCount(prev => prev + 1);
        addMessage({ role: 'system', content: '🧠 Odpověď uložena do trvalé paměti' });
      }
    } catch {}
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

  const isWebTask = (msg) => WEB_TRIGGER_WORDS.some(w => msg.toLowerCase().includes(w));

  const executeTask = async (msg, projectSpecs = null) => {
    if (!msg && attachments.length===0) return;
    if (msg.toLowerCase().trim()==='tohle se nauč') { handleLearn(); return; }

    // Intake formulář — detekuj webový projekt a zeptej se na specifika
    if (isWebTask(msg) && !projectSpecs) {
      setPendingMessage(msg);
      setIntakeOpen(true);
      return;
    }

    setMobileTab('chat');
    addMessage({role:'user', content: msg + (projectSpecs ? '\n\n📋 Specifikace předány Designerovi.' : '')});
    lastUserMsgRef.current = msg;
    setProjectPlan([]); setCurrentPlanStep(-1);
    setIsProcessing(true); setActiveAgent("MANAZER");
    abortControllerRef.current = new AbortController();
    const filesToUpload = attachments.map(a=>({name:a.name,type:a.type,mime:a.mime,data:a.data}));
    setAttachments([]);

    try {
      const response = await fetch('/api/chat',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message: msg, files: filesToUpload,
          model_id: activeModel,
          project_specs: projectSpecs || {},
        }),
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
            else if(data.type==='info'){ addMessage({role:'system', content: data.message}); }
            else if(data.type==='files_processed'){ addMessage({role:'system', content: `📎 ${data.summary}`}); }
            else if(data.type==='progress'){ const id=data.node.toUpperCase(); setActiveAgent(id); if(!agentsSeen.includes(id)){agentsSeen.push(id);const a=AGENTS.find(x=>x.id===id);if(a)addMessage({role:'system',content:`→ ${a.label}`});} }
            else if(data.type==='final'){
              setActiveAgent(null);
              addMessage({role:'ai',agent:'FINALIZER',content:data.response});
              if(data.code){
                setCode(data.code); setCodeLang(data.lang||'python');
                addMessage({role:'system',content:`💾 Kód (${LANG_LABELS[data.lang]||data.lang}) uložen do editoru`});
                // Auto-zapni preview pokud je HTML
                if(data.lang === 'html') {
                  setShowPreview(true);
                  setMobileTab('code');
                  addMessage({role:'system',content:'👁️ Live preview zapnut — přepni na záložku Kód/Preview'});
                }
              }
              setTaskHistory(prev=>[{query:msg,response:data.response,code:data.code,date:data.date||new Date().toLocaleTimeString(),model:data.model,hasCode:!!data.code},...prev]);
            } else if(data.type==='error'){ addMessage({role:'system',content:`❌ ${data.message}`}); }
          } catch {}
        }
      }
    } catch(e) {
      if(e.name!=='AbortError') addMessage({role:'system',content:'❌ Kritická chyba komunikace.'});
    } finally { setIsProcessing(false); setActiveAgent(null); }
  };

  // ZIP export
  const handleZipExport = async () => {
    if (!code || codeLang !== 'html') return;
    addMessage({role:'system', content:'📦 Generuji ZIP archiv projektu...'});
    try {
      const r = await fetch('/api/export-zip', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({html: code, project_name: 'web-projekt'})
      });
      const d = await r.json();
      if(d.status==='ok') {
        // Trigger download
        const bytes = atob(d.data);
        const ab = new ArrayBuffer(bytes.length);
        const ua = new Uint8Array(ab);
        for(let i=0;i<bytes.length;i++) ua[i]=bytes.charCodeAt(i);
        const blob = new Blob([ab], {type:'application/zip'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download=d.filename; a.click();
        URL.revokeObjectURL(url);
        addMessage({role:'system', content:`✅ ZIP stažen: ${d.filename} (${d.size_kb}KB) — ${d.files.join(', ')}`});
      }
    } catch { addMessage({role:'system', content:'❌ Chyba při generování ZIP'}); }
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="min-h-screen bg-[#070b15] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10 pointer-events-none"/>

      {/* HEADER */}
      <header className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-sm z-30">
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
          {/* Telemetrie */}
          <button onClick={()=>setIsTelemetryOpen(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-all" title="Telemetrie — tokeny & cena">
            <BarChart2 size={15} className="text-blue-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 hidden lg:block">Telemetrie</span>
          </button>
          {/* Paměť */}
          <button onClick={()=>setIsMemoryOpen(true)} className="relative flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all" title="Trvalá paměť systému">
            <BookOpen size={15} className="text-emerald-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 hidden lg:block">Paměť</span>
            {memoryCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-lg">
                {memoryCount > 99 ? '99+' : memoryCount}
              </span>
            )}
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
      <GitDrawer isOpen={isGitOpen} onClose={()=>setIsGitOpen(false)}/>
      <TelemetryDrawer isOpen={isTelemetryOpen} onClose={()=>setIsTelemetryOpen(false)}/>
      <MemoryDrawer isOpen={isMemoryOpen} onClose={()=>setIsMemoryOpen(false)} memoryCount={memoryCount} onCountChange={setMemoryCount}/>

      {/* INTAKE MODAL */}
      <IntakeModal
        isOpen={intakeOpen}
        initialMessage={pendingMessage}
        onConfirm={(specs) => {
          setIntakeOpen(false);
          const msg = pendingMessage;
          setPendingMessage('');
          executeTask(msg, specs);
        }}
        onSkip={() => {
          setIntakeOpen(false);
          const msg = pendingMessage;
          setPendingMessage('');
          executeTask(msg, {});
        }}
      />
      <LibraryDrawer isOpen={isLibraryOpen} onClose={()=>setIsLibraryOpen(false)} onIndex={()=>indexInputRef.current?.click()}/>
      <HistoryDrawer isOpen={isHistoryOpen} onClose={()=>setIsHistoryOpen(false)} history={taskHistory}
        onLoadTask={t=>{setCode(t.code||"");setCodeLang('python');addMessage({role:'system',content:`📂 Obnoven: ${t.query}`.substring(0,60)});}}/>
      <input type="file" ref={indexInputRef} className="hidden"/>
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={e=>handleFileSelect(e,'image')}/>
      <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.py,.js,.ts,.jsx,.tsx,.json,.yaml,.yml,.md,.txt,.sh,.bash,.html,.css,.csv,.xml,.env,.toml,.ini,.cfg,.conf,.log" onChange={e=>handleFileSelect(e,'file')}/>

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
              {chatMessages.map(msg=>(
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  onLearn={handleLearnMessage}
                  lastUserMsg={lastUserMsgRef.current}
                />
              ))}
              {isProcessing && activeAgent && <ThinkingIndicator activeAgent={activeAgent}/>}
              <div ref={chatEndRef}/>
            </div>
          </div>

          {/* PŘÍLOHY */}
          {attachments.length>0 && (
            <div className="flex flex-wrap gap-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {attachments.map(file=>{
                const isPdf = file.mime==='application/pdf' || file.name.endsWith('.pdf');
                const isImg = file.type==='image';
                const isCode = /\.(py|js|ts|jsx|tsx|sh|bash|html|css|json|yaml|yml|md)$/.test(file.name);
                const badgeColor = isImg ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  : isPdf ? 'text-red-400 bg-red-500/10 border-red-500/20'
                  : isCode ? 'text-green-400 bg-green-500/10 border-green-500/20'
                  : 'text-gray-400 bg-white/5 border-white/10';
                const badgeLabel = isImg ? 'IMG' : isPdf ? 'PDF' : isCode ? 'KÓD' : 'FILE';
                return (
                  <div key={file.id} className="group bg-[#0a0f1d] border border-white/10 rounded-xl p-2 flex items-center gap-2 hover:border-white/20 transition-all">
                    {isImg && file.preview
                      ? <img src={file.preview} alt="" className="w-8 h-8 rounded-lg object-cover"/>
                      : <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-[9px] font-black ${badgeColor}`}>{badgeLabel}</div>
                    }
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-mono text-gray-300 max-w-[80px] truncate">{file.name}</span>
                      <span className={`text-[8px] font-black uppercase ${badgeColor.split(' ')[0]}`}>{badgeLabel}</span>
                    </div>
                    <button onClick={()=>removeAttachment(file.id)} className="text-gray-700 hover:text-red-400 ml-1"><X size={11}/></button>
                  </div>
                );
              })}
              {/* Tlačítko rychlé analýzy */}
              <button
                onClick={async () => {
                  if (attachments.length === 0 || isProcessing) return;
                  const filesToAnalyze = attachments.map(a=>({name:a.name,type:a.type,mime:a.mime,data:a.data}));
                  addMessage({role:'system', content:`🔍 Spouštím rychlou analýzu: ${attachments.map(a=>a.name).join(', ')}`});
                  setIsProcessing(true); setActiveAgent('EXPERT');
                  try {
                    const r = await fetch('/api/analyze', {
                      method:'POST', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({files: filesToAnalyze, question: input || 'Analyzuj tento soubor podrobně.', model_id: activeModel})
                    });
                    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf='';
                    while(true) {
                      const {done,value} = await reader.read(); if(done) break;
                      const lines = (buf+dec.decode(value)).split('\n'); buf=lines.pop();
                      for(const line of lines) {
                        if(!line.trim()) continue;
                        try {
                          const d = JSON.parse(line);
                          if(d.type==='analysis_complete') {
                            addMessage({role:'ai', agent:'EXPERT', content:d.result});
                          } else if(d.type==='error') {
                            addMessage({role:'system', content:`❌ ${d.message}`});
                          }
                        } catch {}
                      }
                    }
                  } catch { addMessage({role:'system', content:'❌ Chyba analýzy'}); }
                  finally { setIsProcessing(false); setActiveAgent(null); }
                }}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
              >
                <Brain size={12}/> Analyzovat
              </button>
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

        {/* PRAVÝ SLOUPEC — EDITOR + PREVIEW */}
        <div className={`flex flex-col bg-[#0a0f1d] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl h-full ${mobileTab!=='code'?'hidden lg:flex':'flex'}`}>
          {/* Toolbar */}
          <div className="px-5 py-3.5 bg-[#0d1426] flex items-center justify-between border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
              <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">output_workspace</span>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/5 ${LANG_COLORS[codeLang]||'text-blue-400'}`}>
                {LANG_LABELS[codeLang]||codeLang}
              </span>
              {/* Code/Preview přepínač — pouze pro HTML */}
              {codeLang === 'html' && (
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                  <button onClick={()=>setShowPreview(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black transition-all ${!showPreview?'bg-blue-600/30 text-blue-300':'text-gray-600 hover:text-gray-400'}`}>
                    <Code size={10}/> Kód
                  </button>
                  <button onClick={()=>setShowPreview(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black transition-all ${showPreview?'bg-emerald-600/30 text-emerald-300':'text-gray-600 hover:text-gray-400'}`}>
                    <Monitor size={10}/> Preview
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={()=>setIsGitOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 text-[10px] font-black">
                <GitCommit size={13}/><span className="hidden xl:block">Git</span>
              </button>
              {/* ZIP export — jen pro HTML */}
              {codeLang === 'html' && code && (
                <button onClick={handleZipExport}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 text-[10px] font-black"
                  title="Stáhnout jako ZIP archiv (index.html + style.css + script.js + README)">
                  <Package size={13}/><span className="hidden xl:block">ZIP</span>
                </button>
              )}
              <button onClick={handleCopy} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl" title="Kopírovat">
                {isCopied?<Check size={14} className="text-green-400"/>:<Copy size={14}/>}
              </button>
              <button onClick={()=>{const b=new Blob([code],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`solution.${codeLang==='python'?'py':codeLang==='bash'?'sh':codeLang}`;a.click();}}
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl" title="Stáhnout soubor">
                <Download size={14}/>
              </button>
              <button onClick={()=>executeTask("Proveď re-audit aktuálního kódu a oprav případné chyby.")}
                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 text-[10px] font-black active:scale-95">
                <RotateCcw size={13}/> Re-Audit
              </button>
            </div>
          </div>

          {/* Obsah: Editor nebo iframe Preview */}
          {showPreview && codeLang === 'html' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Preview toolbar */}
              <div className="px-4 py-2 bg-emerald-900/20 border-b border-emerald-500/10 flex items-center gap-2 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Live HTML Preview</span>
                <span className="text-[9px] text-gray-700 ml-auto font-mono">sandbox — žádný internet</span>
              </div>
              <iframe
                key={code}
                srcDoc={code}
                className="flex-1 w-full bg-white"
                sandbox="allow-scripts allow-same-origin"
                title="HTML Preview"
              />
            </div>
          ) : (
            <CodeEditor code={code} lang={codeLang}/>
          )}

          {/* Status bar */}
          <div className="px-5 py-2.5 bg-[#0d1426]/50 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-gray-600 shrink-0">
            <div className="flex items-center gap-3">
              <span>UTF-8</span>
              <span className={LANG_COLORS[codeLang]||'text-blue-400/50'}>{LANG_LABELS[codeLang]||codeLang}</span>
              <span className="text-blue-500/40">LSP: Connected</span>
              {showPreview && codeLang==='html' && <span className="text-emerald-500/40 flex items-center gap-1"><Monitor size={8}/> PREVIEW</span>}
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
