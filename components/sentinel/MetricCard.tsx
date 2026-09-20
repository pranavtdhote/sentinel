'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    neutral?: boolean;
  };
  icon?: LucideIcon | React.ReactNode;
  variant?: 'default' | 'critical' | 'warning' | 'success';
  status?: 'default' | 'critical' | 'warning' | 'healthy' | 'neutral';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  subtext,
  trend,
  icon,
  variant,
  status = 'default',
  className = '',
}) => {
  // Map status to effective variant if variant not explicitly provided
  const effectiveVariant: 'default' | 'critical' | 'warning' | 'success' =
    variant ||
    (status === 'critical'
      ? 'critical'
      : status === 'warning'
      ? 'warning'
      : status === 'healthy'
      ? 'success'
      : 'default');

  const variantStyles = {
    default: 'border-surface-border bg-canvas hover:border-surface-border-strong',
    critical: 'border-brand-critical/30 bg-brand-critical/5 hover:border-brand-critical/50',
    warning: 'border-brand-warning/30 bg-brand-warning/5 hover:border-brand-warning/50',
    success: 'border-brand-success/30 bg-brand-success/5 hover:border-brand-success/50',
  };

  const iconColors = {
    default: 'text-brand-accent',
    critical: 'text-brand-critical',
    warning: 'text-brand-warning',
    success: 'text-brand-success',
  };

  const valueColors = {
    default: 'text-ink-primary',
    critical: 'text-brand-critical',
    warning: 'text-brand-warning',
    success: 'text-brand-success',
  };

  const displaySub = subtext || sublabel;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return (
        <div className={`p-1.5 rounded-xs bg-surface-strong/60 ${iconColors[effectiveVariant]}`}>
          {icon}
        </div>
      );
    }
    const IconComp = icon as LucideIcon;
    return (
      <div className={`p-1.5 rounded-xs bg-surface-strong/60 ${iconColors[effectiveVariant]}`}>
        <IconComp className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div
      className={`rounded-sm border p-5 transition-editorial shadow-pleurat-1 flex flex-col justify-between ${variantStyles[effectiveVariant]} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        {renderIcon()}
      </div>

      <div className="flex items-baseline space-x-2.5">
        <span
          className={`text-3xl sm:text-4xl font-black tracking-tight font-sans ${valueColors[effectiveVariant]}`}
        >
          {value}
        </span>
        {trend && (
          <span
            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs ${
              trend.neutral
                ? 'bg-surface-strong text-ink-muted'
                : trend.isPositive
                ? 'bg-brand-success/10 text-brand-success'
                : 'bg-brand-critical/10 text-brand-critical'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {displaySub && (
        <div className="text-[11px] text-ink-secondary mt-2.5 font-sans flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent/70 shrink-0" />
          <span className="truncate">{displaySub}</span>
        </div>
      )}
    </div>
  );
};
