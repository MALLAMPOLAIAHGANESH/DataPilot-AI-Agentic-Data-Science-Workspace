import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, User, Send, Zap, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Terminal, Sparkles, Mic,
  Table as TableIcon, BarChart2, AlertTriangle, Loader2
} from 'lucide-react';
import type { ChatMessage, Dataset } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';

interface CopilotPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  dataset: Dataset | null;
  onSendMessage: (text: string) => void;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  messages,
  loading,
  dataset,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dynamic suggested prompts generated based on uploaded dataset columns
  const suggestedPrompts = dataset
    ? [
        `Count missing values in ${dataset.file_name}`,
        'Correlation matrix of numeric columns',
        dataset.column_names.includes('Age') ? 'Plot age distribution' : 'Show top 5 correlations',
        dataset.column_names.includes('Sex') ? 'Survival rate by gender' : 'Calculate summary statistics',
      ]
    : [
        'Count missing values',
        'Correlation matrix',
        'Plot age distribution',
        'Survival rate by gender',
      ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading || !dataset) return;
    onSendMessage(query);
    setInput('');
  };

  return (
    <section className="bg-[#07091a] border-t border-white/[0.08] flex flex-col z-20 flex-shrink-0">
      {/* Header bar */}
      <div className="h-[36px] bg-[#0b0f20] px-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-[#4f8ef7] to-[#7c5cfc] flex items-center justify-center text-white">
            <Bot size={10} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8b9cc8] font-mono">
            AI COPILOT
          </span>
          {dataset && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#10d98a] bg-[#10d98a]/10 px-1.5 py-0.2 rounded border border-[#10d98a]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10d98a] animate-pulse" />
              Connected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#7c5cfc]">
              <Loader2 size={12} className="animate-spin" />
              Gemini Agent Executing...
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#4a5a80] hover:text-white p-1 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="h-[210px] flex overflow-hidden">
          {/* Messages conversation area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3 font-mono text-[11px]"
          >
            {messages.length === 0 && !loading && (
              <div className="flex items-center gap-2 text-[#4a5a80] py-2">
                <Terminal size={14} />
                <span>
                  {dataset
                    ? `Dataset loaded ✓ (${dataset.rows.toLocaleString()} rows · ${dataset.columns} cols) — Ask anything about your data.`
                    : 'Upload a dataset to activate the Agentic Copilot.'}
                </span>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1.5 animate-in fade-in duration-100">
                {/* User Message */}
                {msg.role === 'user' && (
                  <div className="flex items-start gap-2 text-[#93c5fd]">
                    <div className="w-5 h-5 rounded bg-[#4f8ef7]/20 border border-[#4f8ef7]/40 flex items-center justify-center flex-shrink-0 text-[#4f8ef7] mt-0.5">
                      <User size={11} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-[#4a5a80] uppercase block font-sans">You</span>
                      <p className="text-[#e8edf8] font-sans text-[12px]">{msg.text}</p>
                    </div>
                  </div>
                )}

                {/* AI / Agent Message */}
                {msg.role === 'ai' && (
                  <div className="flex items-start gap-2 text-[#86efac]">
                    <div className="w-5 h-5 rounded bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 flex items-center justify-center flex-shrink-0 text-[#7c5cfc] mt-0.5">
                      <Bot size={11} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <span className="text-[10px] text-[#4a5a80] uppercase block font-sans">
                        DataPilot AI
                      </span>

                      {/* Tool execution badges */}
                      {msg.tool_calls && msg.tool_calls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 py-0.5">
                          {msg.tool_calls.map((tool, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] text-[10px]"
                            >
                              <Zap size={10} />
                              {tool}()
                              <CheckCircle2 size={10} className="text-[#10d98a]" />
                            </span>
                          ))}
                        </div>
                      )}

                      {/* AI Markdown / Plain explanation */}
                      <p className="text-[#e8edf8] font-sans text-[12px] whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>

                      {/* Embedded Table Result if present */}
                      {msg.table_data && (
                        <div className="mt-2 rounded-lg border border-white/10 overflow-x-auto bg-[#0b0f20] max-w-lg">
                          <table className="w-full text-left text-[10px] font-mono">
                            <thead className="bg-white/[0.04] text-[#8b9cc8] border-b border-white/10">
                              <tr>
                                {msg.table_data.columns.map((col, idx) => (
                                  <th key={idx} className="p-1.5 px-2.5 font-semibold">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                              {msg.table_data.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/[0.02]">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-1.5 px-2.5 text-[#e8edf8]">
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Embedded Chart Result if present */}
                      {msg.chart_data && (
                        <div className="h-44 w-full max-w-md bg-[#0b0f20] border border-white/10 rounded-xl p-2.5 mt-2">
                          <ChartRenderer chart={msg.chart_data} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* System Message */}
                {msg.role === 'system' && (
                  <div className="flex items-start gap-2 text-[#4a5a80] text-[10px]">
                    <Terminal size={12} className="mt-0.5 flex-shrink-0 text-[#8b9cc8]" />
                    <span className="whitespace-pre-wrap text-[#8b9cc8]">{msg.text}</span>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[#7c5cfc]">
                <Bot size={13} className="animate-spin" />
                <span className="text-[11px] font-mono">Gemini Agent analyzing schema & choosing tools...</span>
              </div>
            )}
          </div>

          {/* Right suggested prompts rail */}
          <div className="w-[210px] min-w-[210px] bg-[#0b0f20] border-l border-white/[0.06] p-2.5 flex flex-col gap-1.5 overflow-y-auto">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#4a5a80] font-mono px-1">
              Suggested Actions
            </span>
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => dataset && onSendMessage(prompt)}
                disabled={!dataset || loading}
                className="text-left p-1.5 px-2 rounded-lg border border-white/[0.06] bg-[#0f1628]/60 hover:bg-[#1e2d54] hover:border-[#4f8ef7]/40 text-[#8b9cc8] hover:text-white text-[10.5px] font-mono transition-all disabled:opacity-40 disabled:pointer-events-none group"
              >
                <span className="line-clamp-2 leading-tight group-hover:text-[#4f8ef7] transition-colors">
                  {prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Composer */}
      <form
        onSubmit={handleSubmit}
        className="h-[46px] bg-[#0b0f20] border-t border-white/[0.06] px-4 flex items-center gap-3 flex-shrink-0"
      >
        <span className="text-[#4f8ef7] font-mono text-[14px]">❯</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!dataset || loading}
          placeholder={
            dataset
              ? 'Ask anything about your dataset (e.g., "Show average fare by passenger class")...'
              : 'Upload a dataset to begin asking questions...'
          }
          className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-white placeholder-[#4a5a80] disabled:opacity-40"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 rounded-lg text-[#4a5a80] hover:text-white hover:bg-white/[0.05] transition-colors"
            title="Voice Input"
          >
            <Mic size={14} />
          </button>

          <button
            type="submit"
            disabled={!input.trim() || loading || !dataset}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#4f8ef7] to-[#7c5cfc] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md shadow-[#4f8ef7]/20 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <span>Send</span>
            <Send size={11} />
          </button>
        </div>
      </form>
    </section>
  );
};
