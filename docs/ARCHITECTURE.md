# ARCHITECTURE.md — SENTINEL Platform Architecture

> **SENTINEL: AI Incident Intelligence & Autonomous Response Platform**  
> *Target: AWS Hackathon (3-Day Implementation)*  
> *Design Language: Pleurat Shala Architectural System (`#fbf7e6`, `#f3b44a`, `#16140e`)*

---

## 1. Executive Summary & Problem Statement

Modern cloud outages cost enterprises an average of $9,000/minute. During a critical incident (SEV-1 / SEV-2), on-call Site Reliability Engineers (SREs) face alert fatigue, distributed telemetry sprawl across dozens of CloudWatch dashboards, and fragmented tribal runbooks. 

**SENTINEL** transforms chaotic operational incidents into evidence-grounded, human-in-the-loop autonomous response workflows. Powered by **Amazon Bedrock** (Anthropic Claude 3.5 Sonnet / Amazon Nova Pro) and **Bedrock Knowledge Bases**, SENTINEL:
1. Ingests incident alerts and telemetry snapshots.
2. Performs vector-grounded root-cause analysis against enterprise runbooks and architectural postmortems.
3. Formulates step-by-step mitigation plans with blast-radius analysis.
4. Enforces a strict cryptographic **Human-in-the-Loop (HITL) approval gate** before triggering any mutating remediation action.
5. Produces an automated post-incident retrospective and compliance audit trail in Amazon S3.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (Next.js 15 App Router & Pleurat Shala Design System)"]
        UI["Incident Workbench & Command Center\n(General Sans / Warm Canvas #fbf7e6 / Amber #f3b44a)"]
        HITL["Human-in-the-Loop Approval Modal\n(Cryptographic Action Tokens)"]
        TELEMETRY_VIEW["Live Telemetry & Evidence Inspector\n(Schematic Wireframes & Flow Nodes)"]
    end

    subgraph APILayer ["API & Ingestion Layer"]
        NEXT_API["Next.js Server Actions & Route Handlers\n(/api/incidents, /api/triage, /api/actions)"]
        APIGW["Amazon API Gateway (HTTP APIs)\n(Webhook Ingestion)"]
    end

    subgraph OrchestrationLayer ["Domain & Orchestration (TypeScript / Node.js 20)"]
        AUTH_GUARD["Cognito JWT / RBAC Guard\n(IAM / Role: Incident Commander)"]
        ORCHESTRATOR["Incident Orchestrator Engine\n(State Machine & Step Execution)"]
        VALIDATOR["Strict Zod Schema Validator\n(Zero-Hallucination Barrier)"]
        TOOL_RUNNER["Isolated Tool Runner\n(Safe AWS SDK v3 Invokers)"]
    end

    subgraph BedrockLayer ["Amazon Bedrock AI Services"]
        BEDROCK_CONVERSE["Bedrock Converse API\n(Claude 3.5 Sonnet / Nova Pro)"]
        BEDROCK_KB["Bedrock Knowledge Bases\n(OpenSearch Serverless Vector Store)"]
        BEDROCK_AGENTS["Bedrock AgentCore Engine\n(P2 Fallback Orchestrator)"]
    end

    subgraph DataLayer ["Persistence & Event Layer"]
        DDB[("Amazon DynamoDB\n(Single Table: sentinel-records)")]
        S3[("Amazon S3\n(Runbooks, Telemetry Bundles, Postmortems)")]
        EVENTBRIDGE["Amazon EventBridge\n(sentinel.incident.status.changed)"]
        SNS["Amazon SNS\n(On-Call SRE Pager & Email Alerts)"]
        CLOUDWATCH["Amazon CloudWatch Logs & Metrics\n(Audit Trails & Latency Tracking)"]
    end

    %% Interactions
    UI -->|HTTPS / JWT| NEXT_API
    APIGW -->|Webhook Event| NEXT_API
    NEXT_API --> AUTH_GUARD
    AUTH_GUARD --> ORCHESTRATOR

    ORCHESTRATOR -->|1. Retrieve Runbooks| BEDROCK_KB
    BEDROCK_KB -->|Runbook Embeddings & Citations| S3
    ORCHESTRATOR -->|2. Converse & Reason| BEDROCK_CONVERSE
    BEDROCK_CONVERSE -->|JSON Plan Proposal| VALIDATOR

    VALIDATOR -->|3. Persist Pending Plan| DDB
    ORCHESTRATOR -->|4. Request Human Approval| HITL
    HITL -->|5. Approve Signed Token| AUTH_GUARD
    AUTH_GUARD --> TOOL_RUNNER

    TOOL_RUNNER -->|6. Execute Remediation| AWS_TARGETS["AWS Target Services (ECS, Lambda, RDS)"]
    TOOL_RUNNER -->|7. Append Audit Log| DDB
    ORCHESTRATOR -->|8. Emit Event| EVENTBRIDGE
    EVENTBRIDGE --> SNS
    ORCHESTRATOR -->|9. Export Postmortem PDF/Markdown| S3
    ORCHESTRATOR -->|10. Stream Telemetry| CLOUDWATCH
```

---

## 3. Core Subsystems & Domain Boundaries

### 3.1 Frontend Subsystem (`/app`, `/components`)
- **Visual Design System**: Built in accordance with Pleurat Shala specifications:
  - Surface: `#fbf7e6` (muted cream canvas), `#000000` / `#16140e` (dark base/ink text), `#f3b44a` (warm ochre accent), `#efe9d2` (elevated cards).
  - Typography: General Sans / Inter, technical figure markers (`FIG. 001`), breadcrumbs (`■ ■ ■ INCIDENT / WORKBENCH / ACTIVE`).
  - Interactive workbench nodes: SVG wireframe connectors (`C4`, `L3`, `U2`), live status badges, and animated workflow steps.
- **Incident Workbench**: Dual-pane command center. Left: chronological triage timeline, root-cause hypothesis, grounded evidence citations. Right: proposed action plan, blast-radius card, and cryptographic approval drawer.
- **Analytics & SLA View**: Mean Time to Detect (MTTD), Mean Time to Mitigate (MTTM), AI token cost tracking, and tool execution reliability metrics.

### 3.2 AI Orchestration Subsystem (`/backend/ai`, `/lib/aws/bedrock`)
- **Decoupled Engine Design**:
  - `BedrockConverseEngine`: Core P0 production engine using `@aws-sdk/client-bedrock-runtime` with structured JSON output and temperature=0.1.
  - `KnowledgeBaseRetriever`: Queries Bedrock Knowledge Base using `@aws-sdk/client-bedrock-agent-runtime` (`RetrieveCommand`) to extract chunks with source URI and relevance score.
  - `BedrockAgentEngine`: Optional P2 engine utilizing AWS Bedrock Agents.
- **Zero-Hallucination Barrier (`/backend/ai/validators`)**:
  - Raw model outputs are **NEVER** trusted directly.
  - Every payload passes through Zod runtime schema validation.
  - If a generated action references an entity not present in the retrieved evidence or incident telemetry, the validator flags a `GROUNDING_VIOLATION` and falls back to manual triage.

### 3.3 Persistence & Event Subsystem (`/backend/repositories`, `/lib/aws/dynamodb`)
- **Single-Table DynamoDB Schema**:
  - High performance, predictable sub-10ms single-digit read/write latency.
  - Partition Key (`PK`) and Sort Key (`SK`) patterns partitioning Incidents, Timeline Events, Evidence Chunks, Action Plans, and Audit Logs.
  - GSI1 for Status Filtering (`STATUS#OPEN`, `STATUS#INVESTIGATING`, `STATUS#RESOLVED`).
  - GSI2 for Severity-based On-Call queues (`SEV1`, `SEV2`, etc.).

### 3.4 Tool Execution & Security Guardrails (`/backend/tools`, `/backend/domain/security`)
- **Role-Based Execution Guard**:
  - Non-mutating tools (e.g., `inspect_cloudwatch_logs`, `query_ecs_service_health`) execute automatically during triage.
  - Mutating tools (e.g., `restart_ecs_task`, `rollback_lambda_alias`, `scale_auto_scaling_group`) require an explicit cryptographic approval payload containing:
    - `incidentId`
    - `planId`
    - `actionId`
    - `approverEmail`
    - `nonce` & `timestamp` (<5 minute expiry)
  - Execution runs through deterministic AWS SDK wrappers with dry-run verification and automatic rollback capture.

---

## 4. Architectural Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor SRE as On-Call SRE (Commander)
    participant UI as Sentinel Workbench (Next.js)
    participant API as Sentinel Backend (Lambda / API)
    participant DDB as DynamoDB (sentinel-records)
    participant KB as Bedrock Knowledge Base
    participant BEDROCK as Amazon Bedrock (Claude 3.5)
    participant TOOLS as AWS SDK Tool Runner
    participant S3 as Amazon S3 (Artifacts)

    SRE->>UI: Submit Incident Report (Alert payload / SRE notes)
    UI->>API: POST /api/incidents
    API->>DDB: Save Incident (status: DETECTED)
    API-->>UI: Incident ID Created

    Note over API,BEDROCK: Autonomous Investigation & Grounding Phase
    UI->>API: POST /api/incidents/:id/triage
    API->>KB: Retrieve relevant runbooks (Vector Search)
    KB-->>API: Chunks with S3 URIs & confidence scores (>0.75)
    API->>BEDROCK: Prompt with Alert + Runbook Evidence + Telemetry
    BEDROCK-->>API: Structured Triage (Hypothesis, Confidence, Action Plan)
    API->>API: Zod Schema Validation & Citation Matching
    API->>DDB: Save Action Plan (status: PENDING_APPROVAL) & Evidence
    API-->>UI: Triage Result & Action Plan Rendered

    Note over SRE,UI: Human-In-The-Loop Approval Gate
    SRE->>UI: Inspect Grounded Evidence & Blast Radius
    SRE->>UI: Click "Approve Mitigation Step" (Sign Action)
    UI->>API: POST /api/incidents/:id/approve-action (Signed Token)
    API->>API: Verify Commander Role & Token Expiry
    API->>TOOLS: Execute Action (e.g., Rollback Deployment)
    TOOLS-->>API: Execution Result (Success / stdout / latency)
    API->>DDB: Append Audit Log & Update Incident (status: MITIGATING)

    Note over API,S3: Resolution & Retrospective
    SRE->>UI: Mark Incident Resolved
    UI->>API: POST /api/incidents/:id/resolve
    API->>BEDROCK: Synthesize Timeline + Actions + Root Cause into Postmortem
    BEDROCK-->>API: Markdown Postmortem Report
    API->>S3: Upload Postmortem PDF/MD (s3://sentinel-reports-prod/...)
    API->>DDB: Update Incident (status: RESOLVED, reportUrl)
    API-->>UI: Incident Resolved & Downloadable Report Ready
```

---

## 5. Technology Stack & AWS Services Rationale

| Service / Tool | Purpose in Sentinel | Visible Hackathon Demonstration |
| :--- | :--- | :--- |
| **Amazon Bedrock** (`anthropic.claude-3-5-sonnet-20241022-v2:0` / `amazon.nova-pro-v1:0`) | Core reasoning, incident diagnosis, structured action plan generation, and postmortem synthesis. | Real prompt-to-response generation with streaming status, confidence metrics, and deterministic structured JSON. |
| **Bedrock Knowledge Bases** (OpenSearch Serverless) | RAG over engineering runbooks, architecture decision records (ADRs), and past postmortems. | Clickable evidence drawer showing exact runbook passages, confidence scores, and S3 source references. |
| **Amazon DynamoDB** | Single-table persistence for incidents, audit timeline, action plans, and telemetry snapshots. | Real CRUD latency (<10ms), optimistic locking, and query filtering by severity/status. |
| **Amazon S3** | Storage for knowledge runbook markdown files, incident diagnostic bundles, and generated postmortem PDF reports. | Live upload of runbooks and generation of signed S3 download URLs for post-incident reports. |
| **AWS Lambda & API Gateway** | Serverless backend execution for webhooks, triage triggers, and tool runner. | Fast serverless execution and direct AWS IAM role containment. |
| **Amazon EventBridge & SNS** | Event-driven status dispatch and real-time SRE alerting. | Event emission on incident severity changes and live SNS email/SMS alert dispatch. |
| **Amazon CloudWatch** | Structured logging, model invocation latency tracking, and operational metrics. | Live telemetry cards on Sentinel dashboard displaying AWS request IDs and execution traces. |
| **Next.js 15 & Tailwind CSS** | Modern App Router interface implementing the Pleurat Shala design system. | Warm canvas (`#fbf7e6`), schematic diagrams, interactive breadcrumbs, micro-animations, and full WCAG AA accessibility. |
