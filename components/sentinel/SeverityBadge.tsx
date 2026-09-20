import React from 'react';
import { IncidentSeverity } from '@/lib/types/database';

interface SeverityBadgeProps {
  severity: IncidentSeverity | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const norm = (severity || 'SEV3').toUpperCase();
  const isSev1 = norm === 'SEV1' || norm === 'CRITICAL';
  const isSev2 = norm === 'SEV2' || norm === 'HIGH';
  const isSev3 = norm === 'SEV3' || norm === 'MEDIUM';

  const styleConfig = isSev1
    ? 'bg-brand-critical/10 text-brand-critical border-brand-critical/30'
    : isSev2
    ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/30'
    : isSev3
    ? 'bg-amber-light text-ink-primary border-amber-accent/40'
    : 'bg-surface-strong text-ink-secondary border-surface-border';

  const sizeConfig =
    size === 'sm'
      ? 'px-1.5 py-0.2 text-[9px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs'
      : 'px-2 py-0.5 text-[10px]';

  const labelText = norm.startsWith('SEV') ? norm : isSev1 ? 'SEV1' : isSev2 ? 'SEV2' : isSev3 ? 'SEV3' : 'SEV4';

  return (
    <span
      className={`inline-flex items-center space-x-1 font-mono font-bold rounded-xs border tracking-wider uppercase transition-colors ${styleConfig} ${sizeConfig} ${className}`}
      title={`Severity: ${norm}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isSev1 ? 'bg-brand-critical animate-pulse' : isSev2 ? 'bg-brand-warning' : 'bg-brand-accent'
        }`}
      />
      <span>{labelText}</span>
      {showLabel && norm !== labelText && (
        <span className="opacity-75 font-normal text-[9px]">({norm})</span>
      )}
    </span>
  );
};
