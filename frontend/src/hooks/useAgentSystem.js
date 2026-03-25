import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { AGENTS, LANG_LABELS } from '../config/constants';

export const useAgentSystem = () => {
  // --- UI STAVY (Modály, Drawery, Taby) ---
  const [input, setInput] = useState("");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGitOpen, setIsGitOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [codeServerOpen, setCodeServerOpen] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [mobileTab, setMobileTab] = useState('chat');
  const [showPreview, setShowPreview] = useState(false);
  const [showLiveLog, setShowLiveLog] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // --- DATA APLIKACE ---
  const [memoryCount, setMemoryCount] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [sysAlerts, setSysAlerts] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [projectPlan, setProjectPlan] = useState([]);
  const [currentPlanStep, setCurrentPlanStep] = useState(-1);
  const [activeModel, setActiveModel] = useState("gpt-4o-mini");
  const [liveWorkspace, setLiveWorkspace] = useState([]);
  const [runOutput, setRunOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // --- LOCAL STORAGE STAVY ---
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('theme') !== 'light'; } catch { return true; }
  });
  
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem('eas_editor_code') || "# Vítejte ve Workspace.\n# Systém čeká na vaše zadání..."; } catch { return "# Vítejte ve Workspace.\n# Systém čeká na vaše zadání..."; }
  });
  
  const [codeLang, setCodeLang] = useState(() => {
    try { return localStorage.getItem('eas_editor_lang') || 'python'; } catch { return 'python'; }
  });

  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('eas_chat_session');
      if (saved) {
        const msgs = JSON.parse(saved);
        if (Array.isArray(msgs) && msgs.length > 0) return msgs;
      }
    } catch {}
    return [{id:0, role:'system', content:'Inženýrský systém v9.3 online — Authenticated: Kelnape'}];
  });

  // --- REFS (Odkazy na DOM elementy) ---
  const liveEndRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const indexInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const msgIdRef = useRef(1);
  const lastUserMsgRef = useRef("");

  const nextId = () => msgIdRef.current++;

  // --- EFEKTY ---
  useEffect(() => {
    try { 
      const theme = isDark ? 'dark' : 'light';
      localStorage.setItem('theme', theme); 
      document.documentElement.setAttribute('data-theme', theme);
    } catch {}
  }, [isDark]);

  useEffect(() => {
    try { localStorage.setItem('eas_editor_code', code); localStorage.setItem('eas_editor_lang', codeLang); } catch {}
  }, [code, codeLang]);

  useEffect(() => {
    try { localStorage.setItem('eas_chat_session', JSON.stringify(chatMessages.slice(-60))); } catch {}
  }, [chatMessages]);

  useEffect(() => {
    if (isProcessing && liveEndRef.current) {
      liveEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [liveWorkspace, isProcessing]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, isProcessing]);

  useEffect(() => {
    if (window.Chart) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    apiFetch('/api/history').then(r=>r.json()).then(setTaskHistory).catch(()=>{});
    apiFetch('/api/models').then(r=>r.json()).then(d=>{ if(d.active) setActiveModel(d.active); }).catch(()=>{});
    const i = setInterval(async()=>{ try{ const r=await apiFetch('/api/alerts'); if(r.ok) setSysAlerts((await r.json()).alerts||[]); }catch{} },5000);
    return ()=>clearInterval(i);
  }, []);

  //useEffect(() => {
  //  if ('Notification' in window && Notification.permission === 'default') {
  //    Notification.requestPermission();
  //  }
  //}, []);

  // --- FUNKCE PRO APLIKACI ---
  const clearSession = () => {
    try { localStorage.removeItem('eas_chat_session'); } catch {}
    setChatMessages([{id:0, role:'system', content:'Session vymazána — Inženýrský systém v9.3'}]);
    setProjectPlan([]); setCurrentPlanStep(-1); setLiveWorkspace([]); setActiveAgent(null);
    apiFetch('/api/session/clear', { method: 'POST' }).catch(() => {});
  };

  const addMessage = useCallback((msg) => {
    setChatMessages(prev => [...prev, {id:nextId(), time:new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'}), ...msg}]);
  }, []);

  const handleFileSelect = async (e, type) => {
    const files = Array.from(e.target.files);
    const res = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve({id:Math.random().toString(36).substr(2,9), name:file.name, type, mime:file.type, data:ev.target.result, preview:type==='image'?URL.createObjectURL(file):null});
      reader.readAsDataURL(file);
    })));
    setAttachments(prev => [...prev, ...res]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => { const r=prev.find(a=>a.id===id); if(r?.preview) URL.revokeObjectURL(r.preview); return prev.filter(a=>a.id!==id); });
  };

  const handleLearn = async () => {
    const last = taskHistory[0];
    if (!last) { addMessage({role:'system',content:'❌ Historie je prázdná.'}); return; }
    addMessage({role:'system',content:'📚 Indexace do ChromaDB...'});
    setIsProcessing(true); setActiveAgent("REFLEKTOR");
    try {
      const r = await apiFetch('/api/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:last.query,code:last.code})});
      addMessage({role:'ai',agent:'REFLEKTOR',content:r.ok?'✅ Zlaté pravidlo uloženo do ChromaDB.':'❌ Chyba indexace.'});
    } catch { addMessage({role:'ai',agent:'REFLEKTOR',content:'❌ Chyba komunikace.'}); }
    finally { setIsProcessing(false); setActiveAgent(null); }
  };

  const handleLearnMessage = async ({ content, query, agent }) => {
    try {
      const r = await apiFetch('/api/learn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query || lastUserMsgRef.current || "—", content: content, type: 'user_learn', agent: agent || 'FINALIZER' })
      });
      if (r.ok) { setMemoryCount(prev => prev + 1); addMessage({ role: 'system', content: '🧠 Odpověď uložena do trvalé paměti' }); }
    } catch {}
  };

  const handleFeedback = async ({ task_id, query, response, thumbs }) => {
    try {
      await apiFetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id, query, response: response.slice(0,500), thumbs })
      });
      addMessage({ role: 'system', content: thumbs === 1 ? '👍 Díky za zpětnou vazbu!' : '👎 Feedback zaznamenán — pomůže zlepšení systému.' });
    } catch {}
  };

  const handleAddToQueue = async (message) => {
    if (!message.trim()) return;
    try {
      const r = await apiFetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, model_id: activeModel }) });
      if (r.ok) { addMessage({ role: 'system', content: `📋 ${(await r.json()).message}` }); }
    } catch {}
  };

  const handleModelSelect = async (modelId) => {
    try {
      const r = await apiFetch('/api/model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model_id:modelId})});
      if(r.ok){ setActiveModel(modelId); addMessage({role:'system',content:`🤖 Model přepnut na: ${modelId}`}); }
      else addMessage({role:'system',content:`❌ Chyba: ${(await r.json()).detail}`});
    } catch { addMessage({role:'system',content:'❌ Chyba při přepínání modelu.'}); }
  };

  const handleStop = () => {
    if(abortControllerRef.current){ abortControllerRef.current.abort(); addMessage({role:'system',content:'🛑 Úloha zastavena uživatelem.'}); setIsProcessing(false); setActiveAgent(null); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(code); setIsCopied(true); setTimeout(()=>setIsCopied(false),2000); };

  const isCreationTask = (msg) => {
    const t = msg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (t.includes('vytvor') || t.includes('naprogramuj') || t.includes('postav') || t.includes('napis') || t.includes('udelej')) && !t.includes('hledej') && !t.includes('zjisti');
  };

const detectDirectAgent = (msg) => {
    const msgLower = msg.toLowerCase().trim();
    const agentPatterns = [
      { patterns: ['sysadmin', 'sysadmine', 'sys admin'], id: 'SYSADMIN' },
      { patterns: ['specialista', 'specialisto', 'expert', 'experte', 'výzkumník'], id: 'SPECIALISTA' },
      { patterns: ['vývojář', 'vyvojar', 'vývojáři', 'vyvojari', 'kodér', 'programátor'], id: 'VYVOJAR' },
      { patterns: ['qa', 'qa inženýr', 'tester', 'testere', 'auditor', 'auditore'], id: 'QA' },
      { patterns: ['analytik', 'analytiku', 'analytika', 'reflektor'], id: 'REFLEKTOR' },
      { patterns: ['plánovač', 'planovac', 'planovače', 'planner'], id: 'PLANNER' },
      { patterns: ['manažer', 'manazer', 'manažere', 'manager'], id: 'MANAŽER' },
    ];
    for (const { patterns, id } of agentPatterns) {
      for (const pattern of patterns) {
        const regex1 = new RegExp(`^@?${pattern}[,\\s]+`, 'i');
        const regex2 = new RegExp(`^${pattern}\\s+`, 'i');
        if (regex1.test(msgLower) || regex2.test(msgLower)) {
          return { agent: id, cleanMessage: msg.replace(regex1, '').replace(regex2, '').trim(), originalAgent: pattern };
        }
      }
    }
    return null;
  };

  const notifyTaskDone = (query, hasCode, lang) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.hasFocus()) return; 
    new Notification('✅ Engineering AI — úkol dokončen', {
      body: `${query.length > 60 ? query.slice(0, 60) + '…' : query}\n${hasCode ? `💾 Kód (${LANG_LABELS[lang] || lang}) vygenerován` : '💬 Odpověď připravena'}`,
      icon: '/favicon.ico', tag: 'eas-task-done', silent: false,
    });
  };

  const executeTask = async (msg, projectSpecs = null) => {
    if (!msg && attachments.length===0) return;
    if (msg.toLowerCase().trim()==='tohle se nauč') { handleLearn(); return; }

    if (isCreationTask(msg) && !projectSpecs) {
      setPendingMessage(msg); setIntakeOpen(true); return;
    }

    const directAgent = detectDirectAgent(msg);
    const messageToSend = directAgent ? directAgent.cleanMessage : msg;
    const targetAgent = directAgent ? directAgent.agent : null;
    
    if (directAgent) {
      const agentInfo = AGENTS.find(a => a.id === directAgent.agent);
      addMessage({ role: 'system', content: `🎯 Přímé oslovení: ${agentInfo?.label || directAgent.agent}` });
    }

    setMobileTab('chat'); addMessage({role:'user', content: msg});
    lastUserMsgRef.current = msg; setProjectPlan([]); setCurrentPlanStep(-1);
    setIsProcessing(true); setActiveAgent(targetAgent || "MANAZER"); setLiveWorkspace([]); setShowLiveLog(true);
    abortControllerRef.current = new AbortController();
    const filesToUpload = attachments.map(a=>({name:a.name,type:a.type,mime:a.mime,data:a.data}));
    setAttachments([]);

    try {
      const response = await apiFetch('/api/chat',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message: messageToSend, files: filesToUpload, model_id: activeModel,
          project_specs: projectSpecs || {}, current_editor_code: code || '',
          current_editor_lang: codeLang || 'python', direct_agent: targetAgent,
        }),
        signal:abortControllerRef.current.signal
      });
      const reader = response.body.getReader(); const decoder = new TextDecoder();
      let partialLine = "", agentsSeen = [];

      while(true) {
        const {done,value} = await reader.read(); if(done) break;
        const lines = (partialLine + decoder.decode(value)).split('\n'); partialLine = lines.pop();
        for(const line of lines) {
          if(!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if(data.type==='plan'){ setProjectPlan(data.tasks); setCurrentPlanStep(0); addMessage({role:'system',content:`📋 Plánovač: ${data.tasks.length} kroků`}); }
            else if(data.type==='plan_progress'){ setCurrentPlanStep(data.step_index); }
            else if(data.type==='info'){ addMessage({role:'system', content: data.message}); }
            else if(data.type==='files_processed'){ addMessage({role:'system', content: `📎 ${data.summary}`}); }
            else if(data.type==='agent_output'){
              setLiveWorkspace(prev => [...prev, { node: data.node, content: data.content, lang: data.lang || 'text', time: new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) }]);
            }
            else if(data.type==='progress'){
              const id=data.node.toUpperCase(); setActiveAgent(id);
              if(!agentsSeen.includes(id)){
                agentsSeen.push(id); const a=AGENTS.find(x=>x.id===id); if(a) addMessage({role:'system',content:`→ ${a.label}`});
              }
              if(!['MANAZER','PLANNER','NEXTSTEP','FINALIZER'].includes(id)) {
                const a = AGENTS.find(x=>x.id===id);
                setCode(`# ⚙️ ${a?.label || id} pracuje...\n# Čekám na výsledek...`); setCodeLang('python');
              }
            }
            else if(data.type==='final'){
              setActiveAgent(null);
              addMessage({role:'ai', agent:data.node || 'FINALIZER', content:data.response, task_id: data.task_id||'', quality: null, qualityReason:'', additional_kwargs: data.additional_kwargs});
              if(data.code){
                setCode(data.code); setCodeLang(data.lang||'python'); setIsEditing(false); setRunOutput(null);
                addMessage({role:'system',content:`💾 Kód (${LANG_LABELS[data.lang]||data.lang}) uložen do editoru`});
                if(data.lang === 'html') { setShowPreview(true); setMobileTab('code'); addMessage({role:'system',content:'👁️ Live preview zapnut — přepni na záložku Kód/Preview'}); }
              } else {
                setCode('# Úkol dokončen — bez kódu.\n# Výsledek viz chat vlevo.'); setCodeLang('python');
              }
              setTaskHistory(prev=>[{query:msg,response:data.response,code:data.code,date:data.date||new Date().toLocaleTimeString(),model:data.model,hasCode:!!data.code},...prev]);
              notifyTaskDone(msg, !!data.code, data.lang);
            } else if(data.type==='error'){
              setActiveAgent(null); addMessage({role:'system',content:`❌ ${data.message}`});
            }
          } catch {}
        }
      }
    } catch(e) { if(e.name!=='AbortError') addMessage({role:'system',content:'❌ Kritická chyba komunikace.'}); } 
    finally { setIsProcessing(false); setActiveAgent(null); }
  };

  const handleZipExport = async () => {
    if (!code || codeLang !== 'html') return;
    addMessage({role:'system', content:'📦 Generuji ZIP archiv projektu...'});
    try {
      const r = await apiFetch('/api/export-zip', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({html: code, project_name: 'web-projekt'}) });
      const d = await r.json();
      if(d.status==='ok') {
        const bytes = atob(d.data); const ab = new ArrayBuffer(bytes.length); const ua = new Uint8Array(ab);
        for(let i=0;i<bytes.length;i++) ua[i]=bytes.charCodeAt(i);
        const blob = new Blob([ab], {type:'application/zip'}); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download=d.filename; a.click(); URL.revokeObjectURL(url);
        addMessage({role:'system', content:`✅ ZIP stažen: ${d.filename} (${d.size_kb}KB) — ${d.files.join(', ')}`});
      }
    } catch { addMessage({role:'system', content:'❌ Chyba při generování ZIP'}); }
  };

  const handleRun = async () => {
    if (!code.trim() || isRunning) return;
    if (codeLang === 'html') { setShowPreview(true); return; }
    if (!['python','bash','javascript'].includes(codeLang)) { setRunOutput({status:'error', output:`Spuštění jazyka '${codeLang}' není podporováno.`, duration_ms:0}); return; }
    setIsRunning(true); setRunOutput(null);
    try {
      const r = await apiFetch('/api/run', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({code, lang: codeLang}) });
      setRunOutput(await r.json());
    } catch(e) { setRunOutput({status:'error', output:`❌ Chyba komunikace: ${e.message}`, duration_ms:0}); }
    setIsRunning(false);
  };

  // --- EXPORT VŠEHO POTŘEBNÉHO PRO APP.JSX ---
  return {
    input, setInput, isLibraryOpen, setIsLibraryOpen, isHistoryOpen, setIsHistoryOpen, isGitOpen, setIsGitOpen,
    isQueueOpen, setIsQueueOpen, isTelemetryOpen, setIsTelemetryOpen, isMemoryOpen, setIsMemoryOpen, workflowOpen, setWorkflowOpen,
    templatesOpen, setTemplatesOpen, settingsOpen, setSettingsOpen, exportOpen, setExportOpen, codeServerOpen, setCodeServerOpen,
    isPromptEditorOpen, setIsPromptEditorOpen, intakeOpen, setIntakeOpen, pendingMessage, setPendingMessage, mobileTab, setMobileTab,
    showPreview, setShowPreview, showLiveLog, setShowLiveLog, isEditing, setIsEditing, memoryCount, setMemoryCount, attachments, setAttachments,
    sysAlerts, setSysAlerts, taskHistory, setTaskHistory, activeAgent, setActiveAgent, isProcessing, setIsProcessing, isCopied, setIsCopied,
    projectPlan, setProjectPlan, currentPlanStep, setCurrentPlanStep, activeModel, setActiveModel, liveWorkspace, setLiveWorkspace,
    runOutput, setRunOutput, isRunning, setIsRunning, isDark, setIsDark, code, setCode, codeLang, setCodeLang, chatMessages, setChatMessages,
    liveEndRef, chatEndRef, chatContainerRef, fileInputRef, imageInputRef, indexInputRef, abortControllerRef, msgIdRef, lastUserMsgRef,
    clearSession, addMessage, handleFileSelect, removeAttachment, handleLearn, handleLearnMessage, handleFeedback, handleAddToQueue,
    handleModelSelect, handleStop, handleCopy, isCreationTask, detectDirectAgent, notifyTaskDone, executeTask, handleZipExport, handleRun
  };
};