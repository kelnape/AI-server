import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Thermometer, Box, Activity, FolderOpen } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { NasDrawer } from '../drawers/NasDrawer';

export const ServerMetrics = () => {
  const [metrics, setMetrics] = useState({ cpu:"...", ram:"...", temp:"...", docker:"...", uptime:"..." });
  const [online, setOnline] = useState(false);
  const [nasOpen, setNasOpen] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try { const r=await apiFetch('/api/metrics'); if(r.ok){setMetrics(await r.json());setOnline(true);}else setOnline(false); }
      catch { setOnline(false); }
    };
    fetch_(); const i=setInterval(fetch_,3000); return ()=>clearInterval(i);
  }, []);

  const M = ({icon:Icon, color, val, label}) => (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{background:'var(--bg-hover)'}}>
      <Icon size={12} className={online ? color : "theme-text-xs-cls"} />
      <span className="font-black" style={{color:'var(--text-muted)'}}>{label}:</span>
      <span className={`font-black ${online ? color : "theme-text-xs-cls"}`}>{val}</span>
    </div>
  );

  return (
    <>
    <div className="w-full px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 border-b backdrop-blur-sm z-10 relative"
         style={{borderColor:'var(--border)', backgroundColor:'var(--bg-toolbar)'}}>
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-black" style={{background:'var(--bg-hover)'}}>
        <div className={`w-2 h-2 rounded-full ${online?'bg-green-500 animate-pulse':'bg-red-500'}`}/>
        <span className={`text-[10px] font-black uppercase tracking-widest ${online?'text-green-400':'text-red-400'}`}>
          {online ? 'Server' : 'Offline'}
        </span>
      </div>
      <div className="w-px h-4 hidden sm:block" style={{background:'var(--border)'}}/>
      <M icon={Cpu}         color="text-blue-400"   val={metrics.cpu}  label="CPU"/>
      <M icon={HardDrive}   color="text-purple-400" val={metrics.ram}  label="RAM"/>
      <M icon={Thermometer} color="text-red-400"    val={metrics.temp} label="Temp"/>
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{background:'var(--bg-hover)'}}>
        <Box size={12} className={online?"text-cyan-400":"theme-text-xs-cls"}/>
        <span className="font-black text-[10px]" style={{color:'var(--text-muted)'}}>Docker:</span>
        <span className={`font-black text-[10px] ${metrics.docker==="ACTIVE"?"text-cyan-400":"text-red-400"}`}>{metrics.docker}</span>
      </div>
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{background:'var(--bg-hover)'}}>
        <Activity size={12} className={online?"text-green-400":"theme-text-xs-cls"}/>
        <span className="font-black text-[10px]" style={{color:'var(--text-muted)'}}>Uptime:</span>
        <span className={`font-black text-[10px] ${online?"text-green-400":"theme-text-xs-cls"}`}>{metrics.uptime}</span>
      </div>
      <div className="w-px h-4 hidden sm:block ml-1" style={{background:'var(--border)'}}/>
      <button onClick={()=>setNasOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all hover:scale-105"
        style={{background:'var(--bg-hover)', border:'1px solid rgba(251,146,60,0.25)'}}
        title="Otevřít kelnape-NAS">
        <FolderOpen size={12} className="text-orange-400"/>
        <span className="font-black text-[10px] text-orange-400 hidden sm:block">kelnape-NAS</span>
      </button>
    </div>
    <NasDrawer isOpen={nasOpen} onClose={()=>setNasOpen(false)}/>
    </>
  );
};
