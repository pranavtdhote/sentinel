'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Terminal, Cpu, Sparkles, CheckCircle2, ShieldAlert, Clock, FileText } from 'lucide-react';

interface ToolActivityItem {
  id: string;
  tool: string;
  timestamp: string;
  status: 'SUCCESS' | 'REQUIRES_APPROVAL' | 'FAILED' | 'UNAUTHORIZED';
  resultSummary: string;
  evidenceCount: number;
  awsRequestId: string;
  durationMs: number;
  model: string;
}

export default function AiActivityPage() {
  const [activities, setActivities] = useState<ToolActivityItem[]>([
    {
      id: 'act-01',
      tool: 'searchOperationalKnowledge',
      timestamp: '2026-09-17 10:15:02 UTC',
      status: 'SUCCESS',
      resultSummary: 'Retrieved 2 knowledge chunks from Bedrock Knowledge Base (Aurora pool runbook & retrospective).',
      evidenceCount: 2,
      awsRequestId: 'req-kb-842dfa-1726568102',
      durationMs: 340,
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    },
    {
      id: 'act-02',
      tool: 'getResources',
      timestamp: '2026-09-17 10:15:18 UTC',
      status: 'SUCCESS',
      resultSummary: 'Discovered 5 active AWS resources for payment-checkout-service (ECS cluster, ALB target group, RDS Aurora).',
      evidenceCount: 5,
      awsRequestId: 'req-res-391abc-1726568118',
      durationMs: 120,
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    },
    {
      id: 'act-03',
      tool: 'createActionPlan',
      timestamp: '2026-09-17 10:15:42 UTC',
      status: 'REQUIRES_APPROVAL',
      resultSummary: 'Generated mitigation plan plan-481023 (Rollback ECS task definition to revision 48). Human sign-off required.',
      evidenceCount: 2,
      awsRequestId: 'req-plan-7109ff-1726568142',
      durationMs: 890,
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    },
    {
      id: 'act-04',
      tool: 'sendIncidentNotification',
      timestamp: '2026-09-17 10:16:05 UTC',
      status: 'SUCCESS',
      resultSummary: 'Dispatched URGENT alert to Amazon SNS topic sentinel-incident-alerts.',
      evidenceCount: 1,
      awsRequestId: 'req-sns-119c4d-1726568165',
      durationMs: 95,
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    },
    {
      id: 'act-05',
      tool: 'generateResolutionReport',
      timestamp: '2026-09-17 10:22:15 UTC',
      status: 'SUCCESS',
      resultSummary: 'Published postmortem retrospective to S3 bucket sentinel-reports-prod/postmortems/inc-01.md.',
      evidenceCount: 4,
      awsRequestId: 'req-rep-502a11-1726568535',
      durationMs: 1420,
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    },
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
            <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
              AI AGENT ACTIVITY
            </span>
            <span className="text-ink-tertiary">TOOL EXECUTION & GROUNDED AUDIT TIMELINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
            AI Tool Activity & Execution Timeline
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
            Grounded operational tools invoked by Amazon Bedrock. Every execution is audited without exposing private reasoning.
          </p>
        </div>

        {/* Timeline List */}
        <div className="space-y-4">
          {activities.map((act) => (
            <Card key={act.id} className="font-mono-tech text-xs">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-ink-primary font-mono text-sm">
                      {act.tool}()
                    </span>
                    <span className="text-[10px] text-ink-tertiary">({act.id})</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {act.status === 'SUCCESS' && (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        SUCCESS
                      </Badge>
                    )}
                    {act.status === 'REQUIRES_APPROVAL' && (
                      <Badge variant="amber">
                        <ShieldAlert className="w-3 h-3 mr-1" />
                        REQUIRES APPROVAL
                      </Badge>
                    )}
                    {act.status === 'FAILED' && (
                      <Badge variant="destructive">FAILED</Badge>
                    )}
                  </div>
                </div>

                {/* Result Summary */}
                <div className="p-3 bg-surface-subtle/50 rounded-xs border border-surface-border mb-3 font-sans text-xs text-ink-primary">
                  <span className="font-bold font-mono text-[10px] text-ink-tertiary block mb-0.5">
                    RESULT SUMMARY
                  </span>
                  {act.resultSummary}
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-ink-secondary pt-2 border-t border-surface-border">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-ink-tertiary" />
                    <span>{act.timestamp}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-ink-tertiary" />
                    <span>Evidence Count: <strong className="text-ink-primary">{act.evidenceCount}</strong></span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-ink-tertiary" />
                    <span>Duration: <strong className="text-ink-primary">{act.durationMs}ms</strong></span>
                  </div>

                  <div className="text-right truncate">
                    <span className="text-[10px] text-ink-tertiary">AWS ID: {act.awsRequestId}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
