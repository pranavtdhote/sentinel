'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Settings,
  X,
  LogOut,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';
import { useAuth } from '@/lib/auth/AuthContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isSandbox?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
  isSandbox = false,
}) => {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  const userEmail = user?.email || 'operator@sentinel.internal';
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'SO';
  const roleLabel = role ? role.replace('_', ' ') : 'INCIDENT COMMANDER';

  const navItems = [
    { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Incidents', href: '/incidents', icon: AlertTriangle, badge: '1 CRIT' },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Knowledge', href: '/knowledge', icon: BookOpen },
    { label: 'AI Activity', href: '/ai-activity', icon: Bot },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 select-none">
      {/* Top Brand & Nav */}
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            href="/"
            className="flex items-center space-x-2 font-bold tracking-tight text-ink-primary group"
          >
            <div className="w-8 h-8 rounded-xs bg-ink-primary text-canvas flex items-center justify-center font-mono font-black text-sm shadow-pleurat-button group-hover:bg-brand-accent group-hover:text-ink-primary transition-colors">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tighter leading-none">sentinel</span>
              <span className="font-mono text-[9px] text-ink-muted uppercase tracking-wider leading-none mt-0.5">
                AI Incident Intelligence
              </span>
            </div>
          </Link>

          {isMobileOpen && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-xs border border-surface-border text-ink-secondary hover:text-ink-primary lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div>
          <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider px-2 mb-2 font-semibold">
            Operational Menu
          </div>
          <nav className="space-y-1 font-sans text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.exact
                  ? pathname === item.href || (item.href === '/dashboard' && pathname === '/')
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xs transition-editorial font-medium ${
                    isActive
                      ? 'bg-amber-light text-ink-primary font-bold border border-amber-accent/50 shadow-pleurat-button'
                      : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-brand-accent' : 'text-ink-muted'}`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[9px] font-mono bg-brand-critical/15 text-brand-critical border border-brand-critical/30 px-1.5 py-0.2 rounded-xs font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Status Section (As explicitly requested) */}
        <div className="pt-4 border-t border-surface-border">
          <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider px-2 mb-2.5 font-semibold">
            System Telemetry
          </div>
          <div className="bg-canvas border border-surface-border rounded-xs p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <StatusIndicator
                status={isSandbox ? 'sandbox' : 'online'}
                label={isSandbox ? 'Sandbox Mock' : 'AWS Connected'}
                size="sm"
              />
              <span className="text-[9px] font-mono text-ink-muted">US-EAST-1</span>
            </div>

            <div className="flex items-center justify-between">
              <StatusIndicator
                status="online"
                label="Bedrock Online"
                size="sm"
              />
              <span className="text-[9px] font-mono text-ink-muted">NOVA PRO</span>
            </div>

            <div className="flex items-center justify-between">
              <StatusIndicator
                status="online"
                label="Runbooks Grounded"
                size="sm"
              />
              <span className="text-[9px] font-mono text-ink-muted">S3 / RAG</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile / Role / Logout Section */}
      <div className="pt-4 border-t border-surface-border mt-6">
        <div className="flex items-center justify-between p-2 rounded-xs bg-canvas border border-surface-border shadow-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-accent text-ink-primary font-mono font-bold text-xs flex items-center justify-center border border-amber-accent/50 shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-ink-primary font-sans truncate" title={userEmail}>
                {userEmail}
              </div>
              <div className="text-[10px] font-mono font-semibold text-amber-700 leading-none mt-0.5">
                {roleLabel}
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="text-ink-muted hover:text-brand-critical p-1.5 rounded-xs transition-colors shrink-0 cursor-pointer"
            title="Sign Out of Sentinel"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 shrink-0 border-r border-surface-border bg-surface-subtle/40 hidden lg:block h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs lg:hidden flex">
          <div className="w-72 bg-canvas h-full border-r border-surface-border shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
