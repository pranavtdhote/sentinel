# AI_CONTRACTS.md — Amazon Bedrock Prompts, Schemas & Grounding Contracts

> **Primary Model**: `anthropic.claude-3-5-sonnet-20241022-v2:0`  
> **Cost-Efficient / Fast Fallback**: `amazon.nova-pro-v1:0` or `anthropic.claude-3-haiku-20240307-v1:0`  
> **Inference Engine**: `@aws-sdk/client-bedrock-runtime` (Converse API)  
> **Strict Temperature**: `0.1` (deterministic, zero-creativity operational responses)

---

## 1. Zero-Hallucination & Evidence Grounding Rules

To ensure Sentinel is strictly enterprise-ready and safe for mission-critical infrastructure:
1. **Never mutate without human sign-off**: The model output is strictly an *advisory proposal*; it cannot write to DynamoDB or invoke AWS APIs directly.
2. **Grounding Requirement**: Every hypothesis and proposed action **MUST** cite an exact `evidence_id` from the retrieved Bedrock Knowledge Base chunks or CloudWatch telemetry.
3. **No Invented AWS Resource IDs**: If an ECS cluster name, Lambda ARN, or Auto Scaling Group is not explicitly present in the input telemetry or retrieved runbooks, the model is forbidden from guessing or synthesizing placeholder names (`e.g. prod-my-cluster-123`). Violations cause immediate schema rejection.
4. **Strict JSON Output**: Responses must strictly follow the JSON Schema using `additionalProperties: false`.

---

## 2. Contract 1: Incident Triage & Hypothesis Formulation

### 2.1 System Prompt
```markdown
You are SENTINEL's Lead Incident Intelligence SRE. Your duty is to analyze incident alerts, logs, and runbook evidence to produce an accurate root-cause hypothesis and confidence rating.

CRITICAL OPERATIONAL RULES:
1. Ground every conclusion in the provided EVIDENCE CHUNKS or TELEMETRY.
2. If the root cause cannot be definitively determined from the evidence, state the top probable hypotheses and explicitly cite missing telemetry.
3. Output MUST be valid JSON adhering strictly to the schema provided.
4. Do NOT include markdown code fences (```json) in your final response—return pure raw JSON only.
```

### 2.2 Input Prompt Structure
```json
{
  "incidentContext": {
    "incidentId": "inc-2026-0917-01",
    "title": "Payment Checkout API 504 Gateway Timeout Spikes",
    "service": "payment-checkout-service",
    "severity": "SEV1",
    "summary": "P99 latency surged from 120ms to 4,800ms following release v2.14.0."
  },
  "retrievedEvidence": [
    {
      "chunkId": "ev-chunk-302",
      "documentTitle": "Runbook: Aurora PostgreSQL Connection Pool Recovery",
      "snippet": "If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool rollback_ecs_service..."
    }
  ],
  "telemetryLogs": [
    "[2026-09-17T10:14:12Z] [ERROR] ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z."
  ]
}
```

### 2.3 Zod Output Validation Schema
```typescript
import { z } from 'zod';

export const IncidentTriageOutputSchema = z.object({
  rootCauseHypothesis: z.string().min(20).max(500),
  confidenceScore: z.number().min(0.0).max(1.0),
  primaryImpact: z.string().max(250),
  citedEvidenceIds: z.array(z.string()).min(1),
  recommendedStrategy: z.enum([
    'ROLLBACK_DEPLOYMENT',
    'SCALE_HORIZONTAL',
    'RESTART_SERVICE',
    'TOGGLE_FEATURE_FLAG',
    'ESCALATE_TO_DATABASE_TEAM'
  ]),
  technicalSummary: z.string().min(50).max(1000)
});

export type IncidentTriageOutput = z.infer<typeof IncidentTriageOutputSchema>;
```

---

## 3. Contract 2: Action Plan & Blast-Radius Formulation

### 3.1 System Prompt
```markdown
You are SENTINEL's Autonomous Mitigation Planner. Formulate an atomic step-by-step remediation action plan to mitigate the active incident.

RULES:
1. Categorize each action as:
   - READ_ONLY (requiresApproval: false, e.g. verify metrics, query logs)
   - MUTATING (requiresApproval: true, e.g. rollback, restart, scale)
2. Every tool invocation must supply valid parameters using ONLY resource names present in the context.
3. Assess the blast radius (LOW, MEDIUM, HIGH) with exact customer-facing impact details.
4. Output MUST be valid JSON adhering strictly to the schema provided.
```

### 3.2 Zod Output Validation Schema
```typescript
import { z } from 'zod';

export const AllowedToolNames = z.enum([
  'rollback_ecs_task_definition',
  'restart_ecs_service',
  'scale_auto_scaling_group',
  'toggle_feature_flag',
  'query_cloudwatch_insights',
  'verify_cloudwatch_alarm_state'
]);

export const ActionItemSchema = z.object({
  actionId: z.string().regex(/^act-[0-9]{2,}$/),
  order: z.number().int().positive(),
  toolName: AllowedToolNames,
  description: z.string().min(10).max(300),
  requiresApproval: z.boolean(),
  parameters: z.record(z.string(), z.any()),
  blastRadiusRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  rollbackStrategy: z.string().min(10)
});

export const ActionPlanOutputSchema = z.object({
  planSummary: z.string().min(20).max(400),
  overallRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  estimatedRecoveryMinutes: z.number().int().positive(),
  actions: z.array(ActionItemSchema).min(1).max(5)
});

export type ActionPlanOutput = z.infer<typeof ActionPlanOutputSchema>;
```

---

## 4. Contract 3: Post-Incident Retrospective & Postmortem Synthesis

### 4.1 System Prompt
```markdown
You are SENTINEL's Postmortem Documenter. Generate a comprehensive, blameless SRE postmortem retrospective in GitHub-flavored Markdown.

Include sections:
1. Executive Summary & Impact Metrics (MTTD, MTTM, Total Downtime)
2. Timeline of Key Events (Detection, Triage, Approval, Mitigation, Recovery)
3. Root Cause Analysis (5-Whys methodology)
4. What Went Well & Where Sentinel Accelerated Resolution
5. Preventative Action Items with Owners and Jira-style tickets
```

### 4.2 Output Structure
```typescript
export const PostmortemOutputSchema = z.object({
  title: z.string(),
  executiveSummary: z.string().min(50),
  mttdMinutes: z.number(),
  mttmMinutes: z.number(),
  rootCauseAnalysis: z.string().min(100),
  timelineEntries: z.array(z.object({
    time: z.string(),
    description: z.string(),
    actor: z.string()
  })),
  preventativeItems: z.array(z.object({
    ticketId: z.string(),
    action: z.string(),
    owner: z.string(),
    priority: z.enum(['P0', 'P1', 'P2'])
  })),
  markdownReport: z.string().min(200)
});
```

---

## 5. Tool Definitions & Parameter Contracts

These tool definitions are registered with Bedrock Runtime and executed strictly via the isolated `/backend/tools` runner:

### 5.1 `rollback_ecs_task_definition`
- **Description**: Rolls back an Amazon ECS service to a prior verified stable task definition revision.
- **Safety Level**: Mutating (Requires Human Commander Approval)
- **Parameters**:
  - `cluster`: `string` (e.g. `prod-services`)
  - `service`: `string` (e.g. `payment-checkout-service`)
  - `targetTaskDefinition`: `string` (e.g. `payment-checkout-service:48`)

### 5.2 `restart_ecs_service`
- **Description**: Triggers a zero-downtime rolling restart of all container tasks in an ECS service.
- **Safety Level**: Mutating (Requires Human Commander Approval)
- **Parameters**:
  - `cluster`: `string`
  - `service`: `string`

### 5.3 `scale_auto_scaling_group`
- **Description**: Adjusts the desired and minimum capacity of an EC2 Auto Scaling Group.
- **Safety Level**: Mutating (Requires Human Commander Approval)
- **Parameters**:
  - `autoScalingGroupName`: `string`
  - `desiredCapacity`: `integer` (max: 20)
  - `reason`: `string`

### 5.4 `verify_cloudwatch_alarm_state`
- **Description**: Queries CloudWatch to check whether a specific alarm has transitioned from ALARM to OK.
- **Safety Level**: Read-Only (Autonomous Execution Allowed)
- **Parameters**:
  - `alarmName`: `string`
  - `expectedState`: `OK` | `ALARM` | `INSUFFICIENT_DATA`

---

## 6. Model Parameters & Inference Configuration

```typescript
export const BEDROCK_INFERENCE_CONFIG = {
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  inferenceConfig: {
    maxTokens: 2048,
    temperature: 0.1,
    topP: 0.9,
    stopSequences: []
  },
  additionalModelRequestFields: {
    top_k: 250
  }
};
```
