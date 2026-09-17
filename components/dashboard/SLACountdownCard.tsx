'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { IncidentRecord } from '@/lib/types/database';

interface SLACountdownCardProps {
  criticalIncident?: IncidentRecord;
}

export const SLACountdownCard: React.FC<SLACountdownCardProps> = ({ criticalIncident }) => {
  // 15-minute countdown for SEV1 (900 seconds)
  const SLA_TARGET_SECONDS = 15 * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(582); // default ~9m42s

  useEffect(() => {
    if (!criticalIncident || criticalIncident.status === 'RESOLVED') return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [criticalIncident]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const percentage = Math.max(0, Math.min(100, (secondsRemaining / SLA_TARGET_SECONDS) * 100));

  const isWarning = secondsRemaining < 300; // under 5 minutes

  return (
    <Card className="hover:border-ink-secondary transition-editorial">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-sm">SEV-1 SLA Countdown</CardTitle>
          </div>
          <span className="font-mono-tech text-[10px] bg-danger-surface text-danger px-1.5 py-0.5 rounded font-bold border border-danger-border">
            15m TARGET
          </span>
        </div>
        <CardDescription className="text-[11px]">
          {criticalIncident
            ? `${criticalIncident.service} (${criticalIncident.incidentId})`
            : 'Active incident response timeline'}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 font-mono-tech">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-extrabold text-ink-primary font-mono tracking-tight">
              {formattedTime}
            </div>
            <div className="text-[10px] text-ink-tertiary">TIME TO TARGET BREACH</div>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold ${isWarning ? 'text-danger' : 'text-amber-700'}`}>
              {isWarning ? 'URGENT MITIGATION' : 'WITHIN SLA'}
            </span>
            <div className="text-[10px] text-ink-tertiary">Auto-escalation armed</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                isWarning ? 'bg-danger' : 'bg-amber-accent'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-ink-tertiary">
            <span>0m elapsed</span>
            <span>7.5m mid-point</span>
            <span>15m breach</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
