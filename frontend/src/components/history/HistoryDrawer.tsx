import React from 'react';
import { X, History, Database, Zap, BarChart2, Cpu, MessageSquare } from 'lucide-react';
import type { ActivityEvent } from '../../types';

interface HistoryDrawerProps {
  events: ActivityEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  events,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'upload': return <Database size={13} className="text-[#4f8ef7]" />;
      case 'tool': return <Zap size={13} className="text-[#f5a623]" />;
      case 'chart': return <BarChart2 size={13} className="text-[#7c5cfc]" />;
      case 'model': return <Cpu size={13} className="text-[#10d98a]" />;
      case 'chat': return <MessageSquare size={13} className="text-[#22d3ee]" />;
      default: return <History size={13} className="text-[#8b9cc8]" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#0f1628] border-l border-white/10 h-full p-5 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#4f8ef7]" />
            <h3 className="text-[14px] font-bold text-white">Analysis History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8b9cc8] hover:text-white hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 font-mono text-[11px]">
          {events.length === 0 ? (
            <p className="text-center text-[#4a5a80] py-8">No logged activities yet</p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-[#0b0f20] border border-white/[0.05] space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 font-bold capitalize text-white">
                    {getIcon(ev.type)}
                    {ev.type}
                  </span>
                  <span className="text-[#4a5a80]">{ev.timestamp}</span>
                </div>
                <p className="text-[#8b9cc8] text-[11px] font-sans">{ev.message}</p>
                {ev.detail && <p className="text-[10px] text-[#4a5a80]">{ev.detail}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
