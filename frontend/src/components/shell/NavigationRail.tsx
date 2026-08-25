import React from 'react';
import {
  Grid, Database, BarChart2, Cpu,
  Bot, Settings2, Sparkles,
} from 'lucide-react';
import type { WorkspaceSection } from '../../types';

interface NavigationRailProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeSection,
  onSelectSection,
}) => {
  const navItems: { id: WorkspaceSection; icon: React.FC<{ size?: number; className?: string }>; label: string }[] = [
    { id: 'workspace', icon: Grid, label: 'Workspace' },
    { id: 'datasets', icon: Database, label: 'Datasets' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
    { id: 'models', icon: Cpu, label: 'ML Models' },
    { id: 'copilot', icon: Bot, label: 'AI Copilot' },
    { id: 'settings', icon: Settings2, label: 'Settings' },
  ];

  return (
    <aside className="w-[50px] min-w-[50px] bg-[#0b0f20] border-r border-white/[0.06] flex flex-col items-center py-3 justify-between z-10 flex-shrink-0">
      <div className="flex flex-col items-center gap-1.5 w-full">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => onSelectSection(id)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group ${
                isActive
                  ? 'bg-[#1e2d54] text-[#4f8ef7] shadow-inner shadow-[#4f8ef7]/20 border border-[#4f8ef7]/30'
                  : 'text-[#4a5a80] hover:text-[#e8edf8] hover:bg-white/[0.04]'
              }`}
              title={label}
            >
              <Icon size={17} className={isActive ? 'text-[#4f8ef7]' : 'text-current'} />
              
              {isActive && (
                <span className="absolute -left-[5px] w-1 h-5 rounded-r bg-[#4f8ef7]" />
              )}

              {/* Tooltip on hover */}
              <span className="absolute left-[54px] px-2 py-1 rounded bg-[#0f1628] border border-white/10 text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom status badge */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7c5cfc]/20 to-[#4f8ef7]/20 border border-[#7c5cfc]/30 flex items-center justify-center text-[#7c5cfc]">
          <Sparkles size={14} />
        </div>
      </div>
    </aside>
  );
};
