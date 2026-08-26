import React, { useState, useEffect } from 'react';
import {
  Database, Play, Link, Cloud, Terminal,
  CheckCircle2, Sparkles, AlertCircle, Copy, Loader2
} from 'lucide-react';
import type { Dataset } from '../../types';
import { executeSQL, executeJoin, testBigQuery, queryBigQuery } from '../../services/api';

interface SQLStudioProps {
  currentDataset?: Dataset | null;
  onDatasetImported?: (ds: Dataset) => void;
  onAskAI?: (query: string) => void;
}

export const SQLStudio: React.FC<SQLStudioProps> = ({
  currentDataset,
  onDatasetImported,
  onAskAI,
}) => {
  const [query, setQuery] = useState<string>('SELECT * FROM df LIMIT 10;');
  const [source, setSource] = useState<'local' | 'bigquery'>('local');
  const [results, setResults] = useState<{
    columns: string[];
    data?: Record<string, any>[];
    rows?: Record<string, any>[];
    row_count?: number;
    total_rows?: number;
    execution_time_ms?: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await executeSQL(query, source, currentDataset?.dataset_id || 'default_session');
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'SQL execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 text-slate-200 animate-in fade-in duration-150">
      {/* Header with Source Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-indigo-400" />
            <h2 className="text-lg font-bold text-white font-mono tracking-wide">SQL Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Execute in-memory DuckDB queries or live Google Cloud BigQuery statements
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="text-slate-400">Data Engine:</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'local' | 'bigquery')}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
          >
            <option value="local">Local Dataset (DuckDB)</option>
            <option value="bigquery">Google BigQuery (Live)</option>
          </select>
        </div>
      </div>

      {/* SQL Editor Area */}
      <div className="space-y-2 font-mono">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>SQL Query {source === 'local' ? '(Query against table "df")' : '(Google Cloud Standard SQL)'}</span>
          {onAskAI && (
            <button
              onClick={() => onAskAI(`Write an optimized SQL query for ${currentDataset?.file_name || 'my dataset'}`)}
              className="text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Sparkles size={12} /> Ask AI to write query
            </button>
          )}
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={5}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed"
          placeholder={
            source === 'local'
              ? 'SELECT * FROM df WHERE ... LIMIT 10;'
              : 'SELECT * FROM `bigquery-public-data.samples.shakespeare` LIMIT 10;'
          }
        />

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleRunQuery}
            disabled={loading || !query.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2 rounded-lg font-medium text-xs text-white transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Executing Query...
              </>
            ) : (
              <>
                <Play size={13} />
                Execute Query
              </>
            )}
          </button>

          {source === 'bigquery' && (
            <span className="text-[11px] text-slate-400 font-mono">
              Requires GCP credentials configured in environment
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-400 bg-red-950/40 p-3.5 rounded-xl border border-red-800 text-xs font-mono flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <div className="break-all">{error}</div>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 px-4 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400 flex justify-between items-center">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Query successful
            </span>
            <span>
              {(results.row_count ?? results.total_rows ?? results.data?.length ?? results.rows?.length ?? 0).toLocaleString()} rows returned
            </span>
          </div>

          <div className="overflow-x-auto max-h-[360px] p-2">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-indigo-300 uppercase tracking-wider text-[10px] sticky top-0">
                <tr>
                  {results.columns.map((col: string) => (
                    <th key={col} className="px-4 py-2.5 border-b border-slate-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {(results.data || results.rows || []).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    {results.columns.map((col: string) => (
                      <td key={col} className="px-4 py-2 text-slate-300">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                      </td>
                    ))}
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
