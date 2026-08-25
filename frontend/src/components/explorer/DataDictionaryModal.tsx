import React from 'react';
import { X, BookOpen, Download, Search } from 'lucide-react';
import type { Dataset } from '../../types';
import { dtypePill } from './ExplorerSidebar';

interface DataDictionaryModalProps {
  dataset: Dataset | null;
  onClose: () => void;
}

export const DataDictionaryModal: React.FC<DataDictionaryModalProps> = ({
  dataset,
  onClose,
}) => {
  const [search, setSearch] = React.useState('');

  if (!dataset) return null;

  const filtered = dataset.schema.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dtype.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1628] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0f20]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#7c5cfc]/15 text-[#7c5cfc]">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white">Data Dictionary</h3>
              <p className="text-[11px] text-[#8b9cc8]">
                {dataset.file_name} • {dataset.columns} Attributes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/[0.06] bg-[#0b0f20]/50">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5a80]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dictionary attributes..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0f1628] border border-white/[0.08] rounded-lg text-[11px] text-white placeholder-[#4a5a80] focus:outline-none focus:border-[#7c5cfc]/50 font-mono"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-[11px] font-mono border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[#4a5a80] uppercase text-[10px]">
                <th className="pb-2 pl-2">Column</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Unique</th>
                <th className="pb-2">Missing</th>
                <th className="pb-2 pr-2 text-right">Completeness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((col) => {
                const { label, cls } = dtypePill(col.dtype);
                const completeness = (100 - col.missing_percentage).toFixed(1);
                return (
                  <tr key={col.name} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 pl-2 font-bold text-white">{col.name}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] ${cls}`}>
                        {label}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#8b9cc8]">{col.unique.toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className={col.missing > 0 ? 'text-[#f5a623]' : 'text-[#10d98a]'}>
                        {col.missing} ({col.missing_percentage}%)
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-right text-[#10d98a]">
                      {completeness}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
