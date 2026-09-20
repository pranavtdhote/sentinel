'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { MetricCard } from '@/components/sentinel/MetricCard';
import {
  Sparkles,
  Terminal,
  Cpu,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Search,
  Layers,
  FileText,
  Lock,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface AiActivityLog {
  id: string;
  stage: 'ANALYZED' | 'KNOWLEDGE_RETRIEVED' | 'EVIDENCE_ATTACHED' | 'PLAN_GENERATED' | 'APPROVAL_REQUESTED' | 'RESOLUTION_GENERATED';
  title: string;
  operationalExplanation: string;
  incidentId: string;
  timestamp: string;
  status: 'COMPLETED' | 'REQUIRES_APPROVAL' | 'EXECUTED';
  model: string;
  durationMs: number;
  awsRequestId: string;
}

export default function AiActivityPage() {
  const [filter, setFilter] = useState<string>('ALL');

  const [activities] = useState<AiActivityLog[]>([
    {
      id: 'act-01',
      stage: 'ANALYZED',
      title: 'Incident Telemetry Evaluated',
      operationalExplanation: 'Classified incident as SEV1 Critical with 92% confidence based on connection pool timeout pattern.',
      incidentId: 'inc-2026-0917-01',
      timestamp: '10:15:02 UTC',
      status: 'COMPLETED',
      model: 'Amazon Bedrock / Claude 3.5 Sonnet',
      durationMs: 340,
      awsRequestId: 'req-bedrock-992a1',
    },
    {
      id: 'act-02',
      stage: 'KNOWLEDGE_RETRIEVED',
      title: 'Operational Knowledge Retrieved',
      operationalExplanation: 'Retrieved 4 relevant runbook sections and matched this incident with 3 historical incidents from Bedrock S3 vector store.',
      incidentId: 'inc-2026-0917-01',
      timestamp: '10:15:18 UTC',
      status: 'COMPLETED',
      model: 'Titan Multimodal Embeddings G2',
      durationMs: 180,
      awsRequestId: 'req-kb-842dfa',
    },
    {
      id: 'act-03',
      stage: 'EVIDENCE_ATTACHED',
      title: 'Runbook Grounding Evidence Attached',
      operationalExplanation: 'Verified SOP-AURORA-POOL-09.md excerpt with 96% semantic relevance to current RDS pool exhaustion.',
      incidentId: 'inc-2026-0917-01',
      timestamp: '10:15:22 UTC',
      status: 'COMPLETED',
      model: 'Amazon Bedrock Knowledge Base',
      durationMs: 90,
      awsRequestId: 'req-ev-301bb2',
    },
    {
      id: 'act-04',
      stage: 'PLAN_GENERATED',
      title: 'Remediation Action Plan Generated',
      operationalExplanation: 'Generated 3 remediation options with ordered dependencies and blast radius risk assessment.',
      incidentId: 'inc-2026-0917-01',
      timestamp: '10:15:42 UTC',
      status: 'REQUIRES_APPROVAL',
      model: 'Amazon Bedrock / Claude 3.5 Sonnet',
      durationMs: 820,
      awsRequestId: 'req-plan-7109ff',
    },
    {
      id: 'act-05',
      stage: 'APPROVAL_REQUESTED',
      title: 'Human Commander Authorization Requested',
      operationalExplanation: 'Gated step 02 (Rollback ECS Task Definition) for cryptographic HMAC approval by Incident Commander.',
      incidentId: 'inc-2026-0917-01',
      timestamp: '10:16:00 UTC',
      status: 'REQUIRES_APPROVAL',
      model: 'Sentinel HITL Security Gate',
      durationMs: 40,
      awsRequestId: 'req-gate-8819ab',
    },
    {
      id: 'act-06',
      stage: 'RESOLUTION_GENERATED',
      title: 'Resolution Report Synthesized',
      operationalExplanation: 'Generated retrospective markdown postmortem and persisted audit record to S3 bucket sentinel-reports-prod.',
      incidentId: 'inc-2026-0917-01',
      timestamp: '10:22:15 UTC',
      status: 'EXECUTED',
      model: 'Amazon Bedrock / Claude 3.5 Sonnet',
      durationMs: 1420,
      awsRequestId: 'req-post-502a11',
    },
  ]);

  const filteredActivities = activities.filter((act) => {
    if (filter === 'ALL') return true;
    return act.stage === filter;
  });

  const getStageIcon = (stage: AiActivityLog['stage']) => {
    switch (stage) {
      case 'ANALYZED':
        return <Sparkles className="w-4 h-4 text-amber-800" />;
      case 'KNOWLEDGE_RETRIEVED':
        return <Search className="w-4 h-4 text-blue-700" />;
      case 'EVIDENCE_ATTACHED':
        return <FileText className="w-4 h-4 text-purple-700" />;
      case 'PLAN_GENERATED':
        return <Layers className="w-4 h-4 text-amber-700" />;
      case 'APPROVAL_REQUESTED':
        return <Lock className="w-4 h-4 text-danger" />;
      case 'RESOLUTION_GENERATED':
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                AI ACTIVITY
              </span>
              <span className="text-ink-tertiary">SAFE REASONING AUDIT LOG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Observe how Sentinel reasons over operational context.
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Safe, explainable operational telemetry without internal chain-of-thought exposure.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-mono-tech text-xs px-2.5 py-1 rounded bg-surface-subtle border border-surface-border text-ink-secondary">
              AWS BEDROCK LOGS: <strong className="text-ink-primary">STREAMING</strong>
            </span>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="AI Invocations"
            value="14"
            subtext="Zero prompt hallucinations"
            status="healthy"
            icon={<Cpu className="w-4 h-4 text-amber-800" />}
            trend={{ value: '100% Grounded', isPositive: true }}
          />

          <MetricCard
            label="Avg Latency"
            value="480ms"
            subtext="Converse API streaming"
            status="neutral"
            icon={<Clock className="w-4 h-4 text-blue-700" />}
            trend={{ value: 'P95: 820ms', isPositive: true }}
          />

          <MetricCard
            label="KB Citations"
            value="4"
            subtext="SOPs & runbooks cited"
            status="healthy"
            icon={<Search className="w-4 h-4 text-emerald-700" />}
            trend={{ value: 'Verified', isPositive: true }}
          />

          <MetricCard
            label="HITL Sign-Offs"
            value="2"
            subtext="HMAC Cryptographic sign-offs"
            status="healthy"
            icon={<Lock className="w-4 h-4 text-amber-800" />}
            trend={{ value: 'Audited', isPositive: true }}
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-canvas border border-surface-border rounded-sm p-3 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center space-x-1 font-mono-tech text-xs">
            <span className="text-ink-tertiary text-[10px] uppercase pr-2 flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>STAGE:</span>
            </span>
            {[
              { id: 'ALL', label: 'All Activity' },
              { id: 'ANALYZED', label: 'Triage' },
              { id: 'KNOWLEDGE_RETRIEVED', label: 'Retrieval' },
              { id: 'PLAN_GENERATED', label: 'Action Plans' },
              { id: 'APPROVAL_REQUESTED', label: 'Approvals' },
              { id: 'RESOLUTION_GENERATED', label: 'Resolutions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 rounded-xs border text-[11px] whitespace-nowrap transition-editorial ${
                  filter === tab.id
                    ? 'bg-amber-light border-amber-accent/60 text-ink-primary font-bold shadow-pleurat-button'
                    : 'border-surface-border text-ink-secondary hover:bg-surface-subtle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="font-mono-tech text-[10px] text-ink-tertiary hidden sm:inline">
            Showing {filteredActivities.length} operational steps
          </span>
        </div>

        {/* Activity Feed Cards */}
        <div className="space-y-3">
          {filteredActivities.map((act) => (
            <div
              key={act.id}
              className="bg-canvas border border-surface-border hover:border-amber-accent/60 rounded-sm p-5 space-y-3 shadow-xs transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded bg-surface-subtle border border-surface-border flex items-center justify-center">
                    {getStageIcon(act.stage)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink-primary font-sans">
                      {act.title}
                    </h3>
                    <div className="font-mono-tech text-[10px] text-ink-tertiary flex items-center space-x-2 mt-0.5">
                      <span>INCIDENT: <strong className="text-ink-primary">{act.incidentId}</strong></span>
                      <span>·</span>
                      <span>{act.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 font-mono-tech text-[10px]">
                  {act.status === 'COMPLETED' && (
                    <span className="px-2 py-0.5 rounded-xs bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 font-bold">
                      COMPLETED
                    </span>
                  )}
                  {act.status === 'REQUIRES_APPROVAL' && (
                    <span className="px-2 py-0.5 rounded-xs bg-amber-accent/20 text-amber-900 border border-amber-accent/40 font-bold">
                      REQUIRES APPROVAL
                    </span>
                  )}
                  {act.status === 'EXECUTED' && (
                    <span className="px-2 py-0.5 rounded-xs bg-blue-500/15 text-blue-800 border border-blue-500/30 font-bold">
                      EXECUTED
                    </span>
                  )}
                </div>
              </div>

              {/* Safe Operational Explanation (No raw CoT) */}
              <div className="p-3 bg-surface-subtle/50 rounded border border-surface-border/60 text-xs font-sans text-ink-primary leading-relaxed">
                <span className="font-mono-tech text-[10px] text-ink-tertiary uppercase block mb-1 font-bold">
                  Operational Finding
                </span>
                {act.operationalExplanation}
              </div>

              {/* Technical Metadata Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono-tech text-ink-tertiary pt-1">
                <div className="flex items-center space-x-3">
                  <span>ENGINE: <strong className="text-ink-secondary">{act.model}</strong></span>
                  <span>·</span>
                  <span>LATENCY: <strong className="text-ink-secondary">{act.durationMs}ms</strong></span>
                </div>
                <span>AWS REQ: {act.awsRequestId}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
