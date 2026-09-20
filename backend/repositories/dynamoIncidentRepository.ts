import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '@/lib/aws/awsClients';
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
import { getBaselineDemoIncidents, getBaselineDemoBundle } from './demoBaseline';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'sentinel-records-dev';

export class DynamoIncidentRepository implements IIncidentRepository {
  isSandbox(): boolean {
    return false;
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

    await dynamoDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

    return item;
  }

  async getIncident(incidentId: string): Promise<IncidentRecord | null> {
    try {
      const result = await dynamoDocClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `INCIDENT#${incidentId}`,
            SK: 'METADATA',
          },
        })
      );
      if (result.Item) {
        return result.Item as IncidentRecord;
      }
    } catch {
      // Fall through to check baseline demo data
    }
    return getBaselineDemoIncidents().find((i) => i.incidentId === incidentId) || null;
  }

  async getFullIncidentBundle(incidentId: string): Promise<FullIncidentBundle | null> {
    let resultItems: any[] = [];
    try {
      const result = await dynamoDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `INCIDENT#${incidentId}`,
          },
        })
      );
      resultItems = result.Items || [];
    } catch {
      resultItems = [];
    }

    if (resultItems.length > 0) {
      let incident: IncidentRecord | null = null;
      const timeline: TimelineEventRecord[] = [];
      const evidence: EvidenceRecord[] = [];
      let activePlan: ActionPlanRecord | undefined = undefined;
      const auditLogs: AuditRecord[] = [];

      for (const item of resultItems) {
        if (item.SK === 'METADATA') {
          incident = item as IncidentRecord;
        } else if (item.SK.startsWith('EVENT#')) {
          timeline.push(item as TimelineEventRecord);
        } else if (item.SK.startsWith('EVIDENCE#')) {
          evidence.push(item as EvidenceRecord);
        } else if (item.SK.startsWith('PLAN#')) {
          activePlan = item as ActionPlanRecord;
        } else if (item.SK.startsWith('AUDIT#')) {
          auditLogs.push(item as AuditRecord);
        }
      }

      if (incident) {
        // If baseline demo incident has missing evidence chunks in DynamoDB, enrich from baseline
        if (evidence.length === 0) {
          const fallback = getBaselineDemoBundle(incidentId);
          if (fallback && fallback.evidence.length > 0) {
            evidence.push(...fallback.evidence);
          }
        }

        timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        auditLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return {
          incident,
          timeline,
          evidence,
          activePlan,
          auditLogs,
        };
      }
    }

    // Fall back to pristine baseline demo bundle
    return getBaselineDemoBundle(incidentId);
  }

  async listIncidents(filters?: { status?: IncidentStatus; severity?: IncidentSeverity; limit?: number }): Promise<IncidentRecord[]> {
    const limit = filters?.limit || 50;
    let dbItems: IncidentRecord[] = [];

    try {
      const result = await dynamoDocClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
          ExpressionAttributeValues: {
            ':pk': 'INCIDENT#',
            ':sk': 'METADATA',
          },
        })
      );
      dbItems = ((result.Items as IncidentRecord[]) || []).filter(
        (item) => item && typeof item.incidentId === 'string' && item.incidentId.trim() !== ''
      );
    } catch (scanErr) {
      console.warn('DynamoDB scan failed in listIncidents, using baseline fallback:', scanErr);
    }

    // Merge baseline demo incidents with live database items
    const baseline = getBaselineDemoIncidents();
    const itemMap = new Map<string, IncidentRecord>();

    // Seed map with baseline demo incidents
    for (const base of baseline) {
      if (base && base.incidentId) {
        itemMap.set(base.incidentId, base);
      }
    }

    // Overlay real DynamoDB items (persisted user records + any modified demo records)
    for (const item of dbItems) {
      if (item && item.incidentId) {
        itemMap.set(item.incidentId, item);
      }
    }

    let combined = Array.from(itemMap.values());

    // Apply filtering
    if (filters?.status) {
      combined = combined.filter((i) => i.status === filters.status);
    }
    if (filters?.severity) {
      combined = combined.filter((i) => i.severity === filters.severity);
    }

    // Sort newest first
    combined.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return combined.slice(0, limit);
  }

  async updateIncidentStatus(incidentId: string, status: IncidentStatus, expectedVersion: number): Promise<IncidentRecord> {
    const now = new Date().toISOString();
    const result = await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `INCIDENT#${incidentId}`,
          SK: 'METADATA',
        },
        UpdateExpression: 'SET #st = :st, GSI1PK = :gsi1pk, updatedAt = :now, version = version + :inc',
        ConditionExpression: 'version = :expectedVersion',
        ExpressionAttributeNames: {
          '#st': 'status',
        },
        ExpressionAttributeValues: {
          ':st': status,
          ':gsi1pk': `STATUS#${status}`,
          ':now': now,
          ':inc': 1,
          ':expectedVersion': expectedVersion,
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes as IncidentRecord;
  }

  async addTimelineEvent(event: Omit<TimelineEventRecord, 'PK' | 'SK'>): Promise<TimelineEventRecord> {
    const item: TimelineEventRecord = {
      ...event,
      PK: `INCIDENT#${event.incidentId}`,
      SK: `EVENT#${event.timestamp}#${event.eventId}`,
    };
    await dynamoDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
    return item;
  }

  async saveEvidenceChunks(chunks: Omit<EvidenceRecord, 'PK' | 'SK'>[]): Promise<EvidenceRecord[]> {
    if (chunks.length === 0) return [];

    const uniqueMap = new Map<string, EvidenceRecord>();
    for (const c of chunks) {
      const item: EvidenceRecord = {
        ...c,
        PK: `INCIDENT#${c.incidentId}`,
        SK: `EVIDENCE#${c.chunkId}`,
      };
      uniqueMap.set(`${item.PK}#${item.SK}`, item);
    }
    const items = Array.from(uniqueMap.values());

    await dynamoDocClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: items.map((Item) => ({
            PutRequest: { Item },
          })),
        },
      })
    );
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
    await dynamoDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
    return item;
  }

  async updateActionStatus(
    incidentId: string,
    planId: string,
    actionId: string,
    status: 'APPROVED' | 'SUCCESS' | 'FAILED',
    resultSummary?: string
  ): Promise<ActionPlanRecord> {
    // Fetch plan, update action item, save
    const current = await dynamoDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `INCIDENT#${incidentId}`,
          SK: `PLAN#${planId}`,
        },
      })
    );
    if (!current.Item) throw new Error(`Action plan not found: ${planId}`);
    const plan = current.Item as ActionPlanRecord;
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

    await dynamoDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: plan,
      })
    );
    return plan;
  }

  async addAuditLog(log: Omit<AuditRecord, 'PK' | 'SK'>): Promise<AuditRecord> {
    const item: AuditRecord = {
      ...log,
      PK: `INCIDENT#${log.incidentId}`,
      SK: `AUDIT#${log.timestamp}#${log.auditId}`,
    };
    await dynamoDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
    return item;
  }

  async patchIncident(
    incidentId: string,
    updates: Partial<IncidentRecord>,
    expectedVersion: number
  ): Promise<IncidentRecord> {
    const now = new Date().toISOString();
    const updateExpressions: string[] = ['#updatedAt = :now', '#version = #version + :inc'];
    const exprAttrNames: Record<string, string> = {
      '#updatedAt': 'updatedAt',
      '#version': 'version',
    };
    const exprAttrValues: Record<string, unknown> = {
      ':now': now,
      ':inc': 1,
      ':expectedVersion': expectedVersion,
    };

    const forbiddenKeys = new Set(['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK', 'version', 'createdAt', 'updatedAt', 'incidentId']);
    let counter = 0;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && !forbiddenKeys.has(key)) {
        const attrKey = `#f${counter}`;
        const valKey = `:v${counter}`;
        exprAttrNames[attrKey] = key;
        exprAttrValues[valKey] = value;
        updateExpressions.push(`${attrKey} = ${valKey}`);
        counter++;
      }
    }

    if (updates.status) {
      updateExpressions.push('GSI1PK = :gsi1pk');
      exprAttrValues[':gsi1pk'] = `STATUS#${updates.status}`;
    }

    if (updates.severity) {
      updateExpressions.push('GSI2PK = :gsi2pk');
      exprAttrValues[':gsi2pk'] = `SEV#${updates.severity}`;
    }

    try {
      const result = await dynamoDocClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `INCIDENT#${incidentId}`,
            SK: 'METADATA',
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ConditionExpression: 'attribute_exists(PK) AND #version = :expectedVersion',
          ExpressionAttributeNames: exprAttrNames,
          ExpressionAttributeValues: exprAttrValues,
          ReturnValues: 'ALL_NEW',
        })
      );
      return result.Attributes as IncidentRecord;
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj?.name === 'ConditionalCheckFailedException') {
        throw new Error(`OptimisticLockException: Stale version or incident not found for ID ${incidentId}`);
      }
      throw err;
    }
  }

  async getEvents(
    incidentId: string
  ): Promise<{ timeline: TimelineEventRecord[]; auditLogs: AuditRecord[] }> {
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `INCIDENT#${incidentId}`,
        },
      })
    );

    const timeline: TimelineEventRecord[] = [];
    const auditLogs: AuditRecord[] = [];

    if (result.Items) {
      for (const item of result.Items) {
        if (item.SK.startsWith('EVENT#')) {
          timeline.push(item as TimelineEventRecord);
        } else if (item.SK.startsWith('AUDIT#')) {
          auditLogs.push(item as AuditRecord);
        }
      }
    }

    timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    auditLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return { timeline, auditLogs };
  }

  async setResolution(incidentId: string, reportUrl: string, mttmSeconds: number): Promise<IncidentRecord> {
    const now = new Date().toISOString();
    const result = await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `INCIDENT#${incidentId}`,
          SK: 'METADATA',
        },
        UpdateExpression: 'SET #st = :st, GSI1PK = :gsi1pk, postmortemUrl = :url, mttmSeconds = :mttm, updatedAt = :now',
        ExpressionAttributeNames: {
          '#st': 'status',
        },
        ExpressionAttributeValues: {
          ':st': 'RESOLVED',
          ':gsi1pk': 'STATUS#RESOLVED',
          ':url': reportUrl,
          ':mttm': mttmSeconds,
          ':now': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes as IncidentRecord;
  }

  async resetDemo(): Promise<void> {
    // DynamoDB reset: Reset demo incident status back to DETECTED if present
    const now = new Date().toISOString();
    try {
      await dynamoDocClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: 'INCIDENT#inc-2026-0917-01',
            SK: 'METADATA',
          },
          UpdateExpression: 'SET #st = :st, GSI1PK = :gsi1pk, updatedAt = :now REMOVE postmortemUrl, mttmSeconds',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: {
            ':st': 'DETECTED',
            ':gsi1pk': 'STATUS#DETECTED',
            ':now': now,
          },
        })
      );
    } catch {
      // If table item not found, ignore
    }
  }
}
