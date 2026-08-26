import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { uploadDataset } from '../../services/api';

interface DatasetUploadProps {
  onSuccess?: (data: any) => void;
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({ onSuccess }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states for the new upload attempt
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const data = await uploadDataset(file);
      setSuccessMessage(
        `Dataset loaded successfully! Found ${data.rows.toLocaleString()} rows and ${data.columns} columns.`
      );
      if (onSuccess) onSuccess(data);
    } catch (error: any) {
      // Display the exact error thrown by our Python backend
      setErrorMessage(error.message || 'An unknown error occurred during upload.');
    } finally {
      setIsUploading(false);
      // Clear the input so the user can re-upload the same file after fixing it
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Upload button */}
      <label
        className={`cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          ${isUploading
            ? 'bg-[#4f8ef7]/50 text-white/60 cursor-not-allowed'
            : 'bg-[#4f8ef7] hover:bg-[#3b7ae0] text-white'
          }`}
      >
        {isUploading
          ? <><Loader2 size={14} className="animate-spin" /> Parsing data...</>
          : <><Upload size={14} /> Upload Dataset</>
        }
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
        />
      </label>

      {/* Success banner */}
      {successMessage && (
        <div className="flex items-start gap-2 mt-1 p-2.5 bg-[#10d98a]/10 border border-[#10d98a]/25 rounded-lg text-[#10d98a] text-[11px] font-mono">
          <CheckCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 mt-1 p-2.5 bg-[#f0456a]/10 border border-[#f0456a]/25 rounded-lg text-[#f0456a] text-[11px] font-mono">
          <XCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span><strong>Upload failed:</strong> {errorMessage}</span>
        </div>
      )}
    </div>
  );
};
