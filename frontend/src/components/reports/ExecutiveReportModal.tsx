import React, { useState, useEffect } from 'react';
import {
  X, FileText, Download, Printer,
  Sparkles, CheckCircle2, Loader2
} from 'lucide-react';
import type { Dataset } from '../../types';
import { getExecutiveReport, getReportDownloadUrl } from '../../services/api';

interface ExecutiveReportModalProps {
  dataset: Dataset | null;
  onClose: () => void;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  dataset,
  onClose,
}) => {
  const [reportData, setReportData] = useState<{
    html: string;
    overall_score: number;
    generated_at: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (dataset) {
      setLoading(true);
      getExecutiveReport(dataset.dataset_id)
        .then((res) => setReportData(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [dataset]);

  if (!dataset) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && reportData) {
      printWindow.document.write(reportData.html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    window.open(getReportDownloadUrl(dataset.dataset_id), '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1628] border border-white/10 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0f20]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10d98a]/20 to-[#4f8ef7]/20 border border-[#10d98a]/30 flex items-center justify-center text-[#10d98a]">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white">
                Executive Data Intelligence Report
              </h3>
              <p className="text-[10px] text-[#8b9cc8] font-mono">
                {dataset.file_name} • Health Score: {dataset.quality.overall}/100
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !reportData}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#0f1628] hover:bg-white/[0.05] text-[#8b9cc8] hover:text-white text-[11px] font-medium transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <Printer size={13} /> Print / Save PDF
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !reportData}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md shadow-[#4f8ef7]/20 hover:brightness-110 disabled:opacity-40 transition-all"
            >
              <Download size={13} /> Download HTML
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/10 ml-2"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Report Preview Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#07091a]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-[#7c5cfc] space-y-2">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-[12px] font-mono">Compiling Executive Report & Scoring Engine...</span>
            </div>
          ) : reportData ? (
            <div className="rounded-xl overflow-hidden shadow-xl border border-white/10 bg-white">
              <iframe
                title="Executive Report Preview"
                srcDoc={reportData.html}
                className="w-full h-[680px] border-none"
              />
            </div>
          ) : (
            <p className="text-center text-[#f0456a] py-8 font-mono text-[12px]">
              Failed to generate executive report.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
