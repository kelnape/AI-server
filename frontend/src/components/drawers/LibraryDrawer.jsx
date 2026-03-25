import React from 'react';
import { Library, X, FileText, Database } from 'lucide-react';
import { Overlay } from '../common/Overlay';

export const LibraryDrawer = ({ isOpen, onClose, onIndex }) => {
  const manuals = [
    {name:"DIADEM_2024_User_Manual.pdf",size:"12.4 MB",date:"2024-01-15"},
    {name:"LabVIEW_FPGA_Handbook.pdf",size:"8.1 MB",date:"2023-11-20"},
    {name:"NI_DAQmx_Technical_Guide.pdf",size:"4.2 MB",date:"2024-02-05"},
    {name:"System_Architecture_V8.pdf",size:"2.8 MB",date:"2024-03-01"},
  ];
  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-80 theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3"><Library className="text-blue-400" size={20}/><h2 className="text-base font-black tracking-tighter uppercase italic text-white">Knihovna</h2></div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white"><X size={17}/></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {manuals.map((m,i) => (
              <div key={i} className="group p-4 bg-white/5 border theme-border-cls rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer">
                <div className="flex items-start gap-3">
                  <FileText size={14} className="text-blue-400 mt-0.5"/>
                  <div className="flex-1 min-w-0"><h3 className="text-xs font-bold truncate text-gray-300 group-hover:text-white">{m.name}</h3><div className="text-[9px] theme-text-xs-cls font-mono mt-1">{m.size} • {m.date}</div></div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onIndex} className="mt-6 w-full py-3.5 bg-white/5 border theme-border-cls rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <Database size={13} className="text-cyan-400"/> Nahrát manuál
          </button>
        </div>
      </div>
    </>
  );
};
