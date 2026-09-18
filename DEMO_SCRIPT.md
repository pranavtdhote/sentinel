# Sentinel — 3-Minute Hackathon Demo Script

> **Target Duration**: 180 seconds (3:00)  
> **Speaker Role**: Lead Cloud Architect & Incident Commander  
> **Scenario**: Real-Time SEV-1 Campus Outage: *"Lab 304 has lost network connectivity. 42 students cannot access their systems. The issue started 8 minutes ago."*

---

## Timeline & Narration Breakdown

### [0:00 – 0:25] Introduction & The Problem (25s)
- **Visual**: Sentinel Operations Dashboard (`http://localhost:3000/dashboard`). Point out the KPI cards, circuit telemetry header, and active status badge (`AWS US-EAST-1 LIVE` or `FALLBACK_SANDBOX`).
- **Narration**:  
  *"Welcome to Sentinel. When critical production outages hit, SREs face alert fatigue, distributed CloudWatch telemetry sprawl, and fragmented tribal runbooks.  
  Sentinel changes this with an uncompromising principle: **AI recommends. AI prepares. Human approves. Application code executes.**  
  Every AWS service you see here has a critical operational reason for existing."*

---

### [0:25 – 0:50] Incident Ingestion & DynamoDB Persistence (25s)
- **Visual**: Click **Report Incident** in the top bar. Click **⚡ Load Hackathon Demo Incident**.  
  Show populated fields:
  - Title: `Campus Lab 304 Switch Outage: 42 Workstations Offline`
  - Service: `campus-network-core`
  - Severity: `SEV1`
  - Summary: `Lab 304 has lost network connectivity. 42 students cannot access their systems. The issue started 8 minutes ago.`
  Click **Create & Ingest**.
- **Narration**:  
  *"We receive a critical incident report: Lab 304 lost network connectivity, 42 students are blocked, starting 8 minutes ago.  
  Submitting this immediately dispatches an AWS SDK v3 `PutCommand` to our Amazon DynamoDB single-table database, initiating an optimistic version-locked record and emitting an `IncidentCreated` event to Amazon EventBridge."*

---

### [0:50 – 1:20] Bedrock Analysis & Knowledge Base RAG Retrieval (30s)
- **Visual**: In the Interactive Workbench, click **Trigger Bedrock Autonomous Triage**. Watch Step 2 transition with the streaming status indicator. Point to the retrieved Evidence Cards and Cited Runbooks.
- **Narration**:  
  *"Sentinel automatically queries **Amazon Bedrock Knowledge Bases**, running vector search over S3 runbooks indexed in **Amazon OpenSearch Serverless**.  
  It retrieves the exact runbook for Campus Switch Trunk Flap Recovery alongside CloudWatch syslog events showing interface GigabitEthernet1/0/24 dropping state.  
  Powered by **Claude 3.5 Sonnet on Bedrock**, Sentinel formulates a 96% confidence root-cause hypothesis: spanning-tree topology change on switch SW-CORE-304 isolated VLAN 104. Notice that our strict Zod schema validator ensures zero hallucinated resource IDs."*

---

### [1:20 – 1:55] Action Plan Preparation & Cryptographic Approval Gate (35s)
- **Visual**: Click **Generate Remediation Plan**. Show the multi-step plan with blast radius risk, tool names (`query_cloudwatch_insights`, `restart_ecs_service`), and rollback strategies.  
  Click **Approve & Execute Remediation**. The cryptographic modal opens showing proposed action, impact, blast radius, and approval nonce. Enter commander sign-off and click **Confirm Cryptographic Approval**.
- **Narration**:  
  *"Next, Sentinel prepares a structured remediation plan. Notice the safety design: read-only diagnostics run automatically, but the mutating action—restarting the edge gateway and re-initializing the trunk—requires human sign-off.  
  Here is our **Human Approval Safety Gate**: the model cannot execute tools on its own. The approval is cryptographically tied to the incident ID and version number. If the incident state advanced in the background, stale approvals are rejected. Once I approve as Incident Commander, application code safely executes the allowlisted tool."*

---

### [1:55 – 2:25] EventBridge / SNS Notifications & Audit Timeline (30s)
- **Visual**: Show the live **Incident Timeline** and **Audit Trail** updating with the executed tool output. Navigate to `/ai-activity` to show the AI Activity feed with tool status, timestamp, and evidence count.
- **Narration**:  
  *"Upon execution, Sentinel's tool runner completes the action and emits an `IncidentAssigned` and `StatusChanged` event to **Amazon EventBridge**, which routes an emergency alert to **Amazon SNS** to notify the campus networking team.  
  Every single action, actor identity, and Bedrock output is permanently logged to an immutable DynamoDB audit trail. Zero hidden chain-of-thought is leaked."*

---

### [2:25 – 2:45] Resolution & S3 Postmortem Retrospective (20s)
- **Visual**: Return to the Workbench. Click **Resolve Incident**. The system compiles the postmortem. Show the generated markdown retrospective and click the presigned S3 download link.
- **Narration**:  
  *"With network connectivity restored to all 42 workstations, we resolve the incident.  
  Sentinel synthesizes a blameless postmortem report—calculating Mean Time to Detect (72s) and Mean Time to Mitigate (228s)—and exports the retrospective to **Amazon S3** with a secure presigned URL for the engineering team."*

---

### [2:45 – 3:00] Analytics, Architecture & Conclusion (15s)
- **Visual**: Click over to `/analytics`. Show the real DynamoDB metrics: severity distribution, MTTM trends, SLA compliance, and grounded AI insights backed by sample sizes. Point to the architecture diagram in the README.
- **Narration**:  
  *"Finally, on the Analytics page, live DynamoDB telemetry surfaces SLA compliance and grounded recurring issue insights.  
  Sentinel proves that generative AI in cloud operations can be autonomous, grounded in evidence, and strictly governed by human approval. Thank you!"*

---

## Quick Reference Checkpoints for Presenter

1. **Resetting Demo State**: If you need to restart the demo, click the **RESET DEMO** button in the top navigation bar. It resets the database to clean baseline in 500ms.
2. **Key Phrases to Emphasize**:
   - *"AI recommends. AI prepares. Human approves. Application code executes."*
   - *"Zero hallucination guarantee via strict Zod schemas."*
   - *"Single-table DynamoDB with optimistic version locking."*
   - *"Bedrock Knowledge Bases backed by OpenSearch Serverless."*
