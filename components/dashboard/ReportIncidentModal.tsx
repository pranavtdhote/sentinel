'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { IncidentSeverity } from '@/lib/types/database';
import { AlertTriangle, Plus, X } from 'lucide-react';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: () => void;
}

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
}) => {
  const [title, setTitle] = useState<string>('');
  const [service, setService] = useState<string>('');
  const [severity, setSeverity] = useState<IncidentSeverity>('SEV1');
  const [category, setCategory] = useState<string>('Database / Storage');
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          service,
          severity,
          category,
          summary,
          commander: 'prana@sentinel.internal',
        }),
      });

      const data = await res.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Incident Ingested',
          description: `Incident ${data.data.incidentId} created with severity ${severity}.`,
        });
        onIncidentCreated();
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Ingestion Error',
          description: data.error?.message || 'Failed to ingest incident.',
        });
      }
    } catch (err) {
      console.error('Incident report error:', err);
      addToast({
        type: 'error',
        title: 'Network Error',
        description: 'Failed to communicate with the Sentinel ingestion API.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-canvas border border-surface-border rounded-sm max-w-lg w-full p-6 shadow-pleurat-1 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-base font-sans text-ink-primary">
              Report & Ingest Outage
            </h3>
          </div>
          <button onClick={onClose} className="text-ink-tertiary hover:text-ink-primary text-xs">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
              Incident Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Webhook Dispatch Timeout Spikes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                Impacted Service
              </label>
              <input
                type="text"
                required
                placeholder="e.g. payment-checkout-service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
              />
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary font-mono-tech"
              >
                <option value="SEV1">SEV-1 (Critical Outage)</option>
                <option value="SEV2">SEV-2 (High Degradation)</option>
                <option value="SEV3">SEV-3 (Medium Impact)</option>
                <option value="SEV4">SEV-4 (Low Impact)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
              Fault Domain Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary font-mono-tech"
            >
              <option value="Database / Storage">Database / Storage</option>
              <option value="Authentication / Cache">Authentication / Cache</option>
              <option value="Messaging / SQS">Messaging / SQS</option>
              <option value="Compute / ECS Task">Compute / ECS Task</option>
              <option value="Network / API Gateway">Network / API Gateway</option>
            </select>
          </div>

          <div>
            <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
              Summary & Telemetry Logs
            </label>
            <textarea
              required
              rows={3}
              placeholder="Paste relevant CloudWatch error logs, alarm metrics, or observed customer impacts..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Ingesting to DynamoDB...' : 'Ingest & Trigger Sentinel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
