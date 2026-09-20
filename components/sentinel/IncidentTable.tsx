'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { IncidentRecord } from '@/lib/types/database';
import { SeverityBadge } from './SeverityBadge';
import { SlaCountdown } from './SlaCountdown';
import { ArrowUpRight, ChevronRight, ChevronDown, Clock, User, Shield, Terminal } from 'lucide-react';

interface IncidentTableProps {
  incidents: IncidentRecord[];
  onSelectIncident?: (incident: IncidentRecord) => void;
  selectedId?: string;
}

export const IncidentTable: React.FC<IncidentTableProps> = ({
  incidents,
  onSelectIncident,
  selectedId,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusStyle = (status: IncidentRecord['status']) => {
    switch (status) {
      case 'NEW':
      case 'DETECTED':
        return 'bg-amber-light text-amber-900 border-amber-accent/40 font-semibold';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30';
      case 'MITIGATING':
        return 'bg-blue-500/15 text-blue-800 border-blue-500/30';
      case 'INVESTIGATING':
        return 'bg-amber-accent/20 text-amber-900 border-amber-accent/40';
      case 'ACTION_REQUIRED':
        return 'bg-danger/10 text-danger border-danger/30 font-bold animate-pulse';
      default:
        return 'bg-surface-subtle text-ink-secondary border-surface-border';
    }
  };

  return (
    <div className="bg-canvas border border-surface-border rounded-sm overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-surface-subtle/80 border-b border-surface-border font-mono-tech text-[10px] text-ink-tertiary uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Incident ID</th>
              <th className="py-3 px-4">Title & Service</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Commander</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60">
            {(() => {
              const seen = new Set<string>();
              const validList = (incidents || []).filter((inc) => {
                if (!inc || !inc.incidentId || typeof inc.incidentId !== 'string' || inc.incidentId.trim() === '') {
                  return false;
                }
                if (seen.has(inc.incidentId)) {
                  return false;
                }
                seen.add(inc.incidentId);
                return true;
              });

              return validList.map((incident, index) => {
                const isSelected = selectedId === incident.incidentId;
                const isExpanded = expandedId === incident.incidentId;

                return (
                  <React.Fragment key={incident.incidentId || `incident-row-${index}`}>
                  <tr
                    onClick={() => onSelectIncident?.(incident)}
                    className={`hover:bg-surface-subtle/60 transition-colors cursor-pointer ${
                      isSelected ? 'bg-amber-accent/10 border-l-2 border-amber-accent' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-ink-tertiary">
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(incident.incidentId, e)}
                        className="p-0.5 hover:text-ink-primary"
                        aria-label="Expand row details"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4 font-mono-tech text-xs text-ink-primary font-bold">
                      <Link
                        href={`/incidents/${incident.incidentId}`}
                        className="hover:underline hover:text-amber-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {incident.incidentId}
                      </Link>
                    </td>

                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <div className="font-medium text-ink-primary truncate font-sans text-xs">
                        {incident.title}
                      </div>
                      <div className="font-mono-tech text-[10px] text-ink-tertiary flex items-center space-x-1.5 mt-0.5">
                        <Terminal className="w-3 h-3" />
                        <span>{incident.service}</span>
                        <span>·</span>
                        <span className="uppercase">{incident.environment || 'prod'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <SeverityBadge severity={incident.severity} size="sm" />
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-xs font-mono-tech text-[10px] uppercase border ${getStatusStyle(
                          incident.status
                        )}`}
                      >
                        {incident.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono-tech text-[11px] text-ink-secondary">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3 h-3 text-ink-tertiary" />
                        <span className="truncate max-w-[120px]">
                          {incident.commander ? incident.commander.split('@')[0] : 'unassigned'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono-tech text-[10px] text-ink-tertiary whitespace-nowrap">
                      {new Date(incident.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/incidents/${incident.incidentId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 text-[11px] font-mono-tech text-ink-primary hover:text-amber-800 bg-surface-subtle hover:bg-amber-accent/20 border border-surface-border rounded flex items-center space-x-1 transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable row content */}
                  {isExpanded && (
                    <tr className="bg-surface-subtle/30">
                      <td colSpan={8} className="p-4 border-t border-surface-border/40">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                          <div className="md:col-span-2 space-y-2">
                            <div className="text-[10px] font-mono-tech text-ink-tertiary uppercase">
                              Incident Summary & Telemetry
                            </div>
                            <p className="text-ink-secondary leading-relaxed bg-canvas p-3 rounded border border-surface-border">
                              {incident.summary}
                            </p>
                            {incident.rootCauseHypothesis && (
                              <div className="p-2.5 bg-amber-light/70 border border-amber-accent/40 rounded text-xs text-ink-primary">
                                <strong className="font-mono-tech text-[10px] text-amber-900 block mb-1">
                                  ROOT CAUSE HYPOTHESIS:
                                </strong>
                                {incident.rootCauseHypothesis}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 bg-canvas p-3 rounded border border-surface-border font-mono-tech text-[11px]">
                            <div>
                              <div className="text-ink-tertiary text-[10px]">SLA STATUS</div>
                              <div className="mt-1">
                                <SlaCountdown
                                  createdAt={incident.createdAt}
                                  severity={incident.severity}
                                  status={incident.status}
                                />
                              </div>
                            </div>
                            {incident.confidenceScore && (
                              <div>
                                <div className="text-ink-tertiary text-[10px]">AI CONFIDENCE</div>
                                <div className="font-bold text-amber-800 text-xs">
                                  {Math.round(incident.confidenceScore * 100)}% Grounded
                                </div>
                              </div>
                            )}
                            <div className="pt-2 border-t border-surface-border flex justify-end">
                              <Link
                                href={`/incidents/${incident.incidentId}`}
                                className="text-xs font-bold text-amber-800 hover:underline flex items-center space-x-1"
                              >
                                <span>Open Full Investigation</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            });
          })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};
