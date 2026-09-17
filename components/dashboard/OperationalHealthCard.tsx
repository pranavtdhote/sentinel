'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Shield, Server, Database, Cloud } from 'lucide-react';

export const OperationalHealthCard: React.FC = () => {
  const services = [
    {
      name: 'Amazon Bedrock Runtime',
      region: 'us-east-1',
      status: 'OPERATIONAL',
      metric: '99.98% availability',
      icon: Cloud,
    },
    {
      name: 'Bedrock Knowledge Bases',
      region: 'OpenSearch Serverless',
      status: 'SYNCED',
      metric: '48 indexed chunks',
      icon: Database,
    },
    {
      name: 'Amazon DynamoDB',
      region: 'sentinel-records',
      status: 'HEALTHY',
      metric: '< 6ms p99 read/write',
      icon: Server,
    },
    {
      name: 'Isolated Tool Runner',
      region: 'IAM Role Restricted',
      status: 'ARMED',
      metric: 'HITL Cryptographic Nonce Gate Active',
      icon: Shield,
    },
  ];

  return (
    <Card className="hover:border-ink-secondary transition-editorial">
      <CardHeader className="pb-3 border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-success" />
            <CardTitle className="text-base font-bold">AWS Operational Health</CardTitle>
          </div>
          <span className="font-mono-tech text-[10px] text-success font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ALL SYSTEMS MONITORED</span>
          </span>
        </div>
        <CardDescription className="text-xs mt-0.5">
          Health and latency telemetry across AWS managed serverless components
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-surface-border font-mono-tech text-xs">
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <div key={svc.name} className="p-3.5 flex items-center justify-between hover:bg-surface-subtle/30 transition-editorial">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-surface-strong rounded-xs text-ink-primary">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-ink-primary font-sans text-xs">{svc.name}</div>
                  <div className="text-[10px] text-ink-tertiary">{svc.region}</div>
                </div>
              </div>

              <div className="text-right">
                <Badge variant="success">{svc.status}</Badge>
                <div className="text-[10px] text-ink-tertiary mt-0.5">{svc.metric}</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
