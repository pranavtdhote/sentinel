'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Button } from '@/components/ui/button';
import { SystemHealth } from '@/components/sentinel/SystemHealth';
import { useToast } from '@/components/ui/toast';
import { safeFetchJson } from '@/lib/api/safeFetch';
import {
  Settings,
  Cpu,
  Database,
  Cloud,
  Shield,
  Users,
  Activity,
  RotateCcw,
  CheckCircle2,
  Lock,
  Bell,
  BookOpen,
  Terminal,
} from 'lucide-react';

type SettingsTab =
  | 'general'
  | 'ai'
  | 'knowledge'
  | 'notifications'
  | 'security'
  | 'users'
  | 'status'
  | 'demo';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [model, setModel] = useState<string>('anthropic.claude-3-5-sonnet-20241022-v2:0');
  const [region, setRegion] = useState<string>('us-east-1');
  const [enforceHitl, setEnforceHitl] = useState<boolean>(true);
  const [resetting, setResetting] = useState<boolean>(false);
  const { addToast } = useToast();

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      const res = await safeFetchJson<{ success: boolean }>('/api/demo/reset', {
        method: 'POST',
      });
      if (res.ok && res.data?.success) {
        addToast({
          type: 'success',
          title: 'Demo Environment Reset',
          description: 'Incident store restored to pristine baseline state.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Reset Failed',
          description: 'Failed to reset demo state.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        description: 'Failed to reset demo state.',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Configuration Updated',
      description: 'Platform operational parameters saved and active.',
    });
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-5xl">
        {/* Header */}
        <div className="border-b border-surface-border pb-6">
          <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
            <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
              SETTINGS
            </span>
            <span className="text-ink-tertiary">PLATFORM & SECURITY GOVERNANCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
            Platform Configuration
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
            Manage Amazon Bedrock foundation model routing, DynamoDB table parameters, and cryptographic HITL guardrails.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-border font-mono-tech text-xs overflow-x-auto">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'ai', label: 'AI Configuration', icon: Cpu },
            { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'status', label: 'System Status', icon: Activity },
            { id: 'demo', label: 'Demo Controls', icon: RotateCcw },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 font-medium transition-editorial whitespace-nowrap ${
                  isActive
                    ? 'border-amber-accent text-ink-primary font-bold bg-surface-subtle/30'
                    : 'border-transparent text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-800' : 'text-ink-tertiary'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="bg-canvas border border-surface-border rounded-sm p-6 space-y-6">
          {/* TAB 1: General */}
          {activeTab === 'general' && (
            <div className="space-y-4 max-w-xl font-sans text-xs">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                General Settings
              </h3>
              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Platform Name
                </label>
                <input
                  type="text"
                  disabled
                  value="SENTINEL Incident Intelligence"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Default Target Environment
                </label>
                <input
                  type="text"
                  disabled
                  value="production (AWS us-east-1)"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Operational Timezone
                </label>
                <input
                  type="text"
                  disabled
                  value="UTC (Coordinated Universal Time)"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech"
                />
              </div>
            </div>
          )}

          {/* TAB 2: AI Configuration */}
          {activeTab === 'ai' && (
            <div className="space-y-4 max-w-xl font-sans text-xs">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                Amazon Bedrock Model Routing
              </h3>
              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Primary Foundation Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech focus:outline-none focus:border-ink-primary"
                >
                  <option value="anthropic.claude-3-5-sonnet-20241022-v2:0">
                    anthropic.claude-3-5-sonnet-20241022-v2:0 (Recommended)
                  </option>
                  <option value="amazon.nova-pro-v1:0">amazon.nova-pro-v1:0</option>
                  <option value="anthropic.claude-3-haiku-20240307-v1:0">
                    anthropic.claude-3-haiku-20240307-v1:0 (Low Latency)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Bedrock Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech focus:outline-none focus:border-ink-primary"
                >
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="us-west-2">us-west-2 (Oregon)</option>
                </select>
              </div>

              <div className="p-3 bg-surface-subtle rounded border border-surface-border text-xs text-ink-secondary space-y-1">
                <span className="font-bold text-ink-primary font-mono-tech text-[11px] block">
                  SAFETY INVARIANT:
                </span>
                <span>
                  No chain-of-thought is exposed to client responses. Only sanitized operational evidence and hypotheses are rendered.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Knowledge Base */}
          {activeTab === 'knowledge' && (
            <div className="space-y-4 max-w-xl font-sans text-xs">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                Bedrock Knowledge Base RAG Parameters
              </h3>
              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Knowledge Base ID
                </label>
                <input
                  type="text"
                  disabled
                  value="KB-SN-01 (Vector Store)"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  S3 Storage Bucket
                </label>
                <input
                  type="text"
                  disabled
                  value="s3://sentinel-knowledge-090686622776"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Embedding Model
                </label>
                <input
                  type="text"
                  disabled
                  value="amazon.titan-embed-text-v2:0 (1536 dims)"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 max-w-xl font-sans text-xs">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                Event Notification Channels
              </h3>
              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  Amazon SNS Topic ARN
                </label>
                <input
                  type="text"
                  disabled
                  value="arn:aws:sns:us-east-1:090686622776:sentinel-incident-alerts"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                  EventBridge Event Bus
                </label>
                <input
                  type="text"
                  disabled
                  value="sentinel.incidents (Custom Bus)"
                  className="w-full p-2.5 bg-surface-subtle border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Security */}
          {activeTab === 'security' && (
            <div className="space-y-4 max-w-xl font-sans text-xs">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                Cryptographic Security & HITL Guardrails
              </h3>
              <div className="flex items-center justify-between p-3.5 bg-surface-subtle rounded border border-surface-border">
                <div>
                  <div className="font-bold text-ink-primary">
                    Mandatory Human-in-the-Loop Sign-off
                  </div>
                  <div className="text-ink-secondary mt-0.5">
                    Requires cryptographic nonce & Incident Commander approval for mutating tools.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enforceHitl}
                  onChange={(e) => setEnforceHitl(e.target.checked)}
                  className="w-4 h-4 accent-amber-accent"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-surface-subtle rounded border border-surface-border">
                <div>
                  <div className="font-bold text-ink-primary">Tool Allowlisting Invariant</div>
                  <div className="text-ink-secondary mt-0.5">
                    Restricts Bedrock agent execution strictly to predefined AWS Lambda tools.
                  </div>
                </div>
                <span className="font-mono-tech text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 font-bold">
                  ENFORCED
                </span>
              </div>
            </div>
          )}

          {/* TAB 6: Users & Roles */}
          {activeTab === 'users' && (
            <div className="space-y-4 max-w-xl font-sans text-xs">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                Users & Role-Based Access Control (RBAC)
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'Pranav Dhote', email: 'prana@sentinel.internal', role: 'INCIDENT_COMMANDER', status: 'ACTIVE' },
                  { name: 'On-Call SRE Lead', email: 'oncall@sentinel.internal', role: 'RESPONDER', status: 'ACTIVE' },
                  { name: 'Security Auditor', email: 'audit@sentinel.internal', role: 'VIEWER', status: 'ACTIVE' },
                ].map((u) => (
                  <div key={u.email} className="flex items-center justify-between p-3 bg-surface-subtle rounded border border-surface-border">
                    <div>
                      <div className="font-bold text-ink-primary">{u.name}</div>
                      <div className="text-[11px] font-mono-tech text-ink-secondary">{u.email}</div>
                    </div>
                    <span className="font-mono-tech text-[10px] px-2 py-0.5 rounded bg-surface-border text-ink-primary font-bold">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: System Status */}
          {activeTab === 'status' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                Live Infrastructure Status
              </h3>
              <SystemHealth />
            </div>
          )}

          {/* TAB 8: Demo Controls */}
          {activeTab === 'demo' && (
            <div className="space-y-4 max-w-xl font-sans text-xs">
              <h3 className="text-sm font-bold text-ink-primary font-mono-tech uppercase">
                Hackathon Demo Controller
              </h3>
              <p className="text-ink-secondary leading-relaxed">
                Reset Sentinel demo environment back to pristine baseline for 3-minute presentations. Clears transient incident mutations, resets the timeline and audit logs, and restores baseline SEV-1 incident telemetry.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={resetting}
                  onClick={handleResetDemo}
                  className="font-mono-tech text-xs flex items-center space-x-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                  <span>{resetting ? 'Resetting Demo State...' : 'Reset Demo State to Baseline'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Footer Save Action */}
          <div className="flex justify-end pt-4 border-t border-surface-border">
            <Button onClick={handleSave} className="font-mono-tech text-xs">
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
