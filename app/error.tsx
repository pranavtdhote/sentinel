'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink-primary flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 bg-canvas border border-surface-border rounded-sm shadow-pleurat-1 text-center">
        <div className="p-3 bg-danger-surface border border-danger-border rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-danger">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold font-sans text-ink-primary mb-2">
          Critical View Exception
        </h2>
        <p className="text-xs text-ink-secondary leading-relaxed font-sans mb-6">
          {error.message || 'An error occurred during application execution. The incident log has been preserved.'}
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-2.5 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs font-semibold rounded-xs shadow-pleurat-button transition-editorial flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recover & Reload View</span>
        </button>
      </div>
    </div>
  );
}
