# Sentinel — Hackathon Submission Checklist

> **Competition**: AWS Generative AI Hackathon  
> **Project**: Sentinel (AI Incident Intelligence & Autonomous Response Platform)  
> **Repository**: `https://github.com/pranavtdhote/sentinel.git`  
> **Branch**: `main`

---

## 1. Compliance & Rules Verification

| Rule / Requirement | Status | Evidence / Verification Location |
| :--- | :---: | :--- |
| **Solves a Real Problem** | **PASS** | Solves high-stress cloud outage response, tribal runbook fragmentation, and alert fatigue for SREs and Incident Commanders. |
| **Newly Built During Hackathon** | **PASS** | Complete Git commit history from repository creation to final audit within the event window. |
| **AWS Services Integrated & Evident** | **PASS** | Real integrations across 7 AWS services: Amazon Bedrock, Bedrock Knowledge Bases, DynamoDB, S3, EventBridge, SNS, and CloudWatch. |
| **Zero Faked AWS Calls Invariant** | **PASS** | All AWS calls execute via official `@aws-sdk/client-*` libraries. Dual-adapter sandbox engages only when credentials are absent, prominently badging the UI with `FALLBACK_SANDBOX`. |
| **Human-in-the-Loop Safety Gate** | **PASS** | Cryptographic nonce verification, incident version tie-in, and RBAC prevent autonomous unapproved infrastructure mutations. |
| **Zero Direct AI Mutation** | **PASS** | Model only recommends and prepares. Application code executes strictly allowlisted tools upon human sign-off. |
| **AI Coding Tools Disclosed** | **PASS** | Disclosed in `README.md` and `SUBMISSION_CHECKLIST.md`: Google Antigravity IDE (Gemini 2.5 Pro). |
| **Public-Ready Repository** | **PASS** | Zero secrets committed, Apache 2.0 license, clean documentation, passing tests, and no hardcoded keys. |
| **Video Under 3 Minutes** | **PASS** | Structured 180-second demo script documented in [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) featuring Lab 304 scenario. |

---

## 2. Technical Quality Gates

- [x] **TypeScript Compilation**: `npm run typecheck` (`tsc --noEmit`) passes with **0 errors**.
- [x] **ESLint Linting**: `npm run lint` passes with **0 warnings and 0 errors**.
- [x] **Automated Test Suite**: `npm test` executes **13 test suites and 88+ assertions** with **100% pass rate**.
- [x] **Next.js Production Build**: `npm run build` compiles all static and dynamic route handlers successfully.
- [x] **Environment Validation**: Boot-time Zod schema validation in `lib/config/env.ts` guarantees clean startup.
- [x] **Security Threat Model**: Complete STRIDE/DREAD threat model and least-privilege IAM policies in `THREAT_MODEL.md` and `IAM_NOTES.md`.

---

## 3. Core Demonstration Highlights (15 Required Points)

- [x] **1. Incident Creation**: Real-time ingestion of incident via UI or REST API (`POST /api/incidents`).
- [x] **2. AWS API Calls**: Official AWS SDK v3 clients (`@aws-sdk/client-bedrock-runtime`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-bedrock-agent-runtime`, etc.).
- [x] **3. DynamoDB Persistence**: Single-table design (`SentinelIncidents`) with optimistic locking (`#version = :expectedVersion`).
- [x] **4. Bedrock Analysis**: Root-cause hypothesis formulation, confidence score, and impact assessment.
- [x] **5. Knowledge Base Retrieval**: Vector search across S3 runbooks via OpenSearch Serverless.
- [x] **6. Evidence & Grounding**: Citations mapped to source URIs and displayed as evidence cards; ungrounded IDs rejected.
- [x] **7. Action Plan Formulation**: Multi-step remediation plan with blast radius risk assessment and rollback strategy.
- [x] **8. Responder & Resource Check**: Active on-call responder lookup and AWS resource ARN verification.
- [x] **9. Human Approval Safety Gate**: Cryptographic single-use nonce, incident version check, and Incident Commander role gate.
- [x] **10. Notifications & Events**: EventBridge custom bus dispatch and SNS pager alerts.
- [x] **11. Audit Timeline**: Immutable `AuditEvent` records and chronological timeline tracking.
- [x] **12. Incident Resolution**: Status transition to `RESOLVED` with MTTD/MTTM metrics computation.
- [x] **13. AI Resolution Report**: Automated retrospective postmortem compilation exported to Amazon S3.
- [x] **14. Operational Analytics**: Live DynamoDB-derived metrics, severity distribution, category breakdown, and SLA compliance.
- [x] **15. AWS Architecture Diagram**: Clear visualization of AWS service boundaries and data flows in `README.md`.

---

## 4. Submission Package Links

- **Repository**: [`https://github.com/pranavtdhote/sentinel`](https://github.com/pranavtdhote/sentinel)
- **Architecture Specification**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Deployment Guide**: [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Operational Runbook**: [`RUNBOOK.md`](./RUNBOOK.md)
- **Demo Script**: [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)
- **Judging Evidence**: [`JUDGING_EVIDENCE.md`](./JUDGING_EVIDENCE.md)
- **Security Audit**: [`SECURITY.md`](./SECURITY.md)
