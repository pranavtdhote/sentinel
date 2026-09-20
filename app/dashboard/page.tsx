'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Button } from '@/components/ui/button';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { PriorityIncidentQueue } from '@/components/dashboard/PriorityIncidentQueue';
import { DistributionCharts } from '@/components/dashboard/DistributionCharts';
import { SLACountdownCard } from '@/components/dashboard/SLACountdownCard';
import { RecentAIActivityFeed } from '@/components/dashboard/RecentAIActivityFeed';
import { RecurringPatternCard } from '@/components/dashboard/RecurringPatternCard';
import { SystemHealth } from '@/components/sentinel/SystemHealth';
import { ReportIncidentModal } from '@/components/dashboard/ReportIncidentModal';
import { InteractiveWorkbench } from '@/components/dashboard/InteractiveWorkbench';
import { CircuitTelemetryBar } from '@/components/dashboard/CircuitTelemetryBar';
import { IncidentRecord } from '@/lib/types/database';
import { safeFetchJson } from '@/lib/api/safeFetch';
import { Plus, RefreshCw, Layers, ShieldCheck, Activity, Users, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('inc-2026-0917-01');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [incidentsRes, analyticsRes] = await Promise.all([
        safeFetchJson<{ success: boolean; data: { items: IncidentRecord[] } }>('/api/incidents'),
        safeFetchJson<{ success: boolean; data: any }>('/api/analytics'),
      ]);

      if (incidentsRes.ok && incidentsRes.data?.success && incidentsRes.data.data) {
        setIncidents(incidentsRes.data.data.items);
      }
      if (analyticsRes.ok && analyticsRes.data?.success && analyticsRes.data.data) {
        setAnalyticsData(analyticsRes.data.data);
      }
    } catch (err) {
      console.warn('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const criticalIncident = incidents.find((i) => i.severity === 'SEV1' && i.status !== 'RESOLVED');

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                COMMAND CENTER
              </span>
              <span className="text-ink-tertiary">MISSION CONTROL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Real-time operational intelligence
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Live SRE telemetry, Bedrock vector runbooks, and cryptographic human-in-the-loop response.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="flex items-center space-x-1.5 font-mono-tech text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </Button>

            <Button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center space-x-1.5 font-mono-tech text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </Button>
          </div>
        </div>

        {/* Section 1: Top Metrics with Large Numerical Figures */}
        <section aria-label="Command Center Metrics">
          <KPIGrid incidents={incidents} avgMttmMinutes={analyticsData?.avgMttmMinutes || 4.6} />
        </section>

        {/* Priority Incident Queue (LEFT) & System Health / SLA (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Priority Incident Queue */}
          <div className="lg:col-span-8 space-y-6">
            <PriorityIncidentQueue
              incidents={incidents}
              onSelectIncident={(id) => {
                setSelectedIncidentId(id);
                const el = document.getElementById('command-workbench');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              selectedIncidentId={selectedIncidentId}
            />

            {/* Operational Distributions */}
            <DistributionCharts incidents={incidents} />
          </div>

          {/* Right Column (4 cols): System Health & SLA Countdown */}
          <div className="lg:col-span-4 space-y-6">
            {/* System Health / AI Status */}
            <SystemHealth />

            {/* SLA Countdown Card */}
            <SLACountdownCard criticalIncident={criticalIncident} />

            {/* Responder Availability Card */}
            <div className="bg-canvas border border-surface-border rounded-sm p-4 space-y-3 font-mono-tech text-xs">
              <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-amber-accent" />
                  <span className="font-bold text-ink-primary uppercase text-xs">
                    Responder On-Call
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold">● 4 READY</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-ink-secondary">Primary Commander:</span>
                  <span className="text-ink-primary font-bold">prana@sentinel</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-secondary">Database Escalation:</span>
                  <span className="text-ink-primary">aurora-lead@sentinel</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-secondary">Network Operations:</span>
                  <span className="text-ink-primary">netops@sentinel</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <RecurringPatternCard />
          </div>
          <div className="lg:col-span-5">
            <RecentAIActivityFeed />
          </div>
        </div>

        {/* Active Incident Command Workbench */}
        <section id="command-workbench" className="space-y-4 pt-4 border-t border-surface-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
                <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                  WORKBENCH
                </span>
                <span className="text-ink-tertiary">INTERACTIVE SRE REMEDIATION ENGINE</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-ink-primary font-sans">
                Active Incident Command Workbench
              </h2>
            </div>
            <span className="font-mono-tech text-xs text-ink-tertiary">
              TARGET INCIDENT: <strong className="text-ink-primary">{selectedIncidentId}</strong>
            </span>
          </div>

          <InteractiveWorkbench
            selectedIncidentId={selectedIncidentId}
            onRefreshAnalytics={fetchDashboardData}
          />
        </section>

        {/* Hardware Circuit Telemetry Bus */}
        <CircuitTelemetryBar />

        {/* Report Incident Modal */}
        <ReportIncidentModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onIncidentCreated={(newId) => {
            if (newId) setSelectedIncidentId(newId);
            fetchDashboardData();
          }}
        />
      </div>
    </AppShell>
  );
}
