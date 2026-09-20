'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Settings,
  RotateCcw,
  Sparkles,
  ExternalLink,
  X,
  Plus,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api/safeFetch';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReportModal?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenReportModal,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await safeFetchJson('/api/demo/reset', { method: 'POST' });
      window.location.reload();
    } catch {
      setResetting(false);
    }
  };

  const navCommands = [
    { label: 'Command Center Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { label: 'Incident Registry', href: '/incidents', icon: AlertTriangle, category: 'Navigation' },
    { label: 'Operations Analytics', href: '/analytics', icon: BarChart3, category: 'Navigation' },
    { label: 'Knowledge Base & Runbooks', href: '/knowledge', icon: BookOpen, category: 'Navigation' },
    { label: 'AI Activity & Reasoning Log', href: '/ai-activity', icon: Bot, category: 'Navigation' },
    { label: 'Platform Settings & AWS Config', href: '/settings', icon: Settings, category: 'Navigation' },
  ];

  const actionCommands = [
    {
      label: 'Ingest New Incident',
      action: () => {
        onClose();
        if (onOpenReportModal) onOpenReportModal();
        else router.push('/incidents');
      },
      icon: Plus,
      category: 'Actions',
    },
    {
      label: resetting ? 'Resetting Demo State...' : 'Reset Demo Environment (Pristine Baseline)',
      action: handleResetDemo,
      icon: RotateCcw,
      category: 'Actions',
    },
    {
      label: 'Open SEV-1 Payment Checkout Incident (inc-2026-0917-01)',
      action: () => {
        onClose();
        router.push('/dashboard');
      },
      icon: Sparkles,
      category: 'Demo Scenarios',
    },
  ];

  const filteredNav = navCommands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredActions = actionCommands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-canvas border border-surface-border rounded-sm shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-surface-border bg-surface-subtle/50">
          <Search className="w-4 h-4 text-ink-muted mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or jump to page... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm font-sans text-ink-primary placeholder:text-ink-muted focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink-primary p-1 rounded-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4 font-mono text-xs">
          {/* Navigation Section */}
          {filteredNav.length > 0 && (
            <div>
              <div className="text-[10px] text-ink-muted uppercase tracking-wider px-3 py-1 font-semibold">
                Pages
              </div>
              <div className="space-y-0.5">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        onClose();
                        router.push(item.href);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xs text-ink-primary hover:bg-amber-light hover:border-amber-accent/40 border border-transparent transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 text-brand-accent" />
                        <span className="font-sans text-xs font-semibold">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-ink-muted uppercase tracking-wider font-mono">
                        {item.href}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions Section */}
          {filteredActions.length > 0 && (
            <div>
              <div className="text-[10px] text-ink-muted uppercase tracking-wider px-3 py-1 font-semibold">
                Quick Actions
              </div>
              <div className="space-y-0.5">
                {filteredActions.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={item.action}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xs text-ink-primary hover:bg-amber-light hover:border-amber-accent/40 border border-transparent transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 text-brand-warning" />
                        <span className="font-sans text-xs font-semibold">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-amber-700 font-mono">EXECUTE</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredNav.length === 0 && filteredActions.length === 0 && (
            <div className="p-8 text-center text-ink-muted font-sans text-xs">
              No commands matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-surface-border px-4 py-2 bg-surface-strong/40 flex items-center justify-between text-[10px] font-mono text-ink-muted">
          <span>Navigate with mouse or Tab</span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-surface-border font-bold">
              ESC
            </kbd>{' '}
            to close
          </span>
        </div>
      </div>
    </div>
  );
};
