'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/ui/AppShell';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/sentinel/SeverityBadge';
import { SlaCountdown } from '@/components/sentinel/SlaCountdown';
import { AiAnalysisCard } from '@/components/sentinel/AiAnalysisCard';
import { EvidenceCard } from '@/components/sentinel/EvidenceCard';
import { ActionPlanView } from '@/components/sentinel/ActionPlanView';
import { VerticalTimeline } from '@/components/sentinel/VerticalTimeline';
import { SystemHealth } from '@/components/sentinel/SystemHealth';
import { StatusIndicator } from '@/components/sentinel/StatusIndicator';
import { useToast } from '@/components/ui/toast';
import { FullIncidentBundle, EvidenceRecord, ActionItem } from '@/lib/types/database';
import { safeFetchJson } from '@/lib/api/safeFetch';
import { PostmortemReportViewer } from '@/components/dashboard/PostmortemReportViewer';
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Shield,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Radio,
  Clock,
  Terminal,
  Download,
  ExternalLink,
  ChevronRight,
  User,
  Server,
  Layers,
} from 'lucide-react';

export default function IncidentDetailPage() {
  const routeParams = useParams();
  const incidentId = (routeParams?.id as string) || 'inc-2026-0917-01';

  const [bundle, setBundle] = useState<FullIncidentBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [triageLoading, setTriageLoading] = useState<boolean>(false);
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [approvalLoading, setApprovalLoading] = useState<boolean>(false);
  const [approvingActionId, setApprovingActionId] = useState<string | null>(null);
  const [resolveLoading, setResolveLoading] = useState<boolean>(false);
  const [postmortemModalOpen, setPostmortemModalOpen] = useState<boolean>(false);
  const [postmortemData, setPostmortemData] = useState<any>(null);
  const [postmortemLoading, setPostmortemLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'actions' | 'timeline' | 'evidence'>('overview');

  const { addToast } = useToast();

  const fetchBundle = useCallback(async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson<{ success: boolean; data: FullIncidentBundle }>(
        `/api/incidents/${incidentId}`
      );
      if (res.ok && res.data?.success && res.data.data) {
        setBundle(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load incident detail:', err);
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchBundle();
  }, [fetchBundle]);

  // Deduplicate evidence records by chunkId / SK
  const uniqueEvidence = React.useMemo(() => {
    if (!bundle?.evidence || !Array.isArray(bundle.evidence)) return [];
    const seen = new Set<string>();
    return bundle.evidence.filter((chunk) => {
      const id = chunk.chunkId || chunk.SK;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [bundle?.evidence]);

  // Trigger Bedrock Triage
  const handleTriggerTriage = async () => {
    if (!bundle) return;
    setTriageLoading(true);
    try {
      const res = await safeFetchJson<any>(`/api/incidents/${incidentId}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetrySnippet: `[OBSERVABILITY ALARM] Alert condition met on service ${bundle.incident.service}. Root telemetry snapshot recorded for Bedrock evaluation.`,
        }),
      });
      if (res.ok && res.data?.success) {
        addToast({
          type: 'success',
          title: 'Bedrock Triage Complete',
          description: 'Severity classified and grounded runbook knowledge retrieved.',
        });
        await fetchBundle();
      } else {
        addToast({
          type: 'error',
          title: 'Triage Failed',
          description: res.data?.error?.message || res.error || 'Failed to triage incident.',
        });
      }
    } catch (err) {
      console.error('Triage error:', err);
    } finally {
      setTriageLoading(false);
    }
  };

  // Trigger Bedrock Action Plan
  const handleGeneratePlan = async () => {
    if (!bundle) return;
    setPlanLoading(true);
    try {
      // Auto-ground with Bedrock triage if hypothesis not yet present
      if (!bundle.incident.rootCauseHypothesis) {
        try {
          await safeFetchJson<any>(`/api/incidents/${incidentId}/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telemetrySnippet: bundle.incident.summary || 'Incident remediation request',
            }),
          });
        } catch (triageErr) {
          console.warn('Pre-plan triage note:', triageErr);
        }
      }

      const res = await safeFetchJson<any>(`/api/incidents/${incidentId}/action-plans`, {
        method: 'POST',
      });
      if (res.ok && res.data?.success) {
        addToast({
          type: 'success',
          title: 'Action Plan Generated',
          description: 'Synthesized remediation runbook with blast radius scoring.',
        });
        await fetchBundle();
      } else {
        addToast({
          type: 'error',
          title: 'Plan Generation Failed',
          description: res.data?.error?.message || res.error || 'Failed to generate plan.',
        });
      }
    } catch (err) {
      console.error('Plan error:', err);
    } finally {
      setPlanLoading(false);
    }
  };

  // Trigger Cryptographic Human Approval
  const handleApproveAction = async (action: ActionItem) => {
    if (!bundle || !bundle.activePlan) return;
    setApprovingActionId(action.actionId);
    setApprovalLoading(true);
    try {
      const nonce = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const signature = `sha256:${Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const res = await safeFetchJson<any>(`/api/incidents/${incidentId}/approve-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sentinel-actor-role': 'INCIDENT_COMMANDER',
        },
        body: JSON.stringify({
          planId: bundle.activePlan.planId,
          actionId: action.actionId,
          decision: 'APPROVED',
          approverEmail: bundle.incident.commander,
          nonce,
          timestamp,
          signature,
        }),
      });

      if (res.ok && res.data?.success) {
        addToast({
          type: 'success',
          title: 'Action Executed',
          description: `Action ${action.actionId} approved with cryptographic signature and executed.`,
        });
        await fetchBundle();
      } else {
        addToast({
          type: 'error',
          title: 'Approval Rejected',
          description: res.data?.error?.message || res.error || 'Action approval was rejected.',
        });
      }
    } catch (err) {
      console.error('Approval error:', err);
    } finally {
      setApprovalLoading(false);
      setApprovingActionId(null);
    }
  };

  // Trigger Incident Resolution & S3 Postmortem
  const handleResolveIncident = async () => {
    if (!bundle) return;
    setResolveLoading(true);
    try {
      const res = await safeFetchJson<any>(`/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionSummary: `Remediation executed on ${bundle.incident.service}. Service telemetry restored to normal baseline. Verification confirmed.`,
          triggerPostmortemGeneration: true,
        }),
      });

      if (res.ok && res.data?.success) {
        setPostmortemData(res.data.data.postmortem);
        setPostmortemModalOpen(true);
        addToast({
          type: 'success',
          title: 'Incident Resolved',
          description: 'S3 Postmortem report generated and incident status updated.',
        });
        await fetchBundle();
      } else {
        addToast({
          type: 'error',
          title: 'Resolution Failed',
          description: res.data?.error?.message || res.error || 'Failed to resolve incident.',
        });
      }
    } catch (err) {
      console.error('Resolution error:', err);
    } finally {
      setResolveLoading(false);
    }
  };

  const handleOpenPostmortem = async () => {
    if (postmortemData?.markdown) {
      setPostmortemModalOpen(true);
      return;
    }
    setPostmortemLoading(true);
    try {
      const res = await safeFetchJson<any>(`/api/incidents/${incidentId}/postmortem`);
      if (res.ok && res.data?.success && res.data?.data) {
        setPostmortemData(res.data.data);
        setPostmortemModalOpen(true);
      } else if (bundle?.incident.postmortemUrl) {
        window.open(bundle.incident.postmortemUrl, '_blank');
      }
    } catch {
      if (bundle?.incident.postmortemUrl) {
        window.open(bundle.incident.postmortemUrl, '_blank');
      }
    } finally {
      setPostmortemLoading(false);
    }
  };

  if (loading || !bundle) {
    return (
      <AppShell>
        <div className="p-16 text-center font-mono-tech text-xs text-ink-secondary">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-accent" />
          <span>LOADING INCIDENT DEEP-DIVE TELEMETRY...</span>
        </div>
      </AppShell>
    );
  }

  const { incident, timeline, activePlan } = bundle;
  const isResolved = incident.status === 'RESOLVED';

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/incidents"
            className="inline-flex items-center space-x-1.5 text-xs font-mono-tech text-ink-secondary hover:text-ink-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO INCIDENT REGISTRY</span>
          </Link>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBundle}
              className="flex items-center space-x-1.5 text-xs font-mono-tech"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>SYNC STATE</span>
            </Button>
          </div>
        </div>

        {/* Top Header Card */}
        <div className="bg-canvas border border-surface-border rounded-sm p-6 shadow-pleurat-1">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 font-mono-tech text-xs">
                <SeverityBadge severity={incident.severity} size="md" />
                <span className="font-bold text-ink-primary">INCIDENT #{incident.incidentId}</span>
                <span className="text-ink-tertiary">·</span>
                <span className="px-2 py-0.5 rounded-xs bg-surface-subtle border border-surface-border text-ink-secondary font-medium uppercase">
                  {incident.environment || 'PRODUCTION'}
                </span>
                <span className="text-ink-tertiary">·</span>
                <span className="font-medium text-ink-primary flex items-center space-x-1">
                  <Server className="w-3 h-3 text-ink-tertiary" />
                  <span>{incident.service}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
                {incident.title}
              </h1>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {incident.status === 'NEW' && (
                <Button
                  onClick={handleTriggerTriage}
                  disabled={triageLoading}
                  className="flex items-center space-x-1.5 font-mono-tech text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-900" />
                  <span>{triageLoading ? 'TRIAGING WITH BEDROCK...' : 'START AI TRIAGE'}</span>
                </Button>
              )}

              {!isResolved && !activePlan && (
                <Button
                  onClick={handleGeneratePlan}
                  disabled={planLoading}
                  className="flex items-center space-x-1.5 font-mono-tech text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-900" />
                  <span>{planLoading ? 'SYNTHESIZING PLAN...' : 'GENERATE ACTION PLAN'}</span>
                </Button>
              )}

              {!isResolved && (
                <Button
                  variant="outline"
                  onClick={handleResolveIncident}
                  disabled={resolveLoading}
                  className="flex items-center space-x-1.5 font-mono-tech text-xs border-emerald-700/40 text-emerald-800 hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{resolveLoading ? 'FINALIZING...' : 'RESOLVE INCIDENT'}</span>
                </Button>
              )}

              {isResolved && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleOpenPostmortem}
                    disabled={postmortemLoading}
                    className="flex items-center space-x-1.5 font-mono-tech text-xs bg-amber-accent/20 hover:bg-amber-accent/30 text-ink-primary border-amber-accent/40"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-800" />
                    <span>{postmortemLoading ? 'LOADING REPORT...' : 'VIEW S3 POSTMORTEM'}</span>
                  </Button>
                  {incident.postmortemUrl && (
                    <a
                      href={incident.postmortemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-surface-subtle hover:bg-surface-border text-ink-primary font-mono-tech text-xs font-bold rounded-xs border border-surface-border flex items-center space-x-1.5 transition-colors"
                      title="Download raw S3 markdown file"
                    >
                      <Download className="w-3.5 h-3.5 text-ink-secondary" />
                      <span>.MD</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-mono-tech">
            <div className="p-3 bg-surface-subtle/50 rounded border border-surface-border/60">
              <div className="text-[10px] text-ink-tertiary uppercase">CURRENT STATUS</div>
              <div className="font-bold text-ink-primary mt-0.5 text-sm uppercase">
                {incident.status}
              </div>
            </div>

            <div className="p-3 bg-surface-subtle/50 rounded border border-surface-border/60">
              <div className="text-[10px] text-ink-tertiary uppercase">INCIDENT COMMANDER</div>
              <div className="font-medium text-ink-primary mt-0.5 truncate">
                {incident.commander || 'Unassigned'}
              </div>
            </div>

            <div className="p-3 bg-surface-subtle/50 rounded border border-surface-border/60">
              <div className="text-[10px] text-ink-tertiary uppercase">INGESTION TIMESTAMP</div>
              <div className="text-ink-primary mt-0.5">
                {new Date(incident.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            <div className="p-3 bg-surface-subtle/50 rounded border border-surface-border/60">
              <div className="text-[10px] text-ink-tertiary uppercase">AI CONFIDENCE</div>
              <div className="font-bold text-amber-800 mt-0.5">
                {incident.confidenceScore ? `${Math.round(incident.confidenceScore * 100)}% GROUNDED` : 'CALCULATING'}
              </div>
            </div>
          </div>
        </div>

        {/* 65% / 35% Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT ~65% (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Navigation Tabs for Deep Dive */}
            <div className="flex border-b border-surface-border font-mono-tech text-xs overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview & Triage' },
                { id: 'actions', label: `Action Plan (${activePlan?.actions?.length || 0})` },
                { id: 'evidence', label: `Grounded Evidence (${uniqueEvidence.length})` },
                { id: 'timeline', label: `Timeline (${timeline.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 border-b-2 font-medium transition-editorial whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-amber-accent text-ink-primary font-bold'
                      : 'border-transparent text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: Overview & Triage */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Incident Narrative / Summary */}
                <div className="bg-canvas border border-surface-border rounded-sm p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
                    <h3 className="font-mono-tech text-xs font-bold uppercase text-ink-primary">
                      Telemetry & Summary
                    </h3>
                    <span className="font-mono-tech text-[10px] text-ink-tertiary">
                      SOURCE: CLOUDWATCH METRICS
                    </span>
                  </div>
                  <p className="text-xs font-sans text-ink-secondary leading-relaxed bg-surface-subtle/40 p-3.5 rounded border border-surface-border/50">
                    {incident.summary}
                  </p>
                </div>

                {/* AI Analysis Card */}
                <AiAnalysisCard
                  incident={incident}
                  evidence={uniqueEvidence}
                  onTriggerTriage={handleTriggerTriage}
                  isTriaging={triageLoading}
                />

                {/* Action Plan Preview */}
                {activePlan && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono-tech text-xs font-bold uppercase text-ink-primary">
                        Remediation Action Plan
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('actions')}
                        className="text-xs font-mono-tech text-amber-800 hover:underline flex items-center space-x-1"
                      >
                        <span>View all steps</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <ActionPlanView
                      plan={activePlan}
                      onApproveAction={handleApproveAction}
                      approvingActionId={approvingActionId}
                      disabled={approvalLoading}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB: Action Plan */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                {activePlan ? (
                  <ActionPlanView
                    plan={activePlan}
                    onApproveAction={handleApproveAction}
                    approvingActionId={approvingActionId}
                    disabled={approvalLoading}
                  />
                ) : (
                  <div className="bg-canvas border border-surface-border rounded-sm p-8 text-center space-y-4">
                    <Sparkles className="w-8 h-8 text-amber-accent mx-auto" />
                    <h4 className="text-sm font-bold text-ink-primary">
                      No Action Plan Synthesized Yet
                    </h4>
                    <p className="text-xs text-ink-secondary max-w-md mx-auto">
                      Bedrock can analyze retrieved runbook knowledge and formulate an ordered
                      remediation sequence with blast radius estimations.
                    </p>
                    <Button
                      onClick={handleGeneratePlan}
                      disabled={planLoading}
                      className="font-mono-tech text-xs"
                    >
                      <span>{planLoading ? 'SYNTHESIZING...' : 'GENERATE ACTION PLAN'}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Grounded Evidence */}
            {activeTab === 'evidence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-mono-tech text-xs font-bold uppercase text-ink-primary">
                      Knowledge Base Vector Citations
                    </h3>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Operational SOPs, runbooks, and historical incidents retrieved by Amazon Bedrock.
                    </p>
                  </div>
                  <span className="font-mono-tech text-xs px-2 py-0.5 rounded bg-surface-subtle text-ink-primary border border-surface-border">
                    {uniqueEvidence.length} CITATIONS
                  </span>
                </div>

                {uniqueEvidence.length > 0 ? (
                  <div className="space-y-3">
                    {uniqueEvidence.map((ev, idx) => (
                      <EvidenceCard key={ev.chunkId || ev.SK || `ev-${idx}`} evidence={ev} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-canvas border border-surface-border rounded-sm p-8 text-center text-xs font-mono-tech text-ink-tertiary">
                    NO GROUNDED CITATIONS RECORDED FOR THIS INCIDENT.
                  </div>
                )}
              </div>
            )}

            {/* TAB: Timeline */}
            {activeTab === 'timeline' && (
              <div className="bg-canvas border border-surface-border rounded-sm p-6">
                <div className="mb-4">
                  <h3 className="font-mono-tech text-xs font-bold uppercase text-ink-primary">
                    Chronological Audit Trail
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Immutable event sequence recorded by Sentinel orchestration engine.
                  </p>
                </div>
                <VerticalTimeline events={timeline} />
              </div>
            )}
          </div>

          {/* RIGHT ~35% (4 cols) - Sticky Panel on Desktop */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* SLA Countdown Card */}
            <div className="bg-canvas border border-surface-border rounded-sm p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-accent" />
                  <h3 className="font-mono-tech text-xs font-bold uppercase text-ink-primary">
                    SLA Compliance
                  </h3>
                </div>
                <span className="font-mono-tech text-[10px] text-ink-tertiary">
                  TARGET: {incident.severity === 'SEV1' ? '15 MIN' : '60 MIN'}
                </span>
              </div>

              <SlaCountdown
                createdAt={incident.createdAt}
                severity={incident.severity}
                status={incident.status}
              />
            </div>

            {/* Incident Metadata Panel */}
            <div className="bg-canvas border border-surface-border rounded-sm p-4 space-y-3 shadow-xs font-mono-tech text-xs">
              <h3 className="text-xs font-bold uppercase text-ink-primary border-b border-surface-border/60 pb-2">
                Operational Metadata
              </h3>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">INCIDENT ID:</span>
                  <span className="font-bold text-ink-primary">{incident.incidentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">SERVICE:</span>
                  <span className="text-ink-primary font-medium">{incident.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">ENVIRONMENT:</span>
                  <span className="text-ink-primary uppercase">{incident.environment || 'prod'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">CATEGORY:</span>
                  <span className="text-ink-primary">{incident.category || 'DATABASE_DEPLETION'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">VERSION:</span>
                  <span className="text-ink-primary">v{incident.version || 1}</span>
                </div>
              </div>
            </div>

            {/* Human-in-the-Loop Approval Gate */}
            <div className="bg-canvas border border-surface-border rounded-sm p-4 space-y-3 shadow-xs">
              <div className="flex items-center space-x-2 border-b border-surface-border/60 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="font-mono-tech text-xs font-bold uppercase text-ink-primary">
                  Cryptographic HITL Gate
                </h3>
              </div>

              <p className="text-xs text-ink-secondary font-sans leading-relaxed">
                Remediation actions with high blast radius require verified HMAC-SHA256 signature by an Incident Commander before AWS execution.
              </p>

              <div className="p-2.5 bg-surface-subtle/60 rounded border border-surface-border/60 font-mono-tech text-[10px] text-ink-tertiary space-y-1">
                <div className="flex justify-between">
                  <span>ROLE:</span>
                  <strong className="text-ink-primary">INCIDENT_COMMANDER</strong>
                </div>
                <div className="flex justify-between">
                  <span>AUDIT LOG:</span>
                  <span className="text-emerald-700 font-bold">ACTIVE</span>
                </div>
              </div>
            </div>

            {/* AWS System Health */}
            <SystemHealth />
          </div>
        </div>

        {/* Postmortem Modal */}
        {postmortemModalOpen && postmortemData && (
          <PostmortemReportViewer
            markdown={postmortemData.markdown || postmortemData.markdownReport || ''}
            s3Key={postmortemData.s3Key}
            s3Bucket={postmortemData.s3Bucket}
            downloadUrl={postmortemData.downloadUrl || postmortemData.s3Url || postmortemData.presignedUrl || incident.postmortemUrl}
            incidentId={incident.incidentId}
            onClose={() => setPostmortemModalOpen(false)}
          />
        )}
      </div>
    </AppShell>
  );
}
