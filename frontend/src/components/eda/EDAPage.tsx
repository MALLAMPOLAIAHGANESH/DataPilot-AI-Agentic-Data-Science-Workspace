import React, { useEffect, useState } from 'react';
import { fetchSmartEDA, type EDAResponse } from '../../services/api';
import type { Dataset } from '../../types';

interface EDAPageProps {
  dataset?: Dataset | null;
  onAskAI?: (query: string) => void;
}

export const EDAPage: React.FC<EDAPageProps> = ({ dataset, onAskAI }) => {
  const [data, setData] = useState<EDAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'charts' | 'heatmap' | 'geo' | 'table'>('charts');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchSmartEDA(dataset?.dataset_id || 'default_session')
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => console.error('Failed to load EDA data:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dataset?.dataset_id, dataset?.rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
        Analyzing data types and constructing visual summaries...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm">
        No dataset active. Please upload a CSV to generate automated visualizations.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-150">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide font-mono">
            Exploratory Data Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Metadata-driven visual analytics & feature relationships
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onAskAI && (
            <button
              onClick={() => onAskAI('Summarize the top correlations and distributions in this dataset.')}
              className="text-[11px] font-mono text-[#4f8ef7] hover:underline"
            >
              Ask Copilot to summarize EDA →
            </button>
          )}

          {/* Tab Controls */}
          <div className="flex gap-1 bg-slate-900 p-1 border border-slate-800 rounded-lg text-xs font-mono">
            {(['charts', 'heatmap', 'geo', 'table'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab === 'geo' ? 'Geospatial Map' : tab === 'table' ? 'Summary Grid' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW 1: METADATA-DRIVEN CHARTS */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.charts.map((chart, idx) => (
            <div
              key={idx}
              className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-200 truncate font-mono" title={chart.column}>
                    {chart.column}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-indigo-400 border border-slate-700">
                    {chart.chart_type}
                  </span>
                </div>

                {/* Categorical Distribution */}
                {(chart.chart_type === 'bar' || chart.chart_type === 'donut') &&
                  chart.labels &&
                  chart.values && (
                    <div className="space-y-2.5 mt-2">
                      {chart.labels.slice(0, 5).map((label, lIdx) => {
                        const maxVal = Math.max(...chart.values!);
                        const pct = maxVal > 0 ? (chart.values![lIdx] / maxVal) * 100 : 0;
                        return (
                          <div key={lIdx} className="text-xs">
                            <div className="flex justify-between text-slate-400 mb-1">
                              <span className="truncate max-w-[150px]">{label || '(empty)'}</span>
                              <span className="font-mono text-slate-300">
                                {chart.values![lIdx].toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* Continuous Numeric Histogram & Box Stats */}
                {chart.chart_type === 'histogram' && chart.counts && chart.box_stats && (
                  <div className="mt-2 space-y-3">
                    {/* Sparkline Histogram Bins */}
                    <div className="flex items-end gap-1 h-20 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      {chart.counts.map((c, cIdx) => {
                        const maxCount = Math.max(...chart.counts!);
                        const hPct = maxCount > 0 ? (c / maxCount) * 100 : 0;
                        return (
                          <div
                            key={cIdx}
                            className="flex-1 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all"
                            style={{ height: `${Math.max(4, hPct)}%` }}
                            title={`Count: ${c}`}
                          />
                        );
                      })}
                    </div>
                    {/* Box Metrics Summary */}
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono text-slate-400">
                      <div className="bg-slate-800/60 p-1.5 rounded border border-slate-700/50">
                        <span className="block text-[9px] text-slate-500 uppercase">Q1</span>
                        {chart.box_stats.q1}
                      </div>
                      <div className="bg-slate-800/60 p-1.5 rounded border border-slate-700/50 text-emerald-400 font-bold">
                        <span className="block text-[9px] text-slate-500 uppercase">Median</span>
                        {chart.box_stats.median}
                      </div>
                      <div className="bg-slate-800/60 p-1.5 rounded border border-slate-700/50">
                        <span className="block text-[9px] text-slate-500 uppercase">Q3</span>
                        {chart.box_stats.q3}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex justify-between font-mono">
                <span>Missing: {chart.null_count ?? 0}</span>
                {chart.box_stats && <span>Outliers: {chart.box_stats.outliers_count}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: CORRELATION HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-1 font-mono">
            Pearson Correlation Matrix
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Identifies positive and negative co-dependencies between features
          </p>

          {data.correlation_matrix ? (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs font-mono">
                <thead>
                  <tr>
                    <th className="p-2 border border-slate-800 bg-slate-950 text-slate-400 font-semibold text-left">
                      Feature
                    </th>
                    {data.correlation_matrix.columns.map((col, i) => (
                      <th
                        key={i}
                        className="p-2 border border-slate-800 bg-slate-950 text-slate-300 font-semibold text-center truncate max-w-[90px]"
                        title={col}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.correlation_matrix.matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="p-2 border border-slate-800 bg-slate-950 text-slate-300 font-medium whitespace-nowrap">
                        {data.correlation_matrix!.columns[rIdx]}
                      </td>
                      {row.map((val, cIdx) => {
                        const isPositive = val > 0;
                        const intensity = Math.abs(val);
                        const bgStyle = isPositive
                          ? `rgba(99, 102, 241, ${intensity * 0.85})`
                          : `rgba(239, 68, 68, ${intensity * 0.85})`;
                        return (
                          <td
                            key={cIdx}
                            style={{ backgroundColor: bgStyle }}
                            className={`p-2 border border-slate-800 text-center font-bold ${
                              intensity > 0.45 ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-mono">
              At least 2 numeric columns are required to calculate correlations.
            </p>
          )}
        </div>
      )}

      {/* VIEW 3: GEOSPATIAL MAP VIEW */}
      {activeTab === 'geo' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 font-mono">
                Geospatial Distribution
              </h3>
              <p className="text-xs text-slate-400">
                {data.geo_data
                  ? `Plotted ${data.geo_data.points.length.toLocaleString()} locations using ${data.geo_data.lat_col} & ${data.geo_data.lon_col}`
                  : 'No latitude/longitude coordinates identified.'}
              </p>
            </div>
          </div>

          {data.geo_data ? (
            <div className="relative w-full h-96 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
              {/* Simulated Map Visualizer Canvas */}
              <svg className="w-full h-full p-4">
                {data.geo_data.points.map((pt, pIdx) => {
                  const lat = pt[data.geo_data!.lat_col];
                  const lon = pt[data.geo_data!.lon_col];
                  const x = ((lon + 180) % 360) / 3.6;
                  const y = ((-lat + 90) % 180) / 1.8;
                  return (
                    <circle
                      key={pIdx}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="3.5"
                      className="fill-indigo-400/80 hover:fill-emerald-400 transition-colors"
                    />
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              No geospatial fields (e.g., Latitude, Longitude, Northing, Easting) found in the dataset.
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: SUMMARY GRID */}
      {activeTab === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-6 py-3">Column</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Unique</th>
                  <th className="px-6 py-3">Missing</th>
                  <th className="px-6 py-3">Mean</th>
                  <th className="px-6 py-3">Std</th>
                  <th className="px-6 py-3">Min</th>
                  <th className="px-6 py-3">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {data.summary_table.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-sans font-medium text-white">{row.column}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                        {row.dtype}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">{row.unique_values.toLocaleString()}</td>
                    <td className="px-6 py-3.5">
                      <span className={row.missing_count > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {row.missing_count} ({row.missing_pct}%)
                      </span>
                    </td>
                    <td className="px-6 py-3.5">{row.mean !== undefined && row.mean !== null ? row.mean : '—'}</td>
                    <td className="px-6 py-3.5">{row.std !== undefined && row.std !== null ? row.std : '—'}</td>
                    <td className="px-6 py-3.5">{row.min !== undefined && row.min !== null ? row.min : '—'}</td>
                    <td className="px-6 py-3.5">{row.max !== undefined && row.max !== null ? row.max : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
