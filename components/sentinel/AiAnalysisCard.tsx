'use client';

import React from 'react';
import { Sparkles, Cpu, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { IncidentTriageOutput } from '@/backend/ai/validators';
import { IncidentRecord, EvidenceRecord } from '@/lib/types/database';

export interface AiAnalysisCardProps {
  triage?: Partial<IncidentTriageOutput> | null;
  incident?: IncidentRecord;
  evidence?: EvidenceRecord[];
  severity?: string;
  category?: string;
  slaMinutes?: number;
  modelName?: string;
  isLoading?: boolean;
  isTriaging?: boolean;
  onTriggerTriage?: () => void;
  className?: string;
}

export const AiAnalysisCard: React.FC<AiAnalysisCardProps> = ({
  triage,
  incident,
  evidence,
  severity,
  category,
  slaMinutes = 15,
  modelName = 'Amazon Bedrock (Claude 3.5 Sonnet)',
  isLoading = false,
  isTriaging = false,
  onTriggerTriage,
  className = '',
}) => {
  const effectiveLoading = isLoading || isTriaging;
  const activeSeverity = incident ? incident.severity : (severity || 'SEV1');
  const activeCategory = incident ? (incident.category || 'Database / Infrastructure') : (category || 'Database / Infrastructure');
  const activeHypothesis = incident?.rootCauseHypothesis || triage?.rootCauseHypothesis;
  const activeConfidence = incident?.confidenceScore || triage?.confidenceScore || 0.92;
  const confidencePercent = Math.round(activeConfidence * 100);

  if (!activeHypothesis && !effectiveLoading) {
    return (
      <div className={`rounded-sm border border-surface-border bg-canvas p-6 shadow-pleurat-1 text-center space-y-4 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-amber-light text-brand-accent flex items-center justify-center mx-auto border border-amber-accent/40">
          <Sparkles className="w-6 h-6 text-amber-800" />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink-primary font-sans">Autonomous AI Triage Pending</h3>
          <p className="text-xs text-ink-secondary mt-1 font-sans max-w-md mx-auto">
            Sentinel has not yet formulated an evidence-grounded root-cause hypothesis for this incident.
          </p>
        </div>
        {onTriggerTriage && (
          <button
            type="button"
            onClick={onTriggerTriage}
            className="px-4 py-2 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs font-bold rounded-xs shadow-pleurat-button transition-colors inline-flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Formulate Triage Hypothesis</span>
          </button>
        )}
      </div>
    );
  }

  if (effectiveLoading) {
    return (
      <div className={`rounded-sm border border-surface-border bg-canvas p-6 shadow-pleurat-1 space-y-4 animate-pulse ${className}`}>
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="h-4 w-36 bg-surface-strong rounded-xs" />
          <div className="h-4 w-24 bg-surface-strong rounded-xs" />
        </div>
        <div className="space-y-2.5">
          <div className="h-3 w-full bg-surface-subtle rounded-xs" />
          <div className="h-3 w-4/5 bg-surface-subtle rounded-xs" />
          <div className="h-3 w-2/3 bg-surface-subtle rounded-xs" />
        </div>
        <div className="text-[11px] font-mono-tech text-amber-800 font-semibold pt-2 flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Bedrock reasoning over logs & retrieved runbooks...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-sm border border-surface-border bg-canvas p-5 sm:p-6 shadow-pleurat-1 space-y-5 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-xs bg-amber-light text-amber-800 border border-amber-accent/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono-tech font-bold text-ink-primary uppercase tracking-wider flex items-center space-x-1.5">
              <span>Bedrock Triage Synthesis</span>
              <span className="text-ink-muted">·</span>
              <span className="text-amber-800 font-normal">{modelName}</span>
            </div>
            <div className="text-[10px] font-mono-tech text-ink-tertiary">
              GROUNDED IN RETRIEVED S3 RUNBOOKS
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono-tech text-xs">
          <span className="text-ink-tertiary">CONFIDENCE:</span>
          <span className="px-2 py-0.5 rounded-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 font-bold text-xs">
            {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Meta Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-tech text-xs">
        <div className="p-2.5 rounded-xs bg-surface-subtle border border-surface-border">
          <div className="text-[10px] text-ink-tertiary uppercase">Classified Severity</div>
          <div className="mt-1">
            <SeverityBadge severity={activeSeverity} size="sm" />
          </div>
        </div>

        <div className="p-2.5 rounded-xs bg-surface-subtle border border-surface-border">
          <div className="text-[10px] text-ink-tertiary uppercase">Target SLA</div>
          <div className="font-bold text-ink-primary mt-1 font-sans">{slaMinutes} Minutes</div>
        </div>

        <div className="p-2.5 rounded-xs bg-surface-subtle border border-surface-border">
          <div className="text-[10px] text-ink-tertiary uppercase">Category</div>
          <div className="font-bold text-ink-primary mt-1 truncate font-sans" title={activeCategory}>
            {activeCategory}
          </div>
        </div>

        <div className="p-2.5 rounded-xs bg-surface-subtle border border-surface-border">
          <div className="text-[10px] text-ink-tertiary uppercase">Strategy</div>
          <div className="font-bold text-amber-800 mt-1 truncate font-mono-tech text-[11px]">
            {triage?.recommendedStrategy || 'ROLLBACK & RECYCLE'}
          </div>
        </div>
      </div>

      {/* Root Cause Hypothesis */}
      <div>
        <div className="text-[10px] font-mono-tech font-semibold uppercase tracking-wider text-ink-tertiary mb-1.5 flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          <span>Root-Cause Hypothesis</span>
        </div>
        <p className="text-sm text-ink-primary font-sans leading-relaxed font-semibold bg-surface-subtle/40 p-3.5 rounded-xs border border-surface-border">
          {activeHypothesis}
        </p>
      </div>

      {/* Technical Summary & Impact */}
      <div className="space-y-3 font-sans text-xs">
        {triage?.primaryImpact && (
          <div>
            <span className="font-mono-tech text-[10px] uppercase font-bold text-ink-tertiary block mb-0.5">
              Customer & Operational Impact
            </span>
            <p className="text-ink-secondary leading-relaxed">{triage.primaryImpact}</p>
          </div>
        )}

        {triage?.technicalSummary && (
          <div>
            <span className="font-mono-tech text-[10px] uppercase font-bold text-ink-tertiary block mb-0.5">
              Technical Summary
            </span>
            <p className="text-ink-secondary leading-relaxed font-mono-tech text-[11px] bg-canvas p-2.5 rounded-xs border border-surface-border">
              {triage.technicalSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
