import React from 'react';
import {
  Play, RotateCcw, Check, Copy, Download, Square, X, Image as ImageIcon,
  Paperclip, Brain, Terminal, MessageSquare, Code, Box, GitCommit, Package,
  Trash2, PenLine, PlayCircle, Monitor
} from 'lucide-react';

// --- IMPORTY STYLŮ A HOOKŮ ---
import './App.css'; 
import { useAgentSystem } from './hooks/useAgentSystem';
import { apiFetch } from './api/client';
import { AGENTS, AGENT_COLORS_HEX, LANG_LABELS, LANG_COLORS } from './config/constants';

// --- DRAWERY ---
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

// --- MODÁLY ---
import { PromptEditor } from './components/modals/PromptEditor';
import { IntakeModal } from './components/modals/IntakeModal';

// --- NAŠE VYČLENĚNÉ KOMPONENTY ---
import { CodeEditor } from './components/editor/CodeEditor';
import { ProjectPlanner } from './components/tools/ProjectPlanner';
import { SysAdminAlerts } from './components/tools/SysAdminAlerts';
import { ActivityBar } from './components/layout/ActivityBar';
import { ServerMetrics } from './components/layout/ServerMetrics';
import { Header } from './components/layout/Header';
import { AgentVisualizer } from './components/chat/AgentVisualizer';
import { ChatMessage } from './components/chat/ChatMessage';
import { ThinkingIndicator } from './components/chat/ThinkingIndicator';

// =============================================================================
// HLAVNÍ APLIKACE (Kostra)
// =============================================================================
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

  // =========================================================================
  // NOVÉ: CHYTRÝ FILTR PRO ODESÍLÁNÍ ZPRÁV
  // =========================================================================
  const handleTaskSubmit = (text) => {
    if (!text.trim()) return;
    
    const lower = text.toLowerCase();
    
    // Pokud text obsahuje slova DIAdem nebo VBS, vyskočí formulář (IntakeModal)
    if (lower.includes('diadem') || lower.includes('vbs')) {
      setPendingMessage(text);
      setIntakeOpen(true);
    } else {
      // Pokud to DIAdem NENÍ, nasimulujeme kliknutí na "Přeskočit" a pošleme to rovnou AI!
      executeTask(text, {});
    }
    
    setInput(""); // Vyčistíme vstupní řádek
  };

  return (
    <div className="app-root font-sans selection:bg-blue-500/30 flex flex-col"
         data-theme={isDark ? 'dark' : 'light'}
         style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', height: '100vh', overflow: 'hidden', position: 'fixed', inset: 0 }}>
      
      <div className="app-gradient fixed inset-0 pointer-events-none"/>

      {/* HEADER */}
      <Header
        activeModel={activeModel} handleModelSelect={handleModelSelect}
        setIsPromptEditorOpen={setIsPromptEditorOpen} setTemplatesOpen={setTemplatesOpen} setWorkflowOpen={setWorkflowOpen}
        setCodeServerOpen={setCodeServerOpen} setIsTelemetryOpen={setIsTelemetryOpen} setIsQueueOpen={setIsQueueOpen}
        setIsMemoryOpen={setIsMemoryOpen} memoryCount={memoryCount} setIsHistoryOpen={setIsHistoryOpen} setIsLibraryOpen={setIsLibraryOpen}
        setSettingsOpen={setSettingsOpen} setExportOpen={setExportOpen} handleLearn={handleLearn} clearSession={clearSession}
        isDark={isDark} setIsDark={setIsDark}
      />

      <ServerMetrics/>
      <SysAdminAlerts alerts={sysAlerts} onResolve={executeTask}/>

      <ActivityBar isProcessing={isProcessing} activeAgent={activeAgent} liveWorkspace={liveWorkspace} projectPlan={projectPlan} currentPlanStep={currentPlanStep}/>

      {/* DRAWERY A MODÁLY */}
      <PromptEditor isOpen={isPromptEditorOpen} onClose={()=>setIsPromptEditorOpen(false)}/>
      <GitDrawer isOpen={isGitOpen} onClose={()=>setIsGitOpen(false)}/>
      <QueueDrawer isOpen={isQueueOpen} onClose={()=>setIsQueueOpen(false)} onAddTask={handleAddToQueue}/>
      <TelemetryDrawer isOpen={isTelemetryOpen} onClose={()=>setIsTelemetryOpen(false)}/>
      <MemoryDrawer isOpen={isMemoryOpen} onClose={()=>setIsMemoryOpen(false)} memoryCount={memoryCount} onCountChange={setMemoryCount}/>
      <WorkflowDrawer isOpen={workflowOpen} onClose={() => setWorkflowOpen(false)} activeAgent={activeAgent} visitedAgents={[]}/>
      <TemplatesDrawer isOpen={templatesOpen} onClose={() => setTemplatesOpen(false)} onUseTemplate={(prompt) => setInput(prompt)}/>
      <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}/>
      <ExportDrawer isOpen={exportOpen} onClose={() => setExportOpen(false)} messages={chatMessages} code={code} codeLang={codeLang}/>
      <CodeServerDrawer isOpen={codeServerOpen} onClose={() => setCodeServerOpen(false)}/>

      <IntakeModal isOpen={intakeOpen} initialMessage={pendingMessage}
        onConfirm={(specs) => { setIntakeOpen(false); const msg = pendingMessage; setPendingMessage(''); executeTask(msg, specs); }}
        onSkip={() => { setIntakeOpen(false); const msg = pendingMessage; setPendingMessage(''); executeTask(msg, {}); }}/>
      
      <LibraryDrawer isOpen={isLibraryOpen} onClose={()=>setIsLibraryOpen(false)} onIndex={()=>indexInputRef.current?.click()}/>
      <HistoryDrawer isOpen={isHistoryOpen} onClose={()=>setIsHistoryOpen(false)} history={taskHistory}
        onLoadTask={t=>{setCode(t.code||"");setCodeLang('python');addMessage({role:'system',content:`📂 Obnoven: ${t.query}`.substring(0,60)});}}/>
      
      <input type="file" ref={indexInputRef} className="hidden"/>
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={e=>handleFileSelect(e,'image')}/>
      <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.py,.js,.ts,.jsx,.tsx,.json,.yaml,.yml,.md,.txt,.sh,.bash,.html,.css,.csv,.xml,.env,.toml,.ini,.cfg,.conf,.log" onChange={e=>handleFileSelect(e,'file')}/>

      {/* MOBILE TABS */}
      <div className="lg:hidden flex max-w-7xl mx-auto w-full px-4 pt-4 gap-2">
        <button onClick={()=>setMobileTab('chat')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab==='chat'?'bg-blue-600/20 border border-blue-500/40 text-blue-300':'bg-[var(--bg-item)] border theme-border-cls theme-text-sm-cls'}`}>
          <MessageSquare size={13}/> Chat
        </button>
        <button onClick={()=>setMobileTab('code')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab==='code'?'bg-blue-600/20 border border-blue-500/40 text-blue-300':'bg-[var(--bg-item)] border theme-border-cls theme-text-sm-cls'}`}>
          <Code size={13}/> {LANG_LABELS[codeLang]||'Kód'}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <main className="relative flex-1 min-h-0 w-full p-3 sm:p-4 lg:p-5 grid lg:grid-cols-[2fr_3fr] gap-4 lg:gap-5 overflow-hidden">
        
        {/* LÁVÝ PANEL - CHAT & AGENTI */}
        <div className={`flex flex-col gap-2 overflow-hidden h-full ${mobileTab!=='chat'?'hidden lg:flex':'flex'}`}>
          <div className="shrink-0"><AgentVisualizer activeAgent={activeAgent}/></div>
          <ProjectPlanner plan={projectPlan} currentStep={currentPlanStep}/>

          <div className="flex-1 min-h-0 theme-card border rounded-[2rem] overflow-hidden flex flex-col shadow-2xl" style={{borderColor:'var(--border)'}}>
            <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {chatMessages.map((msg, idx)=>( <ChatMessage key={`msg-${msg.id || 'x'}-${idx}`} msg={msg} onLearn={handleLearnMessage} onFeedback={handleFeedback} lastUserMsg={lastUserMsgRef.current}/> ))}
              {isProcessing && activeAgent && <ThinkingIndicator activeAgent={activeAgent}/>}
              <div ref={chatEndRef}/>
            </div>
          </div>

          {/* SOUBORY */}
          {attachments.length>0 && (
            <div className="shrink-0 flex flex-wrap gap-2 px-1">
              {attachments.map((file, idx)=>{
                const isImg = file.type==='image';
                const isPdf = file.mime==='application/pdf' || file.name.endsWith('.pdf');
                const badgeColor = isImg ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : isPdf ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-green-400 bg-green-500/10 border-green-500/20';
                return (
                  <div key={`file-${file.id || 'x'}-${idx}`} className="group theme-card-bg border theme-border-cls rounded-xl p-2 flex items-center gap-2">
                    {isImg && file.preview ? <img src={file.preview} alt="" className="w-8 h-8 rounded-lg object-cover"/> : <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-[9px] font-black ${badgeColor}`}>FILE</div>}
                    <div className="flex flex-col min-w-0"><span className="text-[10px] font-mono text-gray-300 max-w-[80px] truncate">{file.name}</span></div>
                    <button onClick={()=>removeAttachment(file.id)} className="text-gray-700 hover:text-red-400 ml-1"><X size={11}/></button>
                  </div>
                );
              })}
              <button onClick={async () => {
                  if (attachments.length === 0 || isProcessing) return;
                  const filesToAnalyze = attachments.map(a=>({name:a.name,type:a.type,mime:a.mime,data:a.data}));
                  addMessage({role:'system', content:`🔍 Spouštím rychlou analýzu...`});
                  setIsProcessing(true); setActiveAgent('EXPERT');
                  try {
                    const r = await apiFetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({files: filesToAnalyze, question: input || 'Analyzuj.', model_id: activeModel}) });
                    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf='';
                    while(true) {
                      const {done,value} = await reader.read(); if(done) break;
                      const lines = (buf+dec.decode(value)).split('\n'); buf=lines.pop();
                      for(const line of lines) { if(line.trim()) { try { const d = JSON.parse(line); if(d.type==='analysis_complete') addMessage({role:'ai', agent:'EXPERT', content:d.result}); } catch {} } }
                    }
                  } catch {} finally { setIsProcessing(false); setActiveAgent(null); }
                }} className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 text-violet-400 rounded-xl text-[10px] font-black"><Brain size={12}/> Analyzovat</button>
            </div>
          )}

          {/* INPUT BAR */}
          <div className="shrink-0 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"/>
            <div className="relative flex items-center theme-card border rounded-[1.5rem] shadow-2xl overflow-hidden" style={{borderColor:'var(--border)'}}>
              <div className="absolute left-4 flex items-center gap-1">
                <button onClick={()=>imageInputRef.current.click()} className="p-1.5 hover:bg-blue-500/10 rounded-lg"><ImageIcon size={16}/></button>
                <button onClick={()=>fileInputRef.current.click()} className="p-1.5 hover:bg-blue-500/10 rounded-lg"><Paperclip size={16}/></button>
              </div>
              {/* OPRAVA: Zde voláme naši novou funkci handleTaskSubmit */}
              <input className="w-full bg-transparent px-8 py-4 pl-24 pr-16 text-sm focus:outline-none" style={{color:'var(--text-primary)'}} placeholder={isProcessing?"Tým agentů pracuje...":"Zadejte úkol..."} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!isProcessing&&handleTaskSubmit(input)} disabled={isProcessing}/>
              <div className="absolute right-3">
                {/* OPRAVA: Zde voláme naši novou funkci handleTaskSubmit */}
                {isProcessing ? <button onClick={handleStop} className="p-3 bg-red-600 text-white rounded-xl"><Square size={14}/></button> : <button onClick={()=>handleTaskSubmit(input)} className="p-3 bg-blue-600 text-white rounded-xl"><Play size={16}/></button>}
              </div>
            </div>
          </div>
        </div>

        {/* PRAVÝ PANEL — EDITOR & PREVIEW */}
        <div className={`flex flex-col theme-card border rounded-[2rem] overflow-hidden shadow-2xl h-full min-h-0 ${mobileTab!=='code'?'hidden lg:flex':'flex'}`} style={{borderColor:'var(--border)'}}>
          <div className="px-5 py-3.5 theme-toolbar flex items-center justify-between border-b shrink-0" style={{borderColor:'var(--border)'}}>
            
            {/* OVLÁDÁNÍ POHLEDŮ */}
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
              <span className="text-[10px] font-black tracking-[0.2em] theme-text-sm-cls uppercase">output_workspace</span>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[var(--bg-item)] ${LANG_COLORS[codeLang]||'text-blue-400'}`}>{LANG_LABELS[codeLang]||codeLang}</span>
              {(liveWorkspace.length > 0 || code) && (
                <div className="flex bg-[var(--bg-item)] rounded-lg p-0.5 border theme-border-cls ml-2">
                  <button onClick={() => setShowLiveLog(true)} className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all ${showLiveLog ? 'bg-blue-600/30 text-blue-300' : 'theme-text-xs-cls hover:text-gray-400'}`}>Log Agentů</button>
                  <button onClick={() => setShowLiveLog(false)} className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all ${!showLiveLog ? 'bg-emerald-600/30 text-emerald-300' : 'theme-text-xs-cls hover:text-gray-400'}`}>Kód</button>
                </div>
              )}
            </div>
            
            {/* TLAČÍTKA EDITORU */}
            <div className="flex items-center gap-1.5">
              <button onClick={()=>{ setIsEditing(e=>!e); setRunOutput(null); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${isEditing?'bg-amber-500/20 border-amber-500/30 text-amber-300':'bg-[var(--bg-item)] hover:bg-white/10 border-white/10 theme-text-sm-cls'}`}><PenLine size={13}/><span className="hidden xl:block">{isEditing ? 'Zobrazit' : 'Editovat'}</span></button>
              {['python','bash','javascript','html'].includes(codeLang) && <button onClick={handleRun} disabled={isRunning} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black ${isRunning?'bg-green-500/10 text-green-500 cursor-wait':'bg-green-500/15 text-green-400'}`}>{isRunning?<div className="w-3 h-3 border-2 border-green-700 border-t-green-400 rounded-full animate-spin"/>:<PlayCircle size={13}/>}<span className="hidden xl:block">Spustit</span></button>}
              <button onClick={()=>setIsGitOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 text-[10px] font-black"><GitCommit size={13}/><span className="hidden xl:block">Git</span></button>
              <button onClick={handleCopy} className="p-2 bg-[var(--bg-item)] hover:bg-white/10 text-gray-400 rounded-xl">{isCopied?<Check size={14} className="text-green-400"/>:<Copy size={14}/>}</button>
              <button onClick={()=>{ setCode(''); setCodeLang('python'); setRunOutput(null); setIsEditing(false); }} className="p-2 bg-[var(--bg-item)] hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl"><Trash2 size={14}/></button>
              <button onClick={()=>executeTask("Proveď re-audit aktuálního kódu.")} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 text-[10px] font-black"><RotateCcw size={13}/> Re-Audit</button>
            </div>
          </div>

          {/* VYKRESLENÍ: LOG vs KÓD vs PREVIEW */}
          {liveWorkspace.length > 0 && showLiveLog && !showPreview ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative"> 
              <div className="px-4 py-2 flex items-center gap-3 shrink-0" style={{background:'rgba(59,130,246,0.05)', borderBottom:'1px solid var(--border)'}}>
                <div className="flex items-center gap-2">{isProcessing ? <><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/><span className="text-[9px] font-black uppercase text-blue-400">Live log agentů</span></> : <><div className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-[9px] font-black uppercase text-emerald-400">Log dokončen</span></>}</div>
                {!isProcessing && code && <button onClick={() => setShowLiveLog(false)} className="ml-auto text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">→ Zobrazit Kód</button>}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {liveWorkspace.map((block, idx) => {
                  const agent = AGENTS.find(a => a.id === block.node?.toUpperCase());
                  const hex = AGENT_COLORS_HEX[block.node?.toUpperCase()] || '#64748b';
                  return (
                    <div key={`log-${idx}-${block.node || 'node'}`} className="border-b" style={{borderColor:'var(--border)'}}>
                      <div className="px-4 py-2 flex items-center gap-2.5 sticky top-0" style={{background:'var(--bg-toolbar)'}}><div className="w-2 h-2 rounded-full" style={{background: hex}}/><span className="text-[9px] font-black uppercase tracking-widest" style={{color: hex}}>{agent?.label || block.node}</span></div>
                      <pre className="px-4 py-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap" style={{background:'var(--bg-card)', color:'var(--text-secondary)'}}>{block.content}</pre>
                    </div>
                  );
                })}
                <div ref={liveEndRef}/>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <CodeEditor code={code} lang={codeLang} isEditing={isEditing} onChange={setCode}/>
              {runOutput && (
                <div className="shrink-0 border-t overflow-hidden" style={{borderColor:'var(--border)'}}>
                  <div className="px-4 py-2 flex items-center justify-between" style={{background: runOutput.status==='ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}}>
                    <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${runOutput.status==='ok'?'bg-green-500':'bg-red-500'}`}/><span className={`text-[10px] font-black uppercase tracking-widest ${runOutput.status==='ok'?'text-green-400':'text-red-400'}`}>{runOutput.status==='ok' ? '✓ Výstup' : '✗ Chyba'}</span></div>
                    <button onClick={()=>setRunOutput(null)} className="p-1 text-gray-400"><X size={12}/></button>
                  </div>
                  <pre className="px-4 py-3 font-mono text-[12px] leading-relaxed overflow-auto custom-scrollbar max-h-48 whitespace-pre-wrap" style={{background: 'var(--bg-toolbar)', color: runOutput.status==='ok' ? 'var(--text-primary)' : '#f87171'}}>{runOutput.output}</pre>
                </div>
              )}
            </div>
          )}

          <div className="px-5 py-2.5 theme-toolbar border-t flex items-center justify-between text-[9px] font-mono shrink-0" style={{borderColor:'var(--border)', color:'var(--text-muted)'}}>
            <div className="flex items-center gap-3"><span>UTF-8</span><span className={LANG_COLORS[codeLang]||'text-blue-400/50'}>{LANG_LABELS[codeLang]||codeLang}</span></div>
            <div className="flex items-center gap-1"><Box size={9}/> <span>{code.split('\n').length} lines</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}