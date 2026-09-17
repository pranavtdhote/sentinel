'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const RecurringPatternCard: React.FC = () => {
  return (
    <Card className="hover:border-ink-secondary transition-editorial border-amber-accent/40 bg-amber-light/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-amber-700" />
            <CardTitle className="text-base font-bold text-ink-primary">
              Bedrock Pattern Detection: Recurring Issue
            </CardTitle>
          </div>
          <Badge variant="amber">3× IN 30 DAYS</Badge>
        </div>
        <CardDescription className="text-xs text-ink-secondary">
          Autonomous correlation across historical S3 postmortems and DynamoDB audit records
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 font-mono-tech text-xs">
        <div className="p-3 bg-canvas border border-surface-border rounded-xs">
          <div className="font-bold text-ink-primary text-xs font-sans mb-1">
            PostgreSQL Connection Pool Exhaustion Pattern
          </div>
          <p className="text-xs text-ink-secondary font-sans leading-relaxed">
            Bedrock correlated three SEV-1/SEV-2 incidents over the past month (<code className="text-[10px] bg-surface-strong px-1 py-0.5 rounded">inc-0812</code>, <code className="text-[10px] bg-surface-strong px-1 py-0.5 rounded">inc-0902</code>, <code className="text-[10px] bg-surface-strong px-1 py-0.5 rounded">inc-0917-01</code>). In each event, a production deployment introduced an unindexed foreign-key join on table <code className="text-[10px] bg-surface-strong px-1 py-0.5 rounded">orders</code>, saturating maximum connection pool limits within 4 minutes.
          </p>
        </div>

        {/* Actionable Recommendations */}
        <div className="space-y-2">
          <div className="text-[10px] text-ink-tertiary uppercase tracking-wider font-bold">
            RECOMMENDED PREVENTATIVE REMEDIATION
          </div>

          <div className="p-2.5 bg-canvas border border-surface-border rounded-xs flex items-center justify-between">
            <div>
              <div className="font-bold text-ink-primary font-sans text-xs">
                Provision Amazon RDS Proxy
              </div>
              <div className="text-[11px] text-ink-secondary font-sans">
                Pool and multiplex connections to prevent client-side pool exhaustion surges.
              </div>
            </div>
            <Link
              href="/knowledge"
              className="text-amber-850 hover:underline text-[10px] font-bold flex items-center space-x-0.5 shrink-0"
            >
              <span>View ADR</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-2.5 bg-canvas border border-surface-border rounded-xs flex items-center justify-between">
            <div>
              <div className="font-bold text-ink-primary font-sans text-xs">
                Pre-Deployment Migration Schema Linter
              </div>
              <div className="text-[11px] text-ink-secondary font-sans">
                Block PRs containing foreign key declarations without matching composite index.
              </div>
            </div>
            <span className="text-[10px] text-success font-bold flex items-center space-x-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TICKET REL-402</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
