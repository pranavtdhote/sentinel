import React from 'react';
import { Activity } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas text-ink-primary flex flex-col items-center justify-center p-6">
      <div className="flex items-center space-x-3 text-ink-primary mb-3">
        <Activity className="w-6 h-6 text-amber-600 animate-spin" />
        <span className="font-extrabold text-2xl font-sans tracking-tight">sentinel</span>
      </div>
      <div className="font-mono-tech text-xs text-ink-secondary tracking-widest uppercase animate-pulse">
        CONNECTING AWS TELEMETRY & BEDROCK ENGINE...
      </div>
    </div>
  );
}
