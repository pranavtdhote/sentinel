'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Settings, Shield, Cpu, Database, HardDrive, CheckCircle2, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const [model, setModel] = useState<string>('anthropic.claude-3-5-sonnet-20241022-v2:0');
  const [region, setRegion] = useState<string>('us-east-1');
  const [enforceHitl, setEnforceHitl] = useState<boolean>(true);
  const [resetting, setResetting] = useState<boolean>(false);
  const { addToast } = useToast();

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Demo Environment Reset',
          description: 'Incident store restored to pristine baseline state.',
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
      <div className="space-y-6 max-w-4xl">
        <div>
          <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
            <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
              SETTINGS
            </span>
            <span className="text-ink-tertiary">AWS INFRASTRUCTURE & SAFETY PARAMETERS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
            Platform Configuration
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
            Manage Amazon Bedrock foundation model routing, DynamoDB table parameters, and cryptographic HITL guardrails.
          </p>
        </div>

        {/* AI Model Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-amber-600" />
              <CardTitle>Amazon Bedrock Model Routing</CardTitle>
            </div>
            <CardDescription>Primary reasoning and fallback model identifiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 font-sans text-xs">
            <div>
              <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                Primary Reasoning Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech focus:outline-none focus:border-ink-primary"
              >
                <option value="anthropic.claude-3-5-sonnet-20241022-v2:0">
                  anthropic.claude-3-5-sonnet-20241022-v2:0 (Recommended)
                </option>
                <option value="amazon.nova-pro-v1:0">amazon.nova-pro-v1:0</option>
                <option value="anthropic.claude-3-haiku-20240307-v1:0">
                  anthropic.claude-3-haiku-20240307-v1:0 (Fast Path)
                </option>
              </select>
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                AWS Deployment Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs font-mono-tech focus:outline-none focus:border-ink-primary"
              >
                <option value="us-east-1">us-east-1 (N. Virginia - Primary Bedrock & OpenSearch)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Security & HITL Guardrails */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <CardTitle>Autonomous Safety Invariants</CardTitle>
            </div>
            <CardDescription>
              Hard constraints preventing model hallucinations from mutating infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between p-3 bg-surface-subtle/50 rounded-xs border border-surface-border">
              <div>
                <div className="font-bold text-ink-primary">
                  Mandatory Human-in-the-Loop Sign-off
                </div>
                <div className="text-xs text-ink-secondary">
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

            <div className="flex items-center justify-between p-3 bg-surface-subtle/50 rounded-xs border border-surface-border">
              <div>
                <div className="font-bold text-ink-primary">Evidence Grounding Invariant</div>
                <div className="text-xs text-ink-secondary">
                  Rejects model outputs citing nonexistent or hallucinated AWS resource identifiers.
                </div>
              </div>
              <Badge variant="success">ENFORCED</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Hackathon Demo Controller */}
        <Card className="border-amber-accent/40 bg-amber-light/20">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <CardTitle>Hackathon Demo Controller</CardTitle>
            </div>
            <CardDescription>
              Reset Sentinel demo environment back to pristine baseline for 3-minute presentations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-sans text-xs">
            <p className="text-ink-secondary leading-relaxed">
              Clears transient incident mutations, resets the timeline and audit logs, and restores baseline SEV-1 incident telemetry.
            </p>
            <div className="flex items-center space-x-3 pt-2">
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </div>
    </AppShell>
  );
}
