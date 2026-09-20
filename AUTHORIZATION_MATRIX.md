# SENTINEL — Production Authorization Matrix & RBAC Policy

This document defines the authoritative Role-Based Access Control (RBAC) policy for the SENTINEL AI Incident Intelligence & Autonomous Response Platform.

---

## Conceptual Role Definitions

1. **`ADMIN`**
   - Full administrative and supervisory access.
   - Manages platform configuration, AWS connection parameters, user permissions, and knowledge bases.
   - Can perform, approve, or override all operational incident actions.

2. **`INCIDENT_COMMANDER`**
   - Highest operational incident command authority.
   - Reviews real-time AI triage, hypotheses, and grounded RAG evidence.
   - **Exclusive Human-in-the-Loop (HITL) approval authority** for high-risk autonomous mitigations and AWS remediation tools.
   - Final resolution and closure authority for operational incidents.
   - Access to operational analytics and system telemetry.

3. **`RESPONDER`**
   - Frontline on-call engineer and operational investigator.
   - Investigates active anomalies, executes read-only diagnostic tools, and implements low-risk runbooks.
   - Submits operational updates, notes, and runbook uploads.
   - **Cannot approve high-risk mutating actions** without Incident Commander sign-off.

4. **`VIEWER`**
   - Executive and observer read-only oversight.
   - Can view the Incident Command Center, incident timeline, AI reasoning streams, and analytics.
   - **Zero mutation privileges**: Cannot create incidents, cannot execute tools, cannot approve actions, cannot upload documents, and cannot alter platform state.

---

## Detailed Action-Permission Matrix

| Action / Capability | Endpoint / Operation | ADMIN | COMMANDER | RESPONDER | VIEWER |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Public Landing Page** | `GET /` | YES | YES | YES | YES |
| **Health Telemetry** | `GET /api/health` | YES | YES | YES | YES |
| **View Command Center Dashboard** | `GET /dashboard` | YES | YES | YES | YES |
| **List Incidents Queue** | `GET /api/incidents` | YES | YES | YES | YES |
| **View Incident Details & Timeline** | `GET /api/incidents/[id]` | YES | YES | YES | YES |
| **View Incident Audit Logs & Events** | `GET /api/incidents/[id]/events` | YES | YES | YES | YES |
| **View AI Reasoning & Grounded RAG** | `GET /ai-activity`, `/api/incidents/[id]` | YES | YES | YES | YES |
| **View Operations Analytics** | `GET /api/analytics` | YES | YES | YES | YES |
| **Read Knowledge Base Documents** | `GET /api/knowledge`, `/api/knowledge/[id]` | YES | YES | YES | YES |
| **Create New Incident** | `POST /api/incidents` | YES | YES | YES | **NO** |
| **Trigger Bedrock AI Analysis** | `POST /api/incidents/[id]/analyze` | YES | YES | YES | **NO** |
| **Trigger Autonomous Triage Pipeline** | `POST /api/incidents/[id]/triage` | YES | YES | YES | **NO** |
| **Generate Action Plan** | `POST /api/incidents/[id]/action-plans` | YES | YES | YES | **NO** |
| **Approve High-Risk Mutating Action (HITL)** | `POST /api/incidents/[id]/approve` | **YES** | **YES** | **NO** | **NO** |
| **Approve Action Plan Item Execution** | `POST /api/incidents/[id]/approve-action` | **YES** | **YES** | **NO** | **NO** |
| **Reject High-Risk Action** | `POST /api/incidents/[id]/approve` (`reject`) | **YES** | **YES** | **NO** | **NO** |
| **Resolve Incident & Publish Report** | `POST /api/incidents/[id]/resolve` | YES | YES | YES | **NO** |
| **Upload Runbooks / SOP Documents** | `POST /api/knowledge` | YES | YES | YES | **NO** |
| **Delete Runbook Documents** | `DELETE /api/knowledge/[id]` | **YES** | **NO** | **NO** | **NO** |
| **Reset Demo Baseline** | `POST /api/demo/reset` | YES | YES | YES | **NO** |
| **Configure Platform & AWS Settings** | `GET/POST /settings` | **YES** | **NO** | **NO** | **NO** |

---

## Enforcement Principles

1. **Cognito Token Claim is Authoritative**:
   Role resolution is derived strictly from the verified RS256 Cognito ID token claim `cognito:groups`.
2. **Strict Rejection of Client Spoofing**:
   Any client-supplied header such as `x-sentinel-actor-role` is disregarded when authenticating through Cognito. A caller with a `VIEWER` token attempting to send `x-sentinel-actor-role: ADMIN` will be evaluated strictly as `VIEWER` and denied with `HTTP 403 Forbidden`.
3. **No Silent Elevation**:
   Unauthenticated requests receive `HTTP 401 Unauthorized`. Authenticated requests lacking required group membership receive `HTTP 403 Forbidden`.
4. **Preservation of Approval HMAC Gate**:
   Human approval of mutating actions requires BOTH:
   - Valid `INCIDENT_COMMANDER` or `ADMIN` authenticated session.
   - Valid cryptographic HMAC approval token matching the incident's current optimistic concurrency version.
