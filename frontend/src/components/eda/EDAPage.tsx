import React from 'react';
import { Activity, AlertTriangle, Layers, TrendingUp, BarChart2 } from 'lucide-react';
import type { Dataset } from '../../types';
import { dtypePill } from '../explorer/ExplorerSidebar';

interface EDAPageProps {
  dataset: Dataset | null;
  onAskAI: (query: string) => void;
}

export const EDAPage: React.FC<EDAPageProps> = ({ dataset, onAskAI }) => {
  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-[#0f1628]/40 text-[#4a5a80] space-y-2">
        <Activity size={32} strokeWidth={1.5} />
        <p className="text-[13px] font-medium text-[#8b9cc8]">No dataset uploaded for EDA</p>
        <p className="text-[11px] text-[#4a5a80]">Upload a dataset to inspect distributions, correlations, and missing values</p>
      </div>
    );
  }

  const sortedMissing = [...dataset.schema].sort((a, b) => b.missing_percentage - a.missing_percentage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#8b9cc8] tracking-wider uppercase font-mono">
          EXPLORATORY DATA ANALYSIS (EDA)
        </span>
        <button
          onClick={() => onAskAI('Perform a complete exploratory data analysis on the dataset')}
          className="text-[11px] font-mono text-[#4f8ef7] hover:underline"
        >
          Ask Copilot to summarize EDA →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Missing Values Breakdown */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-[#f5a623]" />
            <h4 className="text-[12px] font-bold text-white font-mono">Missing Values Analysis</h4>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 font-mono text-[11px]">
            {sortedMissing.map((col) => (
              <div key={col.name} className="flex items-center gap-3">
                <span className="w-28 text-[#e8edf8] truncate">{col.name}</span>
                <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${col.missing_percentage}%`,
                      backgroundColor: col.missing_percentage > 50 ? '#f0456a' : col.missing_percentage > 20 ? '#f5a623' : '#10d98a',
                    }}
                  />
                </div>
                <span className="w-12 text-right text-[#8b9cc8]">
                  {col.missing_percentage}%
                </span>
                <span className="w-16 text-right text-[#4a5a80] text-[10px]">
                  {col.missing} cells
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Types & Cardinality */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-[#7c5cfc]" />
            <h4 className="text-[12px] font-bold text-white font-mono">Feature Cardinality & Dtypes</h4>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 font-mono text-[11px]">
            {dataset.schema.map((col) => {
              const { label, cls } = dtypePill(col.dtype);
              return (
                <div key={col.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[#0b0f20]/60 border border-white/[0.04]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#e8edf8] truncate font-bold">{col.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border ${cls}`}>{label}</span>
                  </div>
                  <div className="text-[10px] text-[#8b9cc8] flex items-center gap-2">
                    <span>{col.unique.toLocaleString()} unique</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
