import React, { useState, useEffect } from 'react';
import { X, GitCommit, Globe, FileText, Clock, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { GIT_REPO_PATH } from '../../config/constants';
import { Overlay } from '../common/Overlay';

const FILE_STATUS_COLORS = {
  modified:  { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'M' },
  added:     { color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'A' },
  deleted:   { color: 'text-red-400',    bg: 'bg-red-500/10',    label: 'D' },
  renamed:   { color: 'text-blue-400',   bg: 'bg-blue-500/10',   label: 'R' },
  untracked: { color: 'text-gray-400',   bg: 'bg-white/5',       label: '?' },
};

export const GitDrawer = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/git/status');
      if (r.ok) setStatus(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (isOpen) { load(); setResult(null); } }, [isOpen]);

  const handleCommit = async () => {
    setPushing(true); setResult(null);
    try {
      const r = await apiFetch('/api/git/commit', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ message: commitMsg, push: true })
      });
      const d = await r.json();
      setResult(d);
      setCommitMsg('');
      await load();
    } catch(e) { setResult({ status: 'error', steps: [{step:'network', ok:false, out: e.message}] }); }
    setPushing(false);
  };

  const handlePull = async () => {
    setPulling(true); setResult(null);
    try {
      const r = await apiFetch('/api/git/pull', { method: 'POST' });
      const d = await r.json();
      setResult({ status: d.status, steps: [{step:'pull', ok: d.status==='ok', out: d.out}] });
      await load();
    } catch {}
    setPulling(false);
  };

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[32rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col`}>

        {/* Header */}
        <div className="px-6 py-5 border-b theme-border-cls flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-xl"><GitCommit size={18} className="text-orange-400"/></div>
            <div>
              <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Git</h2>
              <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">
                {status ? `větev: ${status.branch}  •  ${status.changed.length} změn` : 'Načítám...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <div className="flex items-center gap-1.5">
                {status.ahead > 0 && <span className="text-[9px] font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">↑ {status.ahead} ahead</span>}
                {status.behind > 0 && <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg">↓ {status.behind} behind</span>}
                {status.clean && <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">✓ clean</span>}
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white"><X size={17}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-3 theme-text-xs-cls">
              <div className="w-4 h-4 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin"/>
              <span className="text-xs font-mono">Načítám Git status...</span>
            </div>
          ) : status ? (
            <>
              {/* Remote info */}
              {status.remote && (
                <div className="bg-white/3 rounded-xl border theme-border-cls px-4 py-3 flex items-center gap-3">
                  <Globe size={13} className="theme-text-xs-cls shrink-0"/>
                  <span className="text-[10px] font-mono theme-text-sm-cls truncate">{status.remote.split('\t')[1]?.split(' ')[0] || status.remote}</span>
                </div>
              )}

              {/* Změněné soubory */}
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest theme-text-xs-cls mb-2 flex items-center gap-2">
                  <FileText size={11}/> Změněné soubory ({status.changed.length})
                </div>
                {status.changed.length === 0 ? (
                  <div className="text-[11px] theme-text-xs-cls font-mono text-center py-4">Žádné změny — repozitář je čistý ✓</div>
                ) : (
                  <div className="space-y-1">
                    {status.changed.map((f, i) => {
                      const s = FILE_STATUS_COLORS[f.status] || FILE_STATUS_COLORS.untracked;
                      return (
                        <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border theme-border-cls ${s.bg}`}>
                          <span className={`text-[9px] font-black w-4 text-center ${s.color}`}>{s.label}</span>
                          <span className="text-[11px] font-mono text-gray-300 truncate">{f.file}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Commit zpráva + akce */}
              <div className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest theme-text-xs-cls mb-2 flex items-center gap-2">
                  <GitCommit size={11}/> Commit & Push
                </div>
                <textarea
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder={`feat: popis změn\n\nPrázdné = auto zpráva s časem`}
                  rows={3}
                  className="w-full theme-input-bg border theme-border-cls rounded-xl px-3 py-2.5 text-[11px] font-mono theme-text-cls focus:outline-none focus:border-orange-500/40 theme-placeholder resize-none custom-scrollbar"
                />
                <div className="flex gap-2">
                  <button onClick={handlePull} disabled={pulling || pushing}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 rounded-xl text-[10px] font-black disabled:opacity-30 transition-all">
                    {pulling ? <div className="w-3 h-3 border-2 border-blue-700 border-t-blue-400 rounded-full animate-spin"/> : <ArrowRight size={12} className="rotate-180"/>}
                    Pull
                  </button>
                  <button onClick={handleCommit} disabled={pushing || pulling || status.clean}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 text-orange-300 rounded-xl text-[10px] font-black disabled:opacity-30 transition-all">
                    {pushing ? <div className="w-3 h-3 border-2 border-orange-700 border-t-orange-400 rounded-full animate-spin"/> : <GitCommit size={13}/>}
                    {pushing ? 'Odesílám...' : 'Commit + Push'}
                  </button>
                </div>
              </div>

              {/* Výsledek operace */}
              {result && (
                <div className={`rounded-xl border p-4 space-y-2 ${result.status==='ok'?'bg-emerald-500/10 border-emerald-500/20':'bg-red-500/10 border-red-500/20'}`}>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${result.status==='ok'?'text-emerald-400':'text-red-400'}`}>
                    {result.status==='ok' ? '✅ Úspěch' : result.status==='partial' ? '⚠️ Částečně' : '❌ Chyba'}
                  </div>
                  {result.steps?.map((s, i) => (
                    <div key={i} className="text-[10px] font-mono text-gray-400">
                      <span className={s.ok?'text-emerald-400':'text-red-400'}>{s.ok?'✓':'✗'} {s.step}:</span> {s.out?.split('\n')[0]}
                    </div>
                  ))}
                </div>
              )}

              {/* Historie commitů */}
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest theme-text-xs-cls mb-2 flex items-center gap-2">
                  <Clock size={11}/> Poslední commity
                </div>
                <div className="space-y-1">
                  {status.commits.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-white/3 rounded-xl border theme-border-cls">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60 mt-1.5 shrink-0"/>
                      <span className="text-[10px] font-mono text-gray-400 leading-relaxed">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 theme-text-xs-cls text-sm">Git není dostupný nebo repozitář není inicializovaný</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t theme-border-cls flex items-center justify-between shrink-0">
          <button onClick={load} className="text-[9px] font-mono text-orange-500/60 hover:text-orange-400 transition-colors">↻ Obnovit</button>
          <span className="text-[9px] font-mono text-gray-700">{GIT_REPO_PATH || 'SysAdmin: git status, commit, push'}</span>
        </div>
      </div>
    </>
  );
};
