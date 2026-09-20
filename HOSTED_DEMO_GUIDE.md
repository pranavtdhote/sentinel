# SENTINEL — Hosted Hackathon Evaluation & Demo Guide

Welcome to the **SENTINEL AI Incident Intelligence & Autonomous Response Platform**. This guide provides an end-to-end walkthrough for hackathon judges and evaluators to experience production Amazon Cognito authentication and role-based incident intelligence.

---

## 1. Quick Access Credentials

For evaluation, four pre-configured roles are provisioned in Amazon Cognito User Pool `us-east-1_Lz4flXPaw`:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Incident Commander** *(Recommended)* | `demo@sentinel.ai` | `Sentinel2026!` | Full AI triage, HITL approvals, action plan execution, resolution |
| **Responder** | `responder@sentinel.ai` | `Sentinel2026!` | Triage, investigation, runbook inspection (Cannot approve high-risk actions) |
| **Admin** | `admin@sentinel.ai` | `Sentinel2026!` | Full configuration, knowledge management, system oversight |
| **Viewer** *(Auditor)* | `viewer@sentinel.ai` | `Sentinel2026!` | Read-only observation across dashboard, incidents, and analytics |

> [!TIP]
> The login portal includes a **"One-Click Fill"** bar that automatically loads the demo account credentials.

---

## 2. Recommended 5-Minute Evaluator Journey

### Step 1: Public Landing Page
- Navigate to the application root (`/`).
- Notice that the landing page is completely public: review the architectural overview, AI reasoning workflows, AWS service integrations (Bedrock, DynamoDB, EventBridge, SNS, S3, Cognito), and Human-in-the-Loop safety guarantees.
- Click **[ Launch Demo ]** to proceed to the secure authentication portal.

### Step 2: Operator Sign In (Amazon Cognito)
- On the `/login` page:
  - Click the **"Commander"** demo card (`demo@sentinel.ai`).
  - Click **[ SIGN IN TO SENTINEL ]**.
- The frontend authenticates directly against Amazon Cognito via `USER_PASSWORD_AUTH`, verifies the RS256 JWT ID token, and redirects to `/dashboard`.

### Step 3: Command Center & Telemetry Workbench
- In the Topbar and Sidebar, note that your authenticated identity (`demo@sentinel.ai`) and role (`INCIDENT COMMANDER`) are dynamically displayed.
- Review the active incident queue, system telemetry status, and Mean Time to Detect (MTTD).
- Click on any active incident (e.g. `INC-2026-0917-01: Aurora Read-Replica Connection Pool Exhaustion`).

### Step 4: AI Incident Intelligence & Grounded RAG Evidence
- On the incident investigation page:
  - Click **[ Run AI Triage & RAG Retrieval ]**.
  - Sentinel queries the **Amazon Bedrock Knowledge Base** (`KB-SENTINEL-RUNBOOKS-001`), retrieves grounded runbook citations, and generates structured root-cause hypotheses with confidence scores.
  - Review the 5-Whys hypothesis grounded in real telemetry.

### Step 5: Action Plan Formulation & Human-in-the-Loop Approval Gate
- Click **[ Generate Action Plan ]**.
- Amazon Bedrock synthesizes a structured remediation plan with estimated mitigation time and blast radius risk assessment.
- High-risk mutating actions (e.g. ECS task rollback or connection pool resize) are locked behind the **HITL Approval Gate**.
- As the Incident Commander, click **[ Approve & Execute Action ]**.
- Sentinel verifies your authenticated Cognito role and cryptographic HMAC token before dispatching remediation.

### Step 6: Incident Resolution & S3 Retrospective Publishing
- Click **[ Resolve Incident ]**.
- Amazon Bedrock autonomously generates an executive retrospective and blameless postmortem report.
- Sentinel uploads the formatted retrospective to **Amazon S3** (`s3://sentinel-reports-.../postmortems/`) and displays the verified report with measured Mean Time to Mitigation (MTTM).

### Step 7: Testing Role Enforcement (RBAC Security)
- In the Sidebar, click the **Sign Out** icon.
- Return to `/login`.
- Select the **"Viewer"** demo card (`viewer@sentinel.ai`).
- Sign in and navigate to an active incident:
  - Note that mutating action approvals and triage triggers are strictly blocked with `403 Forbidden` messages.
  - Viewers maintain read-only oversight across telemetry, analytics, and historical timelines.

---

## 3. Direct API Security Verification

Judges can verify server-side security by issuing requests directly without a browser session:

```bash
# 1. Unauthenticated request to incidents queue -> 401 Unauthorized
curl -i http://localhost:3000/api/incidents

# 2. Attempting to approve an incident without commander privileges -> 403 Forbidden
curl -i -X POST http://localhost:3000/api/incidents/inc-test/approve \
  -H "Authorization: Bearer <viewer_token>"
```
