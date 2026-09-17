import { IncidentSeverity, IncidentStatus } from '@/lib/types/database';

export type SentinelEventType =
  | 'IncidentCreated'
  | 'IncidentAssigned'
  | 'IncidentStatusChanged'
  | 'SlaApproaching'
  | 'SlaBreached'
  | 'IncidentResolved';

export interface SentinelEventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  eventType: SentinelEventType;
  source: 'sentinel.incidents';
  timestamp: string;
  incidentId: string;
  actor: string;
  payloadVersion: '1.0';
  payload: T;
}

export interface IncidentCreatedPayload {
  title: string;
  service: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  commander: string;
  createdAt: string;
}

export interface IncidentStatusChangedPayload {
  previousStatus: IncidentStatus;
  newStatus: IncidentStatus;
  version: number;
}

export interface SlaAlertPayload {
  severity: IncidentSeverity;
  deadlineMinutes: number;
  elapsedSeconds: number;
  deadlineIso: string;
  percentageElapsed: number;
  status: 'APPROACHING' | 'BREACHED';
}
