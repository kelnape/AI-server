import React, { useState, useEffect } from 'react';
import { 
  X, BarChart2, TrendingUp, Code, MessageSquare, 
  Zap, Clock, CheckCircle, PieChart, Activity
} from 'lucide-react';
import { Overlay } from '../common/Overlay';
import { apiFetch } from '../../api/client';

const StatCard = ({ icon: Icon, label, value, subvalue, color, trend }) => (
  <div className="p-4 rounded-2xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
    <div className="flex items-start justify-between mb-3">
      <div 
        className="p-2 rounded-xl"
        style={{ background: `${color}20` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="text-2xl font-black text-white mb-1">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    {subvalue && (
      <div className="text-[9px] text-gray-600 mt-1">{subvalue}</div>
    )}
  </div>
);

const MiniBarChart = ({ data, maxBars = 7 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-end justify-between gap-1 h-20">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1 bg-gray-800 rounded-t" style={{ height: '20%' }} />
        ))}
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const displayData = data.slice(0, maxBars).reverse();
  
  return (
    <div className="flex items-end justify-between gap-1 h-20">
      {displayData.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: '4px' }}
            title={`${d.date}: ${d.count} uloh`}
          />
          <span className="text-[8px] text-gray-600">
            {new Date(d.date).toLocaleDateString('cs-CZ', { weekday: 'short' }).slice(0, 2)}
          </span>
        </div>
      ))}
      {/* Doplneni prazdnych sloupcu */}
      {[...Array(Math.max(0, maxBars - displayData.length))].map((_, i) => (
        <div key={`empty-${i}`} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-gray-800 rounded-t" style={{ height: '4px' }} />
          <span className="text-[8px] text-gray-700">-</span>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ withCode, withoutCode }) => {
  const total = withCode + withoutCode || 1;
  const codePercent = Math.round((withCode / total) * 100);
  const circumference = 2 * Math.PI * 40;
  const codeOffset = circumference - (codePercent / 100) * circumference;
  
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        {/* Pozadi */}
        <circle
          cx="56"
          cy="56"
          r="40"
          stroke="#334155"
          strokeWidth="12"
          fill="none"
        />
        {/* S kodem */}
        <circle
          cx="56"
          cy="56"
          r="40"
          stroke="#3b82f6"
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={codeOffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white">{codePercent}%</span>
        <span className="text-[8px] text-gray-500 uppercase tracking-wider">s kodem</span>
      </div>
    </div>
  );
};

const ModelBar = ({ model, count, maxCount, index }) => {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
  const color = colors[index % colors.length];
  const percent = (count / maxCount) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-gray-400 font-medium truncate max-w-[150px]">{model}</span>
        <span className="text-gray-500 font-mono">{count}x</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
};

export const AnalyticsDrawer = ({ isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const r = await apiFetch('/api/analytics');
        if (r.ok) {
          setData(await r.json());
        }
      } catch (e) {
        console.error('Analytics fetch error:', e);
      }
      setLoading(false);
    };
    
    fetchData();
  }, [isOpen]);

  const maxModelCount = data?.top_models?.[0]?.count || 1;

  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-[28rem] max-w-[95vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <BarChart2 size={18} className="text-indigo-400"/>
              </div>
              <div>
                <h2 className="text-base font-black tracking-tighter uppercase italic text-white">
                  Analytics
                </h2>
                <p className="text-[9px] theme-text-sm-cls font-mono mt-0.5">
                  Statistiky a metriky systemu
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

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"/>
                <span className="text-xs text-gray-500">Nacitam statistiky...</span>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Hlavni statistiky */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard 
                  icon={MessageSquare}
                  label="Celkem uloh"
                  value={data.total_tasks}
                  color="#3b82f6"
                />
                <StatCard 
                  icon={Code}
                  label="S kodem"
                  value={data.tasks_with_code}
                  subvalue={`${Math.round((data.tasks_with_code / (data.total_tasks || 1)) * 100)}% vsech`}
                  color="#10b981"
                />
                <StatCard 
                  icon={CheckCircle}
                  label="Uspesnost"
                  value={`${data.success_rate}%`}
                  color="#8b5cf6"
                />
                <StatCard 
                  icon={Activity}
                  label="Bez kodu"
                  value={data.tasks_without_code}
                  color="#f59e0b"
                />
              </div>

              {/* Graf uloh za tyden */}
              <div className="p-4 rounded-2xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Ulohy za tyden
                  </h3>
                  <span className="text-[9px] text-gray-600 font-mono">
                    poslednich 7 dni
                  </span>
                </div>
                <MiniBarChart data={data.daily_tasks} />
              </div>

              {/* Donut chart */}
              <div className="p-4 rounded-2xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  Pomer uloh
                </h3>
                <DonutChart 
                  withCode={data.tasks_with_code} 
                  withoutCode={data.tasks_without_code} 
                />
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"/>
                    <span className="text-[9px] text-gray-500">S kodem</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-600"/>
                    <span className="text-[9px] text-gray-500">Bez kodu</span>
                  </div>
                </div>
              </div>

              {/* Top modely */}
              <div className="p-4 rounded-2xl border theme-border-cls" style={{ background: 'var(--bg-card)' }}>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  Nejpouzivanejsi modely
                </h3>
                <div className="space-y-3">
                  {data.top_models && data.top_models.length > 0 ? (
                    data.top_models.map((m, i) => (
                      <ModelBar 
                        key={m.model}
                        model={m.model}
                        count={m.count}
                        maxCount={maxModelCount}
                        index={i}
                      />
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-600 text-center py-4">
                      Zatim zadna data o modelech
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BarChart2 size={48} className="text-gray-700 mx-auto mb-3"/>
                <p className="text-sm text-gray-500">Nepodařilo se načíst data</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t theme-border-cls flex items-center justify-between text-[9px] font-mono theme-text-xs-cls shrink-0">
            <span>Posledni aktualizace: {new Date().toLocaleTimeString('cs-CZ')}</span>
            <button 
              onClick={() => {
                setLoading(true);
                apiFetch('/api/analytics').then(r => r.json()).then(setData).finally(() => setLoading(false));
              }}
              className="text-indigo-500/60 hover:text-indigo-400 transition-colors"
            >
              ↻ Obnovit
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

