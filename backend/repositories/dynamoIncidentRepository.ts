import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
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
    const result = await dynamoDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `INCIDENT#${incidentId}`,
          SK: 'METADATA',
        },
      })
    );
    return (result.Item as IncidentRecord) || null;
  }

  async getFullIncidentBundle(incidentId: string): Promise<FullIncidentBundle | null> {
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `INCIDENT#${incidentId}`,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) return null;

    let incident: IncidentRecord | null = null;
    const timeline: TimelineEventRecord[] = [];
    const evidence: EvidenceRecord[] = [];
    let activePlan: ActionPlanRecord | undefined = undefined;
    const auditLogs: AuditRecord[] = [];

    for (const item of result.Items) {
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

    if (!incident) return null;

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

  async listIncidents(filters?: { status?: IncidentStatus; severity?: IncidentSeverity; limit?: number }): Promise<IncidentRecord[]> {
    const limit = filters?.limit || 20;

    if (filters?.status) {
      const result = await dynamoDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1-StatusIndex',
          KeyConditionExpression: 'GSI1PK = :spk',
          ExpressionAttributeValues: {
            ':spk': `STATUS#${filters.status}`,
          },
          ScanIndexForward: false,
          Limit: limit,
        })
      );
      return (result.Items as IncidentRecord[]) || [];
    }

    if (filters?.severity) {
      const result = await dynamoDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI2-SeverityIndex',
          KeyConditionExpression: 'GSI2PK = :vpk',
          ExpressionAttributeValues: {
            ':vpk': `SEV#${filters.severity}`,
          },
          ScanIndexForward: false,
          Limit: limit,
        })
      );
      return (result.Items as IncidentRecord[]) || [];
    }

    // Default: query all incidents
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1-StatusIndex',
        KeyConditionExpression: 'GSI1PK = :spk',
        ExpressionAttributeValues: {
          ':spk': 'STATUS#INVESTIGATING',
        },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
    return (result.Items as IncidentRecord[]) || [];
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
    const items: EvidenceRecord[] = chunks.map((c) => ({
      ...c,
      PK: `INCIDENT#${c.incidentId}`,
      SK: `EVIDENCE#${c.chunkId}`,
    }));

    if (items.length === 0) return [];

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
