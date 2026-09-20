import React from 'react';

export type StatusType = 'online' | 'healthy' | 'warning' | 'critical' | 'offline' | 'sandbox';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  sublabel,
  size = 'md',
  pulse = true,
  className = '',
}) => {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  const config: Record<StatusType, { color: string; bg: string; text: string; defaultLabel: string }> = {
    online: {
      color: 'bg-brand-success',
      bg: 'bg-brand-success/15',
      text: 'text-brand-success',
      defaultLabel: 'Connected',
    },
    healthy: {
      color: 'bg-brand-success',
      bg: 'bg-brand-success/15',
      text: 'text-brand-success',
      defaultLabel: 'Healthy',
    },
    warning: {
      color: 'bg-brand-warning',
      bg: 'bg-brand-warning/15',
      text: 'text-brand-warning',
      defaultLabel: 'Degraded',
    },
    critical: {
      color: 'bg-brand-critical',
      bg: 'bg-brand-critical/15',
      text: 'text-brand-critical',
      defaultLabel: 'Critical',
    },
    offline: {
      color: 'bg-ink-muted',
      bg: 'bg-ink-muted/15',
      text: 'text-ink-muted',
      defaultLabel: 'Disconnected',
    },
    sandbox: {
      color: 'bg-brand-accent',
      bg: 'bg-brand-accent/15',
      text: 'text-ink-primary',
      defaultLabel: 'Sandbox Fallback',
    },
  };

  const { color, bg, text, defaultLabel } = config[status] || config.online;

  return (
    <div className={`inline-flex items-center space-x-2 font-mono text-xs ${className}`}>
      <span className={`relative flex items-center justify-center p-0.5 rounded-full ${bg}`}>
        <span className={`rounded-full ${dotSize} ${color}`} />
        {pulse && status !== 'offline' && (
          <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${color}`} />
        )}
      </span>
      {(label || defaultLabel) && (
        <span className="flex flex-col text-left">
          <span className={`font-semibold tracking-tight leading-tight ${text}`}>
            {label || defaultLabel}
          </span>
          {sublabel && <span className="text-[10px] text-ink-muted leading-tight">{sublabel}</span>}
        </span>
      )}
    </div>
  );
};
