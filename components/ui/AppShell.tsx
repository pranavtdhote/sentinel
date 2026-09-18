'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Settings,
  Menu,
  X,
  Shield,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { ToastProvider } from './toast';
import { ErrorBoundary } from './ErrorBoundary';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSandbox, setIsSandbox] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/demo/reset', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setIsSandbox(!data.aws?.isConfigured);
      })
      .catch(() => setIsSandbox(true));
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Incidents', href: '/incidents', icon: AlertTriangle, badge: '1 CRITICAL' },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Knowledge', href: '/knowledge', icon: BookOpen },
    { label: 'AI Activity', href: '/ai-activity', icon: Bot },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink-primary flex flex-col">
        {/* Top Operational Bar */}
        <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-surface-border">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="p-1.5 rounded-xs border border-surface-border hover:bg-surface-subtle lg:hidden text-ink-primary"
                aria-label="Toggle navigation menu"
              >
                {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {/* Brand Logo */}
              <Link href="/" className="flex items-center space-x-1.5 font-bold tracking-tight text-ink-primary">
                <span className="font-extrabold text-xl tracking-tighter">sentinel</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-accent inline-block ml-0.5 animate-pulse" />
              </Link>

              {/* Breadcrumb Indicator */}
              <div className="hidden sm:flex items-center space-x-2 text-xs font-mono-tech text-ink-tertiary pl-4 border-l border-surface-border">
                <span className="text-amber-700">■ ■ ■</span>
                <span>SENTINEL / WORKSPACE</span>
                <span>/</span>
                <span className="text-ink-primary font-bold uppercase">
                  {pathname === '/' ? 'OVERVIEW' : pathname.replace('/', '')}
                </span>
              </div>
            </div>

            {/* Status & User Profile */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleResetDemo}
                disabled={isResetting}
                className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded border border-surface-border bg-canvas hover:bg-surface-subtle text-[10px] font-mono-tech text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                title="Reset demo incidents and timeline to clean baseline"
              >
                <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'RESETTING...' : 'RESET DEMO'}</span>
              </button>

              {isSandbox ? (
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-amber-light border border-amber-accent/50 text-ink-primary text-[10px] font-mono-tech">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-accent animate-ping" />
                  <span>FALLBACK_SANDBOX</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-success-surface border border-success-border text-success text-[10px] font-mono-tech">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span>AWS US-EAST-1 LIVE</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pl-3 border-l border-surface-border">
                <div className="w-7 h-7 rounded-full bg-surface-strong border border-surface-border flex items-center justify-center font-mono-tech text-xs font-bold text-ink-primary">
                  PS
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold leading-tight font-sans text-ink-primary">
                    prana@sentinel.internal
                  </div>
                  <div className="text-[10px] font-mono-tech text-amber-700 font-semibold">
                    INCIDENT COMMANDER
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
          {/* Desktop Sidebar */}
          <aside className="w-60 shrink-0 border-r border-surface-border bg-surface-subtle/30 hidden lg:block p-4">
            <div className="text-[10px] font-mono-tech text-ink-tertiary uppercase tracking-wider px-3 mb-2">
              NAVIGATION
            </div>
            <nav className="space-y-1 font-mono-tech text-xs">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xs transition-editorial ${
                      isActive
                        ? 'bg-amber-light text-ink-primary font-bold border border-amber-accent/50 shadow-pleurat-button'
                        : 'text-ink-secondary hover:bg-canvas hover:text-ink-primary'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-ink-primary' : 'text-ink-tertiary'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] bg-danger-surface text-danger border border-danger-border px-1 rounded-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 pt-4 border-t border-surface-border px-3 font-mono-tech text-[10px] text-ink-tertiary space-y-1.5">
              <div>ENGINE: CLAUDE 3.5 SONNET</div>
              <div>KB: OPENSEARCH SERVERLESS</div>
              <div>REGION: US-EAST-1</div>
            </div>
          </aside>

          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 lg:hidden flex">
              <div className="w-64 bg-canvas h-full p-4 border-r border-surface-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
                    <span className="font-extrabold text-lg">sentinel</span>
                    <button onClick={() => setIsMobileSidebarOpen(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <nav className="space-y-1 font-mono-tech text-xs">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileSidebarOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xs ${
                            isActive
                              ? 'bg-amber-light text-ink-primary font-bold'
                              : 'text-ink-secondary hover:bg-surface-subtle'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] bg-danger-surface text-danger px-1 rounded-xs">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Pane with Error Boundary */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    );
  };
