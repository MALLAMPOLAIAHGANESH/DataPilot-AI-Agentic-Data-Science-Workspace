import React, { useState, useEffect } from 'react';
import {
  Cpu, Play, CheckCircle, Zap, Layers, FileCode,
  Trophy, Sparkles, Award
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

  useEffect(() => {
    if (dataset && dataset.column_names.length > 0 && !targetColumn) {
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
      if (res.task_type) {
        setTaskType(res.task_type);
      }
    } catch {
      // Handled gracefully in service
    }
    setLoading(false);
  };

  const handleGenerateColab = async () => {
    if (!targetColumn) return;
    setGeneratingNotebook(true);
    try {
      await generateNotebook(dataset.dataset_id, targetColumn, taskType);
      onAskAI(`Generated PyTorch neural network training code for predicting ${targetColumn} (${taskType}).`);
    } catch {
      // Handled
    }
    setGeneratingNotebook(false);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#8b9cc8] tracking-wider uppercase font-mono">
          MODEL STUDIO & EXPERIMENTATION
        </span>
        {metrics && (
          <span className="text-[10px] font-mono text-[#10d98a] bg-[#10d98a]/10 px-2 py-0.5 rounded border border-[#10d98a]/30 flex items-center gap-1">
            <CheckCircle size={11} />
            AutoML Training Complete ({metrics.task_type})
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Config Panel */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3.5">
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
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleTrain}
              disabled={loading || !targetColumn}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] text-white font-semibold text-[12px] shadow-lg shadow-[#4f8ef7]/20 hover:brightness-110 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Play size={13} />
              {loading ? 'Training 3 Baseline Models...' : 'Run AutoML Pipeline'}
            </button>

            <button
              onClick={handleGenerateColab}
              disabled={generatingNotebook || !targetColumn}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <FileCode size={13} className="text-[#7c5cfc]" />
              {generatingNotebook ? 'Generating Colab...' : 'Generate PyTorch Notebook'}
            </button>
          </div>
        </div>

        {/* Right Metrics & Leaderboard Area */}
        <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-[#f5a623]" />
              <h4 className="text-[13px] font-bold text-white font-mono">
                AutoML Model Leaderboard & Explainability
              </h4>
            </div>
          </div>

          {metrics ? (
            <div className="space-y-4 font-mono">
              {/* Leaderboard Table */}
              {metrics.leaderboard && metrics.leaderboard.length > 0 && (
                <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0b0f20]">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-white/[0.04] text-[#8b9cc8] border-b border-white/10 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5 px-3 font-semibold">Rank</th>
                        <th className="p-2.5 px-3 font-semibold">Model Algorithm</th>
                        <th className="p-2.5 px-3 font-semibold">{metrics.leaderboard[0]?.metric_1 || 'Primary Metric'}</th>
                        <th className="p-2.5 px-3 font-semibold">{metrics.leaderboard[0]?.metric_2 || 'Secondary Metric'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {metrics.leaderboard.map((item, idx) => (
                        <tr
                          key={item.model}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            idx === 0 ? 'bg-[#10d98a]/5' : ''
                          }`}
                        >
                          <td className="p-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                            {idx === 0 ? (
                              <span className="w-5 h-5 rounded-full bg-[#f5a623]/20 border border-[#f5a623]/40 text-[#f5a623] flex items-center justify-center text-[10px]">
                                🏆
                              </span>
                            ) : (
                              <span className="text-[#8b9cc8] px-1">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="p-2.5 px-3 font-medium text-[#e8edf8]">
                            {item.model}
                            {idx === 0 && (
                              <span className="ml-2 text-[9px] font-mono bg-[#10d98a]/20 text-[#10d98a] px-1.5 py-0.2 rounded border border-[#10d98a]/30">
                                BEST
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 px-3 font-bold text-[#10d98a]">
                            {typeof item.val_1 === 'number'
                              ? item.metric_1.toLowerCase().includes('acc')
                                ? `${(item.val_1 * 100).toFixed(1)}%`
                                : item.val_1
                              : item.val_1}
                          </td>
                          <td className="p-2.5 px-3 text-[#4f8ef7]">
                            {typeof item.val_2 === 'number'
                              ? item.metric_2.toLowerCase().includes('f1')
                                ? `${(item.val_2 * 100).toFixed(1)}%`
                                : item.val_2
                              : item.val_2}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Feature Importances (Tree Ensemble) */}
              {metrics.feature_importances && metrics.feature_importances.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#8b9cc8] font-mono">
                      Top Feature Importances (Random Forest)
                    </span>
                    <span className="text-[10px] text-[#4a5a80]">Relative weight</span>
                  </div>

                  <div className="space-y-1.5 bg-[#0b0f20] p-3 rounded-xl border border-white/10">
                    {metrics.feature_importances.map((feat) => (
                      <div key={feat.feature} className="flex items-center gap-3 text-[11px]">
                        <span className="w-28 text-[#e8edf8] truncate">{feat.feature}</span>
                        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc]"
                            style={{
                              width: `${Math.min(100, Math.max(5, feat.importance * 100))}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-[#8b9cc8]">
                          {(feat.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-[#4a5a80] space-y-2.5 bg-[#0b0f20]/50 rounded-xl border border-white/5">
              <Sparkles size={26} className="text-[#4f8ef7] animate-pulse" />
              <p className="text-[12px] text-[#8b9cc8]">
                Ready to train baseline models on {targetColumn || 'your dataset'}
              </p>
              <p className="text-[10px] text-[#4a5a80]">
                Automatically evaluates Linear/Logistic Regression, Random Forest, and Gradient Boosting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
