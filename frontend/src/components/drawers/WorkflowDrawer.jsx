import React, { useState, useEffect, useMemo } from 'react';
import { X, GitBranch, Info, Zap, ArrowRight } from 'lucide-react';
import { Overlay } from '../common/Overlay';
import { AGENTS, AGENT_COLORS_HEX } from '../../config/constants';

// Definice pozic uzlů v grafu (x, y v procentech) - Nová elitní osmička
const NODE_POSITIONS = {
  'MANAŽER':    { x: 50, y: 12 },
  'PLANNER':    { x: 20, y: 35 },
  'SPECIALISTA':{ x: 50, y: 35 },
  'SYSADMIN':   { x: 80, y: 35 },
  'VYVOJAR':    { x: 35, y: 60 },
  'QA':         { x: 35, y: 80 },
  'REFLEKTOR':  { x: 75, y: 80 },
  'FINALIZER':  { x: 50, y: 95 },
};

// Definice hran (spojení mezi uzly) podle nového backendu
const EDGES = [
  // Z Manažera (Routing)
  { from: 'MANAŽER', to: 'PLANNER', type: 'conditional' },
  { from: 'MANAŽER', to: 'SPECIALISTA', type: 'conditional' },
  { from: 'MANAŽER', to: 'VYVOJAR', type: 'conditional' },
  { from: 'MANAŽER', to: 'QA', type: 'conditional' },
  { from: 'MANAŽER', to: 'SYSADMIN', type: 'conditional' },
  { from: 'MANAŽER', to: 'REFLEKTOR', type: 'conditional' },
  { from: 'MANAŽER', to: 'FINALIZER', type: 'conditional' },
  
  // Pevné cesty k Vývojáři
  { from: 'PLANNER', to: 'VYVOJAR', type: 'fixed' },
  { from: 'SPECIALISTA', to: 'VYVOJAR', type: 'fixed' },
  
  // Pevná cesta k Finalizérovi
  { from: 'SYSADMIN', to: 'FINALIZER', type: 'fixed' },
  
  // Cyklus Vývoj -> QA
  { from: 'VYVOJAR', to: 'QA', type: 'fixed' },
  { from: 'QA', to: 'REFLEKTOR', type: 'conditional', label: 'PASS' },
  { from: 'QA', to: 'VYVOJAR', type: 'conditional', label: 'FAIL' },
  
  // Cyklus z Reflektoru
  { from: 'REFLEKTOR', to: 'FINALIZER', type: 'conditional' },
  { from: 'REFLEKTOR', to: 'VYVOJAR', type: 'conditional', label: 'Next' },
];

// Popisy rolí nových agentů
const AGENT_DESCRIPTIONS = {
  'MANAŽER': 'Řídí celý tým, analyzuje dotazy a deleguje práci na specialisty.',
  'PLANNER': 'Vytváří detailní plány a rozkládá složité úkoly na kroky.',
  'SPECIALISTA': 'Analyzuje problém, vyhledává data na webu a zná dokumentaci (např. DIAdem).',
  'VYVOJAR': 'Navrhuje pevnou architekturu aplikací a píše čistý kód.',
  'QA': 'Auditor a tester v jednom. Přísně kontroluje kód a testuje funkčnost.',
  'SYSADMIN': 'Spravuje systém, monitoruje CPU, RAM, disky a Docker.',
  'REFLEKTOR': 'Analyzuje výsledky, ukládá užitečná data do paměti a navrhuje zlepšení.',
  'FINALIZER': 'Shrnuje práci týmu do přehledného výstupu pro klienta.',
};

const WorkflowNode = ({ id, x, y, isActive, isVisited, isHovered, onClick, onHover }) => {
  const agent = AGENTS.find(a => a.id === id);
  const color = AGENT_COLORS_HEX[id] || '#64748b';
  const label = agent?.label || id;
  
  const scale = isActive ? 1.15 : isHovered ? 1.08 : 1;
  const glowIntensity = isActive ? '0 0 20px' : isVisited ? '0 0 10px' : '0 0 0px';
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <circle r={28 * scale} fill="transparent" style={{ filter: `drop-shadow(${glowIntensity} ${color})` }}/>
      <circle
        r={24 * scale}
        fill={isActive ? color : isVisited ? `${color}40` : '#1e293b'}
        stroke={color} strokeWidth={isActive ? 3 : isVisited ? 2 : 1.5}
        strokeOpacity={isActive ? 1 : isVisited ? 0.8 : 0.4}
        style={{ transition: 'all 0.3s ease' }}
      />
      {isActive && (
        <circle r={24} fill="transparent" stroke={color} strokeWidth={2} opacity={0.5}>
          <animate attributeName="r" from="24" to="36" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
      <text
        y={38} textAnchor="middle"
        fill={isActive ? color : isVisited ? '#e2e8f0' : '#94a3b8'}
        fontSize={10} fontWeight={isActive ? 700 : 500}
        style={{ textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.3s ease' }}
      >
        {label}
      </text>
      {isVisited && !isActive && <circle cx={16} cy={-16} r={8} fill="#10b981" />}
    </g>
  );
};

const WorkflowEdge = ({ from, to, type, isActive, isVisited, label }) => {
  const fromPos = NODE_POSITIONS[from];
  const toPos = NODE_POSITIONS[to];
  
  if (!fromPos || !toPos) return null;
  
  const x1 = fromPos.x * 4; const y1 = fromPos.y * 5;
  const x2 = toPos.x * 4; const y2 = toPos.y * 5;
  
  const color = isActive ? '#3b82f6' : isVisited ? '#10b981' : '#334155';
  const strokeWidth = isActive ? 2.5 : isVisited ? 2 : 1;
  const opacity = isActive ? 1 : isVisited ? 0.7 : 0.3;
  const dashArray = type === 'conditional' ? '4,4' : 'none';
  
  const path = `M ${x1} ${y1 + 24} L ${x2} ${y2 - 24}`;
  const midX = (x1 + x2) / 2; const midY = (y1 + y2) / 2;
  
  return (
    <g>
      <path
        d={path} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeOpacity={opacity} strokeDasharray={dashArray}
        markerEnd={isActive || isVisited ? "url(#arrowhead)" : "url(#arrowhead-dim)"}
        style={{ transition: 'all 0.3s ease' }}
      />
      {isActive && (
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth={2} strokeDasharray="8,8">
          <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.5s" repeatCount="indefinite" />
        </path>
      )}
      {label && (
        <text
          x={midX} y={midY - 5} textAnchor="middle"
          fill={color} fontSize={9} fontWeight="bold"
          style={{ opacity: opacity + 0.2 }}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const WorkflowDrawer = ({ isOpen, onClose, activeAgent, visitedAgents = [] }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    if (activeAgent && !history.includes(activeAgent)) {
      setHistory(prev => [...prev, activeAgent]);
    }
  }, [activeAgent]);
  
  const handleNodeClick = (id) => setSelectedNode(selectedNode === id ? null : id);
  
  const activeEdges = useMemo(() => {
    if (!activeAgent || history.length < 2) return [];
    const lastTwo = history.slice(-2);
    return EDGES.filter(e => e.from === lastTwo[0] && e.to === lastTwo[1]);
  }, [activeAgent, history]);
  
  const visitedEdges = useMemo(() => {
    const edges = [];
    for (let i = 0; i < history.length - 1; i++) {
      const from = history[i]; const to = history[i + 1];
      const edge = EDGES.find(e => e.from === from && e.to === to);
      if (edge) edges.push(edge);
    }
    return edges;
  }, [history]);

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[36rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl"><GitBranch size={18} className="text-blue-400"/></div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Workflow Visualizer</h2>
                <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">LangGraph · {AGENTS.length} agentů · {EDGES.length} spojení</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white"><X size={17}/></button>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400"><Zap size={10}/> Aktivní</div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><ArrowRight size={10}/> Navštíveno</div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-gray-500/10 border border-gray-500/20 text-gray-400"><Info size={10}/> Klikni pro info</div>
          </div>
          
          <div className="flex-1 overflow-hidden rounded-2xl border theme-border-cls" style={{ background: '#0f172a' }}>
            <svg viewBox="0 0 400 500" className="w-full h-full" style={{ minHeight: '400px' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#10b981" /></marker>
                <marker id="arrowhead-dim" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#334155" /></marker>
                <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" /></marker>
              </defs>
              
              {EDGES.map((edge, i) => (
                <WorkflowEdge key={i} from={edge.from} to={edge.to} type={edge.type} label={edge.label} isActive={activeEdges.some(e => e.from === edge.from && e.to === edge.to)} isVisited={visitedEdges.some(e => e.from === edge.from && e.to === edge.to)} />
              ))}
              
              {Object.entries(NODE_POSITIONS).map(([id, pos]) => (
                <WorkflowNode key={id} id={id} x={pos.x * 4} y={pos.y * 5} isActive={activeAgent === id} isVisited={history.includes(id)} isHovered={hoveredNode === id} onClick={handleNodeClick} onHover={setHoveredNode} />
              ))}
            </svg>
          </div>
          
          {selectedNode && (
            <div className="p-4 rounded-2xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: AGENT_COLORS_HEX[selectedNode] || '#64748b' }}/>
                <span className="text-sm font-bold text-white">{AGENTS.find(a => a.id === selectedNode)?.label || selectedNode}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{AGENT_DESCRIPTIONS[selectedNode] || 'Popis není k dispozici.'}</p>
            </div>
          )}
          
          {history.length > 0 && (
            <div className="pt-3 border-t theme-border-cls">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Historie průchodu</div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((id, i) => {
                  const color = AGENT_COLORS_HEX[id] || '#64748b';
                  const agent = AGENTS.find(a => a.id === id);
                  return (
                    <React.Fragment key={i}>
                      <span className="px-2 py-1 rounded-md text-[9px] font-bold" style={{ background: `${color}20`, color: color, border: `1px solid ${color}40` }}>{agent?.label || id}</span>
                      {i < history.length - 1 && <span className="text-gray-600 self-center">→</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="pt-3 border-t theme-border-cls flex items-center justify-between text-[9px] font-mono theme-text-xs-cls">
            <span>LangGraph StateGraph</span>
            <button onClick={() => setHistory([])} className="text-blue-500/60 hover:text-blue-400 transition-colors">↻ Reset historie</button>
          </div>
        </div>
      </div>
    </>
  );
};