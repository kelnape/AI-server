import React, { useState, useEffect } from 'react';
import { 
  X, FileCode, Bug, RefreshCw, FileText, Rocket, Shield, 
  Zap, Plus, Trash2, Star, Copy, Play, Search, Tag,
  Code, Database, Globe, Terminal, Layout, Cpu, BookOpen
} from 'lucide-react';
import { Overlay } from '../common/Overlay';

const diademTemplates = [
  {
    id: 'diadem-batch',
    category: 'DIAdem VBScript',
    title: '📂 Dávkové zpracování (Batch Process)',
    description: 'Projít složku s TDMS soubory, načíst, analyzovat a uložit.',
    prompt: `Experte, napiš DIAdem VBScript pro dávkové zpracování (Batch Processing). 
Skript musí:
1. Zobrazit dialog pro výběr složky (Folder Selection).
2. Projít všechny .tdms soubory ve vybrané složce.
3. Pro každý soubor: vyčistit Data Portal, načíst soubor přes NAVIGATOR, najít maximální hodnotu v kanálu 'Speed' ve skupině 'SensorData'.
4. Tuto maximální hodnotu zapsat jako Custom Property (vlastnost) na úroveň Rootu Data Portalu.
5. Uložit modifikovaný soubor zpět a pokračovat dalším.
Nezapomeň na 'Option Explicit' a ošetření chyb.`
  },
  {
    id: 'diadem-report',
    category: 'DIAdem VBScript',
    title: '📊 Automatizace Reportu',
    description: 'Vytvořit 2D graf v REPORT modulu a exportovat do PDF.',
    prompt: `Experte, vytvoř VBScript pro automatizaci modulu REPORT v DIAdemu.
Skript musí:
1. Vymazat aktuální rozvržení (Layout) v REPORTu.
2. Přidat nový 2D Axis System přes celý list.
3. Na osu X přiřadit kanál 'Time' ze skupiny 'Group1' a na osu Y kanál 'Temperature'.
4. Nastavit titulek grafu na 'Teplotní profil'.
5. Zkontrolovat, zda složka existuje, a exportovat tento report jako PDF (jméno PDF ať odpovídá jménu aktuálního Rootu v Data Portalu) do složky "C:\\Temp\\Reports\\".
Použij moderní objektový přístup k REPORTu.`
  },
  {
    id: 'diadem-math',
    category: 'DIAdem VBScript',
    title: '🧮 Analýza dat a Matematika',
    description: 'Výpočty nad kanály (ChnCalculate) s kontrolou existence.',
    prompt: `Experte, potřebuji DIAdem VBScript, který provede matematickou operaci v Data Portalu.
Skript musí:
1. Zkontrolovat, zda existují kanály 'Voltage' a 'Current' ve skupině 'RawData' (použij metodu Exists).
2. Pokud neexistují, vypsat do Logfile upozornění a skript ukončit.
3. Pokud existují, vytvořit novou skupinu 'Results' (pokud už neexistuje).
4. Spočítat nový kanál 'Power' jako součin Voltage * Current pomocí příkazu Calculate (nebo ChnCalculate).
5. Na nově vytvořený kanál nastavit jednotku 'W' a popis 'Vypočítaný výkon'.`
  }
];

// Výchozí systémové šablony
const DEFAULT_TEMPLATES = [
  {
    id: 'code-review',
    name: 'Code Review',
    category: 'Vývoj',
    icon: 'FileCode',
    color: '#3b82f6',
    prompt: 'Proveď code review následujícího kódu. Zaměř se na:\n1. Čitelnost a strukturu\n2. Potenciální bugy\n3. Výkon a optimalizace\n4. Best practices\n5. Bezpečnostní rizika\n\nKód:\n```\n[VLOŽ KÓD]\n```',
    isSystem: true,
  },
  {
    id: 'debug',
    name: 'Debug & Fix',
    category: 'Vývoj',
    icon: 'Bug',
    color: '#ef4444',
    prompt: 'Mám problém s tímto kódem - nefunguje správně.\n\nPopis problému:\n[POPIŠ CO SE DĚJE vs CO BY SE MĚLO DÍT]\n\nKód:\n```\n[VLOŽ KÓD]\n```\n\nChybová hláška (pokud existuje):\n```\n[VLOŽ CHYBU]\n```\n\nNajdi příčinu a navrhni opravu.',
    isSystem: true,
  },
  {
    id: 'refactor',
    name: 'Refaktoring',
    category: 'Vývoj',
    icon: 'RefreshCw',
    color: '#8b5cf6',
    prompt: 'Refaktoruj tento kód pro lepší čitelnost, údržbu a výkon. Zachovej funkcionalitu.\n\nKód:\n```\n[VLOŽ KÓD]\n```\n\nSpecifické požadavky:\n- [např. rozdělit na menší funkce]\n- [použít moderní syntax]\n- [přidat type hints]',
    isSystem: true,
  },
  {
    id: 'documentation',
    name: 'Dokumentace',
    category: 'Vývoj',
    icon: 'FileText',
    color: '#10b981',
    prompt: 'Vytvoř kompletní dokumentaci pro tento kód včetně:\n1. Popis účelu a funkcionality\n2. Docstringy pro všechny funkce/třídy\n3. Příklady použití\n4. Popis parametrů a návratových hodnot\n\nKód:\n```\n[VLOŽ KÓD]\n```',
    isSystem: true,
  },
  {
    id: 'unit-tests',
    name: 'Unit Testy',
    category: 'Testování',
    icon: 'Shield',
    color: '#f59e0b',
    prompt: 'Napiš unit testy pro tento kód. Použij pytest a pokryj:\n1. Základní funkcionalitu (happy path)\n2. Edge cases\n3. Chybové stavy\n4. Hraniční hodnoty\n\nKód k testování:\n```\n[VLOŽ KÓD]\n```',
    isSystem: true,
  },
  {
    id: 'api-design',
    name: 'API Design',
    category: 'Architektura',
    icon: 'Globe',
    color: '#06b6d4',
    prompt: 'Navrhni REST API pro následující funkcionalitu:\n\n[POPIŠ FUNKCIONALITU]\n\nZahrň:\n1. Endpoints (GET, POST, PUT, DELETE)\n2. Request/Response formáty (JSON)\n3. Autentizaci a autorizaci\n4. Error handling\n5. Příklady volání',
    isSystem: true,
  },
  {
    id: 'database-schema',
    name: 'DB Schema',
    category: 'Architektura',
    icon: 'Database',
    color: '#ec4899',
    prompt: 'Navrhni databázové schéma pro:\n\n[POPIŠ DOMÉNU / APLIKACI]\n\nZahrň:\n1. Tabulky a jejich sloupce\n2. Primární a cizí klíče\n3. Indexy\n4. Relace mezi tabulkami\n5. SQL CREATE statements',
    isSystem: true,
  },
  {
    id: 'performance',
    name: 'Optimalizace',
    category: 'Výkon',
    icon: 'Zap',
    color: '#fbbf24',
    prompt: 'Analyzuj tento kód z hlediska výkonu a navrhni optimalizace:\n\nKód:\n```\n[VLOŽ KÓD]\n```\n\nKontext:\n- Očekávaný objem dat: [např. 1M záznamů]\n- Frekvence volání: [např. 100x/sec]\n- Aktuální problémy: [např. pomalé odpovědi]',
    isSystem: true,
  },
  {
    id: 'security-audit',
    name: 'Security Audit',
    category: 'Bezpečnost',
    icon: 'Shield',
    color: '#dc2626',
    prompt: 'Proveď bezpečnostní audit tohoto kódu. Hledej:\n1. SQL Injection\n2. XSS zranitelnosti\n3. CSRF\n4. Nezabezpečené API klíče\n5. Špatné hashování hesel\n6. Další bezpečnostní rizika\n\nKód:\n```\n[VLOŽ KÓD]\n```',
    isSystem: true,
  },
  {
    id: 'explain-code',
    name: 'Vysvětli kód',
    category: 'Učení',
    icon: 'BookOpen',
    color: '#6366f1',
    prompt: 'Vysvětli podrobně, co dělá tento kód. Rozepiš krok po kroku, jako bys vysvětloval začátečníkovi:\n\n```\n[VLOŽ KÓD]\n```',
    isSystem: true,
  },
  {
    id: 'convert-language',
    name: 'Převod jazyka',
    category: 'Utility',
    icon: 'Code',
    color: '#14b8a6',
    prompt: 'Převeď tento kód z [PŮVODNÍ JAZYK] do [CÍLOVÝ JAZYK].\n\nZachovej funkcionalitu a použij idiomatický styl cílového jazyka.\n\nPůvodní kód:\n```\n[VLOŽ KÓD]\n```',
    isSystem: true,
  },
  {
    id: 'docker-setup',
    name: 'Docker Setup',
    category: 'DevOps',
    icon: 'Terminal',
    color: '#0ea5e9',
    prompt: 'Vytvoř Docker konfiguraci pro tuto aplikaci:\n\n[POPIŠ APLIKACI - jazyk, framework, závislosti]\n\nZahrň:\n1. Dockerfile (optimalizovaný, multi-stage)\n2. docker-compose.yml\n3. .dockerignore\n4. Instrukce pro build a run',
    isSystem: true,
  },
];

const ICON_MAP = {
  FileCode, Bug, RefreshCw, FileText, Rocket, Shield, 
  Zap, Code, Database, Globe, Terminal, Layout, Cpu, BookOpen
};

const CATEGORIES = ['Všechny', 'Vývoj', 'Testování', 'Architektura', 'Výkon', 'Bezpečnost', 'Učení', 'Utility', 'DevOps', 'Vlastní'];

export const TemplatesDrawer = ({ isOpen, onClose, onUseTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Všechny');
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'Vlastní', prompt: '' });
  const [copiedId, setCopiedId] = useState(null);

  // Načtení šablon z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eas_templates');
    const custom = saved ? JSON.parse(saved) : [];
    setTemplates([...DEFAULT_TEMPLATES, ...custom]);
  }, [isOpen]);

  // Uložení vlastních šablon
  const saveCustomTemplates = (allTemplates) => {
    const custom = allTemplates.filter(t => !t.isSystem);
    localStorage.setItem('eas_templates', JSON.stringify(custom));
  };

  // Filtrování
  const filtered = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                         t.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'Všechny' || t.category === category;
    return matchesSearch && matchesCategory;
  });

  // Použití šablony
  const handleUse = (template) => {
    onUseTemplate(template.prompt);
    onClose();
  };

  // Kopírování do schránky
  const handleCopy = async (template) => {
    await navigator.clipboard.writeText(template.prompt);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Vytvoření nové šablony
  const handleCreate = () => {
    if (!newTemplate.name.trim() || !newTemplate.prompt.trim()) return;
    
    const template = {
      id: `custom-${Date.now()}`,
      name: newTemplate.name,
      category: newTemplate.category || 'Vlastní',
      icon: 'FileText',
      color: '#6b7280',
      prompt: newTemplate.prompt,
      isSystem: false,
    };
    
    const updated = [...templates, template];
    setTemplates(updated);
    saveCustomTemplates(updated);
    setNewTemplate({ name: '', category: 'Vlastní', prompt: '' });
    setIsCreating(false);
  };

  // Smazání šablony
  const handleDelete = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveCustomTemplates(updated);
  };

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[32rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Rocket size={18} className="text-amber-400"/>
              </div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">
                  Šablony úloh
                </h2>
                <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">
                  {templates.length} šablon • Rychlý start
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCreating(true)}
                className="p-2 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl text-amber-400 transition-all"
                title="Nová šablona"
              >
                <Plus size={16}/>
              </button>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white"
              >
                <X size={17}/>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat šablony..."
              className="w-full pl-9 pr-4 py-2.5 bg-black/20 border theme-border-cls rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Kategorie */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                  category === cat 
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' 
                    : 'bg-black/20 border border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Seznam šablon */}
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <Search size={28} className="text-gray-700"/>
                </div>
                <div>
                  <p className="text-sm font-bold theme-text-sm-cls">Žádné šablony</p>
                  <p className="text-[10px] text-gray-700 mt-1">Zkus změnit filtr nebo hledaný výraz</p>
                </div>
              </div>
            ) : filtered.map(template => {
              const IconComponent = ICON_MAP[template.icon] || FileText;
              return (
                <div 
                  key={template.id}
                  className="group p-4 rounded-2xl border theme-border-cls bg-black/20 hover:bg-black/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-xl shrink-0"
                      style={{ background: `${template.color}20` }}
                    >
                      <IconComponent size={16} style={{ color: template.color }}/>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{template.name}</span>
                        <span 
                          className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${template.color}20`, color: template.color }}
                        >
                          {template.category}
                        </span>
                        {template.isSystem && (
                          <Star size={10} className="text-amber-400" fill="#fbbf24"/>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {template.prompt.slice(0, 120)}...
                      </p>
                    </div>

                    {/* Akce */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(template)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        title="Kopírovat"
                      >
                        {copiedId === template.id ? <Copy size={12} className="text-green-400"/> : <Copy size={12}/>}
                      </button>
                      <button
                        onClick={() => handleUse(template)}
                        className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-all"
                        title="Použít"
                      >
                        <Play size={12}/>
                      </button>
                      {!template.isSystem && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Smazat"
                        >
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t theme-border-cls flex items-center justify-between text-[9px] font-mono theme-text-xs-cls">
            <span>{filtered.length} z {templates.length} šablon</span>
            <span className="text-amber-500/60">Klikni Play pro použití</span>
          </div>
        </div>

        {/* Modal pro vytvoření šablony */}
        {isCreating && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-10">
            <div className="w-full max-w-md theme-card-bg border theme-border-cls rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Nová šablona</h3>
                <button onClick={() => setIsCreating(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={16} className="text-gray-400"/>
                </button>
              </div>
              
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({...prev, name: e.target.value}))}
                placeholder="Název šablony"
                className="w-full px-4 py-2.5 bg-black/30 border theme-border-cls rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              />
              
              <select
                value={newTemplate.category}
                onChange={(e) => setNewTemplate(prev => ({...prev, category: e.target.value}))}
                className="w-full px-4 py-2.5 bg-black/30 border theme-border-cls rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50"
              >
                {CATEGORIES.filter(c => c !== 'Všechny').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <textarea
                value={newTemplate.prompt}
                onChange={(e) => setNewTemplate(prev => ({...prev, prompt: e.target.value}))}
                placeholder="Text šablony / prompt..."
                rows={6}
                className="w-full px-4 py-3 bg-black/30 border theme-border-cls rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none font-mono"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border theme-border-cls rounded-xl text-sm font-bold text-gray-400 transition-all"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTemplate.name.trim() || !newTemplate.prompt.trim()}
                  className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-sm font-bold text-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vytvořit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
