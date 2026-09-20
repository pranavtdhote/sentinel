'use client';

import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Zap, Database, Cpu, HardDrive } from 'lucide-react';
import { safeFetchJson } from '@/lib/api/safeFetch';

export const AnalyticsOverview: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    safeFetchJson<any>('/api/analytics')
      .then((res) => {
        if (res.ok && res.data?.success) {
          setData(res.data.data);
        }
      })
      .catch((err) => console.warn('Analytics error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 text-center font-mono-tech text-xs text-ink-tertiary">
        LOADING ANALYTICS METRICS...
      </div>
    );
  }

  return (
    <div id="analytics" className="w-full bg-canvas border border-surface-border rounded-sm p-6 shadow-pleurat-1 my-8">
      <div className="flex items-center justify-between border-b border-surface-border pb-4 mb-6">
        <div>
          <span className="font-mono-tech text-xs bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
            ANALYTICS
          </span>
          <h3 className="text-xl font-bold tracking-tight text-ink-primary font-sans mt-1">
            Operational Reliability & SRE Metrics
          </h3>
        </div>
        <div className="text-right font-mono-tech text-xs text-ink-tertiary">
          <div>PROVISIONED REGION: US-EAST-1</div>
          <div>DYNAMODB: SINGLE-TABLE</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono-tech">
        <div className="p-4 bg-surface-strong/60 border border-surface-border rounded-xs">
          <div className="flex items-center space-x-2 text-xs text-ink-tertiary mb-1">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>AVG MTTD (DETECTION)</span>
          </div>
          <div className="text-2xl font-bold text-ink-primary">{data.avgMttdSeconds}s</div>
          <div className="text-[10px] text-success mt-1">92% faster than alert-noise baseline</div>
        </div>

        <div className="p-4 bg-surface-strong/60 border border-surface-border rounded-xs">
          <div className="flex items-center space-x-2 text-xs text-ink-tertiary mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>AVG MTTM (MITIGATION)</span>
          </div>
          <div className="text-2xl font-bold text-ink-primary">{data.avgMttmMinutes}m</div>
          <div className="text-[10px] text-success mt-1">Automated rollback & verified health</div>
        </div>

        <div className="p-4 bg-surface-strong/60 border border-surface-border rounded-xs">
          <div className="flex items-center space-x-2 text-xs text-ink-tertiary mb-1">
            <Cpu className="w-3.5 h-3.5 text-amber-600" />
            <span>BEDROCK TOKENS</span>
          </div>
          <div className="text-2xl font-bold text-ink-primary">
            {Number(data.bedrockTokensUsed).toLocaleString()}
          </div>
          <div className="text-[10px] text-ink-tertiary mt-1">Claude 3.5 Sonnet & Nova Pro</div>
        </div>

        <div className="p-4 bg-surface-strong/60 border border-surface-border rounded-xs">
          <div className="flex items-center space-x-2 text-xs text-ink-tertiary mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>TOOL RELIABILITY</span>
          </div>
          <div className="text-2xl font-bold text-success">{data.actionSuccessRate}</div>
          <div className="text-[10px] text-ink-tertiary mt-1">Zero ungrounded executions</div>
        </div>
      </div>
    </div>
  );
};
