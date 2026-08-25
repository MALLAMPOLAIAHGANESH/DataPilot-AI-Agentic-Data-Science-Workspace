import React, { useState, useEffect } from 'react';
import {
  Database, Play, Link, Cloud, Terminal,
  CheckCircle2, Sparkles, AlertCircle, Download,
  Layers, Copy, RefreshCw, Loader2, Table
} from 'lucide-react';
import type { Dataset } from '../../types';
import { executeSQL, executeJoin, testBigQuery, queryBigQuery } from '../../services/api';

interface SQLStudioProps {
  currentDataset: Dataset | null;
  onDatasetImported: (ds: Dataset) => void;
  onAskAI: (query: string) => void;
}

export const SQLStudio: React.FC<SQLStudioProps> = ({
  currentDataset,
  onDatasetImported,
  onAskAI,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'join' | 'bigquery'>('editor');

  // SQL Editor State
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT Pclass, COUNT(*) as total_passengers, AVG(Age) as avg_age, AVG(Fare) as avg_fare FROM df1 GROUP BY Pclass ORDER BY avg_fare DESC'
  );
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: Record<string, any>[];
    total_rows: number;
    execution_time_ms: number;
    available_tables: string[];
  } | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Visual Join State
  const [joinLeftDataset, setJoinLeftDataset] = useState<string>('');
  const [joinRightDataset, setJoinRightDataset] = useState<string>('');
  const [joinLeftKey, setJoinLeftKey] = useState<string>('');
  const [joinRightKey, setJoinRightKey] = useState<string>('');
  const [joinType, setJoinType] = useState<'inner' | 'left' | 'right' | 'outer'>('inner');
  const [joining, setJoining] = useState<boolean>(false);

  // BigQuery State
  const [bqStatus, setBqStatus] = useState<any>(null);
  const [bqQuery, setBqQuery] = useState<string>(
    'SELECT word, word_count, corpus FROM `bigquery-public-data.samples.shakespeare` WHERE word_count > 1000 ORDER BY word_count DESC LIMIT 20'
  );
  const [bqLoading, setBqLoading] = useState<boolean>(false);
  const [bqResult, setBqResult] = useState<any>(null);

  useEffect(() => {
    if (currentDataset) {
      setJoinLeftDataset(currentDataset.dataset_id);
      if (currentDataset.column_names.length > 0) {
        setJoinLeftKey(currentDataset.column_names[0]);
      }
    }
  }, [currentDataset]);

  // Load BigQuery status
  useEffect(() => {
    testBigQuery()
      .then((res) => setBqStatus(res))
      .catch(() => {});
  }, []);

  const handleRunSQL = async () => {
    if (!sqlQuery.trim()) return;
    setExecuting(true);
    setSqlError(null);
    try {
      const res = await executeSQL(sqlQuery);
      setQueryResult(res);
    } catch (err: any) {
      setSqlError(err.response?.data?.detail?.message || err.message || 'SQL query failed');
    }
    setExecuting(false);
  };

  const handleRunJoin = async () => {
    if (!joinLeftDataset || !joinRightDataset || !joinLeftKey || !joinRightKey) return;
    setJoining(true);
    try {
      const newDs = await executeJoin({
        dataset_id_1: joinLeftDataset,
        dataset_id_2: joinRightDataset,
        left_on: joinLeftKey,
        right_on: joinRightKey,
        how: joinType,
      });
      onDatasetImported(newDs);
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Join failed');
    }
    setJoining(false);
  };

  const handleRunBigQuery = async () => {
    setBqLoading(true);
    try {
      const res = await queryBigQuery(bqQuery, undefined, true);
      setBqResult(res);
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'BigQuery query failed');
    }
    setBqLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Studio Header & Sub-Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[#4f8ef7]" />
          <span className="text-[12px] font-bold text-white font-mono uppercase">
            SQL STUDIO & CLOUD DATA CONNECTORS
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#0b0f20] p-1 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => setActiveSubTab('editor')}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              activeSubTab === 'editor'
                ? 'bg-[#1e2d54] text-[#4f8ef7] font-bold shadow-sm'
                : 'text-[#8b9cc8] hover:text-white'
            }`}
          >
            <Terminal size={12} /> SQL Query Editor
          </button>
          <button
            onClick={() => setActiveSubTab('join')}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              activeSubTab === 'join'
                ? 'bg-[#1e2d54] text-[#7c5cfc] font-bold shadow-sm'
                : 'text-[#8b9cc8] hover:text-white'
            }`}
          >
            <Link size={12} /> Relational Join Builder
          </button>
          <button
            onClick={() => setActiveSubTab('bigquery')}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              activeSubTab === 'bigquery'
                ? 'bg-[#1e2d54] text-[#22d3ee] font-bold shadow-sm'
                : 'text-[#8b9cc8] hover:text-white'
            }`}
          >
            <Cloud size={12} /> BigQuery Connector
          </button>
        </div>
      </div>

      {/* SUBTAB 1: SQL Query Editor */}
      {activeSubTab === 'editor' && (
        <div className="space-y-3">
          {/* Query Box */}
          <div className="bg-[#0f1628] border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-[#8b9cc8] font-mono">
                <span>Active Table Aliases:</span>
                <span className="bg-[#0b0f20] px-2 py-0.5 rounded border border-white/10 text-white font-bold">
                  df1
                </span>
                <span className="text-[#4a5a80]">(or table name)</span>
              </div>

              {/* Sample snippet chips */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-[#4a5a80]">Templates:</span>
                <button
                  onClick={() =>
                    setSqlQuery('SELECT Pclass, COUNT(*) as count, AVG(Fare) as avg_fare FROM df1 GROUP BY Pclass')
                  }
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#8b9cc8] hover:text-white"
                >
                  Group By
                </button>
                <button
                  onClick={() =>
                    setSqlQuery('SELECT * FROM df1 WHERE Age > 30 AND Survived = 1 ORDER BY Fare DESC')
                  }
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#8b9cc8] hover:text-white"
                >
                  Filter & Sort
                </button>
              </div>
            </div>

            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              rows={3}
              className="w-full bg-[#0b0f20] border border-white/10 rounded-xl p-3 text-[12px] font-mono text-[#e8edf8] focus:outline-none focus:border-[#4f8ef7] leading-relaxed resize-none"
              placeholder="Write SQL query across df1, df2..."
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[#4a5a80] font-mono">
                ⚡ In-Memory SQLite Analytical Engine with Read-Only Guards
              </span>
              <button
                onClick={handleRunSQL}
                disabled={executing || !sqlQuery.trim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] text-white font-semibold text-[11px] shadow-md shadow-[#4f8ef7]/20 hover:brightness-110 flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Play size={12} />
                {executing ? 'Executing SQL...' : 'Run Query (Ctrl + Enter)'}
              </button>
            </div>
          </div>

          {/* Error display if any */}
          {sqlError && (
            <div className="bg-[#f0456a]/10 border border-[#f0456a]/30 rounded-xl p-3 flex items-center gap-2 text-[#f0456a] text-[11px] font-mono">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{sqlError}</span>
            </div>
          )}

          {/* Query Results Table */}
          {queryResult && (
            <div className="bg-[#0f1628] border border-white/[0.08] rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#10d98a] flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={13} />
                  {queryResult.total_rows.toLocaleString()} rows returned ({queryResult.execution_time_ms} ms)
                </span>
                <button
                  onClick={() =>
                    onAskAI(`Explain insights from this SQL query result: ${JSON.stringify(queryResult.rows.slice(0, 5))}`)
                  }
                  className="text-[#7c5cfc] hover:underline flex items-center gap-1"
                >
                  <Sparkles size={11} /> Explain results with Copilot
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0b0f20] max-h-[300px]">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="sticky top-0 bg-[#0b0f20] border-b border-white/10 text-[#8b9cc8]">
                    <tr>
                      {queryResult.columns.map((col) => (
                        <th key={col} className="p-2 px-3 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02]">
                        {queryResult.columns.map((col) => (
                          <td key={col} className="p-2 px-3 whitespace-nowrap text-[#e8edf8]">
                            {String(row[col] ?? 'null')}
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
      )}

      {/* SUBTAB 2: Relational Join Builder */}
      {activeSubTab === 'join' && (
        <div className="bg-[#0f1628] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Link size={16} className="text-[#7c5cfc]" />
            <h4 className="text-[13px] font-bold text-white">Visual Relational Join Builder</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px]">
            {/* Left Dataset */}
            <div className="space-y-1.5">
              <label className="text-[#8b9cc8] block">Left Table:</label>
              <input
                disabled
                value={currentDataset?.file_name || 'df1'}
                className="w-full bg-[#0b0f20] border border-white/10 rounded-lg p-2 text-[#e8edf8]"
              />
              <label className="text-[#8b9cc8] block pt-1">Left Join Key:</label>
              <select
                value={joinLeftKey}
                onChange={(e) => setJoinLeftKey(e.target.value)}
                className="w-full bg-[#0b0f20] border border-white/10 rounded-lg p-2 text-white"
              >
                {currentDataset?.column_names.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Join Operator */}
            <div className="space-y-1.5 text-center flex flex-col justify-center">
              <label className="text-[#8b9cc8] block">Join Type:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['inner', 'left', 'right', 'outer'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setJoinType(type)}
                    className={`py-1.5 rounded-lg border text-center font-bold uppercase text-[10px] transition-all ${
                      joinType === type
                        ? 'bg-[#7c5cfc]/20 text-[#7c5cfc] border-[#7c5cfc]'
                        : 'bg-[#0b0f20] text-[#8b9cc8] border-white/10 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Dataset */}
            <div className="space-y-1.5">
              <label className="text-[#8b9cc8] block">Right Table / Joined Key:</label>
              <input
                value={joinRightDataset || currentDataset?.dataset_id || ''}
                onChange={(e) => setJoinRightDataset(e.target.value)}
                placeholder="Dataset ID or upload 2nd file"
                className="w-full bg-[#0b0f20] border border-white/10 rounded-lg p-2 text-[#e8edf8]"
              />
              <label className="text-[#8b9cc8] block pt-1">Right Join Key:</label>
              <input
                value={joinRightKey || joinLeftKey}
                onChange={(e) => setJoinRightKey(e.target.value)}
                placeholder="Right key column"
                className="w-full bg-[#0b0f20] border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-[#4a5a80] font-mono">
              Creates a combined unified DataFrame and registers as an active workspace dataset
            </span>
            <button
              onClick={handleRunJoin}
              disabled={joining || !joinLeftKey}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#4f8ef7] text-white font-semibold text-[11px] shadow-md shadow-[#7c5cfc]/20 hover:brightness-110 flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Link size={12} />
              {joining ? 'Executing Join...' : 'Execute Join & Create Dataset'}
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Google BigQuery Connector */}
      {activeSubTab === 'bigquery' && (
        <div className="bg-[#0f1628] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-[#22d3ee]" />
              <h4 className="text-[13px] font-bold text-white">Google Cloud BigQuery Gateway</h4>
            </div>
            {bqStatus && (
              <span className="text-[10px] font-mono text-[#10d98a] bg-[#10d98a]/10 px-2 py-0.5 rounded border border-[#10d98a]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10d98a]" />
                {bqStatus.status} • {bqStatus.project_id}
              </span>
            )}
          </div>

          {/* Public Datasets Quick Pickers */}
          {bqStatus?.available_public_datasets && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-[#8b9cc8] uppercase tracking-wider font-mono">
                Sample Public BigQuery Datasets:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {bqStatus.available_public_datasets.map((pub: any) => (
                  <div
                    key={pub.id}
                    onClick={() => setBqQuery(pub.sample_query)}
                    className="p-2.5 rounded-xl bg-[#0b0f20] border border-white/[0.05] hover:border-[#22d3ee]/40 cursor-pointer transition-all group"
                  >
                    <div className="font-bold text-white text-[11px] group-hover:text-[#22d3ee] transition-colors">
                      {pub.name}
                    </div>
                    <div className="text-[10px] text-[#4a5a80] line-clamp-1">{pub.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BigQuery SQL Query Editor */}
          <div className="space-y-2">
            <textarea
              value={bqQuery}
              onChange={(e) => setBqQuery(e.target.value)}
              rows={3}
              className="w-full bg-[#0b0f20] border border-white/10 rounded-xl p-3 text-[12px] font-mono text-[#e8edf8] focus:outline-none focus:border-[#22d3ee] leading-relaxed resize-none"
              placeholder="SELECT ... FROM `bigquery-public-data...`"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#4a5a80] font-mono">
                Dry Run Estimated Scan: ~24.5 MB
              </span>
              <button
                onClick={handleRunBigQuery}
                disabled={bqLoading || !bqQuery.trim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#22d3ee] to-[#4f8ef7] text-white font-semibold text-[11px] shadow-md shadow-[#22d3ee]/20 hover:brightness-110 flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Cloud size={12} />
                {bqLoading ? 'Executing Query on BigQuery...' : 'Execute on BigQuery & Import'}
              </button>
            </div>
          </div>

          {/* BigQuery Results */}
          {bqResult && (
            <div className="p-3 rounded-xl bg-[#0b0f20] border border-white/[0.06] space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between text-[#10d98a]">
                <span className="flex items-center gap-1 font-bold">
                  <CheckCircle2 size={13} /> {bqResult.message}
                </span>
                <span className="text-[#8b9cc8]">{bqResult.execution_time_ms} ms</span>
              </div>
              <div className="overflow-x-auto rounded-lg max-h-[180px]">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.04] text-[#8b9cc8]">
                    <tr>
                      {bqResult.columns.map((c: string) => (
                        <th key={c} className="p-1.5 px-2">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {bqResult.rows.slice(0, 5).map((r: any, idx: number) => (
                      <tr key={idx}>
                        {bqResult.columns.map((c: string) => (
                          <td key={c} className="p-1.5 px-2 text-[#e8edf8]">
                            {String(r[c])}
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
      )}
    </div>
  );
};
