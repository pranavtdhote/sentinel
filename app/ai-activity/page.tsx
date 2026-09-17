'use client';

import React from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Terminal, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AiActivityPage() {
  const activities = [
    {
      id: 'inv-01',
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      operation: 'Incident Triage & Root Cause RAG',
      incidentId: 'inc-2026-0917-01',
      latencyMs: 1820,
      inputTokens: 1450,
      outputTokens: 380,
      confidenceScore: 0.94,
      groundedChunks: ['ev-chunk-302', 'ev-chunk-418'],
      timestamp: '2026-09-17 10:15:10 UTC',
      status: 'SUCCESS_GROUNDED',
    },
    {
      id: 'inv-02',
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      operation: 'Mitigation Action Plan Formulation',
      incidentId: 'inc-2026-0917-01',
      latencyMs: 1240,
      inputTokens: 1890,
      outputTokens: 420,
      confidenceScore: 0.91,
      groundedChunks: ['ev-chunk-302'],
      timestamp: '2026-09-17 10:15:45 UTC',
      status: 'SUCCESS_GROUNDED',
    },
    {
      id: 'inv-03',
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      operation: 'Postmortem Retrospective Synthesis',
      incidentId: 'inc-2026-0917-01',
      latencyMs: 2410,
      inputTokens: 2100,
      outputTokens: 650,
      confidenceScore: 0.96,
      groundedChunks: ['ev-chunk-302', 'ev-chunk-418'],
      timestamp: '2026-09-17 10:22:15 UTC',
      status: 'SUCCESS_GROUNDED',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
            <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
              AI ACTIVITY
            </span>
            <span className="text-ink-tertiary">AMAZON BEDROCK AUDIT & TRACE LOGS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
            Model Inference & Prompt Audits
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
            Zero-hallucination verification records, prompt token consumption, and model inference latency.
          </p>
        </div>

        <div className="space-y-4">
          {activities.map((act) => (
            <Card key={act.id} className="font-mono-tech text-xs">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-ink-primary font-sans text-sm">
                      {act.operation}
                    </span>
                    <span className="text-[10px] text-ink-tertiary">({act.id})</span>
                  </div>
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {act.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-surface-subtle/50 rounded-xs border border-surface-border text-xs mb-3">
                  <div>
                    <div className="text-[10px] text-ink-tertiary">MODEL ID</div>
                    <div className="font-bold text-ink-primary truncate">{act.model}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-tertiary">INFERENCE LATENCY</div>
                    <div className="font-bold text-ink-primary">{act.latencyMs} ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-tertiary">TOKEN USAGE</div>
                    <div className="font-bold text-ink-primary">
                      {act.inputTokens} in / {act.outputTokens} out
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-tertiary">GROUNDING SCORE</div>
                    <div className="font-bold text-success">
                      {Math.round(act.confidenceScore * 100)}%
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-tertiary">
                  <span>TARGET INCIDENT: {act.incidentId}</span>
                  <span>GROUNDED CHUNKS: {act.groundedChunks.join(', ')}</span>
                  <span>TIMESTAMP: {act.timestamp}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
