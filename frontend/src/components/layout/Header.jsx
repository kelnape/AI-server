import React from 'react';
import {
  User, PenLine, Rocket, GitBranch, Code, BarChart3, BarChart2,
  ListChecks, BookOpen, History, Library, Settings, Key,
  Download, Brain, Trash2, Sun, Moon, Wrench
} from 'lucide-react';

import { HeaderDropdown } from '../common/HeaderDropdown';
import { ModelSelector } from './ModelSelector';

export const Header = ({
  activeModel, handleModelSelect,
  setIsPromptEditorOpen, setTemplatesOpen, setWorkflowOpen, setCodeServerOpen,
  setIsTelemetryOpen, setIsQueueOpen, setIsMemoryOpen, memoryCount, setIsHistoryOpen, setIsLibraryOpen,
  setSettingsOpen, setExportOpen, handleLearn, clearSession, isDark, setIsDark
}) => {
  return (
    <header className="relative w-full px-4 sm:px-6 py-3 flex items-center justify-between backdrop-blur-xl z-30 shrink-0"
            style={{
              background: 'linear-gradient(180deg, var(--bg-card) 0%, transparent 100%)',
              borderBottom: '1px solid var(--border)',
            }}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl opacity-60 blur-sm"/>
          <div className="relative p-2 rounded-xl" style={{background:'var(--bg-card)', border:'1px solid var(--border-accent)'}}>
            <User size={20} className="text-blue-400"/>
          </div>
        </div>
        <div>
          <h1 className="text-sm font-black italic tracking-tight uppercase leading-none" style={{
            background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Engineering AI System</h1>
          <p className="text-[9px] font-mono tracking-[0.3em] uppercase mt-0.5" style={{color:'var(--accent)'}}>
            Authenticated: Kelnape
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ModelSelector activeModel={activeModel} onSelect={handleModelSelect}/>

        <HeaderDropdown
          label="Nástroje"
          icon={Wrench}
          color="purple"
          items={[
            { label: 'Prompty', icon: PenLine, color: 'violet', onClick: () => setIsPromptEditorOpen(true) },
            { label: 'Šablony', icon: Rocket, color: 'amber', onClick: () => setTemplatesOpen(true) },
            { label: 'Workflow', icon: GitBranch, color: 'blue', onClick: () => setWorkflowOpen(true) },
            { divider: true },
            { label: 'VS Code', icon: Code, color: 'violet', onClick: () => setCodeServerOpen(true) },
          ]}
        />

        <HeaderDropdown
          label="Data"
          icon={BarChart3}
          color="blue"
          items={[
            { label: 'Telemetrie', icon: BarChart2, color: 'blue', onClick: () => setIsTelemetryOpen(true) },
            { label: 'Fronta', icon: ListChecks, color: 'purple', onClick: () => setIsQueueOpen(true) },
            { label: 'Paměť', icon: BookOpen, color: 'emerald', badge: memoryCount > 0 ? memoryCount : undefined, onClick: () => setIsMemoryOpen(true) },
            { divider: true },
            { label: 'Historie', icon: History, color: 'gray', onClick: () => setIsHistoryOpen(true) },
            { label: 'Knihovna', icon: Library, color: 'blue', onClick: () => setIsLibraryOpen(true) },
          ]}
        />

        <HeaderDropdown
          label="Nastavení"
          icon={Settings}
          color="gray"
          items={[
            { label: 'API Klíče', icon: Key, color: 'amber', onClick: () => setSettingsOpen(true) },
            { label: 'Export', icon: Download, color: 'cyan', onClick: () => setExportOpen(true) },
            { divider: true },
            { label: 'Učit systém', icon: Brain, color: 'pink', onClick: handleLearn },
            { label: 'Smazat chat', icon: Trash2, color: 'red', onClick: clearSession },
            { divider: true },
            { label: isDark ? 'Světlý režim' : 'Tmavý režim', icon: isDark ? Sun : Moon, color: isDark ? 'amber' : 'blue', onClick: () => setIsDark(d => !d) },
          ]}
        />
      </div>
    </header>
  );
};
