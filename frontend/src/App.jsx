import React, { useState, useEffect } from 'react';
import {
  Play, Square, X, Image as ImageIcon, Paperclip, Brain, Terminal, 
  Code, GitCommit, Trash2, PenLine, PlayCircle, Activity,
  HardDrive, GitBranch, FileEdit, Settings
} from 'lucide-react';

import './App.css'; 
import { useAgentSystem } from './hooks/useAgentSystem';
import { apiFetch } from './api/client';
import { AGENTS, AGENT_COLORS_HEX, LANG_LABELS, LANG_COLORS } from './config/constants';

import { GitDrawer } from './components/drawers/GitDrawer';
import { QueueDrawer } from './components/drawers/QueueDrawer';
import { TelemetryDrawer } from './components/drawers/TelemetryDrawer';
import { LibraryDrawer } from './components/drawers/LibraryDrawer';
import { HistoryDrawer } from './components/drawers/HistoryDrawer';
import { MemoryDrawer } from './components/drawers/MemoryDrawer';
import { WorkflowDrawer } from './components/drawers/WorkflowDrawer';
import { TemplatesDrawer } from './components/drawers/TemplatesDrawer';
import { SettingsDrawer } from './components/drawers/SettingsDrawer';
import { ExportDrawer } from './components/drawers/ExportDrawer';
import { CodeServerDrawer } from './components/drawers/CodeServerDrawer';
import { NasDrawer } from './components/drawers/NasDrawer';

import { PromptEditor } from './components/modals/PromptEditor';
import { IntakeModal } from './components/modals/IntakeModal';

import { CodeEditor } from './components/editor/CodeEditor';
import { SysAdminAlerts } from './components/tools/SysAdminAlerts';
import { Header } from './components/layout/Header';
import { ChatMessage } from './components/chat/ChatMessage';

export default function App() {
  const {
    input, setInput, isLibraryOpen, setIsLibraryOpen, isHistoryOpen, setIsHistoryOpen, isGitOpen, setIsGitOpen,
    isQueueOpen, setIsQueueOpen, isTelemetryOpen, setIsTelemetryOpen, isMemoryOpen, setIsMemoryOpen, workflowOpen, setWorkflowOpen,
    templatesOpen, setTemplatesOpen, settingsOpen, setSettingsOpen, exportOpen, setExportOpen, codeServerOpen, setCodeServerOpen,
    isPromptEditorOpen, setIsPromptEditorOpen, intakeOpen, setIntakeOpen, pendingMessage, setPendingMessage, mobileTab, setMobileTab,
    showPreview, setShowPreview, showLiveLog, setShowLiveLog, isEditing, setIsEditing, memoryCount, setMemoryCount, attachments, setAttachments,
    sysAlerts, setSysAlerts, taskHistory, setTaskHistory, activeAgent, setActiveAgent, isProcessing, setIsProcessing, isCopied, setIsCopied,
    projectPlan, setProjectPlan, currentPlanStep, setCurrentPlanStep, activeModel, setActiveModel, liveWorkspace, setLiveWorkspace,
    runOutput, setRunOutput, isRunning, setIsRunning, isDark, setIsDark, code, setCode, codeLang, setCodeLang, chatMessages, setChatMessages,
    liveEndRef, chatEndRef, chatContainerRef, fileInputRef, imageInputRef, indexInputRef, lastUserMsgRef,
    clearSession, addMessage, handleFileSelect, removeAttachment, handleLearn, handleLearnMessage, handleFeedback, handleAddToQueue,
    handleModelSelect, handleStop, handleCopy, executeTask, handleZipExport, handleRun
  } = useAgentSystem();

  // === STAVY APLIKACE ===
  const [agentStats, setAgentStats] = useState([]);
  const [selectedMode, setSelectedMode] = useState('AUTO');
  const [isNasOpen, setIsNasOpen] = useState(false); // Lokální stav pro NAS, kdyby chyběl v hooku

  // === NAČÍTÁNÍ STATISTIK ===
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiFetch('/api/agent-stats');
        const json = await response.json();
        if (json.status === 'ok') setAgentStats(json.data);
      } catch (e) { console.error("Nelze načíst statistiky agentů", e); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // === ODESLÁNÍ ÚKOLU ===
  const handleTaskSubmit = (text) => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    const directAgentOverride = selectedMode === 'AUTO' ? null : selectedMode;

    if (lower.includes('diadem') || lower.includes('vbs')) {
      setPendingMessage(text);
      setIntakeOpen(true);
    } else {
      executeTask(text, { direct_agent: directAgentOverride });
    }
    setInput("");
  };

  // === POMOCNÁ KOMPONENTA PRO NOVOU KARTU AGENTA ===
  const AgentStatCard = ({ agentId, label }) => {
    const stat = agentStats.find(s => s.name === agentId) || { requests: 0, tokens: 0, cost: 0, errors: 0 };
    const isActive = activeAgent === agentId;
    const sr = stat.requests > 0 ? "100%" : "---";

    return (
      <div className={`mb-4 rounded-md border p-4 transition-all duration-300 ${isActive ? 'bg-[#111827]/80 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-[#0a0f18] border-gray-800/80'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className={`text-sm font-bold tracking-wide ${isActive ? 'text-blue-400' : 'text-emerald-500'}`}>
              {label}
            </span>
          </div>
          <span className="bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded text-[9px] uppercase tracking-widest">
            {isActive ? 'Working' : 'Ready'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px]">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center"><span className="text-gray-500">SR:</span><span className="text-emerald-400 font-medium">{sr}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500">Requests:</span><span className="text-gray-300 font-medium">{stat.requests}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500">Cost:</span><span className="text-gray-300 font-medium">${stat.cost.toFixed(4)}</span></div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center"><span className="text-gray-500">Tokens:</span><span className="text-gray-300 font-medium">{stat.tokens.toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500">Latency:</span><span className="text-gray-300 font-medium">--- ms</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500">Errors:</span><span className="text-gray-300 font-medium">{stat.errors || 0}</span></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="font-mono bg-[#050505] text-gray-300 h-screen w-screen overflow-hidden flex flex-col selection:bg-blue-900/50">
      
      {/* HEADER S TOOLBAREM */}
      <header className="h-10 border-b border-gray-800 bg-[#0a0a0a] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Terminal size={14} className="text-blue-500" />
          <span className="text-xs font-bold tracking-widest text-gray-200">KELNAPE V0.5.0</span>
          <span className="text-[10px] text-gray-600 border-l border-gray-800 pl-3 ml-2">SYSTEM OPERATIONAL</span>
        </div>

        {/* --- COMMAND BAR (NAS, GIT, PROMPTY) --- */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <button 
            onClick={() => setIsNasOpen(true)} 
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-widest text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 border border-transparent hover:border-cyan-400/30 transition-all rounded-sm"
          >
            <HardDrive size={12} /> NAS
          </button>
          
          <button 
            onClick={() => setIsGitOpen(true)} 
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-widest text-gray-500 hover:text-orange-400 hover:bg-orange-400/10 border border-transparent hover:border-orange-400/30 transition-all rounded-sm"
          >
            <GitBranch size={12} /> GIT
          </button>

          <button 
            onClick={() => setIsPromptEditorOpen(true)} 
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-widest text-gray-500 hover:text-fuchsia-400 hover:bg-fuchsia-400/10 border border-transparent hover:border-fuchsia-400/30 transition-all rounded-sm"
          >
            <FileEdit size={12} /> PROMPTY
          </button>
        </div>

        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-emerald-500 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> 0/1 agents active</span>
          <button onClick={() => setSettingsOpen(true)} className="hover:text-white transition-colors flex items-center gap-1.5">
            <Settings size={12} /> CONFIG
          </button>
        </div>
      </header>

      {/* HLAVNÍ MŘÍŽKA */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEVÝ PANEL: WORKSPACE (Chat & Kód) */}
        <div className="flex-1 flex flex-col border-r border-gray-800 min-w-0">
          
          {/* HLAVIČKA WORKSPACE */}
          <div className="h-8 bg-[#0a0a0a] border-b border-gray-800 flex items-center px-4 shrink-0">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={12}/> PIPELINE / WORKSPACE
            </span>
          </div>

          {/* VÝPIS - Rozděleno na Půl (Nahoře Kód, Dole Chat) */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#080808]">
            
            {/* HORNÍ ČÁST: EDITOR / LOG (Cyberpunk Upgrade) */}
            <div className="flex-1 border-b border-gray-800 relative flex flex-col min-h-0 bg-[#020202]">
              
              {/* Ovladač v pravém horním rohu pro přepínání pohledů */}
              <div className="absolute top-0 right-0 z-20 flex text-[9px] font-bold uppercase tracking-widest border-b border-l border-gray-800 bg-[#050505]">
                <button 
                  onClick={() => setShowLiveLog(true)}
                  className={`px-4 py-1.5 transition-all flex items-center gap-2 ${showLiveLog ? 'text-emerald-400 bg-emerald-400/10 shadow-[inset_0_-2px_0_rgba(16,185,129,1)]' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}
                >
                  <Activity size={10} /> Trace Log
                </button>
                <button 
                  onClick={() => setShowLiveLog(false)}
                  className={`px-4 py-1.5 transition-all border-l border-gray-800 flex items-center gap-2 ${!showLiveLog ? 'text-blue-400 bg-blue-400/10 shadow-[inset_0_-2px_0_rgba(59,130,246,1)]' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}
                >
                  <Code size={10} /> Source Code
                </button>
              </div>

              {/* Samotný obsah horního okna */}
              {liveWorkspace.length > 0 && showLiveLog ? (
                <div className="flex-1 overflow-y-auto p-4 pt-10 custom-scrollbar text-[11px] font-mono relative">
                  
                  {/* Jemný mřížkový vzor v pozadí pro "Engineering" feeling */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                  
                  <div className="z-10 relative flex flex-col">
                    {liveWorkspace.map((block, idx) => {
                      const isLast = idx === liveWorkspace.length - 1;
                      const agentHex = AGENT_COLORS_HEX[block.node.toUpperCase()] || '#3b82f6';
                      
                      return (
                        <div key={idx} className="flex gap-4 min-h-[60px]">
                          {/* Časová osa a Název Node */}
                          <div className="flex flex-col items-center shrink-0 w-24 pt-1">
                            <div 
                              className="text-[9px] font-bold mb-2 border px-2 py-0.5 rounded shadow-[0_0_10px_rgba(0,0,0,0.5)] uppercase tracking-wider text-center w-full truncate"
                              style={{ color: agentHex, borderColor: `${agentHex}40`, backgroundColor: `${agentHex}15` }}
                            >
                              {block.node}
                            </div>
                            {!isLast && <div className="w-px flex-1 bg-gray-800/80 my-1"></div>}
                          </div>
                          
                          {/* Obsah (Myšlenky agenta) */}
                          <div className={`flex-1 pb-6 ${!isLast ? 'border-b border-gray-800/30' : ''}`}>
                            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed bg-[#0a0a0a]/80 border border-gray-800/50 p-3 rounded-md shadow-[inset_0_0_15px_rgba(0,0,0,0.4)]">
                              {block.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={liveEndRef}/>
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative pt-8 bg-[#050505]">
                  <div className="absolute inset-0 top-8">
                    <CodeEditor code={code} lang={codeLang} isEditing={isEditing} onChange={setCode}/>
                  </div>
                </div>
              )}
            </div>

            {/* DOLNÍ ČÁST: CHAT (Konzole - Hacker Style) */}
            <div className="h-[45%] bg-[#030303] p-4 overflow-y-auto custom-scrollbar flex flex-col gap-1 text-[12px] font-mono relative" ref={chatContainerRef}>
              
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-20"></div>

              {chatMessages.length === 0 && (
                <div className="text-emerald-700/60 flex flex-col items-center justify-center h-full animate-pulse">
                  <Terminal size={32} className="mb-3"/>
                  <span>[ INIT SEQUENCE COMPLETED ]</span>
                  <span>AWAITING DIRECTIVES...</span>
                </div>
              )}

              <div className="z-20 flex flex-col gap-1">
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const agentName = msg.agent ? msg.agent.toUpperCase() : 'SYSTEM';
                  const agentHex = AGENT_COLORS_HEX[agentName] || '#3b82f6';

                  return (
                    <div key={idx} className="flex gap-3 mb-2 leading-relaxed">
                      <div className="shrink-0 pt-0.5 select-none">
                        {isUser ? (
                          <span className="text-emerald-500 font-bold">kelnape@admin:~$</span>
                        ) : (
                          <span style={{ color: agentHex }} className="font-bold">[{agentName}]&gt;</span>
                        )}
                      </div>
                      <div className={`flex-1 whitespace-pre-wrap ${isUser ? 'text-gray-300' : 'text-gray-400'}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                
                {isProcessing && (
                  <div className="flex gap-3 mb-2 leading-relaxed text-blue-400">
                    <div className="shrink-0 pt-0.5 font-bold">[SYSTEM]&gt;</div>
                    <div className="flex-1 flex items-center gap-2">
                      Executing pipeline... 
                      <div className="w-1.5 h-3 bg-blue-400 animate-pulse"/>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
            </div>
          </div> 

          {/* INPUT COMMAND LINE (Spodní lišta Cyberpunk) */}
          <div className="shrink-0 p-4 bg-[#0a0f18] border-t border-gray-800/80">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mr-2">
                Select Mode:
              </span>
              
              <button 
                onClick={() => setSelectedMode('AUTO')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all ${
                  selectedMode === 'AUTO' 
                    ? 'bg-indigo-600/15 border border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(79,70,229,0.15)]' 
                    : 'bg-[#050505] border border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                🤖 AUTO (Manager)
              </button>

              {[
                { label: 'SysAdmin', id: 'SysAdmin' },
                { label: 'Specialist', id: 'Specialista' },
                { label: 'Auditor', id: 'QA' },
                { label: 'Coder', id: 'Vyvojar' },
                { label: 'Excel', id: 'Excel' }
              ].map((mode) => (
                <button 
                  key={mode.id} 
                  onClick={() => setSelectedMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all ${
                    selectedMode === mode.id
                      ? 'bg-emerald-600/15 border border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                      : 'bg-[#050505] border border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 items-stretch h-11">
              <input 
                className="flex-1 bg-[#050505] border border-gray-800 rounded-md px-4 text-[13px] text-gray-200 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_10px_rgba(79,70,229,0.1)] placeholder-gray-700 font-mono transition-all"
                placeholder={isProcessing ? "Executing task pipeline..." : "Enter task description..."}
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !isProcessing && handleTaskSubmit(input)} 
                disabled={isProcessing}
              />
              <button 
                onClick={() => handleTaskSubmit(input)}
                disabled={isProcessing || !input.trim()}
                className={`px-6 rounded-md text-[11px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 justify-center min-w-[120px] ${
                  isProcessing 
                    ? 'bg-[#050505] border-gray-800 text-gray-600' 
                    : input.trim() 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-[#050505] border-gray-800 text-gray-600'
                }`}
              >
                {isProcessing ? 'Working...' : <><Play size={12}/> Submit</>}
              </button>
              <button 
                onClick={() => setInput('')}
                className="px-5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:border-red-500/40"
              >
                Clear
              </button>
            </div>
          </div>

        </div> {/* KONEC LEVÉHO PANELU */}

        {/* PRAVÝ PANEL: AGENT POOL */}
        <div className="w-[300px] bg-[#050505] flex flex-col shrink-0">
          <div className="h-8 bg-[#0a0a0a] border-b border-gray-800 flex items-center px-4 shrink-0 justify-between">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">AGENT POOL</span>
            <span className="text-[9px] text-gray-600">{agentStats.length} loaded</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <AgentStatCard agentId="MANAŽER" label="Manager" />
            <AgentStatCard agentId="VYVOJAR" label="Coder" />
            <AgentStatCard agentId="SPECIALISTA" label="Specialist" />
            <AgentStatCard agentId="EXCEL" label="Excel Expert" />
            <AgentStatCard agentId="QA" label="Auditor" />
            <AgentStatCard agentId="SYSADMIN" label="SysAdmin" />
          </div>
        </div>

      </main>

      {/* Skryté Drawery a Modály - VČETNĚ NAS DRAWERU! */}
      <PromptEditor isOpen={isPromptEditorOpen} onClose={()=>setIsPromptEditorOpen(false)}/>
      <GitDrawer isOpen={isGitOpen} onClose={()=>setIsGitOpen(false)}/>
      <NasDrawer isOpen={isNasOpen} onClose={()=>setIsNasOpen(false)}/> 
      
      <QueueDrawer isOpen={isQueueOpen} onClose={()=>setIsQueueOpen(false)} onAddTask={handleAddToQueue}/>
      <TelemetryDrawer isOpen={isTelemetryOpen} onClose={()=>setIsTelemetryOpen(false)}/>
      <MemoryDrawer isOpen={isMemoryOpen} onClose={()=>setIsMemoryOpen(false)} memoryCount={memoryCount} onCountChange={setMemoryCount}/>
      <WorkflowDrawer isOpen={workflowOpen} onClose={() => setWorkflowOpen(false)} activeAgent={activeAgent} visitedAgents={[]}/>
      <TemplatesDrawer isOpen={templatesOpen} onClose={() => setTemplatesOpen(false)} onUseTemplate={(prompt) => setInput(prompt)}/>
      <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}/>
      <ExportDrawer isOpen={exportOpen} onClose={() => setExportOpen(false)} messages={chatMessages} code={code} codeLang={codeLang}/>
      <CodeServerDrawer isOpen={codeServerOpen} onClose={() => setCodeServerOpen(false)}/>
      <IntakeModal isOpen={intakeOpen} initialMessage={pendingMessage} onConfirm={(specs) => { setIntakeOpen(false); const msg = pendingMessage; setPendingMessage(''); executeTask(msg, specs); }} onSkip={() => { setIntakeOpen(false); const msg = pendingMessage; setPendingMessage(''); executeTask(msg, {}); }}/>
    </div>
  );
}