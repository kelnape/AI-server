import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Key, Eye, EyeOff, Check, AlertCircle,
  Zap, Sparkles, Save, RefreshCw, Shield, Server
} from 'lucide-react';
import { Overlay } from '../common/Overlay';
import { apiFetch } from '../../api/client';

const ApiKeyInput = ({ provider, label, icon: Icon, color, configured, preview, onSave }) => {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    setResult(null);
    
    try {
      const r = await apiFetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: value.trim() })
      });
      const data = await r.json();
      
      if (data.success) {
        setResult({ type: 'success', message: data.message });
        setValue('');
      } else {
        setResult({ type: 'error', message: data.error });
      }
    } catch (e) {
      setResult({ type: 'error', message: 'Chyba při ukládání' });
    }
    
    setSaving(false);
  };

  return (
    <div className="p-4 rounded-2xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-xl"
            style={{ background: `${color}20` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{label}</h3>
            <p className="text-[9px] text-gray-500 font-mono">
              {configured ? `Nakonfigurováno: ${preview}` : 'Není nastaven'}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
          configured 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {configured ? 'Aktivní' : 'Chybí'}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={configured ? 'Zadat nový klíč...' : 'Zadat API klíč...'}
            className="w-full px-3 py-2.5 pr-10 bg-black/30 border theme-border-cls rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 font-mono"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!value.trim() || saving}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Uložit
        </button>
      </div>

      {result && (
        <div className={`mt-3 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2 ${
          result.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {result.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {result.message}
        </div>
      )}
    </div>
  );
};

export const SettingsDrawer = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/settings');
      if (r.ok) {
        setSettings(await r.json());
      }
    } catch (e) {
      console.error('Settings fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[28rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500/10 rounded-xl">
                <Settings size={18} className="text-slate-400"/>
              </div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">
                  Nastavení
                </h2>
                <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">
                  API klíče a konfigurace
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

          {/* Info */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Shield size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-300 leading-relaxed">
                API klíče jsou uloženy v .env souboru na serveru. Po změně klíče restartuj backend pro plnou aplikaci změn.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin"/>
                <span className="text-xs text-gray-500">Načítám nastavení...</span>
              </div>
            </div>
          ) : settings ? (
            <div className="space-y-4 flex-1">
              {/* OpenAI */}
              <ApiKeyInput
                provider="openai"
                label="OpenAI API"
                icon={Zap}
                color="#22c55e"
                configured={settings.openai_configured}
                preview={settings.openai_preview}
                onSave={fetchSettings}
              />

              {/* Anthropic */}
              <ApiKeyInput
                provider="anthropic"
                label="Anthropic API"
                icon={Sparkles}
                color="#f97316"
                configured={settings.anthropic_configured}
                preview={settings.anthropic_preview}
                onSave={fetchSettings}
              />

              {/* Server info */}
              <div className="p-4 rounded-2xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20">
                    <Server size={16} className="text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Server</h3>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Backend URL</span>
                    <span className="text-gray-300 font-mono">localhost:8000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frontend URL</span>
                    <span className="text-gray-300 font-mono">localhost:5173</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Databáze</span>
                    <span className="text-gray-300 font-mono">SQLite</span>
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="p-4 rounded-2xl border border-red-500/30" style={{ background: 'rgba(239,68,68,0.05)' }}>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3">
                  Danger Zone
                </h3>
                <p className="text-[10px] text-red-300/60 mb-3">
                  Tyto akce nelze vrátit zpět.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (window.confirm('Opravdu smazat celou historii úloh?')) {
                        apiFetch('/api/session/clear', { method: 'POST' });
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold transition-all"
                  >
                    Smazat historii
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('Opravdu vymazat celou paměť systému?')) {
                        apiFetch('/api/memory/clear', { method: 'POST' });
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold transition-all"
                  >
                    Smazat paměť
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Settings size={48} className="text-gray-700 mx-auto mb-3"/>
                <p className="text-sm text-gray-500">Nepodařilo se načíst nastavení</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t theme-border-cls flex items-center justify-between text-[9px] font-mono theme-text-xs-cls shrink-0">
            <span>EAS v1.0.0</span>
            <button 
              onClick={fetchSettings}
              className="text-slate-500/60 hover:text-slate-400 transition-colors"
            >
              ↻ Obnovit
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
