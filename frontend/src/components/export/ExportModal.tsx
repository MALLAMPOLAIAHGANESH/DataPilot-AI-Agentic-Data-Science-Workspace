import React from 'react';
import {
  X, Download, FileSpreadsheet, FileCode,
  FileText, Cloud, CheckCircle2
} from 'lucide-react';
import type { Dataset } from '../../types';
import { getReportDownloadUrl } from '../../services/api';

interface ExportModalProps {
  dataset: Dataset | null;
  onClose: () => void;
  onOpenReport?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  dataset,
  onClose,
  onOpenReport,
}) => {
  if (!dataset) return null;

  const exportCleanedCSV = () => {
    if (!dataset.preview.length) return;
    const keys = dataset.column_names;
    const csvContent = [
      keys.join(','),
      ...dataset.preview.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${dataset.file_name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    window.open(getReportDownloadUrl(dataset.dataset_id), '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1628] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/10"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2.5 rounded-xl bg-[#4f8ef7]/15 text-[#4f8ef7]">
            <Download size={20} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-white">Export Center</h3>
            <p className="text-[11px] text-[#8b9cc8]">
              {dataset.file_name} • Download data, reports, and code artifacts
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* Phase 7: Executive Intelligence HTML Report */}
          <div
            onClick={() => {
              if (onOpenReport) onOpenReport();
              else handleDownloadReport();
            }}
            className="p-3.5 rounded-xl bg-[#0b0f20] border border-white/[0.06] hover:border-[#10d98a]/40 hover:bg-[#10d98a]/5 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-[#10d98a]" />
              <div>
                <span className="text-[13px] font-semibold text-white group-hover:text-[#10d98a] transition-colors block">
                  Executive Intelligence Report (HTML / PDF)
                </span>
                <span className="text-[10px] text-[#4a5a80]">
                  Automated scorecard, data health metrics, and strategic recommendations
                </span>
              </div>
            </div>
            <Download size={15} className="text-[#4a5a80] group-hover:text-[#10d98a]" />
          </div>

          {/* Export Cleaned CSV */}
          <div
            onClick={exportCleanedCSV}
            className="p-3.5 rounded-xl bg-[#0b0f20] border border-white/[0.06] hover:border-[#4f8ef7]/40 hover:bg-[#1e2d54]/40 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={18} className="text-[#4f8ef7]" />
              <div>
                <span className="text-[13px] font-semibold text-white group-hover:text-[#4f8ef7] transition-colors block">
                  Cleaned Dataset (CSV)
                </span>
                <span className="text-[10px] text-[#4a5a80]">
                  Download processed records without missing values or duplicates
                </span>
              </div>
            </div>
            <Download size={15} className="text-[#4a5a80] group-hover:text-[#4f8ef7]" />
          </div>

          {/* Export PyTorch Notebook */}
          <div
            onClick={onClose}
            className="p-3.5 rounded-xl bg-[#0b0f20] border border-white/[0.06] hover:border-[#7c5cfc]/40 hover:bg-[#1e2d54]/40 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileCode size={18} className="text-[#7c5cfc]" />
              <div>
                <span className="text-[13px] font-semibold text-white group-hover:text-[#7c5cfc] transition-colors block">
                  Google Colab PyTorch Notebook (.ipynb)
                </span>
                <span className="text-[10px] text-[#4a5a80]">
                  Runnable GPU-ready deep learning training pipeline
                </span>
              </div>
            </div>
            <Download size={15} className="text-[#4a5a80] group-hover:text-[#7c5cfc]" />
          </div>
        </div>
      </div>
    </div>
  );
};
