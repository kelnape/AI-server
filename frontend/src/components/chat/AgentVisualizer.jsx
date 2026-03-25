import React, { useRef, useEffect } from 'react';
import { AGENTS, AGENT_COLORS_HEX } from '../../config/constants';

export const AgentVisualizer = ({ activeAgent }) => {
  const activeRef = useRef(null);
  
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeAgent]);

  return (
    <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border" style={{background:'var(--bg-card)', borderColor:'var(--border)'}}>
      {AGENTS.map(({id, label, icon:Icon}) => {
        const isActive = activeAgent === id;
        const hex = AGENT_COLORS_HEX[id] || '#64748b';
        return (
          <div key={id}
            ref={isActive ? activeRef : null}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              padding:'4px 10px', borderRadius:'10px',
              border: `1px solid ${isActive ? hex+'90' : 'var(--border)'}`,
              background: isActive ? `${hex}25` : 'var(--bg-hover)',
              boxShadow: isActive ? `0 0 16px ${hex}50` : 'none',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s ease',
              color: isActive ? hex : 'var(--text-secondary)',
            }}>
            <Icon size={12} style={{color: isActive ? hex : 'var(--text-muted)', transition:'color 0.3s'}}
              className={isActive ? 'animate-pulse' : ''}/>
            <span style={{
              fontSize:'9px', fontWeight:900,
              letterSpacing:'0.07em', textTransform:'uppercase',
              color: isActive ? hex : 'var(--text-secondary)',
              transition: 'color 0.3s',
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};
