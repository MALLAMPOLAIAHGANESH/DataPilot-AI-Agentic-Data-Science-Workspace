import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DataPilot Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-[#0f1628] border border-red-500/20 rounded-2xl text-slate-200 space-y-4 my-4 font-mono">
          <div className="flex items-center gap-3 text-red-400">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-sans">
                {this.props.fallbackTitle || 'Component Render Error'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {this.props.fallbackMessage || 'An isolated error occurred while rendering this component.'}
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] text-red-300 overflow-x-auto">
              {this.state.error.message}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-sans font-medium flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={12} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
