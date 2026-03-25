import React from 'react';
import { ShieldAlert, Terminal } from 'lucide-react';

export const SysAdminAlerts = ({ alerts, onResolve }) => {
  if (!alerts?.length) return null;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 z-10 relative">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 animate-pulse"/>
        <div className="flex items-center gap-4 pl-2">
          <div className="p-2.5 bg-red-500/20 rounded-xl"><ShieldAlert className="text-red-500 animate-bounce" size={20}/></div>
          <div>
            <h3 className="text-red-400 font-black tracking-widest uppercase text-[10px]">SysAdmin Alert</h3>
            <p className="text-red-200/80 text-xs mt-0.5">{alerts.join(" | ")}</p>
          </div>
        </div>
        <button onClick={() => onResolve(`Alerty: ${alerts.join(", ")}. Analyzuj a navrhni řešení.`)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-full sm:w-auto justify-center">
          <Terminal size={13}/> Vyřešit
        </button>
      </div>
    </div>
  );
};
