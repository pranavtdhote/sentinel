# IMPLEMENTATION_PLAN.md — 3-Day AWS Hackathon Execution Roadmap

> **Platform**: SENTINEL — AI Incident Intelligence & Autonomous Response Platform  
> **Timeline**: 72 Hours (3 Days)  
> **Team Priority**: Working End-to-End P0 Flow First, Then Polish & P1/P2 Enhancements

---

## 1. Scope & Feature Prioritization (P0 / P1 / P2)

```
+-----------------------------------------------------------------------------------+
| P0 — Core Hackathon MVP (MUST WORK & BE DEMONSTRATED IN VIDEO)                    |
| - Create & ingest incident report with telemetry payload                         |
| - Persist and query in Amazon DynamoDB (single-table design)                      |
| - Bedrock Knowledge Base RAG retrieval with verified document citations           |
| - Amazon Bedrock (Claude 3.5 Sonnet) root-cause reasoning & confidence score      |
| - Action Plan generation with blast-radius assessment                             |
| - Cryptographic Human-in-the-Loop (HITL) approval gate (Commander role check)     |
| - Isolated Tool Runner executing safe AWS remediation                             |
| - Incident resolution & automated Bedrock postmortem export to Amazon S3          |
| - Real AWS calls executed with live telemetry traces                              |
| - Pleurat Shala design system UI (Cream #fbf7e6, Amber #f3b44a, General Sans)     |
+-----------------------------------------------------------------------------------+
| P1 — High-Value Enhancements (Hours 36-54)                                        |
| - Amazon Cognito User Pool authentication & RBAC JWT verification                 |
| - Amazon EventBridge status transition events                                     |
| - Amazon SNS email/SMS alert dispatch                                             |
| - Real-time SLA countdown timers & MTTD/MTTR analytics dashboard                  |
| - Full audit log export with cryptographic nonces                                 |
+-----------------------------------------------------------------------------------+
| P2 — Differentiators & Advanced Features (Hours 54-72)                            |
| - Amazon Bedrock AgentCore autonomous multi-agent reasoning                       |
| - Interactive S3 Runbook uploader & vector indexing pipeline                      |
| - CloudFront distribution with Edge caching for telemetry dashboard               |
| - PDF generation for C-suite executive postmortem summary                         |
+-----------------------------------------------------------------------------------+
```

---

## 2. 72-Hour Day-by-Day Implementation Timeline

```mermaid
gantt
    title Sentinel 72-Hour Hackathon Implementation Schedule
    dateFormat  HH
    axisFormat  Day %d

    section Day 1: Foundations
    Repository setup & Next.js 15 scaffolding     :d1_1, 00, 4h
    Pleurat Shala design system tokens & shell    :d1_2, after d1_1, 6h
    DynamoDB single-table schema & CRUD repo      :d1_3, after d1_2, 6h
    Incident ingestion API & telemetry intake     :d1_4, after d1_3, 4h
    AWS SDK v3 client setup & dual-adapter bridge :d1_5, after d1_4, 4h

    section Day 2: AI & Orchestration
    Bedrock Converse API & Prompt contracts       :d2_1, 24, 6h
    Bedrock Knowledge Base retrieval & citations  :d2_2, after d2_1, 6h
    Action Plan generation & blast-radius engine  :d2_3, after d2_2, 4h
    HITL approval drawer & cryptographic nonces   :d2_4, after d2_3, 4h
    Isolated Tool Runner & AWS remediation tools  :d2_5, after d2_4, 4h

    section Day 3: Polish & Video
    Postmortem generator & S3 report storage      :d3_1, 48, 6h
    Analytics view & CloudWatch telemetry cards   :d3_2, after d3_1, 4h
    End-to-end integration tests & typechecks     :d3_3, after d3_2, 4h
    Deterministic demo seed script execution      :d3_4, after d3_3, 4h
    3-minute demo video recording & write-up      :d3_5, after d3_4, 6h
```

---

## 3. Detailed Daily Milestones

### Day 1: Architecture, Data Layer & Design System
- **Hour 0–4: Project Initialization**
  - Initialize Next.js 15 project with TypeScript, Tailwind CSS, and shadcn/ui.
  - Configure ESLint, Prettier, and absolute import aliases (`@/lib`, `@/components`, `@/backend`).
  - Create directory architecture mirroring domain boundaries.
- **Hour 4–10: Design System Foundation (Pleurat Shala)**
  - Implement base color tokens: canvas `#fbf7e6`, dark text `#16140e`, amber accent `#f3b44a`, strong card `#efe9d2`.
  - Configure typography: General Sans / Inter fallback with technical figure markers (`FIG. 001`).
  - Build architectural UI primitives: isometric node cards, schematic wireframe connectors, circuit test point tags (`C4`, `L3`, `U2`).
  - Implement smooth page transitions and responsive layouts.
- **Hour 10–16: DynamoDB Repository & Domain Entities**
  - Implement `DynamoDBIncidentRepository` with `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`.
  - Implement single-table access patterns (AP-01 through AP-11).
  - Add optimistic locking with version attribute verification.
- **Hour 16–24: Ingestion API & Dual Adapter Pattern**
  - Implement `POST /api/incidents` and `GET /api/incidents`.
  - Build mock/real dual adapter with explicit `FALLBACK_SANDBOX_ENGAGED` badge in case of AWS credential absence.
  - Run test suite & commit stable milestone.

### Day 2: Bedrock AI Reasoning, Knowledge Bases & Human Approval
- **Hour 24–30: Bedrock Converse API Integration**
  - Connect `@aws-sdk/client-bedrock-runtime` using `anthropic.claude-3-5-sonnet-20241022-v2:0`.
  - Implement strict JSON schema parsing and Zod output validation.
  - Implement the zero-hallucination barrier.
- **Hour 30–36: Bedrock Knowledge Base Retrieval**
  - Ingest mock runbooks to Amazon S3: `aurora-connection-leak.md`, `ecs-memory-exhaustion.md`.
  - Implement vector retrieval using Bedrock Agent Runtime (`RetrieveCommand`).
  - Render grounded citations in UI with clickable source view and confidence indicators.
- **Hour 36–42: Action Plan Formulation & Blast-Radius Engine**
  - Implement Bedrock Action Plan prompt generating sequence of remediation steps.
  - Compute blast-radius risk (LOW / MEDIUM / HIGH) and customer impact summary.
- **Hour 42–48: Cryptographic HITL Approval Drawer & Isolated Tool Runner**
  - Build slide-out modal for Incident Commander approval with cryptographic signature verification.
  - Implement isolated Tool Runner executing `rollback_ecs_task_definition` and `verify_cloudwatch_alarm_state`.
  - Commit stable milestone.

### Day 3: Resolution Retrospective, Analytics & Submission Prep
- **Hour 48–54: Bedrock Postmortem Synthesis & S3 Export**
  - Synthesize incident timeline, root cause, and remediation steps into a markdown postmortem.
  - Upload report to S3 bucket (`sentinel-reports-prod`) and return presigned URL.
- **Hour 54–60: Analytics Dashboard & CloudWatch Telemetry**
  - Build analytics view displaying MTTD, MTTM, Bedrock token costs, and tool success rate.
  - Display live CloudWatch request ID traces and latency metrics.
- **Hour 60–66: Quality Verification & End-to-End Testing**
  - Run full test suite: unit tests, integration tests, Zod validation tests, TypeScript build (`npm run build`).
  - Execute deterministic demo seed script (`npm run seed:demo`).
- **Hour 66–72: Demo Video & Submission Write-up**
  - Record 3-minute demo video following `DEMO_SCENARIO.md`.
  - Write hackathon submission overview highlighting AWS architecture, problem, and AI coding tools used.

---

## 4. Risk Register & Mitigation Matrix

| Risk | Severity | Probability | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Bedrock Quota / Rate Limiting (TPS limits)** | High | Medium | Implement streaming responses, exponential backoff retries, and an automated fallback to Claude Haiku or Nova Pro. |
| **Bedrock Knowledge Base Indexing Delay** | Medium | High | Pre-populate the S3 bucket with runbooks; include a deterministic local vector fallback if OpenSearch Serverless ingestion lags. |
| **AgentCore Setup Complexity** | Medium | Medium | **Fallback Plan**: Rely on the direct Bedrock Converse API with tool definitions (P0 rock-solid implementation). AgentCore is scoped strictly to P2. |
| **Hallucinated Infrastructure Parameters** | High | Low | Enforce strict Zod schema validation; reject any action referencing unknown ARNs; mandate Incident Commander review. |
