import React from 'react';
import { BarChart2, RefreshCw, Zap, Loader2 } from 'lucide-react';
import type { ChartData } from '../../types';
import { ChartCard } from './ChartCard';

interface ChartGridProps {
  charts: ChartData[];
  loadingEda: boolean;
  onRunEda: () => void;
  hasDataset: boolean;
  onAskAI?: (prompt: string) => void;
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  charts,
  loadingEda,
  onRunEda,
  hasDataset,
  onAskAI,
}) => {
  if (!hasDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-[#0f1628]/40 text-[#4a5a80] space-y-2">
        <BarChart2 size={32} strokeWidth={1.5} />
        <p className="text-[13px] font-medium text-[#8b9cc8]">No charts generated yet</p>
        <p className="text-[11px] text-[#4a5a80]">Upload a dataset to automatically generate exploratory visualizations</p>
      </div>
    );
  }

  if (loadingEda) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#0f1628] border border-white/[0.06] rounded-2xl h-[230px] p-4 flex flex-col justify-between animate-pulse"
          >
            <div className="h-4 bg-white/[0.06] rounded w-2/3" />
            <div className="h-28 bg-white/[0.04] rounded-xl flex items-center justify-center text-[#4a5a80]">
              <Loader2 size={16} className="animate-spin text-[#4f8ef7]" />
            </div>
            <div className="h-3 bg-white/[0.04] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#7c5cfc]/10 text-[#7c5cfc] flex items-center justify-center">
          <Zap size={22} />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-white">Generate Exploratory Charts</h4>
          <p className="text-[11px] text-[#8b9cc8] max-w-sm mt-1">
            DataPilot can automatically analyze categorical distributions, trends, and correlations across all features.
          </p>
        </div>
        <button
          onClick={onRunEda}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] text-white font-semibold text-[12px] shadow-lg shadow-[#4f8ef7]/20 hover:brightness-110 transition-all flex items-center gap-2"
        >
          <Zap size={13} />
          Auto-Generate EDA Visualizations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#8b9cc8] tracking-wider uppercase font-mono">
          EDA VISUALIZATION GRID ({charts.length})
        </span>
        <button
          onClick={onRunEda}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-[#0f1628] text-[#8b9cc8] hover:text-white text-[11px] font-mono transition-all"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {charts.map((chart, idx) => (
          <ChartCard key={idx} chart={chart} onAskAI={onAskAI} />
        ))}
      </div>
    </div>
  );
};
