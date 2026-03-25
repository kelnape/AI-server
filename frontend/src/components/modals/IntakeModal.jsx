import React, { useState, useEffect } from 'react';
import { Wand2, X, Database, Eye, SigmaSquare, FileBarChart, Layers3 } from 'lucide-react';

export const IntakeModal = ({ isOpen, initialMessage, onConfirm, onSkip }) => {
  const [specs, setSpecs] = useState({
    name: '',
    description: '',
  });

  // Když se modal otevře, vložíme do popisu zprávu z chatu
  useEffect(() => {
    if (isOpen && initialMessage) {
      setSpecs(p => ({ ...p, description: initialMessage }));
    }
  }, [isOpen, initialMessage]);

  const [selectedModules, setSelectedModules] = useState({
    NAVIGATOR: false,
    VIEW: false,
    ANALYSIS: false,
    REPORT: false
  });

  const handleToggle = (mod) => {
    setSelectedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  const handleConfirm = () => {
    const activeModules = Object.keys(selectedModules).filter(k => selectedModules[k]);
    onConfirm({
      ...specs,
      project_type: 'diadem_vbs',
      diadem_modules: activeModules
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="theme-card-bg border theme-border-cls rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b theme-border-cls flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl"><Layers3 size={18} className="text-blue-400"/></div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white">DIAdem Projekt — Intake</h2>
              <p className="text-[10px] theme-text-sm-cls font-mono mt-0.5">Zadej specifika → Expert dostane přesné instrukce</p>
            </div>
          </div>
          <button onClick={onSkip} className="p-2 hover:bg-white/5 rounded-xl theme-text-sm-cls hover:text-white" title="Přeskočit a spustit bez specifikací"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {/* Základní info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest theme-text-sm-cls block mb-2">Název / Účel skriptu</label>
              <input value={specs.name} onChange={e=>setSpecs(p=>({...p,name:e.target.value}))}
                placeholder="Např. Analýza motoru, Dávkové zpracování..."
                className="w-full theme-input-bg border theme-border-cls rounded-xl px-3 py-2.5 text-sm theme-text-cls focus:outline-none focus:border-blue-500/40 theme-placeholder"/>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest theme-text-sm-cls block mb-2">Podrobný popis úkolu</label>
              <textarea value={specs.description} onChange={e=>setSpecs(p=>({...p,description:e.target.value}))}
                placeholder="Popiš detailně, co má skript v DIAdemu dělat..."
                rows={4}
                className="w-full theme-input-bg border theme-border-cls rounded-xl px-3 py-2.5 text-sm theme-text-cls focus:outline-none focus:border-blue-500/40 theme-placeholder resize-none custom-scrollbar"/>
            </div>
          </div>

          {/* Výběr DIAdem modulů */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest theme-text-sm-cls block mb-3 flex items-center gap-2">
              <Layers3 size={11}/> Zapojené DIAdem Moduly
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'NAVIGATOR', name: 'NAVIGATOR', desc: 'Načtení/Správa dat', icon: Database },
                { id: 'VIEW', name: 'VIEW', desc: 'Zobrazení/Inspekce', icon: Eye },
                { id: 'ANALYSIS', name: 'ANALYSIS', desc: 'Matematika/Výpočty', icon: SigmaSquare },
                { id: 'REPORT', name: 'REPORT', desc: 'Generování PDF', icon: FileBarChart },
              ].map(mod => (
                <button key={mod.id} onClick={() => handleToggle(mod.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left w-full ${selectedModules[mod.id] ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 theme-border-cls text-gray-400 hover:border-white/20'}`}>
                  <div className={`mt-0.5 p-1.5 rounded-lg ${selectedModules[mod.id] ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-500'}`}>
                    <mod.icon size={16} />
                  </div>
                  <div>
                    <span className={`block text-[11px] font-black uppercase tracking-wider ${selectedModules[mod.id] ? 'text-white' : 'text-gray-300'}`}>{mod.name}</span>
                    <span className="block text-[9px] theme-text-sm-cls">{mod.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t theme-border-cls flex items-center gap-3 shrink-0">
          <button onClick={onSkip}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border theme-border-cls text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            Přeskočit
          </button>
          <button onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Wand2 size={13}/> Spustit Experta s těmito specifikacemi
          </button>
        </div>
      </div>
    </div>
  );
};