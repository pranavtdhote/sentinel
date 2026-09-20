# SENTINEL — Production Amazon Cognito Authentication & Authorization Plan

## Executive Summary
This document defines the comprehensive implementation plan for adding production-style Amazon Cognito User Pool authentication and Role-Based Access Control (RBAC) to the **SENTINEL AI Incident Intelligence & Autonomous Response Platform**.

The primary constraint of this implementation is:
> **DO NOT BREAK, REMOVE, REWRITE, OR CHANGE ANY EXISTING WORKING SENTINEL FUNCTIONALITY.**
> Authentication wraps the existing application, intelligence engine, RAG pipeline, approval gate, and AWS eventing abstractions without modifying incident business logic or data models.

---

## 1. Current Authentication Implementation
### Current State
- The backend domain security layer in [`backend/domain/security/auth.ts`](file:///d:/SENTNEL/backend/domain/security/auth.ts) implements:
  - `verifyAuthorization(req, requiredRoles)`: A synchronous guard checking `authorization` or `x-sentinel-auth` headers.
  - `verifyAuthorizationAsync(req, requiredRoles)`: An asynchronous guard that utilizes `aws-jwt-verify` (`CognitoJwtVerifier.create`) to verify RS256 JWT ID tokens against Cognito JWKS when a 3-part JWT is supplied.
- Frontend API fetch abstraction in [`lib/api/safeFetch.ts`](file:///d:/SENTNEL/lib/api/safeFetch.ts):
  - Automatically attaches `Authorization: Bearer <token>` from `localStorage.getItem('sentinel_token')`.
  - Had fallback headers `x-sentinel-actor-role: INCIDENT_COMMANDER` and `x-sentinel-user-email: commander@sentinel.internal`.
- Frontend UI components:
  - [`components/sentinel/Topbar.tsx`](file:///d:/SENTNEL/components/sentinel/Topbar.tsx) and [`components/sentinel/Sidebar.tsx`](file:///d:/SENTNEL/components/sentinel/Sidebar.tsx) display a static user identity (`prana@sentinel.internal` / `COMMANDER`).
  - No dedicated `/login` page existed; the public landing page ([`app/page.tsx`](file:///d:/SENTNEL/app/page.tsx)) navigated directly to `/dashboard`.

---

## 2. Current Role Implementation
### Role Definitions
Sentinel defines four strict roles in [`lib/types/database.ts`](file:///d:/SENTNEL/lib/types/database.ts):
1. **`ADMIN`**: Full platform control, configuration, knowledge management, system oversight.
2. **`INCIDENT_COMMANDER`**: Incident triage, AI analysis review, action plan approval/rejection, high-risk mitigation gatekeeper, resolution authority.
3. **`RESPONDER`**: Operational investigation, telemetry inspection, executing permitted actions, incident triage/updates.
4. **`VIEWER`**: Read-only oversight across incidents, dashboards, analytics, and AI reasoning. No approval, mutation, or administrative capabilities.

### Cognito Group Mapping
Cognito User Pool `us-east-1_Lz4flXPaw` contains four groups mapped directly via `mapGroupsToRole`:
- `Admins` → `ADMIN` (Precedence 0)
- `Commanders` → `INCIDENT_COMMANDER` (Precedence 1)
- `Responders` → `RESPONDER` (Precedence 2)
- `Viewers` → `VIEWER` (Precedence 3)

The user's token carries group membership in the authoritative `cognito:groups` claim.

---

## 3. Existing Protected and Unprotected Routes
### Public Routes
- `/`: Public landing page (product introduction, architecture, HITL safety explanation, telemetry status).
- `/login`: Professional Sentinel authentication portal (to be created).
- `/api/health`: Operational health check endpoint.

### Protected Application Routes
Must require valid authentication:
- `/dashboard`: Primary Incident Command Center & Workbench.
- `/incidents`: Incident Registry & filtering queue.
- `/incidents/[id]`: Incident Investigation, AI triage, RAG evidence, action plans, approval gate, resolution.
- `/analytics`: Mean Time to Mitigation (MTTM), incident volume, and SLA compliance analytics.
- `/knowledge`: Operational Knowledge Center, runbooks, SOP document ingestion.
- `/ai-activity`: Autonomous AI reasoning audit log & Bedrock trace events.
- `/settings`: Platform configuration, AWS connection parameters, and session telemetry.

All protected pages are wrapped by [`components/ui/AppShell.tsx`](file:///d:/SENTNEL/components/ui/AppShell.tsx).

---

## 4. Existing API Endpoints
All existing API routes located in `app/api/`:
- `GET /api/health` — Public health check & AWS connection status.
- `POST /api/demo/reset` — Demo data reset endpoint.
- `GET /api/incidents` — List active & resolved incidents.
- `POST /api/incidents` — Create new incident.
- `GET /api/incidents/[id]` — Retrieve incident detail by ID.
- `PATCH /api/incidents/[id]` — Update incident state/metadata.
- `POST /api/incidents/[id]/analyze` — Trigger Bedrock structured analysis.
- `POST /api/incidents/[id]/triage` — Run triage pipeline.
- `GET /api/incidents/[id]/events` — Retrieve incident timeline & audit trail.
- `POST /api/incidents/[id]/action-plans` — Generate AI action plan.
- `POST /api/incidents/[id]/approve` — Human approval gate for mutating actions.
- `POST /api/incidents/[id]/approve-action` — Action plan execution approval.
- `POST /api/incidents/[id]/resolve` — Resolve incident with resolution report.
- `GET /api/incidents/[id]/postmortem` — Retrieve generated S3 postmortem.
- `GET /api/knowledge` — Retrieve grounded runbooks & documents.
- `POST /api/knowledge` — Upload new SOP/runbook to S3 / Knowledge Base.
- `DELETE /api/knowledge/[id]` — Delete runbook document.
- `GET /api/analytics` — Operational metrics calculation.

---

## 5. Existing Authorization Checks
Current role restrictions enforced across endpoints:
| Endpoint | Method | Required Roles | Behavior on Insufficient Role |
| :--- | :--- | :--- | :--- |
| `/api/incidents/[id]/approve` | `POST` | `INCIDENT_COMMANDER`, `ADMIN` | 403 Forbidden |
| `/api/incidents/[id]/approve-action` | `POST` | `INCIDENT_COMMANDER`, `ADMIN` | 403 Forbidden |
| `/api/incidents/[id]/resolve` | `POST` | `INCIDENT_COMMANDER`, `ADMIN`, `RESPONDER` | 403 Forbidden |
| `/api/knowledge` (upload) | `POST` | `INCIDENT_COMMANDER`, `ADMIN`, `RESPONDER` | 403 Forbidden |
| `/api/knowledge/[id]` (delete) | `DELETE` | `ADMIN` | 403 Forbidden |
| `/api/incidents` | `POST` | `INCIDENT_COMMANDER`, `ADMIN`, `RESPONDER` | 403 Forbidden (Viewer cannot create) |
| `/api/incidents/*` | `GET` | Authenticated (`ANY`) | 401 if unauthenticated |
| `/api/analytics` | `GET` | Authenticated (`ANY`) | 401 if unauthenticated |

---

## 6. Where Cognito Will Be Integrated
### 1. Amazon Cognito User Pool Details
- **User Pool ID**: `us-east-1_Lz4flXPaw` (Region: `us-east-1`)
- **App Client ID**: `15qk2aht7ivv8d4s676s18ieu0` (`sentinel-web-client`, Public Client, no client secret required)
- **Auth Flow**: `USER_PASSWORD_AUTH` & `REFRESH_TOKEN_AUTH` via `@aws-sdk/client-cognito-identity-provider`
- **Token Verification**: Signature verification (RS256) using `aws-jwt-verify` against `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Lz4flXPaw/.well-known/jwks.json`

### 2. Backend Authentication API Endpoints
- `POST /api/auth/login`: Accepts `email` & `password`, initiates Cognito `InitiateAuthCommand`, returns `idToken`, `accessToken`, `refreshToken`, user identity, and mapped role.
- `POST /api/auth/logout`: Clears session tokens.
- `GET /api/auth/me`: Verifies Bearer JWT and returns verified Cognito claims (`sub`, `email`, `role`).
- `POST /api/auth/refresh`: Refreshes session via `REFRESH_TOKEN_AUTH`.

### 3. API Route Guarding
- Update all protected API routes to `await verifyAuthorizationAsync(req, requiredRoles)`.
- Disallow client header role spoofing (`x-sentinel-actor-role`) whenever Cognito is configured.
- Preserve backward-compatible mock fallback strictly for local unit tests and test suites (`ENABLE_MOCK_FALLBACK=true` / `tests/runAllTests.ts`).

### 4. Frontend Auth State Management
- `lib/auth/AuthContext.tsx`: React Context providing `user`, `role`, `token`, `isAuthenticated`, `isLoading`, `signIn()`, and `signOut()`.
- `lib/api/safeFetch.ts`: Reads valid `idToken` from storage and attaches `Authorization: Bearer <idToken>`.

### 5. UI Updates
- `app/login/page.tsx`: Production-styled Sentinel login page with credentials form, quick demo user selector (for hackathon evaluation), error handling, and return-to redirect support.
- `components/sentinel/Topbar.tsx`: Renders real authenticated user initials, email, and role badge.
- `components/sentinel/Sidebar.tsx`: Displays active user email, role, and functional Sign Out button.
- `components/ui/AppShell.tsx`: Intercepts unauthenticated sessions and redirects to `/login?returnTo=<path>`.

---

## 7. What Files Will Be Modified & Created
### Files to Create
- [`AUTH_IMPLEMENTATION_PLAN.md`](file:///d:/SENTNEL/AUTH_IMPLEMENTATION_PLAN.md) — This document.
- [`AUTHORIZATION_MATRIX.md`](file:///d:/SENTNEL/AUTHORIZATION_MATRIX.md) — Comprehensive permission matrix.
- [`AWS_COGNITO_SETUP.md`](file:///d:/SENTNEL/AWS_COGNITO_SETUP.md) — User pool, groups, and IAM reference.
- [`AUTHENTICATION_TEST_REPORT.md`](file:///d:/SENTNEL/AUTHENTICATION_TEST_REPORT.md) — Test results for auth & attack scenarios.
- [`HOSTED_DEMO_GUIDE.md`](file:///d:/SENTNEL/HOSTED_DEMO_GUIDE.md) — Judge/Evaluator demo instructions.
- [`AUTH_FINAL_STATUS.md`](file:///d:/SENTNEL/AUTH_FINAL_STATUS.md) — Final summary and verification sign-off.
- [`lib/auth/AuthContext.tsx`](file:///d:/SENTNEL/lib/auth/AuthContext.tsx) — Centralized client auth context.
- [`app/login/page.tsx`](file:///d:/SENTNEL/app/login/page.tsx) — Sentinel login UI.
- [`app/api/auth/login/route.ts`](file:///d:/SENTNEL/app/api/auth/login/route.ts) — Cognito authentication endpoint.
- [`app/api/auth/logout/route.ts`](file:///d:/SENTNEL/app/api/auth/logout/route.ts) — Session termination endpoint.
- [`app/api/auth/me/route.ts`](file:///d:/SENTNEL/app/api/auth/me/route.ts) — Identity verification endpoint.
- [`app/api/auth/refresh/route.ts`](file:///d:/SENTNEL/app/api/auth/refresh/route.ts) — Token refresh endpoint.
- [`scripts/testCognitoAuthSecurity.ts`](file:///d:/SENTNEL/scripts/testCognitoAuthSecurity.ts) — Dedicated auth security attack test suite.

### Files to Modify
- [`backend/domain/security/auth.ts`](file:///d:/SENTNEL/backend/domain/security/auth.ts): Enhance `verifyAuthorizationAsync` to cryptographically verify Cognito ID tokens and strictly reject spoofed headers.
- [`app/api/incidents/route.ts`](file:///d:/SENTNEL/app/api/incidents/route.ts): Use `await verifyAuthorizationAsync(req)`.
- [`app/api/incidents/[id]/route.ts`](file:///d:/SENTNEL/app/api/incidents/[id]/route.ts): Use `await verifyAuthorizationAsync(req)`.
- [`app/api/incidents/[id]/approve/route.ts`](file:///d:/SENTNEL/app/api/incidents/[id]/approve/route.ts): Use `await verifyAuthorizationAsync(req, ['INCIDENT_COMMANDER', 'ADMIN'])`.
- [`app/api/incidents/[id]/approve-action/route.ts`](file:///d:/SENTNEL/app/api/incidents/[id]/approve-action/route.ts): Use `await verifyAuthorizationAsync(req, ['INCIDENT_COMMANDER', 'ADMIN'])`.
- [`app/api/incidents/[id]/resolve/route.ts`](file:///d:/SENTNEL/app/api/incidents/[id]/resolve/route.ts): Use `await verifyAuthorizationAsync(req, ['INCIDENT_COMMANDER', 'ADMIN', 'RESPONDER'])`.
- [`app/api/incidents/[id]/analyze/route.ts`](file:///d:/SENTNEL/app/api/incidents/[id]/analyze/route.ts): Use `await verifyAuthorizationAsync(req, ['INCIDENT_COMMANDER', 'ADMIN', 'RESPONDER'])`.
- [`app/api/incidents/[id]/events/route.ts`](file:///d:/SENTNEL/app/api/incidents/[id]/events/route.ts): Use `await verifyAuthorizationAsync(req)`.
- [`app/api/knowledge/route.ts`](file:///d:/SENTNEL/app/api/knowledge/route.ts): Use `await verifyAuthorizationAsync(req, ['INCIDENT_COMMANDER', 'ADMIN', 'RESPONDER'])`.
- [`app/api/analytics/route.ts`](file:///d:/SENTNEL/app/api/analytics/route.ts): Use `await verifyAuthorizationAsync(req)`.
- [`lib/api/safeFetch.ts`](file:///d:/SENTNEL/lib/api/safeFetch.ts): Remove hardcoded role headers; use real stored Bearer token.
- [`components/ui/AppShell.tsx`](file:///d:/SENTNEL/components/ui/AppShell.tsx): Wrap in `AuthProvider`, add route guard and loading boundary.
- [`components/sentinel/Topbar.tsx`](file:///d:/SENTNEL/components/sentinel/Topbar.tsx): Bind user profile and role dynamically.
- [`components/sentinel/Sidebar.tsx`](file:///d:/SENTNEL/components/sentinel/Sidebar.tsx): Bind user profile, role, and logout action.
- [`app/page.tsx`](file:///d:/SENTNEL/app/page.tsx): Link "Command Center" / "Open Command Center" CTA to `/login`.
- [`.env.example`](file:///d:/SENTNEL/.env.example): Add documentation for Cognito environment variables.

---

## 8. What Files Must NOT Be Modified (FROZEN)
To protect working Sentinel functionality from regression, the following files are strictly **FROZEN**:
1. [`backend/domain/ai/IncidentAnalyzer.ts`](file:///d:/SENTNEL/backend/domain/ai/IncidentAnalyzer.ts) — Bedrock structured analysis & fallback logic.
2. [`backend/domain/ai/AgentToolExecutor.ts`](file:///d:/SENTNEL/backend/domain/ai/AgentToolExecutor.ts) — Autonomous agent tool dispatch & safety checks.
3. [`backend/domain/ai/PromptSecurityManager.ts`](file:///d:/SENTNEL/backend/domain/ai/PromptSecurityManager.ts) — Prompt injection defense & XML sanitization.
4. [`backend/domain/ai/BedrockOrchestrator.ts`](file:///d:/SENTNEL/backend/domain/ai/BedrockOrchestrator.ts) — Bedrock model routing & runtime client.
5. [`backend/domain/events/EventRouter.ts`](file:///d:/SENTNEL/backend/domain/events/EventRouter.ts) — EventBridge and SNS notification pipeline.
6. [`backend/domain/sla/SlaManager.ts`](file:///d:/SENTNEL/backend/domain/sla/SlaManager.ts) — SLA deadline calculations & alerting.
7. [`backend/domain/hitl/ApprovalManager.ts`](file:///d:/SENTNEL/backend/domain/hitl/ApprovalManager.ts) — HMAC token generation & replay checks.
8. [`backend/repositories/DynamoIncidentRepository.ts`](file:///d:/SENTNEL/backend/repositories/DynamoIncidentRepository.ts) — DynamoDB schema & single-table queries.
9. [`components/dashboard/InteractiveWorkbench.tsx`](file:///d:/SENTNEL/components/dashboard/InteractiveWorkbench.tsx) — Main dashboard triage workbench.
10. [`components/dashboard/AIInsightStream.tsx`](file:///d:/SENTNEL/components/dashboard/AIInsightStream.tsx) — Live AI insight rendering.

---

## 9. How Backward Compatibility Will Be Preserved
1. **Unit Test Stability**: `tests/runAllTests.ts` runs directly via `tsx` without a live browser or Cognito session. The backend auth guard allows unit tests in development/sandbox mode to test mock tokens deterministically.
2. **API Data Contracts**: All request bodies, status payloads, incident models, and error responses maintain their exact shapes.
3. **Audit Trail Backwards Compatibility**: Audit log entries without Cognito `sub` continue to deserialize and display properly.
4. **Offline / Sandbox Mode**: When `ENABLE_MOCK_FALLBACK=true`, Sentinel continues to operate cleanly for offline evaluation.

---

## 10. Testing Strategy
1. **Baseline Validation**:
   - `npm run typecheck` (0 errors)
   - `npm test` (13/13 suites pass)
2. **Authentication Security Matrix**:
   - Request with no token → `401 Unauthorized`.
   - Request with tampered/invalid signature → `401 Unauthorized`.
   - Request with expired token → `401 Unauthorized`.
   - Request with valid token → Authorized context populated.
3. **Role-Based Access Control (RBAC) Matrix**:
   - `VIEWER` attempting approval on `/api/incidents/[id]/approve` → `403 Forbidden`.
   - `VIEWER` attempting knowledge upload on `/api/knowledge` → `403 Forbidden`.
   - `RESPONDER` attempting approval on `/api/incidents/[id]/approve` → `403 Forbidden`.
   - `INCIDENT_COMMANDER` executing approval on `/api/incidents/[id]/approve` → `200 OK`.
   - `ADMIN` executing approval or administrative action → `200 OK`.
4. **Spoofing Defense**:
   - Malicious client sending `x-sentinel-actor-role: ADMIN` with `VIEWER` token → Token claims prevail, role evaluated as `VIEWER`, request denied (`403 Forbidden`).
5. **End-to-End User Experience**:
   - Visit `/` → Landing page renders without requiring login.
   - Click "Command Center" → Redirected to `/login?returnTo=/dashboard`.
   - Select Demo Commander (`demo@sentinel.ai`) → Authenticate via Cognito → Redirected to `/dashboard`.
   - Verify Topbar and Sidebar display `demo@sentinel.ai` and `INCIDENT_COMMANDER`.
   - Navigate to `/incidents` → Open incident → Verify AI triage, action plan, and approval work seamlessly.
   - Click "Sign Out" → Local tokens cleared → Redirected to `/login`.
   - Attempting to visit `/dashboard` redirects back to `/login`.
