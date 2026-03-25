import React, { useEffect, useRef } from 'react';
import { ListChecks, Check } from 'lucide-react';

export const ProjectPlanner = ({ plan, currentStep }) => {
  const activeStepRef = useRef(null);
  
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  if (!plan?.length) return null;
  
  return (
    <div className="shrink-0 theme-card-bg rounded-2xl border theme-border-cls animate-in fade-in duration-500" style={{maxHeight:'180px', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 px-4 pt-3 pb-2 flex items-center gap-2 shrink-0">
        <ListChecks size={13}/> Operační Plán
      </h3>
      <div className="overflow-y-auto custom-scrollbar px-4 pb-3 space-y-2">
        {plan.map((step, idx) => (
          <div key={idx}
            ref={idx === currentStep ? activeStepRef : null}
            className={`flex items-start gap-3 text-xs transition-all duration-300 ${idx<currentStep?'opacity-30':idx===currentStep?'translate-x-1':'opacity-50'}`}>
            <div className="mt-0.5 shrink-0">
              {idx<currentStep ? <Check size={12} className="text-green-500"/>
               : idx===currentStep ? <div className="relative flex h-4 w-4 items-center justify-center"><div className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75"/><div className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"/></div>
               : <div className="h-4 w-4 border theme-border-cls rounded-full flex items-center justify-center text-[8px] font-mono">{idx+1}</div>}
            </div>
            <span className={idx===currentStep?'font-bold':''}
              style={{color: idx===currentStep ? 'var(--text-primary)' : 'var(--text-muted)'}}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
