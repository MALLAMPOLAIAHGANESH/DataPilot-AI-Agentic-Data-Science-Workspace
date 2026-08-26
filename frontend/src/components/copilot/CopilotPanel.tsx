import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, User, Send, Zap, ChevronDown, ChevronUp,
  CheckCircle2, Terminal, Sparkles, Loader2
} from 'lucide-react';
import { sendCopilotMessage } from '../../services/api';
import type { CopilotMessageResponse } from '../../services/api';
import type { Dataset, ChatMessage as GlobalChatMessage } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';

interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'ai' | 'system';
  content?: string;
  text?: string;
  toolUsed?: string | null;
  toolOutput?: any;
  tool_calls?: string[];
  chart_data?: any;
  table_data?: any;
}

interface CopilotPanelProps {
  messages?: GlobalChatMessage[];
  loading?: boolean;
  dataset?: Dataset | null;
  onSendMessage?: (text: string) => void;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  messages: propMessages,
  loading: propLoading,
  dataset,
  onSendMessage,
}) => {
  const [internalMessages, setInternalMessages] = useState<LocalChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your AI Data Science Copilot. Ask me questions about your dataset, request summaries, or ask me to run statistical queries!',
    },
  ]);
  const [input, setInput] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isControlled = propMessages !== undefined;
  const isLoading = isControlled ? (propLoading ?? false) : internalLoading;

  // Normalize messages for rendering
  const displayMessages: LocalChatMessage[] = isControlled
    ? (propMessages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.text,
        text: m.text,
        toolUsed: m.tool_calls?.[0],
        tool_calls: m.tool_calls,
        chart_data: m.chart_data,
        table_data: m.table_data,
      }))
    : internalMessages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input.trim();
    setInput('');

    if (isControlled && onSendMessage) {
      onSendMessage(userPrompt);
      return;
    }

    const userMsg: LocalChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt,
    };

    setInternalMessages((prev) => [...prev, userMsg]);
    setInternalLoading(true);
    setStatusText('Thinking and checking tools...');

    try {
      const res: CopilotMessageResponse = await sendCopilotMessage(
        userPrompt,
        dataset?.dataset_id || 'default_session'
      );

      const aiMsg: LocalChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        toolUsed: res.tool_used,
        toolOutput: res.tool_output,
        tool_calls: res.tool_used ? [res.tool_used] : [],
      };

      setInternalMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setInternalMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Unable to complete request.'}`,
        },
      ]);
    } finally {
      setInternalLoading(false);
      setStatusText(null);
    }
  };

  return (
    <section className="bg-slate-900 border-t border-slate-800 flex flex-col z-20 flex-shrink-0 text-slate-100 shadow-xl">
      {/* Header */}
      <div className="h-[38px] bg-slate-800/80 px-4 border-b border-slate-700/60 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="font-semibold text-xs tracking-wide text-slate-200 uppercase font-mono">
            DataPilot Copilot
          </h2>
          {dataset && (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30 font-mono">
              {dataset.file_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
            Gemini 2.5 Flash
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Collapsible Chat Body */}
      {isExpanded && (
        <div className="h-[230px] flex flex-col overflow-hidden">
          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs font-mono">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none font-sans text-[12px]'
                  }`}
                >
                  {/* Tool Execution Tag */}
                  {(msg.toolUsed || (msg.tool_calls && msg.tool_calls.length > 0)) && (
                    <div className="mb-2 pb-1.5 border-b border-slate-700/60 flex flex-wrap items-center gap-1.5 text-[10px] text-amber-400 font-mono">
                      <Zap size={11} />
                      <span>Tool executed:</span>
                      <span className="font-semibold text-amber-300">
                        {msg.toolUsed || msg.tool_calls?.join(', ')}()
                      </span>
                      <CheckCircle2 size={11} className="text-emerald-400" />
                    </div>
                  )}

                  {/* Main Text Content */}
                  <div className="whitespace-pre-wrap">{msg.content || msg.text}</div>

                  {/* Tool Output / Data Preview */}
                  {msg.toolOutput && msg.toolOutput.data && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300 font-mono">
                        Queried {msg.toolOutput.row_count} rows:
                      </span>
                      <pre className="mt-1 bg-slate-950/80 p-2 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-28">
                        {JSON.stringify(msg.toolOutput.data.slice(0, 3), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Embedded Chart if returned */}
                  {msg.chart_data && (
                    <div className="h-40 w-full max-w-md bg-slate-950/80 border border-slate-700/80 rounded-lg p-2 mt-2">
                      <ChartRenderer chart={msg.chart_data} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/40 p-2 rounded-lg border border-indigo-800/40 w-fit">
                <Loader2 size={12} className="animate-spin text-indigo-400" />
                <span>{statusText || 'Gemini Copilot executing tools & reasoning...'}</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-slate-800/50 border-t border-slate-800 flex gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or request a SQL calculation..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send size={11} />
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
