import React, { useEffect, useState } from 'react';
import { fetchDatasetProfile } from '../../services/api';
import type { Dataset } from '../../types';

interface OverviewMetrics {
  total_rows: number;
  total_columns: number;
  missing_cells: number;
  missing_percentage: number;
  duplicate_rows: number;
  duplicate_percentage: number;
  health_score: number;
}

interface ColumnStat {
  type: string;
  missing_count: number;
  missing_percentage: number;
  unique_values: number;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  max?: number | null;
  zeros?: number;
}

interface ProfileData {
  overview: OverviewMetrics;
  columns: Record<string, ColumnStat>;
}

interface DatasetOverviewProps {
  dataset?: Dataset | null;
}

export const DatasetOverview: React.FC<DatasetOverviewProps> = ({ dataset }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDatasetProfile(dataset?.dataset_id || 'default_session');
        if (isMounted) {
          if (data && data.overview) {
            setProfile(data);
          } else if (dataset) {
            // Fallback from dataset object if profile API is warming up
            setProfile({
              overview: {
                total_rows: dataset.rows,
                total_columns: dataset.columns,
                missing_cells: dataset.missing_cells,
                missing_percentage: dataset.missing_percentage,
                duplicate_rows: 0,
                duplicate_percentage: 0,
                health_score: dataset.quality?.overall ?? 85,
              },
              columns: Object.fromEntries(
                dataset.schema.map((c) => [
                  c.name,
                  {
                    type: c.dtype,
                    missing_count: c.missing,
                    missing_percentage: c.missing_percentage,
                    unique_values: c.unique,
                    mean: c.mean ?? null,
                    std: c.std ?? null,
                    min: c.min ?? null,
                    max: c.max ?? null,
                  },
                ])
              ),
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          if (dataset) {
            setProfile({
              overview: {
                total_rows: dataset.rows,
                total_columns: dataset.columns,
                missing_cells: dataset.missing_cells,
                missing_percentage: dataset.missing_percentage,
                duplicate_rows: 0,
                duplicate_percentage: 0,
                health_score: dataset.quality?.overall ?? 85,
              },
              columns: Object.fromEntries(
                dataset.schema.map((c) => [
                  c.name,
                  {
                    type: c.dtype,
                    missing_count: c.missing,
                    missing_percentage: c.missing_percentage,
                    unique_values: c.unique,
                    mean: c.mean ?? null,
                    std: c.std ?? null,
                    min: c.min ?? null,
                    max: c.max ?? null,
                  },
                ])
              ),
            });
          } else {
            setError(err.message || 'Failed to load dataset overview');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [dataset?.dataset_id, dataset?.rows]);

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
        Generating automated dataset profile...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-sm">
        {error || 'No active dataset found to profile. Please upload a CSV first.'}
      </div>
    );
  }

  if (!profile) return null;

  const { overview, columns } = profile;

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-150">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-700 transition-all">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">Health Score</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-mono">{overview.health_score}%</h3>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border font-mono ${
              overview.health_score >= 80
                ? 'bg-emerald-950 text-emerald-400 border-emerald-700/50'
                : overview.health_score >= 50
                ? 'bg-amber-950 text-amber-400 border-amber-700/50'
                : 'bg-red-950 text-red-400 border-red-700/50'
            }`}
          >
            {overview.health_score}
          </div>
        </div>

        {/* Dataset Shape */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-sm hover:border-slate-700 transition-all">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">Shape</p>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">
            {overview.total_rows.toLocaleString()} <span className="text-xs text-slate-500 font-normal">rows</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">{overview.total_columns} columns</p>
        </div>

        {/* Missing Values */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-sm hover:border-slate-700 transition-all">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">Missing Cells</p>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">
            {overview.missing_cells.toLocaleString()}
          </h3>
          <p className="text-xs text-amber-400 mt-1 font-mono">{overview.missing_percentage}% total missing</p>
        </div>

        {/* Duplicates */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-sm hover:border-slate-700 transition-all">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">Duplicates</p>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">
            {overview.duplicate_rows.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">{overview.duplicate_percentage}% duplicate rows</p>
        </div>
      </div>

      {/* Column Quality & Stats Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <h4 className="font-semibold text-sm text-slate-200 font-mono">Column Profiles & Statistical Summaries</h4>
          <span className="text-xs text-slate-400 font-mono">{Object.keys(columns).length} Features Detected</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3">Column</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Unique</th>
                <th className="px-6 py-3">Missing</th>
                <th className="px-6 py-3">Mean ± Std</th>
                <th className="px-6 py-3">Min / Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {Object.entries(columns).map(([colName, stats]) => (
                <tr key={colName} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-white font-sans text-xs">{colName}</td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                      {stats.type}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">{stats.unique_values.toLocaleString()}</td>
                  <td className="px-6 py-3.5">
                    {stats.missing_count > 0 ? (
                      <span className="text-amber-400 font-medium">
                        {stats.missing_count} ({stats.missing_percentage}%)
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">0%</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {stats.mean !== undefined && stats.mean !== null ? (
                      `${stats.mean.toFixed(2)} ± ${stats.std ? stats.std.toFixed(2) : '0.00'}`
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {stats.min !== undefined && stats.min !== null ? (
                      `${stats.min} / ${stats.max}`
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
