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
import { IIncidentRepository } from './types';

// In-Memory Deterministic Store
class MockStore {
  incidents: Map<string, IncidentRecord> = new Map();
  timeline: Map<string, TimelineEventRecord[]> = new Map();
  evidence: Map<string, EvidenceRecord[]> = new Map();
  actionPlans: Map<string, ActionPlanRecord> = new Map();
  auditLogs: Map<string, AuditRecord[]> = new Map();

  constructor() {
    this.seedDefaultDemoData();
  }

  seedDefaultDemoData() {
    const defaultId = 'inc-2026-0917-01';
    const now = new Date().toISOString();

    const incident: IncidentRecord = {
      PK: `INCIDENT#${defaultId}`,
      SK: 'METADATA',
      GSI1PK: 'STATUS#DETECTED',
      GSI1SK: `CREATED#${now}`,
      GSI2PK: 'SEV#SEV1',
      GSI2SK: `CREATED#${now}`,
      incidentId: defaultId,
      title: 'Payment Checkout API 504 Gateway Timeout Spikes',
      service: 'payment-checkout-service',
      environment: 'production',
      severity: 'SEV1',
      status: 'DETECTED',
      commander: 'prana@sentinel.internal',
      summary: 'P99 latency surged from 120ms to 4,800ms following release v2.14.0. Upstream Stripe webhook errors reaching 12% failure threshold.',
      category: 'Database / Storage',
      confidenceScore: 0.94,
      mttdSeconds: 88,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.incidents.set(defaultId, incident);

    // Incident 2: SEV2 Auth Latency Degraded
    const id2 = 'inc-2026-0917-02';
    const incident2: IncidentRecord = {
      PK: `INCIDENT#${id2}`,
      SK: 'METADATA',
      GSI1PK: 'STATUS#INVESTIGATING',
      GSI1SK: `CREATED#${now}`,
      GSI2PK: 'SEV#SEV2',
      GSI2SK: `CREATED#${now}`,
      incidentId: id2,
      title: 'Auth Service JWT Verification Latency Degradation',
      service: 'auth-service',
      environment: 'production',
      severity: 'SEV2',
      status: 'INVESTIGATING',
      commander: 'sarah.m@sentinel.internal',
      summary: 'JWT public key cache miss rate surged to 42%, causing token verification P95 to climb from 8ms to 320ms.',
      category: 'Authentication / Cache',
      rootCauseHypothesis: 'Redis replica node failover evicted cached JWKS public key set.',
      confidenceScore: 0.91,
      mttdSeconds: 65,
      version: 2,
      createdAt: new Date(Date.now() - 2400 * 1000).toISOString(),
      updatedAt: now,
    };
    this.incidents.set(id2, incident2);

    // Incident 3: SEV3 Webhook Dispatch Backlog
    const id3 = 'inc-2026-0916-03';
    const incident3: IncidentRecord = {
      PK: `INCIDENT#${id3}`,
      SK: 'METADATA',
      GSI1PK: 'STATUS#RESOLVED',
      GSI1SK: `CREATED#${now}`,
      GSI2PK: 'SEV#SEV3',
      GSI2SK: `CREATED#${now}`,
      incidentId: id3,
      title: 'Downstream Webhook Retry Storm on SQS Queue',
      service: 'notification-service',
      environment: 'production',
      severity: 'SEV3',
      status: 'RESOLVED',
      commander: 'alex.k@sentinel.internal',
      summary: 'Partner endpoint outage triggered automatic 5x retry storm, causing SQS queue backlog of 14,000 messages.',
      category: 'Messaging / SQS',
      confidenceScore: 0.95,
      mttdSeconds: 110,
      mttmSeconds: 340,
      postmortemUrl: 'https://sentinel-reports-prod.s3.amazonaws.com/postmortems/inc-2026-0916-03-retrospective.md',
      version: 3,
      createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
      updatedAt: now,
    };
    this.incidents.set(id3, incident3);

    this.timeline.set(defaultId, [
      {
        PK: `INCIDENT#${defaultId}`,
        SK: `EVENT#${now}#ev-01`,
        incidentId: defaultId,
        eventId: 'ev-01',
        title: 'CloudWatch High Latency Alarm Triggered',
        description: 'PaymentApiLatencyAlarm transitioned to ALARM state. P99 latency = 4,820ms (> 500ms threshold).',
        actor: 'CloudWatch Alarms (AWS)',
        category: 'ALERT',
        timestamp: now,
      },
    ]);

    this.evidence.set(defaultId, [
      {
        PK: `INCIDENT#${defaultId}`,
        SK: 'EVIDENCE#ev-chunk-302',
        incidentId: defaultId,
        chunkId: 'ev-chunk-302',
        sourceType: 'BEDROCK_KNOWLEDGE_BASE',
        sourceUri: 's3://sentinel-runbooks-prod/payments/aurora-connection-leak.md',
        documentTitle: 'Runbook: Aurora PostgreSQL Connection Pool Recovery',
        snippet: 'If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool rollback_ecs_service followed by terminating idle backend sessions.',
        relevanceScore: 0.962,
        retrievedAt: now,
      },
      {
        PK: `INCIDENT#${defaultId}`,
        SK: 'EVIDENCE#ev-chunk-418',
        incidentId: defaultId,
        chunkId: 'ev-chunk-418',
        sourceType: 'CLOUDWATCH_LOGS',
        sourceUri: 'log-group:/aws/ecs/prod-services/payment-checkout',
        documentTitle: 'CloudWatch Log Stream: payment-checkout-service:49',
        snippet: '[ERROR] ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z. Unindexed query on table "orders".',
        relevanceScore: 0.915,
        retrievedAt: now,
      },
    ]);

    this.auditLogs.set(defaultId, [
      {
        PK: `INCIDENT#${defaultId}`,
        SK: `AUDIT#${now}#aud-01`,
        auditId: 'aud-01',
        incidentId: defaultId,
        eventType: 'INCIDENT_CREATED',
        actor: {
          email: 'system@sentinel.internal',
          role: 'ADMIN',
        },
        timestamp: now,
      },
    ]);
  }
}

const store = new MockStore();

export class MockIncidentRepository implements IIncidentRepository {
  isSandbox(): boolean {
    return true;
  }

  async createIncident(
    input: Omit<IncidentRecord, 'PK' | 'SK' | 'GSI1PK' | 'GSI1SK' | 'GSI2PK' | 'GSI2SK' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<IncidentRecord> {
    const now = new Date().toISOString();
    const item: IncidentRecord = {
      ...input,
      PK: `INCIDENT#${input.incidentId}`,
      SK: 'METADATA',
      GSI1PK: `STATUS#${input.status}`,
      GSI1SK: `CREATED#${now}`,
      GSI2PK: `SEV#${input.severity}`,
      GSI2SK: `CREATED#${now}`,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    store.incidents.set(input.incidentId, item);
    store.timeline.set(input.incidentId, []);
    store.evidence.set(input.incidentId, []);
    store.auditLogs.set(input.incidentId, []);

    return item;
  }

  async getIncident(incidentId: string): Promise<IncidentRecord | null> {
    return store.incidents.get(incidentId) || null;
  }

  async getFullIncidentBundle(incidentId: string): Promise<FullIncidentBundle | null> {
    const incident = store.incidents.get(incidentId);
    if (!incident) return null;

    return {
      incident,
      timeline: store.timeline.get(incidentId) || [],
      evidence: store.evidence.get(incidentId) || [],
      activePlan: store.actionPlans.get(incidentId),
      auditLogs: store.auditLogs.get(incidentId) || [],
    };
  }

  async listIncidents(filters?: { status?: IncidentStatus; severity?: IncidentSeverity; limit?: number }): Promise<IncidentRecord[]> {
    let items = Array.from(store.incidents.values());
    if (filters?.status) {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters?.severity) {
      items = items.filter((i) => i.severity === filters.severity);
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items.slice(0, filters?.limit || 20);
  }

  async updateIncidentStatus(incidentId: string, status: IncidentStatus, expectedVersion: number): Promise<IncidentRecord> {
    const item = store.incidents.get(incidentId);
    if (!item) throw new Error(`Incident not found: ${incidentId}`);
    if (item.version !== expectedVersion) {
      throw new Error(`OptimisticLockException: Expected version ${expectedVersion} but got ${item.version}`);
    }

    const updated: IncidentRecord = {
      ...item,
      status,
      GSI1PK: `STATUS#${status}`,
      version: item.version + 1,
      updatedAt: new Date().toISOString(),
    };
    store.incidents.set(incidentId, updated);
    return updated;
  }

  async patchIncident(
    incidentId: string,
    updates: Partial<IncidentRecord>,
    expectedVersion: number
  ): Promise<IncidentRecord> {
    const item = store.incidents.get(incidentId);
    if (!item) {
      throw new Error(`Incident not found: ${incidentId}`);
    }
    if (item.version !== expectedVersion) {
      throw new Error(`OptimisticLockException: Expected version ${expectedVersion} but got ${item.version}`);
    }

    const forbiddenKeys = new Set(['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK', 'version', 'createdAt', 'updatedAt', 'incidentId']);
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && !forbiddenKeys.has(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    const updated: IncidentRecord = {
      ...item,
      ...sanitizedUpdates,
      status: (updates.status || item.status) as IncidentStatus,
      severity: (updates.severity || item.severity) as IncidentSeverity,
      GSI1PK: updates.status ? `STATUS#${updates.status}` : item.GSI1PK,
      GSI2PK: updates.severity ? `SEV#${updates.severity}` : item.GSI2PK,
      version: item.version + 1,
      updatedAt: new Date().toISOString(),
    };

    store.incidents.set(incidentId, updated);
    return updated;
  }

  async getEvents(
    incidentId: string
  ): Promise<{ timeline: TimelineEventRecord[]; auditLogs: AuditRecord[] }> {
    const timeline = [...(store.timeline.get(incidentId) || [])];
    const auditLogs = [...(store.auditLogs.get(incidentId) || [])];
    timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    auditLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return { timeline, auditLogs };
  }

  async addTimelineEvent(event: Omit<TimelineEventRecord, 'PK' | 'SK'>): Promise<TimelineEventRecord> {
    const item: TimelineEventRecord = {
      ...event,
      PK: `INCIDENT#${event.incidentId}`,
      SK: `EVENT#${event.timestamp}#${event.eventId}`,
    };
    const current = store.timeline.get(event.incidentId) || [];
    current.push(item);
    store.timeline.set(event.incidentId, current);
    return item;
  }

  async saveEvidenceChunks(chunks: Omit<EvidenceRecord, 'PK' | 'SK'>[]): Promise<EvidenceRecord[]> {
    const items: EvidenceRecord[] = chunks.map((c) => ({
      ...c,
      PK: `INCIDENT#${c.incidentId}`,
      SK: `EVIDENCE#${c.chunkId}`,
    }));
    if (chunks.length > 0) {
      const incidentId = chunks[0].incidentId;
      const current = store.evidence.get(incidentId) || [];
      store.evidence.set(incidentId, [...current, ...items]);
    }
    return items;
  }

  async saveActionPlan(plan: Omit<ActionPlanRecord, 'PK' | 'SK' | 'version' | 'createdAt'>): Promise<ActionPlanRecord> {
    const now = new Date().toISOString();
    const item: ActionPlanRecord = {
      ...plan,
      PK: `INCIDENT#${plan.incidentId}`,
      SK: `PLAN#${plan.planId}`,
      version: 1,
      createdAt: now,
    };
    store.actionPlans.set(plan.incidentId, item);
    return item;
  }

  async updateActionStatus(
    incidentId: string,
    planId: string,
    actionId: string,
    status: 'APPROVED' | 'SUCCESS' | 'FAILED',
    resultSummary?: string
  ): Promise<ActionPlanRecord> {
    const plan = store.actionPlans.get(incidentId);
    if (!plan) throw new Error(`Action plan not found for incident: ${incidentId}`);

    plan.actions = plan.actions.map((act) => {
      if (act.actionId === actionId) {
        return {
          ...act,
          status,
          resultSummary: resultSummary || act.resultSummary,
          executedAt: new Date().toISOString(),
        };
      }
      return act;
    });

    store.actionPlans.set(incidentId, plan);
    return plan;
  }

  async addAuditLog(log: Omit<AuditRecord, 'PK' | 'SK'>): Promise<AuditRecord> {
    const item: AuditRecord = {
      ...log,
      PK: `INCIDENT#${log.incidentId}`,
      SK: `AUDIT#${log.timestamp}#${log.auditId}`,
    };
    const current = store.auditLogs.get(log.incidentId) || [];
    current.push(item);
    store.auditLogs.set(log.incidentId, current);
    return item;
  }

  async setResolution(incidentId: string, reportUrl: string, mttmSeconds: number): Promise<IncidentRecord> {
    const item = store.incidents.get(incidentId);
    if (!item) throw new Error(`Incident not found: ${incidentId}`);
    const updated: IncidentRecord = {
      ...item,
      status: 'RESOLVED',
      GSI1PK: 'STATUS#RESOLVED',
      postmortemUrl: reportUrl,
      mttmSeconds,
      updatedAt: new Date().toISOString(),
    };
    store.incidents.set(incidentId, updated);
    return updated;
  }
}
