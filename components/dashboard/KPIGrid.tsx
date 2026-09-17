'use client';

import React from 'react';
import { Activity, AlertTriangle, Clock, Zap, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { IncidentRecord } from '@/lib/types/database';

interface KPIGridProps {
  incidents: IncidentRecord[];
  avgMttmMinutes?: number;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ incidents, avgMttmMinutes = 4.6 }) => {
  const activeCount = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const criticalCount = incidents.filter((i) => i.severity === 'SEV1' && i.status !== 'RESOLVED').length;
  const slaAtRiskCount = incidents.filter(
    (i) => i.severity === 'SEV1' && i.status !== 'RESOLVED'
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono-tech">
      {/* 1. Active Incidents */}
      <Card className="hover:border-ink-secondary transition-editorial">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs text-ink-tertiary mb-2">
            <span className="font-semibold uppercase tracking-wider">Active Incidents</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-ink-primary font-sans">{activeCount}</span>
            <span className="text-xs text-ink-secondary font-mono-tech">in flight</span>
          </div>
          <div className="text-[10px] text-ink-tertiary mt-2 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-accent" />
            <span>Monitored across 4 ECS clusters</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Critical Incidents */}
      <Card className={`transition-editorial ${criticalCount > 0 ? 'border-danger/40 bg-danger-surface/20' : ''}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs text-ink-tertiary mb-2">
            <span className="font-semibold uppercase tracking-wider">Critical Incidents</span>
            <AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? 'text-danger animate-pulse' : 'text-ink-tertiary'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-extrabold font-sans ${criticalCount > 0 ? 'text-danger' : 'text-ink-primary'}`}>
              {criticalCount}
            </span>
            <span className="text-xs text-ink-secondary font-mono-tech">SEV-1 active</span>
          </div>
          <div className="text-[10px] text-danger mt-2 flex items-center space-x-1 font-bold">
            {criticalCount > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
                <span>Immediate SRE commander response required</span>
              </>
            ) : (
              <span className="text-success">Zero active SEV-1 outages</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. SLA At Risk */}
      <Card className="hover:border-ink-secondary transition-editorial">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs text-ink-tertiary mb-2">
            <span className="font-semibold uppercase tracking-wider">SLA At Risk</span>
            <ShieldAlert className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-700 font-sans">{slaAtRiskCount}</span>
            <span className="text-xs text-ink-secondary font-mono-tech">&lt; 10m to target</span>
          </div>
          <div className="text-[10px] text-ink-tertiary mt-2 flex items-center space-x-1">
            <span>Target: &lt; 15m MTTR compliance</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Average Resolution Time */}
      <Card className="hover:border-ink-secondary transition-editorial">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs text-ink-tertiary mb-2">
            <span className="font-semibold uppercase tracking-wider">Avg Resolution Time</span>
            <Zap className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-ink-primary font-sans">{avgMttmMinutes}</span>
            <span className="text-xs text-ink-secondary font-mono-tech">minutes</span>
          </div>
          <div className="text-[10px] text-success mt-2 flex items-center space-x-1">
            <span>-68% vs manual baseline (22m)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
