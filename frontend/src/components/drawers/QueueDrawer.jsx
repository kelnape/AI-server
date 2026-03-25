import React, { useState, useEffect } from 'react';
import { ListChecks, X, ArrowRight, Trash2, ChevronDown } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { Overlay } from '../common/Overlay';

const STATUS_STYLES = {
  pending:  { color:'text-amber-400',  bg:'bg-amber-500/10',  label:'Čeká',      dot:'bg-amber-400' },
  running:  { color:'text-blue-400',   bg:'bg-blue-500/10',   label:'Běží',      dot:'bg-blue-400 animate-pulse' },
  done:     { color:'text-emerald-400',bg:'bg-emerald-500/10',label:'Hotovo',    dot:'bg-emerald-400' },
  failed:   { color:'text-red-400',    bg:'bg-red-500/10',    label:'Selhalo',   dot:'bg-red-400' },
};

export const QueueDrawer = ({ isOpen, onClose, onAddTask }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await apiFetch('/api/queue'); if(r.ok) setTasks(await r.json()); } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    load();
    const i = setInterval(load, 4000);
    return () => clearInterval(i);
  }, [isOpen]);

  const handleAdd = async () => {
    if (!input.trim() || adding) return;
    setAdding(true);
    await onAddTask(input.trim());
    setInput('');
    setAdding(false);
    setTimeout(load, 800);
  };

  const handleDelete = async (id) => {
    await apiFetch(`/api/queue/${id}`, { method: 'DELETE' });
    load();
  };

  const pending = tasks.filter(t=>t.status==='pending').length;
  const running = tasks.filter(t=>t.status==='running').length;

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[32rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.3)] flex flex-col`}>

        {/* Header */}
        <div className="px-6 py-5 border-b theme-border-cls flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl"><ListChecks size={18} className="text-violet-400"/></div>
            <div>
              <h2 className="text-base font-black tracking-tighter uppercase italic" style={{color:'var(--text-primary)'}}>Fronta úkolů</h2>
              <p className="text-[9px] font-mono mt-0.5" style={{color:'var(--text-muted)'}}>
                {pending} čeká · {running} běží · {tasks.length} celkem
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full" style={{color:'var(--text-muted)'}}><X size={17}/></button>
        </div>

        {/* Input pro nový úkol */}
        <div className="px-6 py-4 border-b theme-border-cls shrink-0">
          <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{color:'var(--text-muted)'}}>Přidat do fronty</div>
          <div className="flex gap-2">
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              placeholder="Popis úkolu — agent ho zpracuje automaticky..."
              rows={2}
              className="flex-1 theme-input rounded-xl px-3 py-2 text-[12px] font-mono resize-none focus:outline-none custom-scrollbar"
              style={{background:'var(--bg-input)', color:'var(--text-primary)', borderColor:'var(--border)', border:'0.5px solid'}}
              onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) handleAdd(); }}
            />
            <button onClick={handleAdd} disabled={adding||!input.trim()}
              className="px-4 py-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/25 text-violet-300 rounded-xl text-[10px] font-black disabled:opacity-30 transition-all self-stretch flex items-center gap-1.5">
              {adding ? <div className="w-3 h-3 border-2 border-violet-700 border-t-violet-400 rounded-full animate-spin"/> : <><ArrowRight size={13}/>Přidat</>}
            </button>
          </div>
          <p className="text-[9px] mt-1.5" style={{color:'var(--text-muted)'}}>Ctrl+Enter pro rychlé přidání</p>
        </div>

        {/* Seznam úkolů */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-2">
          {loading && tasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 gap-2" style={{color:'var(--text-muted)'}}>
              <div className="w-4 h-4 border-2 border-gray-700 border-t-violet-500 rounded-full animate-spin"/>
              <span className="text-xs font-mono">Načítám frontu...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <ListChecks size={28} className="mx-auto mb-3 opacity-20" style={{color:'var(--text-muted)'}}/>
              <p className="text-sm" style={{color:'var(--text-muted)'}}>Fronta je prázdná</p>
              <p className="text-[10px] mt-1" style={{color:'var(--text-muted)'}}>Přidej úkoly výše — zpracují se postupně</p>
            </div>
          ) : tasks.map(t => {
            const st = STATUS_STYLES[t.status] || STATUS_STYLES.pending;
            const isExp = expanded === t.id;
            return (
              <div key={t.id} className="rounded-2xl border overflow-hidden" style={{borderColor:'var(--border)', background:'var(--bg-card)'}}>
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={()=>setExpanded(isExp?null:t.id)}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono truncate" style={{color:'var(--text-primary)'}}>{t.message}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-black uppercase ${st.color}`}>{st.label}</span>
                      {t.quality_score && <span className="text-[9px]" style={{color:'var(--text-muted)'}}>★ {t.quality_score}/10</span>}
                      {t.finished_at && <span className="text-[9px] font-mono" style={{color:'var(--text-muted)'}}>{new Date(t.finished_at).toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.status === 'pending' && (
                      <button onClick={e=>{e.stopPropagation();handleDelete(t.id);}} className="p-1 hover:text-red-400 transition-colors" style={{color:'var(--text-muted)'}}>
                        <Trash2 size={12}/>
                      </button>
                    )}
                    <ChevronDown size={13} style={{color:'var(--text-muted)', transform:isExp?'rotate(180deg)':'', transition:'transform 0.2s'}}/>
                  </div>
                </div>
                {isExp && t.result && (
                  <div className="px-4 pb-3 border-t theme-border-cls pt-3">
                    <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{color:'var(--text-muted)'}}>Výsledek</div>
                    <div className="text-[11px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar" style={{color:'var(--text-secondary)'}}>
                      {t.result.slice(0, 400)}{t.result.length > 400 ? '...' : ''}
                    </div>
                    {t.code && <div className="mt-2 text-[9px] font-black text-emerald-400">💾 Kód ({t.lang}) vygenerován</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t theme-border-cls flex items-center justify-between shrink-0">
          <button onClick={load} className="text-[9px] font-mono transition-colors" style={{color:'var(--text-muted)'}}>↻ Obnovit</button>
          <span className="text-[9px] font-mono" style={{color:'var(--text-muted)'}}>Ctrl+Enter = přidat rychle</span>
        </div>
      </div>
    </>
  );
};
