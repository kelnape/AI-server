import { 
  User, ListChecks, Wrench, Code, ShieldCheck, 
  Terminal, Brain, CheckCircle 
} from 'lucide-react';

export const LANG_LABELS = { python: 'Python', bash: 'Bash/Shell', html: 'HTML', css: 'CSS', javascript: 'JavaScript', json: 'JSON', vbs: 'VBScript' }
export const LANG_COLORS = { python: 'text-blue-400', bash: 'text-green-400', html: 'text-orange-400', css: 'text-pink-400', javascript: 'text-yellow-400', json: 'text-cyan-400', vbs: 'text-purple-400' };
export const WEB_TRIGGER_WORDS = ['eshop','e-shop','web','website','stránk','stránky','landing','portfolio','blog','obchod','prodej','frontend','html','tailwind'];
export const GIT_REPO_PATH = ''; // Můžeš načítat z env nebo nechat prázdné dle backendu

export const AGENTS = [
  { id: 'MANAŽER', label: 'Manažer', icon: User },
  { id: 'PLANNER', label: 'Plánovač', icon: ListChecks },
  { id: 'SPECIALISTA', label: 'Specialista', icon: Wrench },
  { id: 'VYVOJAR', label: 'Vývojář', icon: Code },
  { id: 'QA', label: 'QA Inženýr', icon: ShieldCheck },
  { id: 'SYSADMIN', label: 'SysAdmin', icon: Terminal },
  { id: 'REFLEKTOR', label: 'Analytik', icon: Brain },
  { id: 'FINALIZER', label: 'Finalizér', icon: CheckCircle },
];

export const AGENT_COLORS = {
  'MANAŽER': 'text-blue-400',
  'PLANNER': 'text-purple-400',
  'SPECIALISTA': 'text-amber-400',
  'VYVOJAR': 'text-green-400',
  'QA': 'text-red-400',
  'SYSADMIN': 'text-cyan-400',
  'REFLEKTOR': 'text-indigo-400',
  'FINALIZER': 'text-emerald-400',
};

export const AGENT_COLORS_HEX = {
  'MANAŽER': '#60a5fa',
  'PLANNER': '#c084fc',
  'SPECIALISTA': '#fbbf24',
  'VYVOJAR': '#4ade80',
  'QA': '#f87171',
  'SYSADMIN': '#22d3ee',
  'REFLEKTOR': '#818cf8',
  'FINALIZER': '#34d399',
};
