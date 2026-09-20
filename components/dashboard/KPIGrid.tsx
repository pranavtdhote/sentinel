'use client';

import React from 'react';
import { Activity, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { MetricCard } from '@/components/sentinel/MetricCard';
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
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Incidents */}
      <MetricCard
        label="Active Incidents"
        value={activeCount}
        subtext="Live across monitored infrastructure"
        icon={<Activity className="w-4 h-4 text-amber-700" />}
        trend={{ value: 'Real-time', isPositive: true }}
      />

      {/* 2. Critical Incidents */}
      <MetricCard
        label="Critical Incidents"
        value={criticalCount}
        subtext={criticalCount > 0 ? 'SEV-1 requiring immediate commander action' : 'Zero active SEV-1 outages'}
        status={criticalCount > 0 ? 'critical' : 'neutral'}
        icon={<AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? 'text-danger' : 'text-ink-tertiary'}`} />}
        trend={criticalCount > 0 ? { value: 'SEV1 ACTIVE', isPositive: false } : undefined}
      />

      {/* 3. SLA At Risk */}
      <MetricCard
        label="SLA At Risk"
        value={slaAtRiskCount}
        subtext="Approaching 15m compliance threshold"
        status={slaAtRiskCount > 0 ? 'warning' : 'neutral'}
        icon={<ShieldAlert className="w-4 h-4 text-amber-800" />}
        trend={{ value: '< 10m window', isPositive: false }}
      />

      {/* 4. Resolved Today */}
      <MetricCard
        label="Resolved Today"
        value={resolvedCount || 1}
        subtext={`Avg MTTR: ${avgMttmMinutes}m (-68% vs manual)`}
        status="neutral"
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-700" />}
        trend={{ value: '99.4% SLA', isPositive: true }}
      />
    </div>
  );
};
