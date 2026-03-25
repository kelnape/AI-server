import React, { useState } from 'react';
import { 
  X, Download, FileJson, FileText, File, 
  MessageSquare, Code, CheckCircle, Copy, Archive
} from 'lucide-react';
import { Overlay } from '../common/Overlay';

const ExportOption = ({ icon: Icon, label, description, format, color, onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="w-full p-4 rounded-2xl border theme-border-cls text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ background: 'var(--bg-card)' }}
  >
    <div className="flex items-start gap-3">
      <div 
        className="p-2.5 rounded-xl shrink-0"
        style={{ background: `${color}20` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-white text-sm">{label}</span>
          <span 
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${color}20`, color }}
          >
            {format}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {description}
        </p>
      </div>
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin shrink-0" />
      ) : (
        <Download size={16} className="text-gray-500 shrink-0" />
      )}
    </div>
  </button>
);

export const ExportDrawer = ({ isOpen, onClose, messages = [], code = '', codeLang = 'python' }) => {
  const [loading, setLoading] = useState(null);
  const [success, setSuccess] = useState(null);

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTimestamp = () => {
    return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  };

  const exportChatJSON = () => {
    setLoading('chat-json');
    setTimeout(() => {
      const data = {
        exported_at: new Date().toISOString(),
        total_messages: messages.length,
        messages: messages.map(m => ({
          role: m.role,
          agent: m.agent || null,
          content: m.content,
          time: m.time || null,
        }))
      };
      downloadFile(JSON.stringify(data, null, 2), `chat-export-${getTimestamp()}.json`, 'application/json');
      setLoading(null);
      setSuccess('chat-json');
      setTimeout(() => setSuccess(null), 2000);
    }, 500);
  };

  const exportChatMarkdown = () => {
    setLoading('chat-md');
    setTimeout(() => {
      let md = `# Chat Export\n\n`;
      md += `> Exportováno: ${new Date().toLocaleString('cs-CZ')}\n\n`;
      md += `---\n\n`;
      
      messages.forEach(m => {
        if (m.role === 'system') {
          md += `*${m.content}*\n\n`;
        } else if (m.role === 'user') {
          md += `### 👤 Uživatel\n\n${m.content}\n\n`;
        } else {
          const agent = m.agent ? `[${m.agent}]` : '';
          md += `### 🤖 AI ${agent}\n\n${m.content}\n\n`;
        }
        md += `---\n\n`;
      });
      
      downloadFile(md, `chat-export-${getTimestamp()}.md`, 'text/markdown');
      setLoading(null);
      setSuccess('chat-md');
      setTimeout(() => setSuccess(null), 2000);
    }, 500);
  };

  const exportCode = () => {
    if (!code.trim()) return;
    setLoading('code');
    setTimeout(() => {
      const ext = {
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        html: 'html',
        css: 'css',
        json: 'json',
        sql: 'sql',
        bash: 'sh',
        yaml: 'yaml',
      }[codeLang] || 'txt';
      
      downloadFile(code, `code-export-${getTimestamp()}.${ext}`, 'text/plain');
      setLoading(null);
      setSuccess('code');
      setTimeout(() => setSuccess(null), 2000);
    }, 300);
  };

  const exportAll = () => {
    setLoading('all');
    setTimeout(() => {
      const data = {
        exported_at: new Date().toISOString(),
        chat: {
          total_messages: messages.length,
          messages: messages.map(m => ({
            role: m.role,
            agent: m.agent || null,
            content: m.content,
            time: m.time || null,
          }))
        },
        code: {
          language: codeLang,
          content: code,
          lines: code.split('\n').length,
        }
      };
      downloadFile(JSON.stringify(data, null, 2), `full-export-${getTimestamp()}.json`, 'application/json');
      setLoading(null);
      setSuccess('all');
      setTimeout(() => setSuccess(null), 2000);
    }, 500);
  };

  const copyToClipboard = async (content, id) => {
    await navigator.clipboard.writeText(content);
    setSuccess(id);
    setTimeout(() => setSuccess(null), 2000);
  };

  const chatCount = messages.filter(m => m.role !== 'system').length;
  const codeLines = code.split('\n').length;

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[26rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4">
          
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-xl">
                <Download size={18} className="text-cyan-400"/>
              </div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">
                  Export
                </h2>
                <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">
                  Stáhnout chat a kód
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white"
            >
              <X size={17}/>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={14} className="text-blue-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Zprávy</span>
              </div>
              <span className="text-xl font-black text-white">{chatCount}</span>
            </div>
            <div className="p-3 rounded-xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Code size={14} className="text-emerald-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Řádky kódu</span>
              </div>
              <span className="text-xl font-black text-white">{codeLines}</span>
            </div>
          </div>

          {/* Export options */}
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">
              Chat
            </h3>
            
            <ExportOption
              icon={FileJson}
              label="Chat jako JSON"
              description="Strukturovaný formát pro další zpracování"
              format="JSON"
              color="#f59e0b"
              onClick={exportChatJSON}
              loading={loading === 'chat-json'}
            />
            
            <ExportOption
              icon={FileText}
              label="Chat jako Markdown"
              description="Čitelný formát pro dokumentaci"
              format="MD"
              color="#8b5cf6"
              onClick={exportChatMarkdown}
              loading={loading === 'chat-md'}
            />

            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1 pt-2">
              Kód
            </h3>
            
            <ExportOption
              icon={Code}
              label={`Kód jako ${codeLang}`}
              description="Aktuální obsah editoru"
              format={codeLang.toUpperCase()}
              color="#10b981"
              onClick={exportCode}
              loading={loading === 'code'}
            />

            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1 pt-2">
              Kompletní
            </h3>
            
            <ExportOption
              icon={Archive}
              label="Vše v jednom"
              description="Chat + kód v jednom JSON souboru"
              format="JSON"
              color="#3b82f6"
              onClick={exportAll}
              loading={loading === 'all'}
            />
          </div>

          {/* Quick copy */}
          <div className="pt-3 border-t theme-border-cls space-y-2 shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Rychlé kopírování
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(messages.map(m => `${m.role}: ${m.content}`).join('\n\n'), 'copy-chat')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-bold ${
                  success === 'copy-chat'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-black/20 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {success === 'copy-chat' ? <CheckCircle size={12} /> : <Copy size={12} />}
                Chat
              </button>
              <button
                onClick={() => copyToClipboard(code, 'copy-code')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-bold ${
                  success === 'copy-code'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-black/20 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {success === 'copy-code' ? <CheckCircle size={12} /> : <Copy size={12} />}
                Kód
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 text-center text-[9px] font-mono theme-text-xs-cls shrink-0">
            Soubory se stahují přímo do prohlížeče
          </div>
        </div>
      </div>
    </>
  );
};
