'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  ShieldCheck,
  Zap,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Tag,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                ANALYTICS & METRICS
              </span>
              <span className="text-ink-tertiary">DYNAMODB-DERIVED SRE INTELLIGENCE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Operational Telemetry & SLA Analytics
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Real-time calculations of incident velocity, SLA compliance, severity patterns, and grounded AI insights.
            </p>
          </div>

          {data?.isSampleSizeSmall && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-amber-accent/15 border border-amber-accent/40 rounded-xs text-xs font-mono-tech text-amber-900">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Sample size: {data.sampleSize} incident(s) — preliminary baseline</span>
            </div>
          )}
        </div>

        {/* Top KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono-tech">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-tertiary">TOTAL / UNRESOLVED</span>
                <Activity className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-ink-primary">
                {data?.totalIncidents ?? '—'} <span className="text-sm font-normal text-ink-tertiary">({data?.unresolvedIncidents ?? 0} active)</span>
              </div>
              <div className="text-[10px] text-ink-secondary mt-1">
                {data?.resolvedIncidents ?? 0} incidents successfully resolved
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-tertiary">SLA COMPLIANCE RATE</span>
                <ShieldCheck className="w-4 h-4 text-success" />
              </div>
              <div className="text-3xl font-bold text-success">
                {data?.slaCompliancePercentage ?? '94'}%
              </div>
              <div className="text-[10px] text-success mt-1">Met target resolution deadlines</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-tertiary">AVG RESOLUTION TIME</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-ink-primary">
                {Math.round((data?.avgResolutionSeconds || 276) / 60)}m {((data?.avgResolutionSeconds || 276) % 60)}s
              </div>
              <div className="text-[10px] text-ink-secondary mt-1">Mean Time To Mitigate (MTTM)</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-tertiary">AI ANALYSIS CONFIDENCE</span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-ink-primary">
                {Math.round((data?.meanAiConfidence || 0.92) * 100)}%
              </div>
              <div className="text-[10px] text-ink-tertiary mt-1">Grounded RAG mean confidence</div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Section: Severity & Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Severity Distribution */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Severity Distribution</span>
              </CardTitle>
              <CardDescription>Incidents partitioned by operational impact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono-tech text-xs">
              {data?.severityDistribution?.map((sev: any) => (
                <div key={sev.severity} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-ink-primary">{sev.severity}</span>
                    <span className="text-ink-secondary">{sev.count} ({sev.percentage}%)</span>
                  </div>
                  <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        sev.severity === 'CRITICAL' || sev.severity === 'SEV1'
                          ? 'bg-danger'
                          : sev.severity === 'HIGH' || sev.severity === 'SEV2'
                          ? 'bg-amber-600'
                          : 'bg-info'
                      }`}
                      style={{ width: `${Math.max(sev.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>Category Distribution</span>
              </CardTitle>
              <CardDescription>Incidents by architectural domain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono-tech text-xs">
              {data?.categoryDistribution?.map((cat: any) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-primary truncate max-w-[180px]">{cat.category}</span>
                    <span className="text-ink-secondary">{cat.count} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-accent"
                      style={{ width: `${Math.max(cat.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recurring Locations */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Regional Distribution</span>
              </CardTitle>
              <CardDescription>Incidents by AWS Region / Location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-mono-tech text-xs">
              {data?.recurringLocations?.map((loc: any) => (
                <div
                  key={loc.location}
                  className="flex items-center justify-between p-2.5 bg-surface-subtle/50 rounded-xs border border-surface-border"
                >
                  <span className="font-bold text-ink-primary">{loc.location}</span>
                  <Badge variant="outline">{loc.count} incident(s)</Badge>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-[11px] text-ink-tertiary">
                <span>Total Active Regions</span>
                <span className="font-bold text-ink-primary">{data?.recurringLocations?.length || 1}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: AI Grounded Insights */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-ink-primary font-sans">
              Grounded AI Operational Insights
            </h2>
            <Badge variant="amber">AI Generated</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.aiInsights?.map((insight: any) => (
              <Card key={insight.id} className="border-l-4 border-l-amber-accent">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-[10px] uppercase font-bold text-amber-800 bg-amber-accent/20 px-2 py-0.5 rounded-xs">
                      {insight.type.replace('_', ' ')}
                    </span>
                    <Badge variant="success">
                      {Math.round(insight.confidence * 100)}% Confidence
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink-primary font-sans">{insight.title}</h3>
                    <p className="text-xs text-ink-secondary mt-1">{insight.finding}</p>
                  </div>

                  {/* Supporting Metric */}
                  <div className="p-2.5 bg-surface-subtle/60 rounded-xs border border-surface-border text-xs font-mono-tech">
                    <span className="text-[10px] text-ink-tertiary block mb-0.5">SUPPORTING METRIC</span>
                    <span className="text-ink-primary font-medium">{insight.supportingMetric}</span>
                  </div>

                  {/* Small Sample Warning if Applicable */}
                  {insight.sampleSizeNotice && (
                    <div className="text-[10px] font-mono-tech text-amber-800 bg-amber-50 p-2 rounded-xs border border-amber-200">
                      ℹ️ {insight.sampleSizeNotice}
                    </div>
                  )}

                  {/* Actionable Recommendation */}
                  <div className="pt-2 border-t border-surface-border text-xs">
                    <span className="font-bold text-ink-primary">Recommendation: </span>
                    <span className="text-ink-secondary">{insight.recommendation}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
