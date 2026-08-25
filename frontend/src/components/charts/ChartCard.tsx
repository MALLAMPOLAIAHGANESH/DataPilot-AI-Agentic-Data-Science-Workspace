import React, { useState } from 'react';
import { MoreVertical, Maximize2, Download, Bot, Eye } from 'lucide-react';
import type { ChartData } from '../../types';
import { ChartRenderer } from './ChartRenderer';

interface ChartCardProps {
  chart: ChartData;
  onAskAI?: (prompt: string) => void;
}

export const ChartCard: React.FC<ChartCardProps> = ({ chart, onAskAI }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownloadCSV = () => {
    if (!chart.data?.length) return;
    const keys = Object.keys(chart.data[0]);
    const csvRows = [
      keys.join(','),
      ...chart.data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(chart.title || 'chart').toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  return (
    <>
      <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 flex flex-col h-[230px] hover:border-white/15 transition-all shadow-sm relative group">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 pr-2">
            <h4 className="text-[12px] font-bold text-[#e8edf8] truncate font-mono">
              {chart.title || 'Data Visualization'}
            </h4>
            {chart.subtitle && (
              <p className="text-[10px] text-[#4a5a80] truncate">{chart.subtitle}</p>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-[#4a5a80] hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-6 bg-[#0b0f20] border border-white/10 rounded-xl p-1 shadow-2xl z-30 w-36 text-[11px] font-medium font-mono text-[#8b9cc8] space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setIsExpanded(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-white/[0.05] hover:text-white flex items-center gap-1.5"
                >
                  <Maximize2 size={12} /> Expand
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-white/[0.05] hover:text-white flex items-center gap-1.5"
                >
                  <Download size={12} /> Export CSV
                </button>
                {onAskAI && (
                  <button
                    onClick={() => {
                      onAskAI(`Explain key analytical takeaways from the chart: "${chart.title}"`);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-white/[0.05] text-[#7c5cfc] hover:text-[#7c5cfc] flex items-center gap-1.5"
                  >
                    <Bot size={12} /> Ask AI
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="flex-1 w-full min-h-0">
          <ChartRenderer chart={chart} />
        </div>
      </div>

      {/* Expanded Modal View */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-[#0f1628] border border-white/10 rounded-2xl w-full max-w-4xl h-[520px] p-6 flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-[16px] font-bold text-white font-mono">{chart.title}</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[12px] font-medium"
              >
                Close
              </button>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ChartRenderer chart={chart} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
