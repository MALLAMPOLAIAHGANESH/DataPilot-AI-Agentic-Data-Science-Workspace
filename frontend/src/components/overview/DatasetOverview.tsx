import React from 'react';
import { Database, Grid, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import type { Dataset, QualityScore } from '../../types';

interface DatasetOverviewProps {
  dataset: Dataset | null;
}

export const DatasetOverview: React.FC<DatasetOverviewProps> = ({ dataset }) => {
  if (!dataset) return null;

  const { quality } = dataset;
  const score = quality.overall;
  const gradeColor = score >= 80 ? '#10d98a' : score >= 60 ? '#f5a623' : '#f0456a';

  const breakdown = [
    { label: 'Completeness', value: quality.completeness },
    { label: 'Consistency', value: quality.consistency },
    { label: 'Validity', value: quality.validity },
    { label: 'Uniqueness', value: quality.uniqueness },
    { label: 'Timeliness', value: quality.timeliness },
  ];

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#8b9cc8] tracking-wider uppercase font-mono">
          DATASET OVERVIEW
        </span>
        <span className="text-[11px] font-mono text-[#4a5a80]">
          ID: {dataset.dataset_id}
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Rows Card */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-xl p-3.5 hover:border-white/15 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4f8ef7]/15 border border-[#4f8ef7]/25 flex items-center justify-center text-[#4f8ef7] flex-shrink-0">
              <Database size={18} />
            </div>
            <div>
              <div className="text-[20px] font-bold font-mono text-[#e8edf8] leading-tight">
                {dataset.rows.toLocaleString()}
              </div>
              <div className="text-[11px] font-medium text-[#8b9cc8]">Rows</div>
              <div className="text-[9px] text-[#4a5a80]">Total number of records</div>
            </div>
          </div>
        </div>

        {/* Columns Card */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-xl p-3.5 hover:border-white/15 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/25 flex items-center justify-center text-[#7c5cfc] flex-shrink-0">
              <Grid size={18} />
            </div>
            <div>
              <div className="text-[20px] font-bold font-mono text-[#e8edf8] leading-tight">
                {dataset.columns}
              </div>
              <div className="text-[11px] font-medium text-[#8b9cc8]">Columns</div>
              <div className="text-[9px] text-[#4a5a80]">Total number of features</div>
            </div>
          </div>
        </div>

        {/* Missing Values Card */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-xl p-3.5 hover:border-white/15 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f5a623]/15 border border-[#f5a623]/25 flex items-center justify-center text-[#f5a623] flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-[20px] font-bold font-mono text-[#e8edf8] leading-tight">
                {dataset.missing_percentage}%
              </div>
              <div className="text-[11px] font-medium text-[#8b9cc8]">Missing Values</div>
              <div className="text-[9px] text-[#4a5a80]">
                {dataset.missing_cells.toLocaleString()} cells empty
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality Score Card */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-xl p-3.5 hover:border-white/15 transition-all shadow-sm flex items-center gap-3.5">
          {/* Circular Donut Gauge */}
          <div className="relative w-[64px] h-[64px] flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="9"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke={gradeColor}
                strokeWidth="9"
                strokeDasharray={`${(score / 100) * 201} 201`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[16px] font-bold font-mono text-white leading-none">
                {score}
              </span>
              <span className="text-[8px] text-[#4a5a80] font-mono">/100</span>
            </div>
          </div>

          {/* Sub-metrics Breakdown Bars */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9cc8] font-mono flex items-center gap-1">
                <ShieldCheck size={11} className="text-[#10d98a]" />
                Quality Score
              </span>
              <span className="text-[9px] font-bold uppercase font-mono px-1 py-0.2 rounded" style={{ color: gradeColor }}>
                {quality.grade}
              </span>
            </div>

            {breakdown.slice(0, 3).map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[9px] text-[#4a5a80] w-16 truncate font-sans">
                  {item.label}
                </span>
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.value >= 80 ? '#10d98a' : '#f5a623',
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-[#8b9cc8] w-7 text-right">
                  {item.value.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
