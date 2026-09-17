'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Sentinel Uncaught Error Boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[350px] flex flex-col items-center justify-center p-8 text-center bg-canvas border border-surface-border rounded-sm">
          <div className="p-3 bg-danger-surface border border-danger-border rounded-full mb-3 text-danger">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-ink-primary font-sans mb-1">
            System Interface Error
          </h3>
          <p className="text-xs text-ink-secondary max-w-md font-sans mb-4 leading-relaxed">
            {this.state.error?.message || 'An unexpected operational anomaly occurred while rendering this view.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs font-semibold rounded-xs shadow-pleurat-button transition-editorial flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Operation</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
