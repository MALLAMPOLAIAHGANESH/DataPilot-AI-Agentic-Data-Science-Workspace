import React from 'react';
import {
  Cpu, Grid, Download, History, Star,
  Moon, Sun, Bell, Check,
} from 'lucide-react';
import type { Dataset } from '../../types';

interface TopbarProps {
  dataset: Dataset | null;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  activeSection: string;
  onOpenExport: () => void;
  onOpenHistory: () => void;
  onSelectSection: (s: any) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  dataset,
  saveStatus,
  activeSection,
  onOpenExport,
  onOpenHistory,
  onSelectSection,
}) => {
  const [darkMode, setDarkMode] = React.useState(true);

  return (
    <header className="h-[52px] min-h-[52px] bg-[#0b0f20] border-b border-white/[0.07] px-4 flex items-center justify-between z-20 flex-shrink-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f8ef7] to-[#7c5cfc] flex items-center justify-center shadow-md shadow-[#4f8ef7]/20 flex-shrink-0">
          <Cpu size={16} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[14px] tracking-tight bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] bg-clip-text text-transparent">
            DataPilot AI
          </span>
          <span className="text-[9px] text-[#4a5a80] font-medium tracking-wider uppercase -mt-0.5">
            Agentic Data Science Workspace
          </span>
        </div>
      </div>

      {/* Center Action Tabs */}
      <nav className="flex items-center gap-1.5 bg-[#0f1628] p-1 rounded-lg border border-white/[0.05]">
        <button
          onClick={() => onSelectSection('workspace')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
            activeSection === 'workspace'
              ? 'bg-[#1e2d54] text-[#4f8ef7] shadow-sm'
              : 'text-[#8b9cc8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Grid size={13} />
          Workspace
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium text-[#8b9cc8] hover:text-white hover:bg-white/[0.04] transition-all"
        >
          <Download size={13} />
          Export
        </button>

        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium text-[#8b9cc8] hover:text-white hover:bg-white/[0.04] transition-all"
        >
          <History size={13} />
          History
        </button>

        <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-[#4a5a80] border-l border-white/[0.06] ml-1">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-[#10d98a]">
              <Check size={11} /> Saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-[#f5a623] animate-pulse">
              ● Saving...
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="flex items-center gap-1 text-[#8b9cc8]">
              <Star size={11} /> Ready
            </span>
          )}
        </div>
      </nav>

      {/* Right User & Tools */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/[0.06]"
          title="Toggle Theme"
        >
          {darkMode ? <Moon size={14} /> : <Sun size={14} />}
        </button>

        <button
          className="p-2 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/[0.05] transition-all relative border border-transparent hover:border-white/[0.06]"
          title="Notifications"
        >
          <Bell size={14} />
          {dataset && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#10d98a] ring-2 ring-[#0b0f20]" />
          )}
        </button>

        <div className="h-5 w-[1px] bg-white/[0.08] mx-1" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#7c5cfc] to-[#4f8ef7] flex items-center justify-center text-white font-bold text-[12px] shadow-sm ring-1 ring-white/10 group-hover:ring-[#4f8ef7]/50 transition-all">
            G
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[12px] font-semibold text-[#e8edf8] group-hover:text-[#4f8ef7] transition-colors leading-tight">
              Ganesh
            </span>
            <span className="text-[9px] text-[#4a5a80] font-mono leading-none">
              Data Scientist
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
