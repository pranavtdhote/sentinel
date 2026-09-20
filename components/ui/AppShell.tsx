'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ToastProvider } from './toast';
import { ErrorBoundary } from './ErrorBoundary';
import { Sidebar } from '@/components/sentinel/Sidebar';
import { Topbar } from '@/components/sentinel/Topbar';
import { CommandPalette } from '@/components/sentinel/CommandPalette';
import { safeFetchJson } from '@/lib/api/safeFetch';
import { useAuth } from '@/lib/auth/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSandbox, setIsSandbox] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Route protection redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnTo = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?returnTo=${returnTo}`);
    }
  }, [authLoading, isAuthenticated, pathname, router]);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await safeFetchJson('/api/demo/reset', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.warn('Failed to reset demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    safeFetchJson<any>('/api/health')
      .then((res) => {
        if (res.ok && res.data) {
          setIsSandbox(!res.data.aws?.isConfigured);
        }
      })
      .catch(() => setIsSandbox(true));
  }, []);

  // Loading boundary: avoid flashing protected dashboard before auth check resolves
  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink-primary flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-9 h-9 rounded-xs bg-ink-primary flex items-center justify-center text-amber-accent font-bold font-mono text-base shadow-sm border border-surface-border animate-pulse">
          S
        </div>
        <div className="flex items-center space-x-2 font-mono text-xs text-ink-muted">
          <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <span>VERIFYING COGNITO SESSION...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, render redirect state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas text-ink-primary flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-9 h-9 rounded-xs bg-ink-primary flex items-center justify-center text-amber-accent font-bold font-mono text-base shadow-sm border border-surface-border">
          S
        </div>
        <div className="flex items-center space-x-2 font-mono text-xs text-ink-muted">
          <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <span>REDIRECTING TO OPERATOR SIGN IN...</span>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-canvas text-ink-primary flex flex-col font-sans antialiased selection:bg-amber-light selection:text-ink-primary">
        {/* Global Topbar */}
        <Topbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
          isSandbox={isSandbox}
        />

        {/* Main Body Layout */}
        <div className="flex-1 flex max-w-[1720px] w-full mx-auto">
          {/* Reusable Sidebar (Desktop + Mobile Drawer) */}
          <Sidebar
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            isSandbox={isSandbox}
          />

          {/* Page Content Pane wrapped in ErrorBoundary with smooth scroll and route transitions */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0 scroll-smooth">
            <div key={pathname} className="animate-page-enter">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Global Keyboard-Accessible Command Palette (⌘K) */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </ToastProvider>
  );
};
