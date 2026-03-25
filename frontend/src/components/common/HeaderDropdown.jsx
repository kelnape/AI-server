import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * HeaderDropdown - Dropdown menu pro seskupení tlačítek v headeru
 * 
 * Props:
 *   label: string - Text na tlačítku
 *   icon: Component - Lucide ikona
 *   color: string - Tailwind barva (např. "blue", "purple", "amber")
 *   items: Array<{
 *     label: string,
 *     icon: Component,
 *     color: string,
 *     onClick: () => void,
 *     badge?: number | string,
 *     divider?: boolean
 *   }>
 */
export const HeaderDropdown = ({ label, icon: Icon, color = "blue", items = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Zavři při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Barvy podle typu
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',
    gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/20',
  };

  const itemColorClasses = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    cyan: 'text-cyan-400',
    red: 'text-red-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    violet: 'text-violet-400',
    pink: 'text-pink-400',
    gray: 'text-gray-400',
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger tlačítko */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${colorClasses[color] || colorClasses.blue}`}
      >
        {Icon && <Icon size={14} />}
        <span className="hidden sm:block">{label}</span>
        <ChevronDown 
          size={12} 
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div 
          className="absolute right-0 top-full mt-2 w-52 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ 
            background: 'var(--bg-card)', 
            borderColor: 'var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div 
            className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest border-b"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
          >
            {label}
          </div>

          {/* Items */}
          <div className="py-1">
            {items.map((item, index) => {
              // Divider
              if (item.divider) {
                return (
                  <div 
                    key={index} 
                    className="my-1 mx-2 border-t" 
                    style={{ borderColor: 'var(--border)' }}
                  />
                );
              }

              const ItemIcon = item.icon;
              const itemColor = itemColorClasses[item.color] || 'text-gray-400';

              return (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-white/5 group"
                >
                  {ItemIcon && (
                    <ItemIcon 
                      size={15} 
                      className={`${itemColor} transition-transform group-hover:scale-110`}
                    />
                  )}
                  <span 
                    className="flex-1 text-xs font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span 
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md ${itemColor} bg-current/10`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
