import React, { useState, useRef } from 'react';
import {
  Upload, Search, Hash, Type, Calendar,
  ToggleLeft, HelpCircle, CheckCircle, FileText,
  BookOpen, Loader2, Sparkles, X, ChevronRight,
  Info, BarChart
} from 'lucide-react';
import type { Dataset, ColumnSchema } from '../../types';

interface ExplorerSidebarProps {
  dataset: Dataset | null;
  loading: boolean;
  onUpload: (file: File) => void;
  onSelectColumn?: (col: ColumnSchema) => void;
  onOpenDataDictionary: () => void;
  onExportNotebook?: () => void;
}

export function dtypePill(dtype: string) {
  const d = dtype.toLowerCase();
  if (d.includes('int') || d.includes('float')) return { label: 'int64', cls: 'bg-[#4f8ef7]/15 text-[#4f8ef7] border-[#4f8ef7]/30', Icon: Hash };
  if (d.includes('object') || d.includes('str')) return { label: 'object', cls: 'bg-[#10d98a]/15 text-[#10d98a] border-[#10d98a]/30', Icon: Type };
  if (d.includes('datetime')) return { label: 'datetime', cls: 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/30', Icon: Calendar };
  if (d.includes('bool')) return { label: 'bool', cls: 'bg-[#7c5cfc]/15 text-[#7c5cfc] border-[#7c5cfc]/30', Icon: ToggleLeft };
  return { label: dtype, cls: 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30', Icon: HelpCircle };
}

export const ExplorerSidebar: React.FC<ExplorerSidebarProps> = ({
  dataset,
  loading,
  onUpload,
  onSelectColumn,
  onOpenDataDictionary,
  onExportNotebook,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);

  const filteredColumns = dataset
    ? dataset.schema.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onUpload(f);
  };

  return (
    <aside className="w-[230px] min-w-[230px] bg-[#0b0f20] border-r border-white/[0.06] flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Header Title */}
      <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#8b9cc8] tracking-wider uppercase font-mono">
          Data Explorer
        </span>
        <span className="text-[10px] text-[#4a5a80] font-mono">
          {dataset ? `${dataset.columns} cols` : 'V1.0'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {/* Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border rounded-xl p-4 text-center transition-all relative ${
            dragging
              ? 'border-[#4f8ef7] bg-[#4f8ef7]/10 shadow-lg shadow-[#4f8ef7]/10'
              : 'border-dashed border-white/10 bg-[#0f1628]/60 hover:border-white/20'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />

          <div className="w-10 h-10 rounded-full bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 flex items-center justify-center mx-auto mb-2 text-[#4f8ef7]">
            <Upload size={18} />
          </div>

          <p className="text-[11px] font-medium text-[#e8edf8] mb-0.5">
            Upload CSV
          </p>
          <p className="text-[10px] text-[#4a5a80] mb-3">
            or drag and drop
          </p>

          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="w-full py-1.5 px-3 rounded-md text-[11px] font-semibold bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] text-white hover:brightness-110 shadow-md shadow-[#4f8ef7]/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Analyzing...
              </>
            ) : (
              'Browse Files'
            )}
          </button>
        </div>

        {/* Active Dataset Card */}
        {dataset && (
          <div className="bg-[#0f1628] border border-white/[0.08] rounded-xl p-3 shadow-md relative overflow-hidden group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText size={13} className="text-[#4f8ef7] flex-shrink-0" />
                <span
                  className="text-[12px] font-semibold text-[#e8edf8] truncate"
                  title={dataset.file_name}
                >
                  {dataset.file_name}
                </span>
              </div>
              <span className="w-4 h-4 rounded-full bg-[#10d98a]/20 border border-[#10d98a]/40 flex items-center justify-center text-[#10d98a] flex-shrink-0">
                <CheckCircle size={10} />
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#8b9cc8] flex items-center gap-2">
              <span>{dataset.rows.toLocaleString()} rows</span>
              <span>•</span>
              <span>{dataset.columns} columns</span>
            </div>
          </div>
        )}

        {/* Column Search & List */}
        {dataset && (
          <div className="space-y-2">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5a80]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search columns..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-[#0f1628] border border-white/[0.07] rounded-lg text-[11px] text-[#e8edf8] placeholder-[#4a5a80] focus:outline-none focus:border-[#4f8ef7]/50 font-mono transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a80] font-mono">
                COLUMNS ({dataset.columns})
              </span>
            </div>

            <div className="space-y-1 max-h-[340px] overflow-y-auto pr-0.5">
              {filteredColumns.map((col) => {
                const { label, cls, Icon } = dtypePill(col.dtype);
                const hasMissing = col.missing_percentage > 0;
                return (
                  <div
                    key={col.name}
                    onClick={() => onSelectColumn && onSelectColumn(col)}
                    className="flex items-center justify-between p-1.5 rounded-lg border border-transparent hover:border-white/[0.06] hover:bg-white/[0.03] cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <Icon size={12} className="text-[#4a5a80] flex-shrink-0 group-hover:text-[#4f8ef7]" />
                      <span
                        className="text-[11px] font-mono text-[#e8edf8] truncate group-hover:text-[#4f8ef7] transition-colors"
                        title={col.name}
                      >
                        {col.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasMissing && (
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                            col.missing_percentage > 20
                              ? 'bg-[#f0456a]/15 text-[#f0456a] border-[#f0456a]/30'
                              : 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/30'
                          }`}
                        >
                          {col.missing_percentage}%
                        </span>
                      )}
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${cls}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onOpenDataDictionary}
              className="w-full mt-2 py-1.5 px-2.5 rounded-lg border border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-[#8b9cc8] hover:text-white text-[11px] font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <BookOpen size={12} />
              View Data Dictionary
            </button>

            {onExportNotebook && (
              <button
                onClick={onExportNotebook}
                className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition shadow-md"
              >
                <BookOpen size={14} /> Export Notebook (.ipynb)
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
