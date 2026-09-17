'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';

export default function KnowledgePage() {
  const [search, setSearch] = useState<string>('');

  const runbooks = [
    {
      id: 'rb-01',
      title: 'Aurora PostgreSQL Connection Pool Recovery',
      uri: 's3://sentinel-runbooks-prod/payments/aurora-connection-leak.md',
      service: 'payment-checkout-service',
      lastIndexed: '2026-09-17 08:30 UTC',
      chunks: 8,
      status: 'INDEXED_HEALTHY',
      summary:
        'Mitigation procedures for max_connections saturation on RDS Aurora clusters. Specifies automated ECS task definition rollback and connection drain steps.',
    },
    {
      id: 'rb-02',
      title: 'Amazon ECS Task Rollback Procedure',
      uri: 's3://sentinel-runbooks-prod/ecs/task-definition-rollback.md',
      service: 'global-ecs-services',
      lastIndexed: '2026-09-16 14:15 UTC',
      chunks: 6,
      status: 'INDEXED_HEALTHY',
      summary:
        'Step-by-step rollback procedure using AWS SDK to revert ECS service task definition revisions without dropping active TCP connections.',
    },
    {
      id: 'rb-03',
      title: 'DynamoDB Hot Partition Throttling Mitigation',
      uri: 's3://sentinel-runbooks-prod/dynamodb/partition-throttling.md',
      service: 'data-persistence',
      lastIndexed: '2026-09-15 11:00 UTC',
      chunks: 5,
      status: 'INDEXED_HEALTHY',
      summary:
        'Runbook covering partition key salting and write sharding to eliminate ProvisionedThroughputExceededException events.',
    },
  ];

  const filtered = runbooks.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.service.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                KNOWLEDGE BASE
              </span>
              <span className="text-ink-tertiary">AMAZON BEDROCK · OPENSEARCH SERVERLESS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Engineering Runbooks & ADRs
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Vectorized technical documentation ingested into Bedrock Knowledge Bases for zero-hallucination RAG grounding.
            </p>
          </div>

          <div className="font-mono-tech text-xs text-right hidden sm:block">
            <div className="text-ink-tertiary">EMBEDDING MODEL</div>
            <div className="font-bold text-ink-primary">amazon.titan-embed-text-v2:0</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
          <input
            type="text"
            placeholder="Search runbooks by title, service, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-canvas border border-surface-border rounded-xs text-xs font-sans text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-ink-primary"
          />
        </div>

        {/* Runbook List */}
        <div className="space-y-4">
          {filtered.map((rb) => (
            <Card key={rb.id} className="hover:border-ink-secondary transition-editorial">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-base font-sans text-ink-primary">{rb.title}</h3>
                  </div>
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {rb.status}
                  </Badge>
                </div>

                <p className="text-xs text-ink-secondary leading-relaxed font-sans mb-3">
                  {rb.summary}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 font-mono-tech text-[10px] text-ink-tertiary pt-2 border-t border-surface-border">
                  <span>S3 URI: {rb.uri}</span>
                  <span>TARGET SERVICE: {rb.service}</span>
                  <span>VECTOR CHUNKS: {rb.chunks}</span>
                  <span>INDEXED: {rb.lastIndexed}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
