export type IncidentSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus =
  | 'NEW'
  | 'ANALYZING'
  | 'ACTION_REQUIRED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'MITIGATING';
export type UserRole = 'VIEWER' | 'RESPONDER' | 'INCIDENT_COMMANDER' | 'ADMIN';

export interface IncidentRecord {
  PK: `INCIDENT#${string}`;
  SK: 'METADATA';
  GSI1PK: `STATUS#${IncidentStatus}`;
  GSI1SK: `CREATED#${string}`;
  GSI2PK: `SEV#${string}`;
  GSI2SK: `CREATED#${string}`;
  incidentId: string;
  title: string;
  service: string;
  environment: 'production' | 'staging' | 'development';
  severity: IncidentSeverity;
  status: IncidentStatus;
  commander: string;
  summary: string;
  location?: string;
  affectedUsers?: number | null;
  rootCauseHypothesis?: string;
  confidenceScore?: number;
  mttdSeconds?: number;
  mttmSeconds?: number;
  postmortemUrl?: string;
  category?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface TimelineEventRecord {
  PK: `INCIDENT#${string}`;
  SK: `EVENT#${string}#${string}`;
  incidentId: string;
  eventId: string;
  title: string;
  description: string;
  actor: string;
  category: 'ALERT' | 'TRIAGE' | 'APPROVAL' | 'REMEDIATION' | 'RECOVERY' | 'INVESTIGATION';
  timestamp: string;
}

export interface EvidenceRecord {
  PK: `INCIDENT#${string}`;
  SK: `EVIDENCE#${string}`;
  incidentId: string;
  chunkId: string;
  sourceType: 'BEDROCK_KNOWLEDGE_BASE' | 'CLOUDWATCH_LOGS' | 'METRIC_ALARM';
  sourceUri: string;
  documentTitle: string;
  snippet: string;
  relevanceScore: number;
  retrievedAt: string;
}

export interface ActionItem {
  actionId: string;
  order: number;
  toolName: string;
  description: string;
  requiresApproval: boolean;
  parameters: Record<string, unknown>;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'QUEUED';
  executedAt?: string;
  resultSummary?: string;
}

export interface ActionPlanRecord {
  PK: `INCIDENT#${string}`;
  SK: `PLAN#${string}`;
  incidentId: string;
  planId: string;
  generatedByModel: string;
  status: 'PENDING_APPROVAL' | 'PARTIALLY_EXECUTED' | 'COMPLETED' | 'REJECTED';
  summary: string;
  blastRadiusRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  blastRadiusDetail: string;
  estimatedMitigationTime: string;
  actions: ActionItem[];
  createdAt: string;
  version: number;
}

export interface AuditRecord {
  PK: `INCIDENT#${string}`;
  SK: `AUDIT#${string}#${string}`;
  auditId: string;
  incidentId: string;
  eventType:
    | 'INCIDENT_CREATED'
    | 'TRIAGE_COMPLETED'
    | 'ACTION_APPROVED_AND_EXECUTED'
    | 'ACTION_REJECTED'
    | 'INCIDENT_RESOLVED'
    | 'STATUS_TRANSITION'
    | 'INCIDENT_UPDATED'
    | 'ANALYSIS_COMPLETED';
  actor: {
    email: string;
    role: UserRole;
    ipAddress?: string;
  };
  actionId?: string;
  toolName?: string;
  approvalTokenSignature?: string;
  executionOutput?: Record<string, unknown>;
  timestamp: string;
}

export interface FullIncidentBundle {
  incident: IncidentRecord;
  timeline: TimelineEventRecord[];
  evidence: EvidenceRecord[];
  activePlan?: ActionPlanRecord;
  auditLogs: AuditRecord[];
}
