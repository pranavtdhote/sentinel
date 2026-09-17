'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { IncidentRecord } from '@/lib/types/database';
import { PieChart, BarChart2 } from 'lucide-react';

interface DistributionChartsProps {
  incidents: IncidentRecord[];
}

export const DistributionCharts: React.FC<DistributionChartsProps> = ({ incidents }) => {
  // Severity counts
  const sev1 = incidents.filter((i) => i.severity === 'SEV1').length;
  const sev2 = incidents.filter((i) => i.severity === 'SEV2').length;
  const sev3 = incidents.filter((i) => i.severity === 'SEV3').length;
  const sev4 = incidents.filter((i) => i.severity === 'SEV4').length;
  const total = Math.max(1, incidents.length);

  // Category counts
  const categories: Record<string, number> = {};
  incidents.forEach((i) => {
    const cat = i.category || 'Infrastructure / Compute';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const categoryList = Object.entries(categories).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / total) * 100),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono-tech">
      {/* Severity Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm">Severity Distribution</CardTitle>
            </div>
            <span className="text-[10px] text-ink-tertiary">TOTAL: {incidents.length}</span>
          </div>
          <CardDescription className="text-[11px]">
            Incident breakdown by operational impact tiers
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 text-xs">
          {/* Proportional Split Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-border">
            <div
              className="bg-danger h-full"
              style={{ width: `${(sev1 / total) * 100}%` }}
              title={`SEV-1: ${sev1}`}
            />
            <div
              className="bg-amber-accent h-full"
              style={{ width: `${(sev2 / total) * 100}%` }}
              title={`SEV-2: ${sev2}`}
            />
            <div
              className="bg-ink-tertiary h-full"
              style={{ width: `${(sev3 / total) * 100}%` }}
              title={`SEV-3: ${sev3}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 bg-danger-surface/40 border border-danger-border/60 rounded-xs">
              <div className="text-[10px] text-danger font-bold">SEV-1 CRITICAL</div>
              <div className="text-lg font-bold text-danger font-sans">{sev1}</div>
              <div className="text-[9px] text-ink-tertiary">{Math.round((sev1 / total) * 100)}%</div>
            </div>

            <div className="p-2.5 bg-amber-light/50 border border-amber-accent/40 rounded-xs">
              <div className="text-[10px] text-amber-800 font-bold">SEV-2 HIGH</div>
              <div className="text-lg font-bold text-amber-800 font-sans">{sev2}</div>
              <div className="text-[9px] text-ink-tertiary">{Math.round((sev2 / total) * 100)}%</div>
            </div>

            <div className="p-2.5 bg-surface-strong/50 border border-surface-border rounded-xs">
              <div className="text-[10px] text-ink-secondary font-bold">SEV-3 MEDIUM</div>
              <div className="text-lg font-bold text-ink-primary font-sans">{sev3}</div>
              <div className="text-[9px] text-ink-tertiary">{Math.round((sev3 / total) * 100)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm">Category Fault Domains</CardTitle>
            </div>
            <span className="text-[10px] text-ink-tertiary">FAULT DOMAINS</span>
          </div>
          <CardDescription className="text-[11px]">
            Root cause telemetry clustered across cloud subsystems
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2.5 text-xs">
          {categoryList.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-ink-primary font-medium">{cat.name}</span>
                <span className="text-ink-tertiary">
                  {cat.count} ({cat.percentage}%)
                </span>
              </div>
              <div className="w-full bg-surface-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-accent h-full rounded-full transition-all duration-500"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
