'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, CheckCircle2, Clock } from 'lucide-react';

export const RecentAIActivityFeed: React.FC = () => {
  const activities = [
    {
      id: 'ai-01',
      operation: 'Knowledge Base Vector RAG',
      summary: 'Retrieved 2 runbook chunks with > 90% relevance from s3://sentinel-runbooks-prod/payments/aurora-connection-leak.md',
      model: 'Bedrock Agent Runtime',
      latency: '340 ms',
      time: '2m ago',
    },
    {
      id: 'ai-02',
      operation: 'Root Cause Hypothesis',
      summary: 'Identified Aurora PostgreSQL connection starvation caused by commit 89f4b3c (v2.14.0 unindexed query). Confidence: 94%.',
      model: 'anthropic.claude-3-5-sonnet',
      latency: '1,820 ms',
      time: '3m ago',
    },
    {
      id: 'ai-03',
      operation: 'Blast-Radius Risk Assessment',
      summary: 'Evaluated rollback risk: MEDIUM. 4 container tasks transitioning; connection reset ~1.5s with automatic client retry.',
      model: 'anthropic.claude-3-5-sonnet',
      latency: '1,240 ms',
      time: '5m ago',
    },
    {
      id: 'ai-04',
      operation: 'Postmortem Retrospective',
      summary: 'Synthesized 5-whys root cause analysis and compiled S3 executive postmortem markdown report.',
      model: 'anthropic.claude-3-5-sonnet',
      latency: '2,410 ms',
      time: '12m ago',
    },
  ];

  return (
    <Card className="hover:border-ink-secondary transition-editorial">
      <CardHeader className="pb-3 border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-base font-bold">Recent Bedrock AI Activity</CardTitle>
          </div>
          <span className="font-mono-tech text-[10px] text-ink-tertiary">
            TEMPERATURE: 0.1 · DETERMINISTIC
          </span>
        </div>
        <CardDescription className="text-xs mt-0.5">
          Live trace of model reasoning, vector retrieval, and verification barriers
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-surface-border font-mono-tech text-xs">
        {activities.map((item) => (
          <div key={item.id} className="p-3.5 hover:bg-surface-subtle/40 transition-editorial space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-bold text-ink-primary font-sans text-xs">
                  {item.operation}
                </span>
                <span className="text-[10px] text-ink-tertiary">({item.model})</span>
              </div>
              <span className="text-[10px] text-ink-tertiary flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{item.time}</span>
              </span>
            </div>

            <p className="text-[11px] text-ink-secondary font-sans leading-relaxed">
              {item.summary}
            </p>

            <div className="flex items-center justify-between text-[10px] text-ink-tertiary pt-0.5">
              <span>LATENCY: {item.latency}</span>
              <span className="text-success font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>GROUNDED</span>
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
