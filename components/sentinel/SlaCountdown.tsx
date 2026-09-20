import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { IncidentSeverity, IncidentStatus } from '@/lib/types/database';

interface SlaCountdownProps {
  createdAt: string;
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  targetMinutes?: number;
  compact?: boolean;
  className?: string;
}

export const SlaCountdown: React.FC<SlaCountdownProps> = ({
  createdAt,
  severity,
  status,
  targetMinutes,
  compact = false,
  className = '',
}) => {
  const isResolved = status === 'RESOLVED' || status === 'CLOSED';

  // Default target SLA by severity if not provided
  const target =
    targetMinutes ||
    (severity === 'SEV1' || severity === 'CRITICAL'
      ? 15
      : severity === 'SEV2' || severity === 'HIGH'
      ? 30
      : 60);

  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    isBreached: boolean;
    percent: number;
  }>({ minutes: 0, seconds: 0, isBreached: false, percent: 100 });

  useEffect(() => {
    if (isResolved) return;

    const calculate = () => {
      const createdTime = new Date(createdAt).getTime();
      const deadline = createdTime + target * 60 * 1000;
      const now = Date.now();
      const diffMs = deadline - now;

      const totalDurationMs = target * 60 * 1000;
      const elapsedMs = Math.max(0, now - createdTime);
      const percent = Math.max(0, Math.min(100, Math.round(((totalDurationMs - elapsedMs) / totalDurationMs) * 100)));

      if (diffMs <= 0) {
        const absDiff = Math.abs(diffMs);
        const mins = Math.floor(absDiff / 60000);
        const secs = Math.floor((absDiff % 60000) / 1000);
        setTimeLeft({ minutes: mins, seconds: secs, isBreached: true, percent: 0 });
      } else {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setTimeLeft({ minutes: mins, seconds: secs, isBreached: false, percent });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [createdAt, target, isResolved]);

  if (isResolved) {
    return (
      <div className={`inline-flex items-center space-x-1.5 font-mono text-xs text-brand-success ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />
        <span className="font-bold">SLA MET (RESOLVED)</span>
      </div>
    );
  }

  const isUrgent = !timeLeft.isBreached && timeLeft.minutes < 5;

  const colorClass = timeLeft.isBreached
    ? 'text-brand-critical bg-brand-critical/10 border-brand-critical/30'
    : isUrgent
    ? 'text-brand-warning bg-brand-warning/10 border-brand-warning/30'
    : 'text-ink-primary bg-surface-strong border-surface-border';

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (compact) {
    return (
      <span
        className={`inline-flex items-center space-x-1.5 font-mono px-2 py-0.5 rounded-xs border text-[11px] font-bold ${colorClass} ${className}`}
      >
        <Clock className={`w-3 h-3 ${isUrgent || timeLeft.isBreached ? 'animate-pulse' : ''}`} />
        <span>
          {timeLeft.isBreached ? '-' : ''}
          {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
        {timeLeft.isBreached && <span className="text-[9px] uppercase tracking-wider">BREACH</span>}
      </span>
    );
  }

  return (
    <div className={`rounded-xs border p-3 font-mono ${colorClass} ${className}`}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center space-x-1.5">
          <Clock className={`w-3.5 h-3.5 ${isUrgent || timeLeft.isBreached ? 'animate-pulse' : ''}`} />
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            {timeLeft.isBreached ? 'SLA BREACHED' : 'RECOVERY DEADLINE'}
          </span>
        </div>
        <span className="text-[10px] text-ink-muted">TARGET: {target}M</span>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div className="text-2xl font-black tracking-tight font-sans">
          {timeLeft.isBreached ? '-' : ''}
          {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </div>
        <div className="text-[10px] font-mono text-ink-secondary">
          {timeLeft.isBreached ? 'ESCALATION ACTIVE' : `${timeLeft.percent}% REMAINING`}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-surface-border h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft.isBreached
              ? 'bg-brand-critical w-full'
              : isUrgent
              ? 'bg-brand-warning'
              : 'bg-brand-accent'
          }`}
          style={{ width: `${timeLeft.percent}%` }}
        />
      </div>
    </div>
  );
};
