import React, { useState } from 'react';
import {
  Cpu, Play, Download, Sparkles, CheckCircle,
  BarChart2, Zap, Layers, FileCode
} from 'lucide-react';
import type { Dataset, MLMetrics } from '../../types';
import { runBaselineModel, generateNotebook } from '../../services/api';

interface ModelPageProps {
  dataset: Dataset | null;
  onAskAI: (query: string) => void;
}

export const ModelPage: React.FC<ModelPageProps> = ({ dataset, onAskAI }) => {
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [taskType, setTaskType] = useState<'classification' | 'regression'>('classification');
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingNotebook, setGeneratingNotebook] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);

  React.useEffect(() => {
    if (dataset && dataset.column_names.length > 0 && !targetColumn) {
      // Default to target if 'Survived' or last column
      const defaultTarget = dataset.column_names.includes('Survived')
        ? 'Survived'
        : dataset.column_names[dataset.column_names.length - 1];
      setTargetColumn(defaultTarget);
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-[#0f1628]/40 text-[#4a5a80] space-y-2">
        <Cpu size={32} strokeWidth={1.5} />
        <p className="text-[13px] font-medium text-[#8b9cc8]">No dataset uploaded for Machine Learning</p>
        <p className="text-[11px] text-[#4a5a80]">Upload a dataset to train baseline models and export PyTorch architectures</p>
      </div>
    );
  }

  const handleTrain = async () => {
    if (!targetColumn) return;
    setLoading(true);
    try {
      const res = await runBaselineModel(dataset.dataset_id, targetColumn, taskType);
      setMetrics(res);
    } catch {
      // Handled
    }
    setLoading(false);
  };

  const handleGenerateColab = async () => {
    if (!targetColumn) return;
    setGeneratingNotebook(true);
    try {
      const res = await generateNotebook(dataset.dataset_id, targetColumn, taskType);
      onAskAI(`Generated PyTorch neural network training code for predicting ${targetColumn} (${taskType}).`);
    } catch {
      // Handled
    }
    setGeneratingNotebook(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#8b9cc8] tracking-wider uppercase font-mono">
          MODEL STUDIO & EXPERIMENTATION
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Config Panel */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-[#4f8ef7]" />
            <h4 className="text-[13px] font-bold text-white">Target & Task Configuration</h4>
          </div>

          <div className="space-y-2 text-[11px] font-mono">
            <label className="text-[#8b9cc8] block">Target Variable (y):</label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full bg-[#0b0f20] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#4f8ef7]"
            >
              {dataset.column_names.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>

            <label className="text-[#8b9cc8] block pt-2">Task Type:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskType('classification')}
                className={`py-1.5 px-3 rounded-lg border text-center font-sans font-semibold transition-all ${
                  taskType === 'classification'
                    ? 'bg-[#4f8ef7]/20 text-[#4f8ef7] border-[#4f8ef7]'
                    : 'bg-[#0b0f20] text-[#8b9cc8] border-white/10 hover:text-white'
                }`}
              >
                Classification
              </button>
              <button
                type="button"
                onClick={() => setTaskType('regression')}
                className={`py-1.5 px-3 rounded-lg border text-center font-sans font-semibold transition-all ${
                  taskType === 'regression'
                    ? 'bg-[#7c5cfc]/20 text-[#7c5cfc] border-[#7c5cfc]'
                    : 'bg-[#0b0f20] text-[#8b9cc8] border-white/10 hover:text-white'
                }`}
              >
                Regression
              </button>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleTrain}
              disabled={loading || !targetColumn}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] text-white font-semibold text-[12px] shadow-lg shadow-[#4f8ef7]/20 hover:brightness-110 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Play size={13} />
              {loading ? 'Training Baseline Models...' : 'Train Baseline Models'}
            </button>

            <button
              onClick={handleGenerateColab}
              disabled={generatingNotebook || !targetColumn}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <FileCode size={13} className="text-[#7c5cfc]" />
              {generatingNotebook ? 'Generating Colab...' : 'Generate PyTorch Colab Notebook'}
            </button>
          </div>
        </div>

        {/* Metrics Display */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#10d98a]" />
              <h4 className="text-[13px] font-bold text-white">
                {metrics ? metrics.model_name : 'Baseline Model Performance'}
              </h4>
            </div>
            {metrics && (
              <span className="text-[10px] font-mono text-[#10d98a] bg-[#10d98a]/10 px-2 py-0.5 rounded border border-[#10d98a]/30">
                Evaluation Complete
              </span>
            )}
          </div>

          {metrics ? (
            <div className="space-y-4 font-mono">
              <div className="grid grid-cols-3 gap-3 text-center">
                {metrics.accuracy !== undefined && (
                  <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
                    <span className="text-[10px] text-[#4a5a80] uppercase font-sans">Accuracy</span>
                    <span className="text-[20px] font-bold text-[#10d98a] block">
                      {(metrics.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {metrics.f1_score !== undefined && (
                  <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
                    <span className="text-[10px] text-[#4a5a80] uppercase font-sans">F1-Score</span>
                    <span className="text-[20px] font-bold text-[#4f8ef7] block">
                      {(metrics.f1_score * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {metrics.roc_auc !== undefined && (
                  <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
                    <span className="text-[10px] text-[#4a5a80] uppercase font-sans">ROC-AUC</span>
                    <span className="text-[20px] font-bold text-[#7c5cfc] block">
                      {(metrics.roc_auc * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {metrics.rmse !== undefined && (
                  <div className="bg-[#0b0f20] p-3 rounded-xl border border-white/[0.05]">
                    <span className="text-[10px] text-[#4a5a80] uppercase font-sans">RMSE</span>
                    <span className="text-[20px] font-bold text-[#f5a623] block">
                      {metrics.rmse.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Feature Importance */}
              {metrics.feature_importances && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-[#8b9cc8] font-sans">
                    Top Feature Importances (Tree Ensemble)
                  </span>
                  <div className="space-y-1.5">
                    {metrics.feature_importances.map((feat) => (
                      <div key={feat.feature} className="flex items-center gap-3 text-[11px]">
                        <span className="w-20 text-[#e8edf8] truncate">{feat.feature}</span>
                        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc]"
                            style={{ width: `${feat.importance * 100}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-[#8b9cc8]">
                          {(feat.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-[#4a5a80] space-y-2">
              <Sparkles size={24} />
              <p className="text-[12px]">Click "Train Baseline Models" to evaluate algorithms on {targetColumn || 'your dataset'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
