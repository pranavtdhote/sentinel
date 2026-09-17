# API.md — SENTINEL RESTful & Server Actions API Specification

> **Base URL**: `/api` (Next.js 15 Route Handlers & AWS API Gateway HTTP API v2)  
> **Protocol**: HTTPS / JSON  
> **Authentication**: Bearer JWT (Amazon Cognito / Mock Dev Header)  
> **Idempotency**: Supported via `X-Idempotency-Key` header on all mutation endpoints

---

## 1. Authentication & Security Headers

All mutating requests must include:
```http
Authorization: Bearer <Cognito-Id-Token>
Content-Type: application/json
X-Idempotency-Key: 7f3b890a-1123-4412-a843-0988bcde1234
X-Sentinel-Actor-Role: INCIDENT_COMMANDER
```

---

## 2. API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/incidents` | Ingest new incident report or webhook alert | Yes (`RESPONDER`+) |
| `GET` | `/api/incidents` | List active & historical incidents with pagination & filters | Yes (`VIEWER`+) |
| `GET` | `/api/incidents/:id` | Fetch full incident partition (metadata, evidence, actions, audit) | Yes (`VIEWER`+) |
| `POST` | `/api/incidents/:id/triage` | Trigger Bedrock Knowledge Base RAG & root-cause reasoning | Yes (`RESPONDER`+) |
| `POST` | `/api/incidents/:id/action-plans` | Formulate mitigation action plan with blast-radius analysis | Yes (`RESPONDER`+) |
| `POST` | `/api/incidents/:id/approve-action` | Cryptographically approve and schedule/execute a remediation action | Yes (`INCIDENT_COMMANDER`+) |
| `POST` | `/api/incidents/:id/execute-action` | Execute approved remediation action via AWS SDK tool runner | Yes (Internal / Guarded) |
| `POST` | `/api/incidents/:id/resolve` | Mark incident resolved & generate Bedrock postmortem to S3 | Yes (`INCIDENT_COMMANDER`+) |
| `GET` | `/api/analytics` | Retrieve MTTD, MTTR, AI token consumption, and tool reliability | Yes (`VIEWER`+) |
| `GET` | `/api/health` | Live probe for DynamoDB, S3, and Bedrock connectivity | No |

---

## 3. Endpoint Specifications

### 3.1 `POST /api/incidents` — Ingest Incident
Ingests a new incident from monitoring alerts (DataDog, CloudWatch, PagerDuty) or manual SRE creation.

#### Request Body
```json
{
  "title": "Payment Checkout API 504 Gateway Timeout Spikes",
  "service": "payment-checkout-service",
  "environment": "production",
  "severity": "SEV1",
  "summary": "P99 latency surged from 120ms to 4,800ms following release v2.14.0. Upstream Stripe webhook errors reaching 12% failure threshold.",
  "rawAlertPayload": {
    "alarmName": "PaymentApiLatencyAlarm",
    "region": "us-east-1",
    "timestamp": "2026-09-17T10:14:30.000Z",
    "metricValue": 4820
  }
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "data": {
    "incidentId": "inc-2026-0917-01",
    "status": "DETECTED",
    "severity": "SEV1",
    "title": "Payment Checkout API 504 Gateway Timeout Spikes",
    "createdAt": "2026-09-17T10:14:30.000Z"
  }
}
```

---

### 3.2 `GET /api/incidents` — List Incidents
Query incidents with pagination, status filters, and severity queues.

#### Query Parameters
- `status` (`optional`, e.g. `INVESTIGATING`)
- `severity` (`optional`, e.g. `SEV1`)
- `service` (`optional`, e.g. `payment-checkout-service`)
- `limit` (`default: 20`, `max: 100`)
- `cursor` (`optional`, base64 encoded LastEvaluatedKey)

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "incidentId": "inc-2026-0917-01",
        "title": "Payment Checkout API 504 Gateway Timeout Spikes",
        "service": "payment-checkout-service",
        "severity": "SEV1",
        "status": "INVESTIGATING",
        "commander": "prana@sentinel.internal",
        "createdAt": "2026-09-17T10:14:30.000Z",
        "updatedAt": "2026-09-17T10:15:20.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

---

### 3.3 `POST /api/incidents/:id/triage` — Autonomous Triage & RAG Grounding
Queries Bedrock Knowledge Bases for relevant runbooks, invokes Bedrock Converse with Claude 3.5 Sonnet, and returns a verified root-cause hypothesis.

#### Request Body
```json
{
  "telemetrySnippet": "CloudWatch Logs: [ERROR] ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z.",
  "knowledgeBaseId": "KB-SENTINEL-RUNBOOKS"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "incidentId": "inc-2026-0917-01",
    "status": "INVESTIGATING",
    "rootCauseHypothesis": "Database connection pool exhaustion on Aurora PostgreSQL cluster caused by unindexed query introduced in v2.14.0.",
    "confidenceScore": 0.94,
    "evidence": [
      {
        "chunkId": "ev-chunk-302",
        "documentTitle": "Runbook: Aurora PostgreSQL Connection Pool Recovery",
        "sourceUri": "s3://sentinel-runbooks-prod/payments/aurora-connection-leak.md",
        "relevanceScore": 0.962,
        "snippet": "If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool rollback_ecs_service..."
      }
    ],
    "modelInvocation": {
      "modelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "promptTokens": 1450,
      "completionTokens": 380,
      "latencyMs": 1820
    }
  }
}
```

---

### 3.4 `POST /api/incidents/:id/action-plans` — Action Plan Generation
Asks Bedrock to synthesize the triage evidence into a sequence of actionable remediation steps, categorizing each as auto-executable (read-only) or requiring human approval (mutating).

#### Request Body
```json
{
  "allowAutoRemediationForNonMutating": true
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "planId": "plan-781",
    "incidentId": "inc-2026-0917-01",
    "status": "PENDING_APPROVAL",
    "summary": "Rollback payment-checkout-service to v2.13.9, restart stalled tasks, and monitor alarm recovery.",
    "blastRadiusRisk": "MEDIUM",
    "blastRadiusDetail": "4 ECS tasks will transition; ~1.5s connection reset with automatic client retry.",
    "estimatedMitigationTime": "3 minutes",
    "actions": [
      {
        "actionId": "act-01",
        "order": 1,
        "toolName": "rollback_ecs_task_definition",
        "description": "Rollback ECS task definition from revision 49 to stable revision 48.",
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
        "description": "Verify PaymentApiHighLatencyAlarm transitions back to OK.",
        "requiresApproval": false,
        "parameters": {
          "alarmName": "PaymentApiHighLatencyAlarm",
          "expectedState": "OK"
        },
        "status": "QUEUED"
      }
    ]
  }
}
```

---

### 3.5 `POST /api/incidents/:id/approve-action` — Human Approval Gate
Submits the cryptographic approval token signed by an Incident Commander to execute a mutating action.

#### Request Body
```json
{
  "planId": "plan-781",
  "actionId": "act-01",
  "decision": "APPROVED",
  "approverEmail": "prana@sentinel.internal",
  "nonce": "e4d781b2-1132-4731-97b1-229988114400",
  "timestamp": "2026-09-17T10:16:00.000Z",
  "signature": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "actionId": "act-01",
    "status": "EXECUTED",
    "toolOutput": {
      "status": "SUCCESS",
      "awsRequestId": "73d42bc9-f2a8-4509-bf21-9988ff112233",
      "previousTaskDef": "payment-checkout-service:49",
      "currentTaskDef": "payment-checkout-service:48",
      "durationMs": 1420
    },
    "incidentStatus": "MITIGATING",
    "auditId": "aud-991"
  }
}
```

---

### 3.6 `POST /api/incidents/:id/resolve` — Resolve & Export Postmortem
Marks the incident as resolved, prompts Bedrock to synthesize a structured postmortem retrospective, compiles it to Markdown/PDF, and persists to S3.

#### Request Body
```json
{
  "resolutionSummary": "Service restored following rollback to revision 48. Aurora connection count stabilized at 42 connections.",
  "triggerPostmortemGeneration": true
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "incidentId": "inc-2026-0917-01",
    "status": "RESOLVED",
    "resolvedAt": "2026-09-17T10:22:15.000Z",
    "mttdSeconds": 94,
    "mttmSeconds": 465,
    "postmortem": {
      "s3Key": "postmortems/2026-0917-inc-01-retrospective.md",
      "downloadUrl": "https://sentinel-reports-prod.s3.amazonaws.com/postmortems/2026-0917-inc-01-retrospective.md?AWSAccessKeyId=...",
      "rootCause": "Unindexed database query in commit 89f4b3c exhausted connection pool.",
      "actionItems": [
        "Add database migration query index on orders.customer_uuid",
        "Update pre-deployment load test to simulate 500 concurrent checkout sessions"
      ]
    }
  }
}
```

---

## 4. Standardized Error Response Envelope

All non-2xx responses adhere to this structure:
```json
{
  "success": false,
  "error": {
    "code": "GROUNDING_VIOLATION",
    "message": "Generated tool parameter 'prod-internal-db' is not grounded in retrieved runbook evidence.",
    "details": {
      "proposingModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "violatingField": "actions[0].parameters.cluster"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED_ROLE`: User lacks `INCIDENT_COMMANDER` role.
- `TOKEN_EXPIRED`: Approval nonce is older than 300 seconds.
- `BEDROCK_QUOTA_EXCEEDED`: Bedrock TPS limit reached; automatic fallback to cached mock fixture enabled for demo.
- `OPTIMISTIC_LOCK_FAILURE`: Incident version changed concurrently.
- `TOOL_EXECUTION_ERROR`: Target AWS service returned a client error.
