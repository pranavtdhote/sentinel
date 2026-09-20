'use client';

import React from 'react';
import { ActionPlanRecord, ActionItem } from '@/lib/types/database';
import { ShieldAlert, CheckCircle2, Clock, Play, AlertTriangle, ShieldCheck, Terminal, ArrowRight } from 'lucide-react';

interface ActionPlanViewProps {
  plan: ActionPlanRecord;
  onApproveAction?: (action: ActionItem) => void;
  approvingActionId?: string | null;
  disabled?: boolean;
}

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({
  plan,
  onApproveAction,
  approvingActionId,
  disabled = false,
}) => {
  const getRiskBadge = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (risk) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-xs font-mono-tech text-[10px] font-bold bg-danger/10 text-danger border border-danger/30 flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3" />
            <span>RISK: HIGH</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-xs font-mono-tech text-[10px] font-bold bg-amber-accent/15 text-amber-900 border border-amber-accent/30 flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>RISK: MEDIUM</span>
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2 py-0.5 rounded-xs font-mono-tech text-[10px] font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3" />
            <span>RISK: LOW</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: ActionItem['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 rounded-xs font-mono-tech text-[10px] font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>EXECUTED</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-xs font-mono-tech text-[10px] font-bold bg-blue-500/15 text-blue-800 border border-blue-500/30 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-blue-700" />
            <span>APPROVED</span>
          </span>
        );
      case 'EXECUTING':
        return (
          <span className="px-2 py-0.5 rounded-xs font-mono-tech text-[10px] font-bold bg-amber-accent/20 text-amber-900 border border-amber-accent/40 flex items-center space-x-1 animate-pulse">
            <Play className="w-3 h-3 text-amber-700" />
            <span>EXECUTING</span>
          </span>
        );
      case 'PENDING_APPROVAL':
      default:
        return (
          <span className="px-2 py-0.5 rounded-xs font-mono-tech text-[10px] font-bold bg-surface-subtle text-ink-secondary border border-surface-border flex items-center space-x-1">
            <Clock className="w-3 h-3 text-ink-tertiary" />
            <span>PENDING APPROVAL</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Plan Header Summary Card */}
      <div className="bg-canvas border border-surface-border rounded-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border/60 pb-3">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-[10px] text-ink-tertiary">
              <span className="bg-amber-accent/20 px-1.5 py-0.2 rounded font-bold text-amber-900">
                BEDROCK PLAN
              </span>
              <span>ID: {plan.planId}</span>
              <span>MODEL: {plan.generatedByModel || 'Claude 3.5 Sonnet'}</span>
            </div>
            <h4 className="text-sm font-bold text-ink-primary font-sans mt-1">
              Autonomous Remediation Strategy
            </h4>
          </div>

          <div className="flex items-center space-x-2">
            {getRiskBadge(plan.blastRadiusRisk || 'MEDIUM')}
            <span className="font-mono-tech text-[10px] text-ink-tertiary">
              EST: {plan.estimatedMitigationTime || '8-12m'}
            </span>
          </div>
        </div>

        <p className="text-xs text-ink-secondary font-sans mt-3 leading-relaxed">
          {plan.summary || 'Generated operational runbook steps verified against enterprise SOPs.'}
        </p>

        {plan.blastRadiusDetail && (
          <div className="mt-3 p-2.5 bg-surface-subtle/50 rounded border border-surface-border/60 text-xs font-sans text-ink-secondary flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong className="text-ink-primary font-medium">Blast Radius Analysis:</strong>{' '}
              {plan.blastRadiusDetail}
            </span>
          </div>
        )}
      </div>

      {/* Ordered Steps */}
      <div className="space-y-3">
        {plan.actions.map((action, idx) => {
          const stepNumber = String(action.order || idx + 1).padStart(2, '0');
          const isPending = action.status === 'PENDING_APPROVAL';
          const isApproving = approvingActionId === action.actionId;

          // Determine individual step risk
          const stepRisk: 'LOW' | 'MEDIUM' | 'HIGH' = action.requiresApproval
            ? plan.blastRadiusRisk === 'HIGH'
              ? 'HIGH'
              : 'MEDIUM'
            : 'LOW';

          return (
            <div
              key={action.actionId}
              className={`bg-canvas border rounded-sm p-4 transition-all duration-200 ${
                isPending && action.requiresApproval
                  ? 'border-amber-accent/60 shadow-sm'
                  : 'border-surface-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Step number & details */}
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-8 h-8 rounded bg-surface-subtle border border-surface-border flex items-center justify-center font-mono-tech text-xs font-bold text-ink-primary shrink-0">
                    {stepNumber}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tech text-[10px] font-bold text-ink-primary px-1.5 py-0.5 rounded bg-surface-subtle border border-surface-border flex items-center space-x-1">
                        <Terminal className="w-3 h-3 text-ink-tertiary" />
                        <span>{action.toolName}</span>
                      </span>

                      {getRiskBadge(stepRisk)}
                      {getStatusBadge(action.status)}

                      {action.requiresApproval && (
                        <span className="font-mono-tech text-[10px] text-amber-900 bg-amber-accent/20 px-1.5 py-0.5 rounded font-bold">
                          HUMAN APPROVAL REQUIRED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-ink-primary font-sans leading-relaxed">
                      {action.description}
                    </p>

                    {/* Parameters if present */}
                    {action.parameters && Object.keys(action.parameters).length > 0 && (
                      <div className="mt-2 p-2 bg-surface-subtle rounded text-[11px] font-mono-tech text-ink-tertiary overflow-x-auto">
                        <span className="text-ink-secondary">PARAMS: </span>
                        {JSON.stringify(action.parameters)}
                      </div>
                    )}

                    {/* Result summary if executed */}
                    {action.resultSummary && (
                      <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs font-sans text-emerald-900 flex items-start space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{action.resultSummary}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Approval Trigger */}
                {action.requiresApproval && isPending && onApproveAction && (
                  <div className="sm:shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      disabled={disabled || isApproving}
                      onClick={() => onApproveAction(action)}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs font-bold rounded-xs shadow-pleurat-button transition-editorial flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <span>{isApproving ? 'AUTHORIZING...' : 'APPROVE & EXECUTE'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
