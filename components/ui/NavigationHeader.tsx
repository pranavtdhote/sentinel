'use client';

import React from 'react';
import { Shield, Radio, Terminal } from 'lucide-react';

interface NavigationHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSandbox: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activeTab,
  setActiveTab,
  isSandbox,
}) => {
  const navItems = [
    { id: 'workbench', label: 'Workbench' },
    { id: 'flow', label: 'Architecture' },
    { id: 'tracks', label: 'Pillars' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 font-bold text-xl tracking-tight text-ink-primary">
            <span className="font-extrabold tracking-tighter text-2xl">sentinel</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-accent inline-block ml-0.5 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-surface-strong text-ink-secondary border border-surface-border hidden sm:inline-block">
            AWS BEDROCK · INCIDENT RESPONSE
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative text-sm tracking-normal transition-editorial py-1 ${
                activeTab === item.id
                  ? 'text-ink-primary font-medium'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {item.label}
              {activeTab === item.id && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-accent" />
              )}
            </button>
          ))}
        </nav>

        {/* Status Badge & Commander Action */}
        <div className="flex items-center space-x-3">
          {isSandbox ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-light/80 border border-amber-accent/40 text-ink-primary text-xs font-mono-tech">
              <span className="w-2 h-2 rounded-full bg-amber-accent animate-ping" />
              <span>FALLBACK_SANDBOX</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-success-surface border border-success-border text-success text-xs font-mono-tech">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>AWS US-EAST-1 LIVE</span>
            </div>
          )}

          <a
            href="#workbench"
            onClick={() => setActiveTab('workbench')}
            className="flex items-center space-x-1 px-4 py-2 rounded-sm bg-amber-accent hover:bg-amber-hover text-ink-primary text-xs font-medium tracking-tight shadow-pleurat-button transition-editorial"
          >
            <span>Commander Console</span>
            <span className="text-xs">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
};
