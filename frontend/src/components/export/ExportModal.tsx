import React, { useState } from 'react';
import {
  X, Download, FileSpreadsheet, FileCode,
  FileText, CheckCircle2, Loader2
} from 'lucide-react';
import type { Dataset } from '../../types';
import { API_BASE } from '../../services/api';

interface ExportModalProps {
  dataset?: Dataset | null;
  onClose?: () => void;
  onOpenReport?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  dataset,
  onClose,
  onOpenReport,
}) => {
  const [isExporting, setIsExporting] = useState<'notebook' | 'report' | 'csv' | null>(null);

  const handleDownload = async (type: 'notebook' | 'report') => {
    setIsExporting(type);
    try {
      const sessionId = dataset?.dataset_id || 'default_session';
      const response = await fetch(`${API_BASE}/export/${type}?session_id=${sessionId}`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });
      if (!response.ok) throw new Error(`Export ${type} failed`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a hidden link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'notebook' ? 'datapilot_analysis.ipynb' : 'executive_report.html';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const exportCleanedCSV = () => {
    if (!dataset || !dataset.preview.length) return;
    setIsExporting('csv');
    try {
      const keys = dataset.column_names;
      const csvContent = [
        keys.join(','),
        ...dataset.preview.map((row) =>
          keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_${dataset.file_name || 'dataset.csv'}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f1628] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2.5 rounded-xl bg-[#4f8ef7]/15 text-[#4f8ef7]">
            <Download size={20} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-white font-mono">Export Workspace</h3>
            <p className="text-[11px] text-[#8b9cc8]">
              {dataset?.file_name ? `${dataset.file_name} • ` : ''}Download reproducible notebooks & reports
            </p>
          </div>
        </div>

        <div className="space-y-3 font-mono">
          {/* Executive Intelligence HTML Report */}
          <div
            onClick={() => handleDownload('report')}
            className="p-3.5 rounded-xl bg-[#0b0f20] border border-white/[0.06] hover:border-[#10d98a]/40 hover:bg-[#10d98a]/5 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-[#10d98a]" />
              <div>
                <span className="text-[13px] font-semibold text-white group-hover:text-[#10d98a] transition-colors block font-sans">
                  Executive Intelligence Report (HTML)
                </span>
                <span className="text-[10px] text-[#4a5a80]">
                  Automated scorecard, data health metrics, and column statistical summaries
                </span>
              </div>
            </div>
            {isExporting === 'report' ? (
              <Loader2 size={15} className="animate-spin text-[#10d98a]" />
            ) : (
              <Download size={15} className="text-[#4a5a80] group-hover:text-[#10d98a]" />
            )}
          </div>

          {/* Export Jupyter Notebook */}
          <div
            onClick={() => handleDownload('notebook')}
            className="p-3.5 rounded-xl bg-[#0b0f20] border border-white/[0.06] hover:border-[#4f8ef7]/40 hover:bg-[#1e2d54]/40 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileCode size={18} className="text-[#4f8ef7]" />
              <div>
                <span className="text-[13px] font-semibold text-white group-hover:text-[#4f8ef7] transition-colors block font-sans">
                  Reproducible Jupyter Notebook (.ipynb)
                </span>
                <span className="text-[10px] text-[#4a5a80]">
                  Pre-configured Python notebook with data loading, EDA, and model training
                </span>
              </div>
            </div>
            {isExporting === 'notebook' ? (
              <Loader2 size={15} className="animate-spin text-[#4f8ef7]" />
            ) : (
              <Download size={15} className="text-[#4a5a80] group-hover:text-[#4f8ef7]" />
            )}
          </div>

          {/* Export Cleaned CSV */}
          {dataset && (
            <div
              onClick={exportCleanedCSV}
              className="p-3.5 rounded-xl bg-[#0b0f20] border border-white/[0.06] hover:border-[#7c5cfc]/40 hover:bg-[#1e2d54]/40 cursor-pointer flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={18} className="text-[#7c5cfc]" />
                <div>
                  <span className="text-[13px] font-semibold text-white group-hover:text-[#7c5cfc] transition-colors block font-sans">
                    Cleaned Dataset (CSV)
                  </span>
                  <span className="text-[10px] text-[#4a5a80]">
                    Download active workspace data snapshot
                  </span>
                </div>
              </div>
              {isExporting === 'csv' ? (
                <Loader2 size={15} className="animate-spin text-[#7c5cfc]" />
              ) : (
                <Download size={15} className="text-[#4a5a80] group-hover:text-[#7c5cfc]" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
