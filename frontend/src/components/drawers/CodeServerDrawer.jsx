import React, { useState, useEffect } from 'react';
import { 
  X, Code, Play, Square, RefreshCw, ExternalLink, 
  Copy, CheckCircle, AlertCircle, Server, Globe, Key, Eye, EyeOff
} from 'lucide-react';
import { Overlay } from '../common/Overlay';
import { apiFetch } from '../../api/client';

const StatusBadge = ({ running, label }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
    running 
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : 'bg-red-500/20 text-red-400 border border-red-500/30'
  }`}>
    <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
    {label}: {running ? 'Online' : 'Offline'}
  </div>
);

export const CodeServerDrawer = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/code-server/status');
      if (r.ok) {
        setStatus(await r.json());
      }
    } catch (e) {
      console.error('Code-server status error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      // Auto-refresh kazdych 10 sekund
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      const r = await apiFetch('/api/code-server/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await r.json();
      if (data.success) {
        // Pockej a obnov status
        setTimeout(fetchStatus, 2000);
      }
    } catch (e) {
      console.error('Code-server action error:', e);
    }
    setActionLoading(null);
  };

  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const openCodeServer = () => {
    if (status?.url) {
      window.open(status.url, '_blank');
    } else if (status?.local_url) {
      window.open(status.local_url, '_blank');
    }
  };

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[26rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4">
          
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-xl">
                <Code size={18} className="text-violet-400"/>
              </div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">
                  Code Server
                </h2>
                <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">
                  Vzdaleny VS Code Editor
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

          {loading && !status ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"/>
                <span className="text-xs text-gray-500">Nacitam stav...</span>
              </div>
            </div>
          ) : status ? (
            <>
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge running={status.code_server_running} label="Code Server" />
                <StatusBadge running={status.tunnel_running} label="Tunel" />
              </div>

              {/* Akcni tlacitka */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAction('start')}
                  disabled={actionLoading || (status.code_server_running && status.tunnel_running)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'start' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Play size={14} />
                  )}
                  Start
                </button>
                
                <button
                  onClick={() => handleAction('stop')}
                  disabled={actionLoading || (!status.code_server_running && !status.tunnel_running)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'stop' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Square size={14} />
                  )}
                  Stop
                </button>
                
                <button
                  onClick={() => handleAction('restart')}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'restart' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Restart
                </button>
              </div>

              {/* URL info */}
              <div className="p-4 rounded-2xl border theme-border-cls space-y-3" style={{ background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <Globe size={12} />
                  Pristupova URL
                </div>
                
                {status.url ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={status.url}
                      readOnly
                      className="flex-1 px-3 py-2 bg-black/30 border theme-border-cls rounded-lg text-sm text-white font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(status.url, 'url')}
                      className="p-2 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg text-violet-400 transition-all"
                    >
                      {copied === 'url' ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                    <AlertCircle size={14} />
                    Tunel neni nakonfigurovan
                  </div>
                )}
                
                {status.local_url && (
                  <div className="text-[10px] text-gray-500">
                    Lokalni: <span className="text-gray-400 font-mono">{status.local_url}</span>
                  </div>
                )}
              </div>

              {/* Heslo */}
              <div className="p-4 rounded-2xl border theme-border-cls space-y-3" style={{ background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <Key size={12} />
                  Pristupove heslo
                </div>
                
                {status.password ? (
                  <div className="flex items-center gap-2">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={status.password}
                      readOnly
                      className="flex-1 px-3 py-2 bg-black/30 border theme-border-cls rounded-lg text-sm text-white font-mono"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 bg-gray-500/10 hover:bg-gray-500/20 rounded-lg text-gray-400 transition-all"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(status.password, 'password')}
                      className="p-2 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg text-violet-400 transition-all"
                    >
                      {copied === 'password' ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                    <AlertCircle size={14} />
                    Heslo neni nastaveno
                  </div>
                )}
              </div>

              {/* Otevrit tlacitko */}
              <button
                onClick={openCodeServer}
                disabled={!status.code_server_running || !status.tunnel_running}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-2xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
              >
                <Code size={20} />
                Otevrit VS Code v prohlizeci
                <ExternalLink size={16} />
              </button>

              {/* Info */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-[10px] text-blue-300 leading-relaxed">
                  <strong>Tip:</strong> Code-server bezi na tvem serveru a je pristupny pres zabezpeceny Cloudflare tunel. 
                  Muzes editovat kod odkudkoliv.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Server size={48} className="text-gray-700 mx-auto mb-3"/>
                <p className="text-sm text-gray-500">Nepodarilo se nacist stav</p>
                <button
                  onClick={fetchStatus}
                  className="mt-3 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg text-xs font-bold"
                >
                  Zkusit znovu
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t theme-border-cls flex items-center justify-between text-[9px] font-mono theme-text-xs-cls shrink-0">
            <span>VS Code Server</span>
            <button 
              onClick={fetchStatus}
              className="text-violet-500/60 hover:text-violet-400 transition-colors"
            >
              ↻ Obnovit
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
