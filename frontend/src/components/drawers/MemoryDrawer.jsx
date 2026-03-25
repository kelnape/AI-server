import React, { useState, useEffect } from 'react';
import { BookOpen, X, Clock, Trash2, Lightbulb, Brain, BookmarkCheck } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { Overlay } from '../common/Overlay';

const TYPE_STYLES = {
  golden_rule: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Zlaté pravidlo', icon: Lightbulb },
  reflection:  { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Reflexe', icon: Brain },
  user_learn:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Naučeno', icon: BookmarkCheck },
};

export const MemoryDrawer = ({ isOpen, onClose, memoryCount, onCountChange }) => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/memory');
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
      await apiFetch(`/api/memory/${id}`, { method: 'DELETE' });
      setMemories(prev => {
        const updated = prev.filter(m => m.id !== id);
        onCountChange(updated.length);
        return updated;
      });
    } catch {}
    setDeleting(null);
  };

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[28rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><BookOpen size={18} className="text-emerald-400"/></div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Trvalá paměť</h2>
                <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">{memories.length} záznamů v ChromaDB</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white"><X size={17}/></button>
          </div>

          {/* Legenda typů */}
          <div className="flex flex-wrap gap-2">
            {Object.values(TYPE_STYLES).map(t => (
              <div key={t.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.bg} border ${t.border} ${t.color}`}>
                <t.icon size={10}/> {t.label}
              </div>
            ))}
          </div>

          {/* Seznam pamětí */}
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-3 theme-text-xs-cls">
                <div className="w-4 h-4 border-2 border-gray-700 border-t-emerald-500 rounded-full animate-spin"/>
                <span className="text-xs font-mono">Načítám paměť...</span>
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <div className="p-4 bg-white/5 rounded-2xl"><BookOpen size={28} className="text-gray-700"/></div>
                <div>
                  <p className="text-sm font-bold theme-text-sm-cls">Paměť je prázdná</p>
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
                      <div className="flex items-center gap-1 text-[9px] font-mono theme-text-xs-cls">
                        <Clock size={9}/> {mem.date ? new Date(mem.date).toLocaleDateString('cs-CZ') : '—'}
                      </div>
                      <button
                        onClick={() => handleDelete(mem.id)}
                        disabled={deleting === mem.id}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 theme-text-xs-cls hover:text-red-400 rounded-lg transition-all"
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
            <div className="pt-3 border-t theme-border-cls flex items-center justify-between text-[9px] font-mono theme-text-xs-cls">
              <span>ChromaDB · {memories.length} vektorů</span>
              <button onClick={loadMemories} className="text-emerald-500/60 hover:text-emerald-400 transition-colors">↻ Obnovit</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
