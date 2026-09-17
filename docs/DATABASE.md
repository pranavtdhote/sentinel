# DATABASE.md — DynamoDB Single-Table Schema & Access Patterns

> **Table Name**: `sentinel-records-prod` (and `sentinel-records-dev`)  
> **Billing Mode**: PAY_PER_REQUEST (On-Demand)  
> **Encryption**: AWS Managed KMS (alias/aws/dynamodb)  
> **Point-In-Time Recovery (PITR)**: Enabled  
> **Time To Live (TTL)**: Attribute `ttl` enabled (epoch seconds)

---

## 1. Single-Table Architecture Rationale

SENTINEL adopts a single-table architecture in Amazon DynamoDB to deliver:
1. **Sub-10ms latency** across all incident command workflows.
2. **Atomic transactions** (`TransactWriteItems`) linking action plan approval and audit log creation without distributed lock hazards.
3. **Optimistic Locking** (`version` counter) preventing concurrent approval race conditions among multiple on-call commanders.
4. **Predictable query cost** by avoiding full table scans and utilizing indexed composite partition/sort keys.

---

## 2. Table Primary Keys & Global Secondary Indexes (GSIs)

### 2.1 Base Table Keys
- **Partition Key (`PK`)**: `String` — Entity Partition Identifier (e.g., `INCIDENT#inc-8842`)
- **Sort Key (`SK`)**: `String` — Sub-entity discriminator & temporal ordering (e.g., `METADATA`, `EVENT#2026-09-17T10:15:00Z#ev-01`)

### 2.2 Global Secondary Indexes

| Index Name | Partition Key (`PK`) | Sort Key (`SK`) | Projection | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`GSI1-StatusIndex`** | `GSI1PK` (`String`): `STATUS#<status>` | `GSI1SK` (`String`): `CREATED#<iso8601>` | `ALL` | Retrieve incidents by active lifecycle status (e.g., `STATUS#INVESTIGATING`) ordered chronologically. |
| **`GSI2-SeverityIndex`** | `GSI2PK` (`String`): `SEV#<severity>` | `GSI2SK` (`String`): `CREATED#<iso8601>` | `ALL` | Query high-priority on-call queues (e.g., all active `SEV1` / `SEV2` incidents). |

---

## 3. Entity Schemas & Key Design

```
+--------------------------+-------------------------------------+-----------------------------------+
| Entity                   | Partition Key (PK)                  | Sort Key (SK)                     |
+--------------------------+-------------------------------------+-----------------------------------+
| Incident Metadata        | INCIDENT#<incidentId>               | METADATA                          |
| Timeline Event           | INCIDENT#<incidentId>               | EVENT#<timestamp>#<eventId>       |
| Bedrock Evidence Chunk   | INCIDENT#<incidentId>               | EVIDENCE#<chunkId>                |
| Action Plan Proposal     | INCIDENT#<incidentId>               | PLAN#<planId>                     |
| Mitigation Action Item   | INCIDENT#<incidentId>               | ACTION#<planId>#<actionId>        |
| Cryptographic Approval   | INCIDENT#<incidentId>               | APPROVAL#<planId>#<actionId>      |
| Audit Log Entry          | INCIDENT#<incidentId>               | AUDIT#<timestamp>#<auditId>       |
| System Metric Snapshot   | INCIDENT#<incidentId>               | TELEMETRY#<timestamp>             |
+--------------------------+-------------------------------------+-----------------------------------+
```

---

## 4. Entity Attribute Specifications

### 4.1 Incident Metadata (`SK = METADATA`)
```json
{
  "PK": "INCIDENT#inc-2026-0917-01",
  "SK": "METADATA",
  "GSI1PK": "STATUS#INVESTIGATING",
  "GSI1SK": "CREATED#2026-09-17T10:14:30.000Z",
  "GSI2PK": "SEV#SEV1",
  "GSI2SK": "CREATED#2026-09-17T10:14:30.000Z",
  "incidentId": "inc-2026-0917-01",
  "title": "Payment Processing API 504 Gateway Timeout Spikes",
  "service": "payment-checkout-service",
  "environment": "production",
  "severity": "SEV1",
  "status": "INVESTIGATING",
  "commander": "prana@sentinel.internal",
  "summary": "P99 latency jumped from 120ms to 4,800ms following deployment v2.14.0. Upstream Stripe webhook errors increasing.",
  "rootCauseHypothesis": "Connection pool exhaustion on Aurora RDS cluster caused by unindexed query introduced in commit 89f4b3c.",
  "confidenceScore": 0.94,
  "mttdSeconds": 94,
  "version": 3,
  "createdAt": "2026-09-17T10:14:30.000Z",
  "updatedAt": "2026-09-17T10:16:45.000Z"
}
```

### 4.2 Bedrock Grounded Evidence Chunk (`SK = EVIDENCE#<chunkId>`)
```json
{
  "PK": "INCIDENT#inc-2026-0917-01",
  "SK": "EVIDENCE#ev-chunk-302",
  "incidentId": "inc-2026-0917-01",
  "chunkId": "ev-chunk-302",
  "sourceType": "BEDROCK_KNOWLEDGE_BASE",
  "sourceUri": "s3://sentinel-runbooks-prod/payments/aurora-connection-leak.md",
  "knowledgeBaseId": "KB-SENTINEL-RUNBOOKS",
  "documentTitle": "Runbook: Aurora PostgreSQL Connection Pool Recovery",
  "snippet": "If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool rollback_ecs_service followed by terminating idle backend sessions.",
  "relevanceScore": 0.962,
  "retrievedAt": "2026-09-17T10:15:10.000Z"
}
```

### 4.3 Action Plan Proposal (`SK = PLAN#<planId>`)
```json
{
  "PK": "INCIDENT#inc-2026-0917-01",
  "SK": "PLAN#plan-781",
  "incidentId": "inc-2026-0917-01",
  "planId": "plan-781",
  "generatedByModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "status": "PENDING_APPROVAL",
  "summary": "Two-step remediation: Revert payment-checkout-service to stable v2.13.9 image, then warm up read-replica connections.",
  "blastRadiusRisk": "MEDIUM",
  "blastRadiusDetail": "Rolling back 4 ECS tasks will cause ~1.5s of transient connection reset; Stripe clients will automatically retry.",
  "estimatedMitigationTime": "3 minutes",
  "actions": [
    {
      "actionId": "act-01",
      "order": 1,
      "toolName": "rollback_ecs_task_definition",
      "requiresApproval": true,
      "parameters": {
        "cluster": "prod-services",
        "service": "payment-checkout-service",
        "targetTaskDefinition": "payment-checkout-service:48"
      },
      "status": "PENDING_APPROVAL"
    },
    {
      "actionId": "act-02",
      "order": 2,
      "toolName": "verify_cloudwatch_alarm_state",
      "requiresApproval": false,
      "parameters": {
        "alarmName": "PaymentApiHighLatencyAlarm",
        "expectedState": "OK"
      },
      "status": "QUEUED"
    }
  ],
  "createdAt": "2026-09-17T10:15:20.000Z"
}
```

### 4.4 Cryptographic Approval & Audit Record (`SK = AUDIT#<timestamp>#<auditId>`)
```json
{
  "PK": "INCIDENT#inc-2026-0917-01",
  "SK": "AUDIT#2026-09-17T10:16:00.000Z#aud-991",
  "auditId": "aud-991",
  "incidentId": "inc-2026-0917-01",
  "eventType": "ACTION_APPROVED_AND_EXECUTED",
  "actor": {
    "email": "prana@sentinel.internal",
    "role": "INCIDENT_COMMANDER",
    "ipAddress": "198.51.100.42"
  },
  "actionId": "act-01",
  "toolName": "rollback_ecs_task_definition",
  "approvalTokenSignature": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "executionOutput": {
    "status": "SUCCESS",
    "awsRequestId": "73d42bc9-f2a8-4509-bf21-9988ff112233",
    "previousTaskDef": "payment-checkout-service:49",
    "currentTaskDef": "payment-checkout-service:48",
    "durationMs": 1420
  },
  "timestamp": "2026-09-17T10:16:00.000Z"
}
```

---

## 5. Complete DynamoDB Access Pattern Matrix

| ID | Access Pattern / Query Intent | Target Key Expression / Index | Filter / Condition Expression | Expected Latency |
| :--- | :--- | :--- | :--- | :--- |
| **AP-01** | Create new incident | `PK = INCIDENT#<id>`, `SK = METADATA` | `attribute_not_exists(PK)` | < 8 ms |
| **AP-02** | Fetch incident metadata | `PK = INCIDENT#<id>`, `SK = METADATA` | None | < 5 ms |
| **AP-03** | Fetch entire incident bundle (metadata, timeline, evidence, plans, audit) | `PK = INCIDENT#<id>` | Query all items in partition | < 12 ms |
| **AP-04** | List active incidents by status (e.g. `INVESTIGATING`) | `GSI1PK = STATUS#INVESTIGATING`, `GSI1SK > CREATED#<time>` | `ScanIndexForward = false` | < 10 ms |
| **AP-05** | List critical on-call queue (`SEV1` / `SEV2`) | `GSI2PK = SEV#SEV1`, `GSI2SK > CREATED#<time>` | `ScanIndexForward = false` | < 10 ms |
| **AP-06** | Append timeline or telemetry event | `PK = INCIDENT#<id>`, `SK = EVENT#<iso>#<uuid>` | None | < 6 ms |
| **AP-07** | Store Bedrock Knowledge Base citations | `BatchWriteItem` (`PK = INCIDENT#<id>`, `SK = EVIDENCE#<id>`) | None | < 15 ms |
| **AP-08** | Persist generated AI Action Plan | `PK = INCIDENT#<id>`, `SK = PLAN#<planId>` | None | < 7 ms |
| **AP-09** | Optimistic atomic action approval | `PK = INCIDENT#<id>`, `SK = PLAN#<planId>` | `version = :expectedVersion AND #st = :pending` | < 9 ms |
| **AP-10** | Append immutable audit log | `PK = INCIDENT#<id>`, `SK = AUDIT#<iso>#<uuid>` | `attribute_not_exists(SK)` | < 6 ms |
| **AP-11** | Close incident with postmortem S3 URI | `UpdateItem(PK = INCIDENT#<id>, SK = METADATA)` | Sets `status = RESOLVED`, `reportUrl = <s3Url>` | < 8 ms |

---

## 6. TypeScript Type Definitions (`/lib/types/database.ts`)

```typescript
export type IncidentSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
export type IncidentStatus = 'DETECTED' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'CLOSED';

export interface IncidentRecord {
  PK: `INCIDENT#${string}`;
  SK: 'METADATA';
  GSI1PK: `STATUS#${IncidentStatus}`;
  GSI1SK: `CREATED#${string}`;
  GSI2PK: `SEV#${IncidentSeverity}`;
  GSI2SK: `CREATED#${string}`;
  incidentId: string;
  title: string;
  service: string;
  environment: 'production' | 'staging';
  severity: IncidentSeverity;
  status: IncidentStatus;
  commander: string;
  summary: string;
  rootCauseHypothesis?: string;
  confidenceScore?: number;
  postmortemUrl?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
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
  requiresApproval: boolean;
  parameters: Record<string, unknown>;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTING' | 'SUCCESS' | 'FAILED';
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
  eventType: 'INCIDENT_CREATED' | 'TRIAGE_COMPLETED' | 'ACTION_APPROVED_AND_EXECUTED' | 'ACTION_REJECTED' | 'INCIDENT_RESOLVED';
  actor: {
    email: string;
    role: 'VIEWER' | 'RESPONDER' | 'INCIDENT_COMMANDER' | 'ADMIN';
    ipAddress?: string;
  };
  actionId?: string;
  toolName?: string;
  approvalTokenSignature?: string;
  executionOutput?: Record<string, unknown>;
  timestamp: string;
}
```
