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
import { OperationalHealthCard } from '@/components/dashboard/OperationalHealthCard';
import { ReportIncidentModal } from '@/components/dashboard/ReportIncidentModal';
import { InteractiveWorkbench } from '@/components/dashboard/InteractiveWorkbench';
import { CircuitTelemetryBar } from '@/components/dashboard/CircuitTelemetryBar';
import { IncidentRecord } from '@/lib/types/database';
import { Plus, RefreshCw, Layers } from 'lucide-react';

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
        fetch('/api/incidents'),
        fetch('/api/analytics'),
      ]);

      const incidentsJson = await incidentsRes.json();
      const analyticsJson = await analyticsRes.json();

      if (incidentsJson.success && incidentsJson.data) {
        setIncidents(incidentsJson.data.items);
      }
      if (analyticsJson.success && analyticsJson.data) {
        setAnalyticsData(analyticsJson.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
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
        {/* Top Header & Report Incident CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                COMMAND CENTER
              </span>
              <span className="text-ink-tertiary">LIVE SRE ORCHESTRATION & TELEMETRY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Sentinel Operations Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Autonomous incident intelligence, vector-grounded RAG runbooks, and cryptographic human-in-the-loop remediation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {/* Section 9: Report Incident CTA */}
            <Button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </Button>
          </div>
        </div>

        {/* Section 1: KPI Cards */}
        <section aria-label="Key Performance Indicators">
          <KPIGrid incidents={incidents} avgMttmMinutes={analyticsData?.avgMttmMinutes || 4.6} />
        </section>

        {/* Section 2, 5 & 8: Priority Incident Queue & Right Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Priority Incident Queue */}
          <div className="lg:col-span-8">
            <PriorityIncidentQueue
              incidents={incidents}
              onSelectIncident={(id) => {
                setSelectedIncidentId(id);
                const el = document.getElementById('command-workbench');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              selectedIncidentId={selectedIncidentId}
            />
          </div>

          {/* Right Column (4 cols): SLA Countdown & Operational Health */}
          <div className="lg:col-span-4 space-y-6">
            {/* Section 5: SLA Countdown */}
            <SLACountdownCard criticalIncident={criticalIncident} />

            {/* Section 8: Operational Health */}
            <OperationalHealthCard />
          </div>
        </div>

        {/* Section 3 & 4: Severity & Category Distribution */}
        <section aria-label="Operational Distributions">
          <DistributionCharts incidents={incidents} />
        </section>

        {/* Section 6 & 7: Recurring Issue Insight & Recent AI Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section 7: Recurring Issue Insight (Bedrock Pattern) */}
          <div className="lg:col-span-7">
            <RecurringPatternCard />
          </div>

          {/* Section 6: Recent AI Activity Feed */}
          <div className="lg:col-span-5">
            <RecentAIActivityFeed />
          </div>
        </div>

        {/* Active Incident Command Workbench (Detailed interactive investigation) */}
        <section id="command-workbench" className="space-y-4 pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
                <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                  WORKBENCH
                </span>
                <span className="text-ink-tertiary">FOCUSED INCIDENT INVESTIGATION</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-ink-primary font-sans">
                Active Incident Command Workbench
              </h2>
            </div>
            <span className="font-mono-tech text-xs text-ink-tertiary">
              TARGET: <strong className="text-ink-primary">{selectedIncidentId}</strong>
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
          onIncidentCreated={fetchDashboardData}
        />
      </div>
    </AppShell>
  );
}
