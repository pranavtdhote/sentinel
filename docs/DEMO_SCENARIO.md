# DEMO_SCENARIO.md — 3-Minute Video Demo Script & Deterministic Walkthrough

> **Submission Constraint**: Video duration must be strictly under 3 minutes (180 seconds).  
> **Judges' Scoring Criterion**: Functionality must be visibly demonstrated, with AWS services actively powering the workflow.

---

## 1. Demo Scenario Overview

- **Incident Title**: `Payment Checkout API 504 Gateway Timeout Spikes`
- **Impacted Service**: `payment-checkout-service` (Production ECS Cluster `prod-services`)
- **Severity**: `SEV1` (Critical Revenue Impact)
- **Root Cause**: Unindexed SQL query in release v2.14.0 exhausted Aurora PostgreSQL connection pool.
- **Remediation**: Autonomous rollback to verified stable task definition `payment-checkout-service:48`, followed by connection pool stabilization and automated S3 postmortem generation.

---

## 2. Second-by-Second Video Script (Total: 175s / 2m 55s)

```
0:00 -------------------- 0:30 -------------------- 1:00 -------------------- 1:45 -------------------- 2:25 -------------------- 2:55
[Hook & Problem]         [Bedrock Triage & RAG]   [Action Plan & HITL Gate] [Tool Runner & Recovery] [Postmortem in S3 & Logs] [Summary]
```

### Act 1: The Problem & Incident Ingestion (0:00 – 0:30 | 30s)
- **Visual**: Sentinel Workbench landing page featuring the Pleurat Shala design system (Cream `#fbf7e6`, amber tags, architectural wireframe schematic).
- **Voiceover**:
  > *"When a mission-critical service fails, every minute of downtime costs thousands of dollars. Welcome to SENTINEL, an AI Incident Intelligence and Autonomous Response platform powered by AWS. Today, our payment checkout service has triggered a critical SEV-1 alert: P99 latency has surged to 4.8 seconds, and Stripe webhooks are failing."*
- **Action**: Click "Simulate Live Ingestion" or "Create Incident". The incident card appears instantly with status `DETECTED` and severity `SEV1` persisted to Amazon DynamoDB.

### Act 2: Bedrock Autonomous Triage & Grounded Citations (0:30 – 1:00 | 30s)
- **Visual**: Click "Trigger Sentinel Autonomous Triage". Real-time pulse animation across the architectural flow diagram.
- **Voiceover**:
  > *"Instead of leaving engineers to guess across disjointed dashboards, Sentinel queries our Amazon Bedrock Knowledge Base backed by OpenSearch Serverless. Claude 3.5 Sonnet analyzes the incoming CloudWatch logs alongside our internal engineering runbooks."*
- **Action**: The triage card resolves in real-time. Root cause hypothesis appears: *"Aurora PostgreSQL connection pool exhaustion"*, with a 94% confidence score.
- **Key Demo Moment**: Click the grounded citation badge (`ev-chunk-302`). A drawer slides out displaying the exact passage from `s3://sentinel-runbooks-prod/payments/aurora-connection-leak.md` with relevance score 0.962.

### Act 3: Action Plan Formulation & Cryptographic Human Approval (1:00 – 1:45 | 45s)
- **Visual**: Sentinel presents the proposed Action Plan with a Blast-Radius assessment card.
- **Voiceover**:
  > *"Sentinel does not hallucinate arbitrary fixes or blindly mutate production infrastructure. It proposes a safe, structured remediation plan: rolling back the ECS task definition to revision 48, with an automated blast-radius evaluation."*
- **Key Demo Moment**: Show that the mutating action requires an Incident Commander sign-off. Click "Review & Authorize Mitigation". 
- **Voiceover**:
  > *"Here is our Human-in-the-Loop security gate. Notice the single-use cryptographic nonce and role validation. As Incident Commander, I sign and authorize execution."*
- **Action**: Click "Sign & Authorize". Status changes to `APPROVED` and dispatches to the isolated tool runner.

### Act 4: Real AWS Tool Execution & Health Recovery (1:45 – 2:25 | 40s)
- **Visual**: Tool Runner card shows real AWS SDK execution with AWS Request ID, latency (1,420ms), and previous/new task definition details.
- **Voiceover**:
  > *"The backend executes the AWS ECS rollback API via our isolated tool runner. Notice the live AWS request ID and sub-second execution. Instantly, our CloudWatch alarm transitions from ALARM back to OK, and connection pool saturation drops back to baseline."*
- **Action**: Incident status updates to `MITIGATING` then prompts for resolution.

### Act 5: Automated Postmortem in S3 & CloudWatch Audit Trail (2:25 – 2:55 | 30s)
- **Visual**: Click "Mark Resolved & Generate Postmortem". Bedrock compiles a comprehensive retrospective report.
- **Voiceover**:
  > *"With the incident mitigated, Sentinel synthesizes the full timeline, telemetry, and root cause into an executive retrospective, automatically exported to Amazon S3. In under three minutes, we diagnosed, mitigated, and documented a major outage—safely, predictably, and entirely powered by AWS."*
- **Action**: Click "Download Postmortem Report", showing the generated S3 signed link and the CloudWatch telemetry audit dashboard.

---

## 3. Deterministic Seed Data Manifest

To guarantee a flawless, repeatable demo recording, run:
```bash
npm run seed:demo
```

This populates DynamoDB and local fixtures with:
1. **Runbook Fixture**: `s3://sentinel-runbooks-prod/payments/aurora-connection-leak.md`
2. **Alert Log Payload**:
   ```
   [2026-09-17T10:14:12Z] [ERROR] ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z.
   [2026-09-17T10:14:15Z] [WARN] HTTP 504 Gateway Timeout returned on POST /v1/checkout/charge (latency: 4820ms)
   ```
3. **Verified Target Entities**:
   - ECS Cluster: `prod-services`
   - ECS Service: `payment-checkout-service`
   - Active Bad Revision: `payment-checkout-service:49`
   - Target Rollback Revision: `payment-checkout-service:48`
