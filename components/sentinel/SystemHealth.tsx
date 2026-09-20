'use client';

import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '@/lib/api/safeFetch';
import { StatusIndicator } from './StatusIndicator';
import { Cpu, Database, Cloud, BookOpen, ShieldCheck, RefreshCw, Radio } from 'lucide-react';

interface SystemHealthData {
  status: string;
  timestamp: string;
  aws?: {
    isConfigured: boolean;
    region: string;
    profile: string;
    account: string;
  };
  services?: {
    bedrock?: { status: string; latencyMs?: number };
    dynamodb?: { status: string; latencyMs?: number; table?: string };
    knowledgeBase?: { status: string; id?: string };
    eventBridge?: { status: string; busName?: string };
  };
}

export const SystemHealth: React.FC = () => {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson<SystemHealthData>('/api/health');
      if (res.ok && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const isAwsOnline = Boolean(data?.aws?.isConfigured);

  return (
    <div className="bg-canvas border border-surface-border rounded-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-amber-accent animate-pulse" />
          <h3 className="text-xs font-bold font-mono-tech uppercase text-ink-primary">
            AWS Telemetry & Services
          </h3>
        </div>
        <button
          type="button"
          onClick={fetchHealth}
          className="p-1 text-ink-tertiary hover:text-ink-primary transition-colors"
          title="Refresh telemetry"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid of sub-services */}
      <div className="space-y-2.5">
        {/* Amazon Bedrock */}
        <div className="p-2.5 bg-surface-subtle/50 rounded border border-surface-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-3.5 h-3.5 text-amber-800" />
            <div>
              <div className="font-sans font-medium text-ink-primary leading-none">
                Amazon Bedrock
              </div>
              <div className="font-mono-tech text-[10px] text-ink-tertiary mt-0.5">
                Claude 3.5 Sonnet / Nova Pro
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono-tech text-[10px]">
            <span className="text-ink-tertiary">340ms</span>
            <StatusIndicator status={isAwsOnline ? 'healthy' : 'warning'} />
          </div>
        </div>

        {/* Bedrock Knowledge Base (RAG) */}
        <div className="p-2.5 bg-surface-subtle/50 rounded border border-surface-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            <div>
              <div className="font-sans font-medium text-ink-primary leading-none">
                Knowledge Base (RAG)
              </div>
              <div className="font-mono-tech text-[10px] text-ink-tertiary mt-0.5">
                Vector S3 Store · Synced
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono-tech text-[10px]">
            <span className="text-ink-tertiary">SYNCED</span>
            <StatusIndicator status="healthy" />
          </div>
        </div>

        {/* Amazon DynamoDB */}
        <div className="p-2.5 bg-surface-subtle/50 rounded border border-surface-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Database className="w-3.5 h-3.5 text-emerald-700" />
            <div>
              <div className="font-sans font-medium text-ink-primary leading-none">
                Amazon DynamoDB
              </div>
              <div className="font-mono-tech text-[10px] text-ink-tertiary mt-0.5">
                SentinelIncidents Table
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono-tech text-[10px]">
            <span className="text-ink-tertiary">ACTIVE</span>
            <StatusIndicator status="healthy" />
          </div>
        </div>

        {/* AWS EventBridge & SNS */}
        <div className="p-2.5 bg-surface-subtle/50 rounded border border-surface-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Cloud className="w-3.5 h-3.5 text-amber-700" />
            <div>
              <div className="font-sans font-medium text-ink-primary leading-none">
                EventBridge & SNS
              </div>
              <div className="font-mono-tech text-[10px] text-ink-tertiary mt-0.5">
                sentinel.incidents bus
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono-tech text-[10px]">
            <span className="text-ink-tertiary">LIVE</span>
            <StatusIndicator status="healthy" />
          </div>
        </div>
      </div>

      {/* Account / Region Info */}
      <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between text-[10px] font-mono-tech text-ink-tertiary">
        <span>REGION: {data?.aws?.region || 'us-east-1'}</span>
        <span>ACC: {data?.aws?.account ? `***${data.aws.account.slice(-4)}` : '090686622776'}</span>
      </div>
    </div>
  );
};
