'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Shield,
  Activity,
  ArrowRight,
  ExternalLink,
  Cpu,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Download,
} from 'lucide-react';
import { FullIncidentBundle, EvidenceRecord, ActionItem } from '@/lib/types/database';

interface InteractiveWorkbenchProps {
  onRefreshAnalytics?: () => void;
  selectedIncidentId?: string;
}

export const InteractiveWorkbench: React.FC<InteractiveWorkbenchProps> = ({
  onRefreshAnalytics,
  selectedIncidentId,
}) => {
  const [bundle, setBundle] = useState<FullIncidentBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [triageLoading, setTriageLoading] = useState<boolean>(false);
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [approvalLoading, setApprovalLoading] = useState<boolean>(false);
  const [resolveLoading, setResolveLoading] = useState<boolean>(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecord | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [isPostmortemModalOpen, setIsPostmortemModalOpen] = useState<boolean>(false);
  const [postmortemData, setPostmortemData] = useState<any>(null);
  const [actionResult, setActionResult] = useState<any>(null);

  const activeId = selectedIncidentId || 'inc-2026-0917-01';

  // Fetch incident data
  const fetchIncidentBundle = React.useCallback(async (idToFetch: string = activeId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/incidents/${idToFetch}`);
      const json = await res.json();
      if (json.success && json.data) {
        setBundle(json.data);
        if (json.data.incident.status === 'RESOLVED') setActiveStep(5);
        else if (json.data.incident.status === 'MITIGATING') setActiveStep(4);
        else if (json.data.activePlan) setActiveStep(3);
        else if (json.data.incident.status === 'INVESTIGATING') setActiveStep(2);
        else setActiveStep(1);
      }
    } catch (err) {
      console.error('Failed to fetch incident bundle:', err);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchIncidentBundle(activeId);
  }, [activeId, fetchIncidentBundle]);

  // Trigger Step 2: Bedrock Triage
  const handleTriggerTriage = async () => {
    if (!bundle) return;
    setTriageLoading(true);
    try {
      const res = await fetch(`/api/incidents/${bundle.incident.incidentId}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetrySnippet: '[ERROR] ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchIncidentBundle();
        setActiveStep(2);
      }
    } catch (err) {
      console.error('Triage failed:', err);
    } finally {
      setTriageLoading(false);
    }
  };

  // Trigger Step 3: Bedrock Action Plan
  const handleGenerateActionPlan = async () => {
    if (!bundle) return;
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/incidents/${bundle.incident.incidentId}/action-plans`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        await fetchIncidentBundle();
        setActiveStep(3);
      }
    } catch (err) {
      console.error('Action plan generation failed:', err);
    } finally {
      setPlanLoading(false);
    }
  };

  // Trigger Step 4: Cryptographic Human Approval & Tool Execution
  const handleApproveAction = async (action: ActionItem) => {
    if (!bundle || !bundle.activePlan) return;
    setApprovalLoading(true);
    try {
      const nonce = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const signature = `sha256:${Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const res = await fetch(`/api/incidents/${bundle.incident.incidentId}/approve-action`, {
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

      const data = await res.json();
      if (data.success) {
        setActionResult(data.data.executionResult);
        setIsApprovalModalOpen(false);
        await fetchIncidentBundle();
        setActiveStep(4);
      } else {
        alert(`Approval rejected: ${data.error?.message}`);
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setApprovalLoading(false);
    }
  };

  // Trigger Step 5: Resolve Incident & Generate S3 Postmortem
  const handleResolveIncident = async () => {
    if (!bundle) return;
    setResolveLoading(true);
    try {
      const res = await fetch(`/api/incidents/${bundle.incident.incidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionSummary: 'ECS task definition rolled back to revision 48. Aurora connection pool stabilized at 38 connections. P99 latency restored to 95ms.',
          triggerPostmortemGeneration: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPostmortemData(data.data.postmortem);
        setIsPostmortemModalOpen(true);
        await fetchIncidentBundle();
        setActiveStep(5);
        if (onRefreshAnalytics) onRefreshAnalytics();
      }
    } catch (err) {
      console.error('Resolution failed:', err);
    } finally {
      setResolveLoading(false);
    }
  };

  if (loading || !bundle) {
    return (
      <div className="p-12 text-center font-mono-tech text-ink-secondary">
        <Activity className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-600" />
        <span>INITIALIZING SENTINEL WORKBENCH...</span>
      </div>
    );
  }

  const { incident, timeline, evidence, activePlan, auditLogs } = bundle;

  return (
    <div id="workbench" className="space-y-6">
      {/* Incident Header Card */}
      <div className="bg-canvas border border-surface-border rounded-sm p-6 shadow-pleurat-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-4 mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-mono-tech text-xs bg-danger-surface text-danger border border-danger-border px-2 py-0.5 rounded-xs font-bold">
                {incident.severity} · CRITICAL
              </span>
              <span className="font-mono-tech text-xs text-ink-tertiary">
                ID: {incident.incidentId}
              </span>
              <span className="font-mono-tech text-xs text-ink-tertiary">
                SERVICE: <strong className="text-ink-primary">{incident.service}</strong>
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-primary font-sans">
              {incident.title}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right font-mono-tech text-xs hidden sm:block">
              <div className="text-ink-tertiary">STATUS</div>
              <div className="font-bold text-amber-600">{incident.status}</div>
            </div>
            <div className="h-8 w-px bg-surface-border hidden sm:block" />
            <div className="text-right font-mono-tech text-xs hidden sm:block">
              <div className="text-ink-tertiary">COMMANDER</div>
              <div className="text-ink-primary font-medium">{incident.commander}</div>
            </div>
          </div>
        </div>

        {/* Live Operational Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 font-mono-tech text-xs">
          <div className="p-3 bg-surface-subtle/70 rounded-xs border border-surface-border">
            <div className="text-ink-tertiary">P99 LATENCY (API)</div>
            <div className="text-base font-bold text-danger mt-0.5 flex items-center space-x-1">
              <span>4,820 ms</span>
              <span className="text-[10px] text-danger font-normal">(+3900%)</span>
            </div>
          </div>
          <div className="p-3 bg-surface-subtle/70 rounded-xs border border-surface-border">
            <div className="text-ink-tertiary">AURORA CONNECTIONS</div>
            <div className="text-base font-bold text-danger mt-0.5">500 / 500 (MAX)</div>
          </div>
          <div className="p-3 bg-surface-subtle/70 rounded-xs border border-surface-border">
            <div className="text-ink-tertiary">AI GROUNDED CONFIDENCE</div>
            <div className="text-base font-bold text-ink-primary mt-0.5">
              {Math.round((incident.confidenceScore || 0.94) * 100)}%
            </div>
          </div>
          <div className="p-3 bg-surface-subtle/70 rounded-xs border border-surface-border">
            <div className="text-ink-tertiary">MTTD (DETECTION)</div>
            <div className="text-base font-bold text-ink-primary mt-0.5">
              {incident.mttdSeconds || 88}s
            </div>
          </div>
        </div>
      </div>

      {/* Dual Pane Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Chronological Timeline & Grounded Evidence */}
        <div className="lg:col-span-6 space-y-6">
          {/* Grounded Evidence Box */}
          <div className="bg-canvas border border-surface-border rounded-sm p-5 shadow-pleurat-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="font-mono-tech font-bold text-xs text-ink-primary uppercase tracking-wider">
                  Bedrock Knowledge Base Citations ({evidence.length})
                </span>
              </div>
              <span className="text-[10px] font-mono-tech text-ink-tertiary">
                VECTOR SEARCH &gt; 0.85
              </span>
            </div>

            {evidence.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono-tech text-ink-tertiary border border-dashed border-surface-border rounded-xs">
                No citations retrieved yet. Trigger Bedrock Triage to query Knowledge Base.
              </div>
            ) : (
              <div className="space-y-3">
                {evidence.map((chunk) => (
                  <div
                    key={chunk.chunkId}
                    onClick={() => setSelectedEvidence(chunk)}
                    className="p-3 bg-surface-strong/60 hover:bg-surface-strong border border-surface-border rounded-xs cursor-pointer transition-editorial group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono-tech font-semibold text-ink-primary flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-accent" />
                        <span>{chunk.documentTitle}</span>
                      </span>
                      <span className="font-mono-tech text-[10px] bg-amber-light px-1.5 py-0.5 rounded text-ink-primary font-bold">
                        {Math.round(chunk.relevanceScore * 100)}% MATCH
                      </span>
                    </div>
                    <p className="text-xs text-ink-secondary line-clamp-2 font-sans italic">
                      &quot;{chunk.snippet}&quot;
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono-tech text-ink-tertiary">
                      <span>URI: {chunk.sourceUri}</span>
                      <span className="text-amber-700 group-hover:underline flex items-center space-x-0.5">
                        <span>Inspect Evidence</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Trail & Timeline */}
          <div className="bg-canvas border border-surface-border rounded-sm p-5 shadow-pleurat-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4 font-mono-tech text-xs">
              <span className="font-bold text-ink-primary uppercase tracking-wider">
                Audited Timeline ({timeline.length})
              </span>
              <span className="text-[10px] text-ink-tertiary">IMMUTABLE LOGS</span>
            </div>

            <div className="space-y-4">
              {timeline.map((event, idx) => (
                <div key={event.eventId || idx} className="flex items-start space-x-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-accent mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink-primary font-sans">{event.title}</span>
                      <span className="font-mono-tech text-[10px] text-ink-tertiary">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-ink-secondary text-xs mt-0.5 leading-relaxed font-sans">
                      {event.description}
                    </p>
                    <div className="text-[10px] font-mono-tech text-ink-tertiary mt-1">
                      ACTOR: {event.actor}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Pane: Autonomous Action Workbench */}
        <div className="lg:col-span-6 space-y-6">
          {/* Action Orchestration Card */}
          <div className="bg-canvas border border-surface-border rounded-sm p-5 shadow-pleurat-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4 font-mono-tech text-xs">
              <span className="font-bold text-ink-primary uppercase tracking-wider">
                Autonomous Response Controls
              </span>
              <span className="text-[10px] text-ink-tertiary">HUMAN-IN-THE-LOOP</span>
            </div>

            {/* Step Progression */}
            <div className="space-y-4">
              {/* Step 1: Bedrock Triage */}
              <div className="p-4 bg-surface-subtle/50 rounded-xs border border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-amber-accent text-ink-primary text-xs font-mono-tech font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="font-bold text-xs text-ink-primary font-mono-tech">
                      BEDROCK AUTONOMOUS TRIAGE
                    </span>
                  </div>
                  {incident.rootCauseHypothesis && (
                    <span className="flex items-center space-x-1 text-[10px] font-mono-tech text-success">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>TRIAGED</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-ink-secondary mb-3 leading-relaxed">
                  Queries Bedrock Knowledge Base and analyzes CloudWatch error telemetry to form a
                  grounded root-cause hypothesis.
                </p>

                {incident.rootCauseHypothesis ? (
                  <div className="p-3 bg-canvas border border-surface-border rounded-xs mb-3">
                    <div className="text-[10px] font-mono-tech text-ink-tertiary mb-1">
                      ROOT CAUSE HYPOTHESIS
                    </div>
                    <p className="text-xs text-ink-primary font-medium leading-relaxed">
                      {incident.rootCauseHypothesis}
                    </p>
                  </div>
                ) : null}

                <button
                  onClick={handleTriggerTriage}
                  disabled={triageLoading}
                  className="w-full py-2 px-3 bg-amber-accent hover:bg-amber-hover disabled:opacity-50 text-ink-primary text-xs font-semibold rounded-xs shadow-pleurat-button transition-editorial flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {triageLoading
                      ? 'Analyzing with Bedrock (Claude 3.5 Sonnet)...'
                      : incident.rootCauseHypothesis
                      ? 'Re-Run Bedrock Triage'
                      : 'Trigger Bedrock Autonomous Triage'}
                  </span>
                </button>
              </div>

              {/* Step 2: Action Plan Formulation */}
              <div className="p-4 bg-surface-subtle/50 rounded-xs border border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-amber-accent text-ink-primary text-xs font-mono-tech font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="font-bold text-xs text-ink-primary font-mono-tech">
                      MITIGATION ACTION PLAN
                    </span>
                  </div>
                  {activePlan && (
                    <span className="flex items-center space-x-1 text-[10px] font-mono-tech text-amber-700">
                      <Clock className="w-3 h-3" />
                      <span>{activePlan.status}</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-ink-secondary mb-3 leading-relaxed">
                  Synthesizes remediation steps with blast-radius modeling and rollback procedures.
                </p>

                {activePlan ? (
                  <div className="space-y-2 mb-3">
                    <div className="p-3 bg-canvas border border-surface-border rounded-xs">
                      <div className="flex items-center justify-between text-[10px] font-mono-tech mb-1">
                        <span className="text-ink-tertiary">PLAN SUMMARY</span>
                        <span className="text-amber-700 font-bold">
                          RISK: {activePlan.blastRadiusRisk}
                        </span>
                      </div>
                      <p className="text-xs text-ink-primary font-medium">{activePlan.summary}</p>
                    </div>

                    {/* Proposed Actions List */}
                    {activePlan.actions.map((act) => (
                      <div
                        key={act.actionId}
                        className="p-3 bg-canvas border border-surface-border rounded-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono-tech text-xs font-bold text-ink-primary">
                            {act.toolName}
                          </div>
                          <div className="text-[11px] text-ink-secondary">{act.description}</div>
                        </div>

                        {act.status === 'SUCCESS' ? (
                          <span className="px-2 py-0.5 bg-success-surface text-success text-[10px] font-mono-tech rounded font-bold">
                            EXECUTED
                          </span>
                        ) : (
                          <button
                            onClick={() => setIsApprovalModalOpen(true)}
                            className="px-3 py-1.5 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-[10px] font-bold rounded-xs shadow-pleurat-button transition-editorial"
                          >
                            Sign & Execute ↗
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}

                {!activePlan && (
                  <button
                    onClick={handleGenerateActionPlan}
                    disabled={planLoading || !incident.rootCauseHypothesis}
                    className="w-full py-2 px-3 bg-surface-strong hover:bg-amber-light disabled:opacity-50 text-ink-primary text-xs font-semibold rounded-xs border border-surface-border transition-editorial flex items-center justify-center space-x-2"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {planLoading ? 'Synthesizing Plan...' : 'Generate Mitigation Action Plan'}
                    </span>
                  </button>
                )}
              </div>

              {/* Step 3: Tool Execution Output & Health Confirmation */}
              {actionResult && (
                <div className="p-4 bg-success-surface border border-success-border rounded-xs font-mono-tech text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-success flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>AWS SDK TOOL EXECUTION SUCCESS</span>
                    </span>
                    <span className="text-[10px] text-ink-tertiary">
                      LATENCY: {actionResult.durationMs}ms
                    </span>
                  </div>
                  <div className="text-ink-primary text-[11px] mb-1">
                    AWS Request ID: <strong>{actionResult.awsRequestId}</strong>
                  </div>
                  <div className="text-ink-secondary text-[11px] mb-2 leading-relaxed">
                    {actionResult.output?.summary}
                  </div>
                  <div className="text-[10px] text-ink-tertiary">
                    Previous: {actionResult.output?.previousTaskDefinition} → Active:{' '}
                    <strong className="text-success">
                      {actionResult.output?.activeTaskDefinition}
                    </strong>
                  </div>
                </div>
              )}

              {/* Step 4: Resolution & S3 Postmortem */}
              <div className="p-4 bg-surface-subtle/50 rounded-xs border border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-amber-accent text-ink-primary text-xs font-mono-tech font-bold flex items-center justify-center">
                      3
                    </span>
                    <span className="font-bold text-xs text-ink-primary font-mono-tech">
                      RESOLVE & EXPORT S3 POSTMORTEM
                    </span>
                  </div>
                  {incident.status === 'RESOLVED' && (
                    <span className="flex items-center space-x-1 text-[10px] font-mono-tech text-success font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>RESOLVED</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-ink-secondary mb-3 leading-relaxed">
                  Closes the incident, compiles a blameless 5-whys retrospective with preventative
                  action tickets, and uploads to Amazon S3.
                </p>

                <button
                  onClick={handleResolveIncident}
                  disabled={resolveLoading || incident.status === 'RESOLVED'}
                  className="w-full py-2 px-3 bg-ink-primary hover:bg-black disabled:opacity-50 text-canvas text-xs font-semibold rounded-xs transition-editorial flex items-center justify-center space-x-2"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-accent" />
                  <span>
                    {resolveLoading
                      ? 'Compiling Postmortem...'
                      : incident.status === 'RESOLVED'
                      ? 'Incident Resolved (Postmortem Ready)'
                      : 'Mark Incident Resolved & Generate Postmortem'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Evidence Modal */}
      <AnimatePresence>
        {selectedEvidence && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-canvas border border-surface-border rounded-sm max-w-2xl w-full p-6 shadow-pleurat-1 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="font-mono-tech font-bold text-xs text-ink-primary">
                    EVIDENCE CITATION INSPECTION
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEvidence(null)}
                  className="text-ink-tertiary hover:text-ink-primary font-mono-tech text-xs"
                >
                  ✕ CLOSE
                </button>
              </div>

              <div className="space-y-3 font-mono-tech text-xs">
                <div>
                  <span className="text-ink-tertiary">DOCUMENT: </span>
                  <span className="font-bold text-ink-primary">
                    {selectedEvidence.documentTitle}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary">SOURCE S3 URI: </span>
                  <span className="text-ink-secondary">{selectedEvidence.sourceUri}</span>
                </div>
                <div>
                  <span className="text-ink-tertiary">RELEVANCE SCORE: </span>
                  <span className="font-bold text-success">
                    {Math.round(selectedEvidence.relevanceScore * 100)}% Match
                  </span>
                </div>

                <div className="mt-4 p-4 bg-surface-strong/70 border border-surface-border rounded-xs">
                  <div className="text-[10px] text-ink-tertiary mb-1">GROUNDED PASSAGE</div>
                  <p className="font-sans text-xs text-ink-primary leading-relaxed">
                    {selectedEvidence.snippet}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cryptographic HITL Approval Modal */}
      <AnimatePresence>
        {isApprovalModalOpen && activePlan && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-canvas border border-surface-border rounded-sm max-w-xl w-full p-6 shadow-pleurat-1"
            >
              <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span className="font-mono-tech font-bold text-xs text-ink-primary uppercase tracking-wider">
                    Cryptographic Human-in-the-Loop Sign-off
                  </span>
                </div>
                <button
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="text-ink-tertiary hover:text-ink-primary font-mono-tech text-xs"
                >
                  ✕ CANCEL
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-amber-light/70 border border-amber-accent/50 rounded-xs text-xs font-mono-tech">
                  <div className="font-bold text-ink-primary mb-1">
                    ⚠ SECURITY INVARIANT ENFORCEMENT
                  </div>
                  <div className="text-ink-secondary text-[11px] leading-relaxed">
                    AI models cannot directly mutate AWS infrastructure. Execution requires an
                    authenticated Incident Commander role and a single-use signed nonce.
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono-tech">
                  <div className="flex justify-between border-b border-surface-border py-1">
                    <span className="text-ink-tertiary">TARGET ACTION:</span>
                    <span className="font-bold text-ink-primary">
                      rollback_ecs_task_definition
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-surface-border py-1">
                    <span className="text-ink-tertiary">TARGET REVISION:</span>
                    <span className="text-ink-primary">payment-checkout-service:48</span>
                  </div>
                  <div className="flex justify-between border-b border-surface-border py-1">
                    <span className="text-ink-tertiary">COMMANDER IDENTITY:</span>
                    <span className="text-ink-primary">{incident.commander}</span>
                  </div>
                  <div className="flex justify-between border-b border-surface-border py-1">
                    <span className="text-ink-tertiary">TOKEN TTL:</span>
                    <span className="text-success font-bold">300 SECONDS</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={() => setIsApprovalModalOpen(false)}
                    className="flex-1 py-2 border border-surface-border hover:bg-surface-subtle text-ink-secondary text-xs font-mono-tech rounded-xs"
                  >
                    Reject Action
                  </button>
                  <button
                    onClick={() => handleApproveAction(activePlan.actions[0])}
                    disabled={approvalLoading}
                    className="flex-1 py-2 bg-amber-accent hover:bg-amber-hover text-ink-primary text-xs font-mono-tech font-bold rounded-xs shadow-pleurat-button transition-editorial"
                  >
                    {approvalLoading ? 'Verifying & Executing...' : 'Sign & Authorize Execution ↗'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* S3 Postmortem Modal */}
      <AnimatePresence>
        {isPostmortemModalOpen && postmortemData && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-canvas border border-surface-border rounded-sm max-w-3xl w-full p-6 shadow-pleurat-1 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-success" />
                  <span className="font-mono-tech font-bold text-xs text-ink-primary">
                    GENERATED POSTMORTEM REPORT (AMAZON S3)
                  </span>
                </div>
                <button
                  onClick={() => setIsPostmortemModalOpen(false)}
                  className="text-ink-tertiary hover:text-ink-primary font-mono-tech text-xs"
                >
                  ✕ CLOSE
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-surface-strong/70 border border-surface-border rounded-xs">
                  <h3 className="font-bold text-base text-ink-primary font-sans mb-1">
                    {postmortemData.title}
                  </h3>
                  <p className="text-xs text-ink-secondary font-sans leading-relaxed">
                    {postmortemData.executiveSummary}
                  </p>
                </div>

                <div>
                  <h4 className="font-mono-tech font-bold text-xs text-ink-primary mb-2">
                    5-WHYS ROOT CAUSE ANALYSIS
                  </h4>
                  <p className="text-xs text-ink-secondary font-sans leading-relaxed bg-canvas p-3 border border-surface-border rounded-xs">
                    {postmortemData.rootCauseAnalysis}
                  </p>
                </div>

                <div>
                  <h4 className="font-mono-tech font-bold text-xs text-ink-primary mb-2">
                    PREVENTATIVE REMEDIATION TICKETS
                  </h4>
                  <div className="space-y-2">
                    {postmortemData.preventativeItems?.map((item: any) => (
                      <div
                        key={item.ticketId}
                        className="p-2.5 bg-canvas border border-surface-border rounded-xs flex items-center justify-between text-xs font-mono-tech"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 bg-amber-light text-ink-primary font-bold rounded">
                            {item.ticketId}
                          </span>
                          <span className="text-ink-secondary">{item.action}</span>
                        </div>
                        <span className="text-ink-tertiary text-[10px]">OWNER: {item.owner}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-border flex justify-end">
                  <a
                    href={bundle.incident.postmortemUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-amber-accent hover:bg-amber-hover text-ink-primary text-xs font-mono-tech font-bold rounded-xs flex items-center space-x-2 shadow-pleurat-button"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Presigned S3 Markdown ↗</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
