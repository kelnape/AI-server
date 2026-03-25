import React, { useState } from 'react';
import { User, Bot, Bookmark, BookmarkCheck } from 'lucide-react';
import { AGENTS, AGENT_COLORS } from '../../config/constants';

export const ChatMessage = ({ msg, onLearn, onFeedback, lastUserMsg }) => {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const agentInfo = AGENTS.find(a => a.id === msg.agent);
  const AgentIcon = agentInfo?.icon || Bot;
  const agentColor = AGENT_COLORS[msg.agent] || 'text-blue-400';
  const [learnState, setLearnState] = useState('idle');
  const [feedback, setFeedback] = useState(null);

  if (isSystem) return (
    <div className="flex items-center gap-3 py-1 px-1 opacity-40">
      <div className="h-px flex-1 bg-[var(--bg-item)]"/>
      <span className="text-[9px] font-mono theme-text-xs-cls uppercase tracking-widest whitespace-nowrap">{msg.content}</span>
      <div className="h-px flex-1 bg-[var(--bg-item)]"/>
    </div>
  );

  if (isUser) return (
    <div className="flex justify-end gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%]">
        <div className="msg-usr border border-blue-500/30 rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed" style={{color:'var(--text-primary)'}}>{msg.content}</div>
        <div className="text-[9px] font-mono mt-1 text-right" style={{color:'var(--text-muted)'}}>{msg.time}</div>
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

  const handleFeedback = async (thumbs) => {
    if (feedback !== null) return;
    setFeedback(thumbs);
    onFeedback && onFeedback({ task_id: msg.task_id || '', query: lastUserMsg || '', response: msg.content, thumbs });
  };

  const canLearn = ['FINALIZER','EXPERT','SYSADMIN','VYZKUMNIK','RESEARCH'].includes(msg.agent);
  const canFeedback = msg.agent === 'FINALIZER' || msg.role === 'ai';

  return (
    <div className="group flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-full bg-[var(--bg-item)] border theme-border-cls flex items-center justify-center shrink-0 mt-1">
        <AgentIcon size={13} className={agentColor}/>
      </div>
      <div className="max-w-[85%] flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {msg.agent && (
            <span className={`text-[9px] font-black uppercase tracking-widest ${agentColor}`}>
              {agentInfo?.label || msg.agent}
            </span>
          )}
          {msg.quality != null && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
              msg.quality >= 8 ? 'bg-emerald-500/15 text-emerald-400' :
              msg.quality >= 6 ? 'bg-amber-500/15 text-amber-400' :
              'bg-red-500/15 text-red-400'}`} title={msg.qualityReason || ''}>
              ★ {msg.quality}/10
            </span>
          )}
          {canLearn && (
            <button onClick={handleLearn} title="Zapamatovat do trvalé paměti"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                learnState === 'saved' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : learnState === 'saving' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 cursor-wait'
                : 'opacity-0 group-hover:opacity-100 bg-[var(--bg-item)] border theme-border-cls theme-text-sm-cls hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400'}`}>
              {learnState === 'saved' ? <><BookmarkCheck size={11}/> Uloženo</>
               : learnState === 'saving' ? <div className="w-2 h-2 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin"/>
               : <><Bookmark size={11}/> Zapamatovat</>}
            </button>
          )}
          {canFeedback && (
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${feedback !== null ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <button onClick={() => handleFeedback(1)}
                className={`text-[11px] px-1.5 py-0.5 rounded-lg border transition-all ${
                  feedback === 1 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-[var(--bg-item)] border-white/10 theme-text-sm-cls hover:bg-emerald-500/10 hover:text-emerald-400'}`}
                title="Dobrá odpověď">👍</button>
              <button onClick={() => handleFeedback(-1)}
                className={`text-[11px] px-1.5 py-0.5 rounded-lg border transition-all ${
                  feedback === -1 ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-[var(--bg-item)] border-white/10 theme-text-sm-cls hover:bg-red-500/10 hover:text-red-400'}`}
                title="Špatná odpověď">👎</button>
            </div>
          )}
        </div>
        <div className="msg-ai border rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={{borderColor:'var(--border)', color:'var(--text-primary)'}}>
          
          {msg.additional_kwargs?.is_research && (
            <div className="research-badge">
              <span className="search-icon">🔍</span>
              <span className="search-text">Ověřeno na internetu</span>
            </div>
          )}

          {msg.content}
          {msg.streaming && <span className="inline-block w-1.5 h-4 bg-blue-400 ml-1 animate-pulse rounded-sm"/>}
        </div>
        {msg.time && <div className="text-[9px] font-mono mt-1" style={{color:'var(--text-muted)'}}>{msg.time}</div>}
      </div>
    </div>
  );
};
