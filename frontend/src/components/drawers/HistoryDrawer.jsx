import React from 'react';
import { History, X, Box, ArrowRight } from 'lucide-react';
import { Overlay } from '../common/Overlay';

export const HistoryDrawer = ({ isOpen, onClose, history = [], onLoadTask }) => {
  // Ochrana proti undefined/null
  const safeHistory = Array.isArray(history) ? history : [];
  
  return (
    <>
      {isOpen && <Overlay onClick={onClose}/>}
      <div className={`fixed inset-y-0 right-0 w-96 max-w-[90vw] theme-card-bg border-l theme-border-cls z-50 transform transition-transform duration-500 ${isOpen?'translate-x-0':'translate-x-full'} shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <History className="text-blue-400" size={20}/>
              <h2 className="text-base font-black tracking-tighter uppercase italic text-white">Historie</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full theme-text-sm-cls hover:text-white">
              <X size={17}/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {safeHistory.length === 0 ? (
              <p className="text-xs theme-text-xs-cls italic">Zatím žádná historie.</p>
            ) : (
              safeHistory.map((task, i) => (
                <div 
                  key={i} 
                  onClick={() => { onLoadTask && onLoadTask(task); onClose(); }} 
                  className="group p-4 bg-white/5 border theme-border-cls rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer relative"
                >
                  <p className="text-xs font-bold text-gray-300 line-clamp-2 leading-relaxed mb-2 pr-6">
                    {task.query}
                  </p>
                  <div className="flex items-center justify-between text-[9px] font-mono theme-text-xs-cls">
                    <span>{task.date}</span>
                    <div className="flex items-center gap-2">
                      {task.model && <span className="text-purple-400/60">{task.model}</span>}
                      {task.hasCode && <span className="text-blue-400 flex items-center gap-1"><Box size={9}/> Kód</span>}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100">
                    <ArrowRight size={13} className="text-blue-500"/>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};