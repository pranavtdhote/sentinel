import {
  IncidentRecord,
  TimelineEventRecord,
  EvidenceRecord,
  ActionPlanRecord,
  AuditRecord,
  FullIncidentBundle,
  IncidentStatus,
  IncidentSeverity,
} from '@/lib/types/database';

export interface IIncidentRepository {
  createIncident(incident: Omit<IncidentRecord, 'PK' | 'SK' | 'GSI1PK' | 'GSI1SK' | 'GSI2PK' | 'GSI2SK' | 'version' | 'createdAt' | 'updatedAt'>): Promise<IncidentRecord>;
  getIncident(incidentId: string): Promise<IncidentRecord | null>;
  getFullIncidentBundle(incidentId: string): Promise<FullIncidentBundle | null>;
  listIncidents(filters?: { status?: IncidentStatus; severity?: IncidentSeverity; limit?: number }): Promise<IncidentRecord[]>;
  updateIncidentStatus(incidentId: string, status: IncidentStatus, expectedVersion: number): Promise<IncidentRecord>;
  patchIncident(incidentId: string, updates: Partial<IncidentRecord>, expectedVersion: number): Promise<IncidentRecord>;
  addTimelineEvent(event: Omit<TimelineEventRecord, 'PK' | 'SK'>): Promise<TimelineEventRecord>;
  saveEvidenceChunks(chunks: Omit<EvidenceRecord, 'PK' | 'SK'>[]): Promise<EvidenceRecord[]>;
  saveActionPlan(plan: Omit<ActionPlanRecord, 'PK' | 'SK' | 'version' | 'createdAt'>): Promise<ActionPlanRecord>;
  updateActionStatus(incidentId: string, planId: string, actionId: string, status: 'APPROVED' | 'SUCCESS' | 'FAILED', resultSummary?: string): Promise<ActionPlanRecord>;
  addAuditLog(log: Omit<AuditRecord, 'PK' | 'SK'>): Promise<AuditRecord>;
  setResolution(incidentId: string, reportUrl: string, mttmSeconds: number): Promise<IncidentRecord>;
  getEvents(incidentId: string): Promise<{ timeline: TimelineEventRecord[]; auditLogs: AuditRecord[] }>;
  isSandbox(): boolean;
}
