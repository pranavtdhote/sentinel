'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Button } from '@/components/ui/button';
import { IncidentTable } from '@/components/sentinel/IncidentTable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { IncidentRecord, IncidentSeverity, IncidentStatus } from '@/lib/types/database';
import { Plus, Search, Filter, RefreshCw, ArrowUpDown, Calendar } from 'lucide-react';
import { safeFetchJson } from '@/lib/api/safeFetch';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'created' | 'severity' | 'title'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Ingest Modal State
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
      const res = await safeFetchJson<{ success: boolean; data: { items: IncidentRecord[] } }>(
        '/api/incidents'
      );
      if (res.ok && res.data?.success && res.data?.data) {
        setIncidents(res.data.data.items);
      }
    } catch (err) {
      console.warn('Failed to fetch incidents:', err);
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
      const res = await safeFetchJson<{
        success: boolean;
        data: IncidentRecord;
        error?: { message: string };
      }>('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer commander-token',
          'x-sentinel-actor-role': 'INCIDENT_COMMANDER',
        },
        body: JSON.stringify({
          title: newTitle,
          service: newService,
          severity: newSeverity,
          summary: newSummary,
          commander: 'prana@sentinel.internal',
        }),
      });

      if (res.ok && res.data?.success && res.data.data) {
        addToast({
          type: 'success',
          title: 'Incident Created',
          description: `Incident ${res.data.data.incidentId} ingested and persisted to DynamoDB.`,
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
          description: res.data?.error?.message || res.error || 'Failed to create incident.',
        });
      }
    } catch (err) {
      console.error('Create error:', err);
    } finally {
      setCreating(false);
    }
  };

  // Filter and sort incidents
  const filteredIncidents = incidents
    .filter((inc) => {
      const matchesSearch =
        inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.incidentId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
      const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'created') {
        comp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'severity') {
        const rank: Record<string, number> = { SEV1: 4, SEV2: 3, SEV3: 2, SEV4: 1 };
        comp = (rank[b.severity] || 0) - (rank[a.severity] || 0);
      } else if (sortBy === 'title') {
        comp = a.title.localeCompare(b.title);
      }
      return sortOrder === 'desc' ? comp : -comp;
    });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                INCIDENTS
              </span>
              <span className="text-ink-tertiary">OPERATIONAL INCIDENT REGISTRY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Incident Management
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Monitor, investigate, and resolve operational incidents with Bedrock AI assistance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchIncidents}
              className="flex items-center space-x-1.5 font-mono-tech text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center space-x-1.5 font-mono-tech text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Incident</span>
            </Button>
          </div>
        </div>

        {/* Controls Bar: Search, Filters, Sort */}
        <div className="bg-canvas border border-surface-border rounded-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
              <input
                type="text"
                placeholder="Search by incident ID, title, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-subtle/50 border border-surface-border rounded-xs text-xs font-sans text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-ink-primary"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center space-x-1 font-mono-tech text-xs">
              <span className="text-ink-tertiary text-[10px] uppercase pr-1">SEV:</span>
              {['ALL', 'SEV1', 'SEV2', 'SEV3', 'SEV4'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1.5 rounded-xs border text-[11px] transition-editorial ${
                    severityFilter === sev
                      ? 'bg-amber-light border-amber-accent/60 text-ink-primary font-bold shadow-pleurat-button'
                      : 'border-surface-border text-ink-secondary hover:bg-surface-subtle'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1 font-mono-tech text-xs">
              <span className="text-ink-tertiary text-[10px] uppercase pr-1">STATUS:</span>
              {['ALL', 'NEW', 'INVESTIGATING', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-xs border text-[11px] transition-editorial ${
                    statusFilter === st
                      ? 'bg-amber-light border-amber-accent/60 text-ink-primary font-bold shadow-pleurat-button'
                      : 'border-surface-border text-ink-secondary hover:bg-surface-subtle'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center space-x-1 font-mono-tech text-xs">
              <button
                type="button"
                onClick={() => {
                  if (sortBy === 'created') setSortBy('severity');
                  else if (sortBy === 'severity') setSortBy('title');
                  else setSortBy('created');
                }}
                className="px-2.5 py-1.5 rounded-xs border border-surface-border bg-surface-subtle/50 text-ink-primary hover:bg-surface-subtle flex items-center space-x-1"
                title="Change sort order"
              >
                <ArrowUpDown className="w-3 h-3 text-ink-tertiary" />
                <span className="uppercase text-[11px]">SORT: {sortBy}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Incidents Table */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <EmptyState
            title="No Incidents Found"
            description="No operational incidents match your current filter parameters or search terms."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSeverityFilter('ALL');
              setStatusFilter('ALL');
            }}
          />
        ) : (
          <IncidentTable incidents={filteredIncidents} />
        )}

        {/* Create Incident Modal */}
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-canvas border border-surface-border rounded-sm max-w-lg w-full p-6 shadow-pleurat-1">
              <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-3">
                <h2 className="text-base font-bold font-sans text-ink-primary">
                  Ingest Operational Incident
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setNewTitle('Campus Lab 304 Switch Outage: 42 Workstations Offline');
                    setNewService('campus-network-core');
                    setNewSeverity('SEV1');
                    setNewSummary(
                      'Lab 304 has lost network connectivity. 42 students cannot access their systems. The issue started 8 minutes ago.'
                    );
                  }}
                  className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-amber-light border border-amber-accent text-ink-primary hover:bg-amber-accent/40 transition-colors"
                >
                  ⚡ Load Demo Scenario
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
                    className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                      Service Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. payment-checkout-service"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                      Severity
                    </label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
                      className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary font-mono-tech"
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
                    Telemetry Logs / Summary
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe CloudWatch alarms, stack traces, or observed degradations..."
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2 border-t border-surface-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewModalOpen(false)}
                    className="font-mono-tech text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="font-mono-tech text-xs">
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
