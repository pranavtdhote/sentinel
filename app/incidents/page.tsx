'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { IncidentRecord, IncidentSeverity, IncidentStatus } from '@/lib/types/database';
import { AlertTriangle, Plus, Search, Filter, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newService, setNewService] = useState<string>('');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('SEV1');
  const [newSummary, setNewSummary] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const { addToast } = useToast();

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incidents');
      const json = await res.json();
      if (json.success && json.data) {
        setIncidents(json.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          service: newService,
          severity: newSeverity,
          summary: newSummary,
          commander: 'prana@sentinel.internal',
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Incident Created',
          description: `Incident ${data.data.incidentId} ingested and persisted to DynamoDB.`,
        });
        setIsNewModalOpen(false);
        setNewTitle('');
        setNewService('');
        setNewSummary('');
        await fetchIncidents();
      } else {
        addToast({
          type: 'error',
          title: 'Creation Failed',
          description: data.error?.message || 'Failed to create incident.',
        });
      }
    } catch (err) {
      console.error('Create error:', err);
    } finally {
      setCreating(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                INCIDENTS
              </span>
              <span className="text-ink-tertiary">PERSISTENT DYNAMODB RECORDS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Incident Registry
            </h1>
          </div>

          <Button onClick={() => setIsNewModalOpen(true)} className="flex items-center space-x-1.5">
            <Plus className="w-4 h-4" />
            <span>Ingest Incident</span>
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Search by incident title, service name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-canvas border border-surface-border rounded-xs text-xs font-sans text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-ink-primary"
            />
          </div>

          <div className="flex items-center space-x-1 font-mono-tech text-xs">
            {['ALL', 'SEV1', 'SEV2', 'SEV3'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-2 rounded-xs border transition-editorial ${
                  severityFilter === sev
                    ? 'bg-amber-light border-amber-accent/50 text-ink-primary font-bold shadow-pleurat-button'
                    : 'border-surface-border text-ink-secondary hover:bg-surface-subtle'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Incident List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <EmptyState
            title="No Incidents Match Filter"
            description="There are currently no active or historical incidents matching your search query."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSeverityFilter('ALL');
            }}
          />
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((incident) => (
              <Card key={incident.incidentId} className="hover:border-ink-secondary transition-editorial">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={incident.severity === 'SEV1' ? 'destructive' : 'amber'}>
                        {incident.severity}
                      </Badge>
                      <span className="font-mono-tech text-xs text-ink-tertiary">
                        ID: {incident.incidentId}
                      </span>
                      <span className="font-mono-tech text-xs text-ink-primary font-medium">
                        {incident.service}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-ink-primary font-sans">
                      {incident.title}
                    </h3>
                    <p className="text-xs text-ink-secondary line-clamp-1 font-sans">
                      {incident.summary}
                    </p>

                    <div className="flex items-center space-x-4 text-[10px] font-mono-tech text-ink-tertiary pt-1">
                      <span>CREATED: {new Date(incident.createdAt).toLocaleDateString()}</span>
                      <span>COMMANDER: {incident.commander}</span>
                      {incident.confidenceScore && (
                        <span className="text-amber-700 font-bold">
                          AI CONFIDENCE: {Math.round(incident.confidenceScore * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                    <Badge variant={incident.status === 'RESOLVED' ? 'success' : 'amber'}>
                      {incident.status}
                    </Badge>
                    <Link
                      href="/dashboard"
                      className="text-xs font-mono-tech text-ink-primary hover:text-amber-700 font-bold flex items-center space-x-1"
                    >
                      <span>Command Workbench</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Ingest Modal */}
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-canvas border border-surface-border rounded-sm max-w-lg w-full p-6 shadow-pleurat-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-sans text-ink-primary">
                  Ingest Operational Incident
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setNewTitle('Campus Lab 304 Switch Outage: 42 Workstations Offline');
                    setNewService('campus-network-core');
                    setNewSeverity('SEV1');
                    setNewSummary('Lab 304 has lost network connectivity. 42 students cannot access their systems. The issue started 8 minutes ago.');
                  }}
                  className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-amber-light border border-amber-accent text-ink-primary hover:bg-amber-accent/40 transition-colors"
                >
                  ⚡ Load Demo Incident
                </button>
              </div>
              <form onSubmit={handleCreateIncident} className="space-y-4 font-sans text-xs">
                <div>
                  <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                    Incident Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Payment Checkout 504 Gateway Timeout"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                      Service
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. payment-checkout-service"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                      Severity
                    </label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
                      className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                    >
                      <option value="SEV1">SEV1 - Critical (Outage)</option>
                      <option value="SEV2">SEV2 - High (Degraded)</option>
                      <option value="SEV3">SEV3 - Medium</option>
                      <option value="SEV4">SEV4 - Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                    Summary & Telemetry Log
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe observed errors, CloudWatch alarms, or deployment commit hashes..."
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    className="w-full p-2 bg-canvas border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Ingesting...' : 'Create & Ingest'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
