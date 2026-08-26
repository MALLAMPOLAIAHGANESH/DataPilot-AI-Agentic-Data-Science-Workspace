import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message, description };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((msg: string, desc?: string) => addToast(msg, 'success', desc), [addToast]);
  const error = useCallback((msg: string, desc?: string) => addToast(msg, 'error', desc), [addToast]);
  const info = useCallback((msg: string, desc?: string) => addToast(msg, 'info', desc), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const borderClass =
            t.type === 'success'
              ? 'border-emerald-500/40 bg-[#0c1f17] text-emerald-300'
              : t.type === 'error'
              ? 'border-red-500/40 bg-[#200c11] text-red-300'
              : 'border-indigo-500/40 bg-[#0f1628] text-indigo-300';

          const Icon =
            t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;

          return (
            <div
              key={t.id}
              className={`p-3.5 px-4 rounded-xl border shadow-xl backdrop-blur-md pointer-events-auto flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200 ${borderClass}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-white">{t.message}</div>
                {t.description && <div className="text-slate-400 mt-0.5">{t.description}</div>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
