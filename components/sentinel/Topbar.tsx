'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  RotateCcw,
  Bell,
  Command,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';
import { useAuth } from '@/lib/auth/AuthContext';

interface TopbarProps {
  onToggleMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
  isSandbox?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleMobileSidebar,
  onOpenCommandPalette,
  onResetDemo,
  isResetting = false,
  isSandbox = false,
}) => {
  const pathname = usePathname();
  const { user, role } = useAuth();

  const userDisplayName = user?.email ? user.email.split('@')[0] : 'operator';
  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'SO';
  const roleLabel = role ? role.replace('_', ' ') : 'INCIDENT COMMANDER';

  const getPageTitle = (path: string) => {
    if (path === '/' || path === '/dashboard') return 'Command Center';
    if (path.startsWith('/incidents/')) return 'Incident Investigation';
    if (path === '/incidents') return 'Incident Registry';
    if (path === '/analytics') return 'Operations Analytics';
    if (path === '/knowledge') return 'Knowledge Base & Runbooks';
    if (path === '/ai-activity') return 'AI Reasoning & Activity';
    if (path === '/settings') return 'Platform Configuration';
    return 'Workspace';
  };

  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-surface-border h-14 select-none">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Left: Mobile menu toggle & Breadcrumbs */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-xs border border-surface-border text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb path */}
          <div className="flex items-center space-x-2 font-mono text-xs text-ink-muted">
            <Link
              href="/dashboard"
              className="text-ink-primary font-bold hover:text-brand-accent transition-colors flex items-center space-x-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              <span>SENTINEL</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <span className="text-ink-secondary font-semibold uppercase tracking-wider text-[11px] truncate max-w-[140px] sm:max-w-none">
              {getPageTitle(pathname)}
            </span>
          </div>
        </div>

        {/* Center: Command Palette Trigger Button (⌘K) */}
        <div className="hidden md:flex items-center">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center space-x-3 px-3 py-1.5 rounded-xs bg-surface-subtle hover:bg-surface-strong border border-surface-border text-ink-muted hover:text-ink-primary transition-colors text-xs font-mono w-72 justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5" />
              <span className="font-sans text-xs">Search or run command...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-surface-border text-[10px] font-bold">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions, Live Status & User Profile */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Quick Command Palette Button for Mobile */}
          <button
            onClick={onOpenCommandPalette}
            className="p-1.5 rounded-xs border border-surface-border text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle md:hidden"
            title="Open Command Palette (⌘K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Reset Demo Button */}
          <button
            type="button"
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xs border border-surface-border bg-canvas hover:bg-surface-subtle text-[11px] font-mono font-medium text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer shadow-xs"
            title="Reset demo incidents and timeline to clean baseline"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isResetting ? 'RESETTING...' : 'RESET DEMO'}</span>
          </button>

          {/* AWS Live / Sandbox Badge */}
          {isSandbox ? (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-amber-light border border-amber-accent/40 text-ink-primary text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping" />
              <span className="font-semibold">SANDBOX</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-brand-success/10 border border-brand-success/30 text-brand-success text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-success" />
              <span>AWS LIVE</span>
            </div>
          )}

          {/* User Profile Avatar */}
          <div className="flex items-center space-x-2 pl-2 border-l border-surface-border">
            <div className="w-7 h-7 rounded-full bg-surface-strong border border-surface-border flex items-center justify-center font-mono text-[11px] font-bold text-ink-primary">
              {userInitials}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-[11px] font-bold leading-tight font-sans text-ink-primary truncate max-w-[120px]">
                {userDisplayName}
              </div>
              <div className="text-[9px] font-mono text-amber-700 font-semibold leading-none">
                {roleLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
