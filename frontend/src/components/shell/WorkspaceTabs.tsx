import React from 'react';
import {
  Table, TrendingUp, AlertTriangle, Layers,
  BarChart2, Activity, Cpu
} from 'lucide-react';
import type { WorkspaceTab } from '../../types';

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  hasCharts: boolean;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({
  activeTab,
  onTabChange,
  hasCharts,
}) => {
  const tabs: { id: WorkspaceTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'preview', label: 'Data Preview', icon: Table },
    { id: 'statistics', label: 'Summary Statistics', icon: TrendingUp },
    { id: 'missing', label: 'Missing Values', icon: AlertTriangle },
    { id: 'types', label: 'Data Types', icon: Layers },
    { id: 'charts', label: 'Charts Grid', icon: BarChart2 },
    { id: 'eda', label: 'Deep EDA', icon: Activity },
    { id: 'models', label: 'Model Studio', icon: Cpu },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-white/[0.06] px-4 bg-[#0b0f20]/40 overflow-x-auto flex-shrink-0">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? 'border-[#4f8ef7] text-[#4f8ef7] font-semibold bg-[#4f8ef7]/5'
                : 'border-transparent text-[#8b9cc8] hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <Icon size={13} className={isActive ? 'text-[#4f8ef7]' : 'text-current'} />
            {label}
            {id === 'charts' && hasCharts && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#10d98a]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
