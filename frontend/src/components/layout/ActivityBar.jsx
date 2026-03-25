import React, { useState, useEffect } from 'react';
import { AGENTS, AGENT_COLORS_HEX } from '../../config/constants';

export const ActivityBar = ({ isProcessing, activeAgent, liveWorkspace, projectPlan, currentPlanStep }) => {
  const [dots, setDots] = useState(0);
  const [shownSteps, setShownSteps] = useState([]);
  
  useEffect(() => {
    if (!isProcessing) return;
    const i = setInterval(() => setDots(d => (d + 1) % 4), 400);
    return () => clearInterval(i);
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing || !activeAgent) return;
    setShownSteps(prev => {
      const last = prev[prev.length - 1];
      if (last?.id === activeAgent) return prev;
      const agent = AGENTS.find(a => a.id === activeAgent);
      if (!agent) return prev;
      return [...prev.slice(-6), { id: activeAgent, label: agent.label, time: Date.now() }];
    });
  }, [activeAgent, isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;
    setShownSteps([]);
  }, [isProcessing && shownSteps.length === 0]);

  const lastBlock = liveWorkspace[liveWorkspace.length - 1];
  const currentPlanItem = projectPlan[currentPlanStep];
  const agentHex = activeAgent ? (AGENT_COLORS_HEX[activeAgent] || '#3b82f6') : '#3b82f6';

  if (!isProcessing && shownSteps.length === 0) return null;

  return (
    <div className="w-full shrink-0 overflow-hidden" style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-toolbar)',
      minHeight: '28px',
    }}>
      <div className="px-4 flex items-center gap-3 h-7 overflow-hidden">
        {isProcessing ? (
          <>
            <div className="shrink-0 flex items-center gap-1.5">
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: agentHex,
                boxShadow: `0 0 8px ${agentHex}`,
                animation: 'pulse 1s infinite',
              }}/>
              <span style={{
                fontSize: 9, fontWeight: 900, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: agentHex,
              }}>
                {AGENTS.find(a => a.id === activeAgent)?.label || 'Systém'}
              </span>
              <span style={{fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 12}}>
                {'·'.repeat(dots)}
              </span>
            </div>
            <div style={{width: 1, height: 12, background: 'var(--border)', flexShrink: 0}}/>
            {currentPlanItem && (
              <span style={{fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280}}>
                {currentPlanItem}
              </span>
            )}
            {lastBlock && !currentPlanItem && (
              <span style={{fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400}}>
                {lastBlock.content.split('\n').find(l => l.trim().length > 10)?.trim().slice(0, 80) || ''}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {shownSteps.map((s, i) => {
                const hex = AGENT_COLORS_HEX[s.id] || '#64748b';
                const isLast = i === shownSteps.length - 1;
                return (
                  <span key={i} style={{
                    fontSize: 8, fontWeight: 900, letterSpacing: '0.08em',
                    textTransform: 'uppercase', padding: '1px 6px',
                    borderRadius: 6, border: `1px solid ${hex}${isLast ? '80' : '30'}`,
                    background: isLast ? `${hex}20` : 'transparent',
                    color: isLast ? hex : `${hex}60`,
                    transition: 'all 0.3s',
                  }}>{s.label}</span>
                );
              })}
              {shownSteps.length > 1 && (
                <span style={{fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace'}}>→</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <div style={{width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0}}/>
            <span style={{fontSize: 9, fontWeight: 900, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#4ade80'}}>
              Dokončeno
            </span>
            <div style={{width: 1, height: 12, background: 'var(--border)', flexShrink: 0, margin: '0 4px'}}/>
            <div className="flex items-center gap-1.5">
              {shownSteps.map((s, i) => {
                const hex = AGENT_COLORS_HEX[s.id] || '#64748b';
                return (
                  <span key={i} style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase', padding: '1px 5px',
                    borderRadius: 5, color: `${hex}80`,
                  }}>{s.label}</span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
