import React, { useState } from 'react';
import {
  Table, Filter, Settings2, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, Search, X
} from 'lucide-react';
import type { Dataset } from '../../types';

interface DataPreviewProps {
  dataset: Dataset | null;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ dataset }) => {
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [showFilterBar, setShowFilterBar] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  React.useEffect(() => {
    if (dataset) {
      setVisibleColumns(dataset.column_names);
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-[#0f1628]/40 text-[#4a5a80] space-y-2">
        <Table size={32} strokeWidth={1.5} />
        <p className="text-[13px] font-medium text-[#8b9cc8]">No dataset uploaded yet</p>
        <p className="text-[11px] text-[#4a5a80]">Upload a CSV or Excel file in the Data Explorer to preview records</p>
      </div>
    );
  }

  // Filter rows locally for preview
  const filteredRows = dataset.preview.filter((row) => {
    if (!filterQuery) return true;
    return Object.values(row).some((val) =>
      String(val ?? '').toLowerCase().includes(filterQuery.toLowerCase())
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const currentRows = filteredRows.slice(startIdx, startIdx + pageSize);

  return (
    <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 shadow-sm space-y-3">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#8b9cc8] font-mono">Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#0b0f20] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-[#4f8ef7]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-[11px] text-[#8b9cc8] font-mono">rows</span>
        </div>

        <div className="flex items-center gap-2">
          {showFilterBar && (
            <div className="relative animate-in fade-in slide-in-from-right-2 duration-150">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5a80]" />
              <input
                value={filterQuery}
                onChange={(e) => {
                  setFilterQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter preview rows..."
                className="pl-7 pr-7 py-1 bg-[#0b0f20] border border-white/10 rounded-lg text-[11px] text-white placeholder-[#4a5a80] font-mono focus:outline-none focus:border-[#4f8ef7]"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a5a80] hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`px-3 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              showFilterBar || filterQuery
                ? 'bg-[#4f8ef7]/15 text-[#4f8ef7] border-[#4f8ef7]/30'
                : 'border-white/10 bg-[#0b0f20] text-[#8b9cc8] hover:text-white hover:border-white/20'
            }`}
          >
            <Filter size={12} />
            Filters {filterQuery && '●'}
          </button>

          <button className="px-3 py-1 rounded-lg border border-white/10 bg-[#0b0f20] text-[#8b9cc8] hover:text-white hover:border-white/20 text-[11px] font-medium transition-all flex items-center gap-1.5">
            <Settings2 size={12} />
            Column Settings
          </button>
        </div>
      </div>

      {/* Interactive Data Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0b0f20]/60 max-h-[360px]">
        <table className="w-full text-left text-[11px] font-mono border-collapse">
          <thead className="sticky top-0 bg-[#0b0f20] z-10 shadow-sm border-b border-white/[0.08]">
            <tr className="text-[#4a5a80] uppercase text-[10px]">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              {visibleColumns.map((col) => (
                <th key={col} className="py-2.5 px-3 whitespace-nowrap font-semibold text-[#8b9cc8]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {currentRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-3 text-center text-[#4a5a80]">
                  {startIdx + rowIdx + 1}
                </td>
                {visibleColumns.map((col) => {
                  const val = row[col];
                  const isNull = val === null || val === undefined;
                  return (
                    <td
                      key={col}
                      className="py-2 px-3 whitespace-nowrap max-w-[200px] truncate"
                      title={String(val ?? 'null')}
                    >
                      {isNull ? (
                        <span className="text-[#f0456a] font-bold text-[10px] bg-[#f0456a]/10 px-1.5 py-0.5 rounded">
                          null
                        </span>
                      ) : (
                        <span className="text-[#e8edf8]">{String(val)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-mono text-[#4a5a80]">
          Showing {Math.min(startIdx + 1, dataset.rows)} to {Math.min(startIdx + currentRows.length, dataset.rows)} of {dataset.rows.toLocaleString()} rows
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1 rounded bg-[#0b0f20] border border-white/10 text-[#8b9cc8] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronsLeft size={13} />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded bg-[#0b0f20] border border-white/10 text-[#8b9cc8] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Page Number Chips */}
          {[...Array(Math.min(5, totalPages))].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-6 h-6 rounded text-[11px] font-mono transition-all ${
                currentPage === i + 1
                  ? 'bg-[#7c5cfc] text-white font-bold shadow-md shadow-[#7c5cfc]/30'
                  : 'bg-[#0b0f20] border border-white/10 text-[#8b9cc8] hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}

          {totalPages > 5 && <span className="text-[#4a5a80] px-1 text-[11px]">...</span>}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-[#0b0f20] border border-white/10 text-[#8b9cc8] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={13} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-[#0b0f20] border border-white/10 text-[#8b9cc8] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
