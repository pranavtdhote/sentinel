# SENTINEL: AI Incident Intelligence & Autonomous Response Platform

> **AWS Hackathon Submission**  
> *Transforming critical cloud incidents into evidence-grounded, human-in-the-loop autonomous response workflows.*

---

## 1. Problem Statement

Modern cloud outages cost enterprises an average of $9,000/minute. When critical SEV-1 alerts fire, Site Reliability Engineers (SREs) face alert fatigue, distributed telemetry sprawl across dozens of CloudWatch dashboards, and fragmented tribal runbooks. 

**SENTINEL** transforms chaotic operational incidents into evidence-grounded, human-approved mitigation workflows powered by **Amazon Bedrock** (Anthropic Claude 3.5 Sonnet & Amazon Nova Pro), **Bedrock Knowledge Bases** (OpenSearch Serverless), **DynamoDB Single-Table**, and **S3**.

---

## 2. Key Architecture & Hard Security Invariants

1. **Zero Direct AI Mutation Invariant**: AI models are strictly advisory. Amazon Bedrock analyzes telemetry and proposes step-by-step remediation plans with blast-radius modeling, but cannot directly invoke mutating AWS APIs or modify production databases.
2. **Cryptographic Human-in-the-Loop (HITL) Gate**: Mutating actions (e.g. `rollback_ecs_task_definition`) require an authenticated Incident Commander role, a single-use UUID nonce, and a 300-second TTL to eliminate replay attacks.
3. **Evidence Grounding Requirement**: Every hypothesis and proposed tool parameter is strictly grounded in retrieved Bedrock Knowledge Base runbook chunks. Unknown or hallucinated AWS resource names are rejected before reaching the tool runner.
4. **Dual-Adapter Architecture with Marked Fallback**: Real AWS SDK v3 calls are executed by default when credentials exist; if offline, a deterministic sandbox engages and visibly badges the UI with `FALLBACK_SANDBOX_ENGAGED`.

---

## 3. AWS Services Employed

| AWS Service | Operational Purpose |
| :--- | :--- |
| **Amazon Bedrock** (`claude-3-5-sonnet` / `nova-pro`) | Root cause analysis, blast-radius risk evaluation, and retrospective postmortem synthesis. |
| **Bedrock Knowledge Bases** (OpenSearch Serverless) | RAG search over S3 engineering runbooks, architectural decision records (ADRs), and past postmortems. |
| **Amazon DynamoDB** (`sentinel-records`) | Single-table storage for incidents, timeline events, evidence chunks, action plans, and audit logs with sub-10ms latency. |
| **Amazon S3** (`sentinel-runbooks`, `sentinel-reports`) | Hosts markdown runbooks and persists compiled postmortem reports with presigned download links. |
| **Amazon CloudWatch** | Ingests alarms, queries logs via CloudWatch Insights, and captures runtime audit traces. |
| **Amazon EventBridge & SNS** | Emits lifecycle status transition events and dispatches on-call SRE pager alerts. |

---

## 4. Design System (Pleurat Shala Aesthetic)

SENTINEL implements the **Pleurat Shala design system**:
- Canvas: `#fbf7e6` (muted warm linen)
- Accent: `#f3b44a` (warm ochre / amber)
- Base/Ink: `#16140e` (deep charcoal text)
- Surface: `#efe9d2` (elevated cards)
- Schematic Detailing: Circuit connector lines with test point markers (`C4`, `L3`, `U2`, `X1`, `D7`, `R1`, `J1`), isometric hardware block illustrations, and technical figure tags (`FIG. 001`).

---

## 5. Quick Start & Local Verification

### Prerequisites
- Node.js >= 18.x (tested on v22.14.0)
- npm >= 9.x

### Installation
```bash
git clone https://github.com/your-org/sentinel.git
cd sentinel
npm install
```

### Run Tests
```bash
npm test
```

### Seed Deterministic Demo Scenario
```bash
npm run seed:demo
```

### Run Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to launch the Sentinel Incident Command Center.

---

