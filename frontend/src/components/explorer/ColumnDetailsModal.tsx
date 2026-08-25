import React from 'react';
import { X, Hash, Type, Calendar, HelpCircle, Activity, BarChart2 } from 'lucide-react';
import type { ColumnSchema } from '../../types';
import { dtypePill } from './ExplorerSidebar';

interface ColumnDetailsModalProps {
  column: ColumnSchema | null;
  totalRows: number;
  onClose: () => void;
  onAskAI: (query: string) => void;
}

export const ColumnDetailsModal: React.FC<ColumnDetailsModalProps> = ({
  column,
  totalRows,
  onClose,
  onAskAI,
}) => {
  if (!column) return null;

  const { label, cls } = dtypePill(column.dtype);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1628] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-5 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/10"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-[#4f8ef7]/10 text-[#4f8ef7]">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white font-mono">{column.name}</h3>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>
              {label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5 text-[12px] font-mono">
          <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
            <span className="text-[#4a5a80] block text-[10px] uppercase font-sans">Unique Values</span>
            <span className="text-white font-bold text-[14px]">{column.unique.toLocaleString()}</span>
          </div>
          <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
            <span className="text-[#4a5a80] block text-[10px] uppercase font-sans">Missing Count</span>
            <span className={`font-bold text-[14px] ${column.missing > 0 ? 'text-[#f5a623]' : 'text-[#10d98a]'}`}>
              {column.missing.toLocaleString()} ({column.missing_percentage}%)
            </span>
          </div>
          <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
            <span className="text-[#4a5a80] block text-[10px] uppercase font-sans">Completeness</span>
            <span className="text-[#10d98a] font-bold text-[14px]">
              {(100 - column.missing_percentage).toFixed(1)}%
            </span>
          </div>
          <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
            <span className="text-[#4a5a80] block text-[10px] uppercase font-sans">Total Records</span>
            <span className="text-white font-bold text-[14px]">{totalRows.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              onAskAI(`Analyze the column ${column.name} and provide summary statistics and distribution`);
              onClose();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-[#4f8ef7] hover:bg-[#4f8ef7]/90 text-white font-semibold text-[12px] shadow-lg shadow-[#4f8ef7]/20 transition-all flex items-center justify-center gap-1.5"
          >
            <BarChart2 size={13} />
            Analyze in Copilot
          </button>
        </div>
      </div>
    </div>
  );
};
