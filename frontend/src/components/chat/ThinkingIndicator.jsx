import React from 'react';
import { Bot } from 'lucide-react';
import { AGENTS, AGENT_COLORS } from '../../config/constants';

export const ThinkingIndicator = ({ activeAgent }) => {
  const agentInfo = AGENTS.find(a => a.id === activeAgent);
  const AgentIcon = agentInfo?.icon || Bot;
  const color = AGENT_COLORS[activeAgent] || 'text-blue-400';
  
  return (
    <div className="flex gap-3 animate-in fade-in duration-300">
      <div className="w-7 h-7 rounded-full bg-[var(--bg-item)] border theme-border-cls flex items-center justify-center shrink-0">
        <AgentIcon size={13} className={`${color} animate-pulse`}/>
      </div>
      <div className="bg-[var(--bg-item)] border theme-border-cls rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
        <span className={`text-[9px] font-black uppercase tracking-widest ${color}`}>
          {agentInfo?.label || activeAgent || 'Systém'}
        </span>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${color.replace('text-','bg-')} opacity-60`} style={{animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>
          ))}
        </div>
      </div>
    </div>
  );
};
