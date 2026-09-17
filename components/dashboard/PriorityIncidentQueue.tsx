'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IncidentRecord } from '@/lib/types/database';
import { AlertTriangle, Clock, ChevronRight, User, Filter, ArrowUpRight } from 'lucide-react';

interface PriorityIncidentQueueProps {
  incidents: IncidentRecord[];
  onSelectIncident: (incidentId: string) => void;
  selectedIncidentId?: string;
}

export const PriorityIncidentQueue: React.FC<PriorityIncidentQueueProps> = ({
  incidents,
  onSelectIncident,
  selectedIncidentId,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  // Filter and sort incidents by priority
  const severityWeight: Record<string, number> = { SEV1: 4, SEV2: 3, SEV3: 2, SEV4: 1 };

  const filtered = incidents
    .filter((inc) => {
      const matchesSev = severityFilter === 'ALL' || inc.severity === severityFilter;
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? inc.status !== 'RESOLVED' && inc.status !== 'CLOSED'
          : inc.status === 'RESOLVED' || inc.status === 'CLOSED';
      return matchesSev && matchesStatus;
    })
    .sort((a, b) => {
      const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <Card className="hover:border-ink-secondary transition-editorial">
      <CardHeader className="pb-3 border-b border-surface-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono-tech text-[10px] bg-amber-accent px-1.5 py-0.5 rounded-xs font-bold text-ink-primary">
                QUEUE
              </span>
              <CardTitle className="text-base font-bold">Priority Incident Queue</CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Ranked on-call dispatch ordered by customer impact and recovery SLA
            </CardDescription>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono-tech text-xs">
            {/* Status Tabs */}
            <div className="flex rounded-xs border border-surface-border p-0.5 bg-surface-subtle">
              {['ACTIVE', 'RESOLVED', 'ALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[10px] rounded-xs font-semibold transition-editorial ${
                    statusFilter === st
                      ? 'bg-canvas text-ink-primary shadow-pleurat-button'
                      : 'text-ink-tertiary hover:text-ink-primary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Severity Tabs */}
            <div className="flex rounded-xs border border-surface-border p-0.5 bg-surface-subtle">
              {['ALL', 'SEV1', 'SEV2'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 text-[10px] rounded-xs font-semibold transition-editorial ${
                    severityFilter === sev
                      ? 'bg-amber-light text-ink-primary shadow-pleurat-button'
                      : 'text-ink-tertiary hover:text-ink-primary'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-surface-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono-tech text-ink-tertiary">
            No incidents in queue matching current filter criteria.
          </div>
        ) : (
          filtered.map((inc, index) => {
            const isSelected = selectedIncidentId === inc.incidentId;
            return (
              <div
                key={inc.incidentId}
                onClick={() => onSelectIncident(inc.incidentId)}
                className={`p-4 cursor-pointer transition-editorial flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-light/40 border-l-4 border-l-amber-accent'
                    : 'hover:bg-surface-subtle/50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Rank Index */}
                  <span className="font-mono-tech font-bold text-xs text-ink-tertiary w-5 mt-0.5">
                    #{index + 1}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={inc.severity === 'SEV1' ? 'destructive' : 'amber'}>
                        {inc.severity}
                      </Badge>
                      <span className="font-mono-tech text-xs font-bold text-ink-primary">
                        {inc.service}
                      </span>
                      <span className="font-mono-tech text-[10px] text-ink-tertiary">
                        ({inc.incidentId})
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-ink-primary font-sans leading-snug">
                      {inc.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 font-mono-tech text-[10px] text-ink-tertiary">
                      <span>CATEGORY: {inc.category || 'Database / Storage'}</span>
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{inc.commander}</span>
                      </span>
                      <span>·</span>
                      <span>CREATED: {new Date(inc.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 shrink-0 pl-8 sm:pl-0">
                  <Badge variant={inc.status === 'RESOLVED' ? 'success' : 'amber'}>
                    {inc.status}
                  </Badge>
                  <span className="text-[10px] font-mono-tech text-amber-800 font-semibold flex items-center space-x-0.5">
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
