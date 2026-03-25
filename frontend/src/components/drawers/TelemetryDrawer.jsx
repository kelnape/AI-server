import React, { useState, useEffect, useRef } from 'react';
import { BarChart2, TrendingUp, DollarSign, X, AlertTriangle, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { AGENT_COLORS_HEX } from '../../config/constants';
import { Overlay } from '../common/Overlay';

export const TelemetryDrawer = ({ isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(0);
  const [clearing, setClearing] = useState(false);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch('/api/telemetry?limit=10');
      if (r.ok) {
        const json = await r.json();
        setData(json);
      } else {
        const err = await r.json().catch(() => ({}));
        setError(`API chyba ${r.status}: ${err.detail || r.statusText}`);
      }
    } catch(e) {
      setError(`Síťová chyba: ${e.message}`);
    }
    setLoading(false);
  };

  useEffect(() => { if (isOpen) { load(); setSelectedTask(0); } }, [isOpen]);

  useEffect(() => {
    if (!data?.tasks?.length || !canvasRef.current) return;
    const task = data.tasks[selectedTask];
    if (!task) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const agents = task.agents.sort((a,b) => b.input_tokens+b.output_tokens - (a.input_tokens+a.output_tokens));
    const labels = agents.map(a => a.agent_id);
    const colors = labels.map(l => AGENT_COLORS_HEX[l] || '#64748b');

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Input tokeny',
            data: agents.map(a => a.input_tokens),
            backgroundColor: colors.map(c => c + '55'),
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            label: 'Output tokeny',
            data: agents.map(a => a.output_tokens),
            backgroundColor: colors.map(c => c + '99'),
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 6,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 10, family: 'monospace' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const agent = agents[ctx.dataIndex];
                return `Cena: $${agent.cost_usd.toFixed(5)} | ${agent.duration_ms}ms`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } }, grid: { color: '#ffffff08' } },
          y: { ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } }, grid: { color: '#ffffff08' } },
        }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, selectedTask]);

  const handleClear = async () => {
    setClearing(true);
    await apiFetch('/api/telemetry', { method: 'DELETE' });
    setData(null); setClearing(false);
  };

  const task = data?.tasks?.[selectedTask];
  const WARN_USD = 0.05;

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[32rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col`}>

        {/* Header */}
        <div className="px-6 py-5 border-b theme-border-cls flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl"><BarChart2 size={18} className="text-blue-400"/></div>
            <div>
              <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Telemetrie</h2>
              <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">Tokeny & cena per agent / úkol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white"><X size={17}/></button>
        </div>

        {/* Celkové součty */}
        {data?.totals && (
          <div className="px-6 py-4 border-b theme-border-cls grid grid-cols-3 gap-3 shrink-0">
            {[
              { label: 'Celkem vstup', val: data.totals.input_tokens.toLocaleString(), icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Celkem výstup', val: data.totals.output_tokens.toLocaleString(), icon: TrendingUp, color: 'text-purple-400' },
              { label: 'Celková cena', val: `$${data.totals.cost_usd.toFixed(4)}`, icon: DollarSign,
                color: data.totals.cost_usd > WARN_USD ? 'text-red-400' : 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <s.icon size={14} className={`${s.color} mx-auto mb-1`}/>
                <div className={`text-sm font-black ${s.color}`}>{s.val}</div>
                <div className="text-[9px] theme-text-xs-cls font-mono mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Výběr úkolu */}
        {data?.tasks?.length > 0 && (
          <div className="px-6 py-3 border-b theme-border-cls shrink-0">
            <div className="text-[9px] font-black uppercase tracking-widest theme-text-xs-cls mb-2">Výběr úkolu</div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {data.tasks.map((t, i) => (
                <button key={t.task_id} onClick={() => setSelectedTask(i)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-black transition-all border ${i===selectedTask?'bg-blue-500/20 border-blue-500/40 text-blue-300':'bg-white/5 theme-border-cls theme-text-sm-cls hover:text-gray-300'}`}>
                  <div>#{i+1}</div>
                  <div className="text-[8px] font-mono opacity-60 mt-0.5">${t.total_cost.toFixed(4)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-3 theme-text-xs-cls">
              <div className="w-4 h-4 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
              <span className="text-xs font-mono">Načítám data...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <div className="p-4 bg-red-500/10 rounded-2xl"><BarChart2 size={28} className="text-red-400"/></div>
              <div>
                <p className="text-sm font-bold text-red-400">Chyba načítání</p>
                <p className="text-[10px] text-red-300/60 mt-1 font-mono">{error}</p>
                <button onClick={load} className="mt-3 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black">↺ Zkusit znovu</button>
              </div>
            </div>
          ) : !data?.tasks?.length ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
              <div className="p-4 bg-white/5 rounded-2xl"><BarChart2 size={28} className="text-gray-700"/></div>
              <div>
                <p className="text-sm font-bold theme-text-sm-cls">Žádná telemetrie</p>
                <p className="text-[10px] text-gray-700 mt-1">Data se začnou shromažďovat<br/>od příštího úkolu</p>
                <button onClick={load} className="mt-3 px-3 py-1.5 bg-blue-500/10 theme-text-sm-cls rounded-lg text-[10px]">↺ Obnovit</button>
              </div>
            </div>
          ) : task ? (
            <>
              {/* Graf */}
              <div className="theme-input-bg rounded-2xl p-4 border theme-border-cls">
                <div className="text-[9px] font-black uppercase tracking-widest theme-text-xs-cls mb-3 flex items-center gap-2">
                  <BarChart2 size={11}/> Distribuce tokenů — Úkol #{selectedTask+1}
                </div>
                <div style={{height: '180px'}}>
                  <canvas ref={canvasRef}/>
                </div>
              </div>

              {/* Souhrn úkolu */}
              <div className="bg-white/3 rounded-2xl border theme-border-cls p-4 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="theme-text-xs-cls font-mono">Model</span>
                  <span className="text-gray-300 font-bold">{task.model}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="theme-text-xs-cls font-mono">Celkem tokenů</span>
                  <span className="text-gray-300 font-bold">{(task.total_input+task.total_output).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="theme-text-xs-cls font-mono">Celková cena</span>
                  <span className={`font-black ${task.total_cost > WARN_USD ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${task.total_cost.toFixed(5)}
                    {task.total_cost > WARN_USD && <AlertTriangle size={10} className="inline ml-1"/>}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="theme-text-xs-cls font-mono">Celková doba</span>
                  <span className="text-gray-300 font-bold">{(task.total_ms/1000).toFixed(1)}s</span>
                </div>
              </div>

              {/* Tabulka agentů */}
              <div className="theme-input-bg rounded-2xl border theme-border-cls overflow-hidden">
                <div className="px-4 py-2 border-b theme-border-cls text-[9px] font-black uppercase tracking-widest theme-text-xs-cls">
                  Detail per agent
                </div>
                <div className="divide-y divide-white/5">
                  {task.agents
                    .sort((a,b) => b.input_tokens+b.output_tokens - (a.input_tokens+a.output_tokens))
                    .map(a => {
                      const color = AGENT_COLORS_HEX[a.agent_id] || '#64748b';
                      const total = a.input_tokens + a.output_tokens;
                      const taskTotal = task.total_input + task.total_output || 1;
                      const pct = Math.round(total / taskTotal * 100);
                      return (
                        <div key={a.agent_id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black" style={{color}}>{a.agent_id}</span>
                            <div className="flex items-center gap-3 text-[9px] font-mono">
                              <span className="theme-text-sm-cls">{total.toLocaleString()} tok.</span>
                              <span className="text-emerald-400 font-bold">${a.cost_usd.toFixed(5)}</span>
                              <span className="theme-text-xs-cls">{a.duration_ms}ms</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{width:`${pct}%`, backgroundColor: color + 'aa'}}/>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t theme-border-cls flex items-center justify-between shrink-0">
          <button onClick={load} className="text-[9px] font-mono text-blue-500/60 hover:text-blue-400 transition-colors">↻ Obnovit</button>
          <button onClick={handleClear} disabled={clearing || !data?.tasks?.length}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-400 disabled:opacity-20 transition-colors">
            <Trash2 size={11}/> {clearing ? 'Mazání...' : 'Smazat vše'}
          </button>
        </div>
      </div>
    </>
  );
};
