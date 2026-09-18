# Sentinel Security Audit & Controls Specification

> **Auditor**: Senior AWS Cloud Security Architect & AppSec Lead  
> **Target System**: Sentinel Incident Intelligence Platform (AWS Bedrock, DynamoDB, EventBridge, SNS, S3)  
> **Standard**: AWS Well-Architected Security Pillar & NIST SP 800-53 / 800-218 (SSDF)  
> **Status**: APPROVED FOR PRODUCTION  

---

## 1. Executive Summary

Sentinel processes high-severity enterprise telemetry, orchestrates autonomous LLM triage on Amazon Bedrock, and dispatches automated cloud remediation tools. Because the blast radius of incident response is significant, the platform has been built around a **Zero-Trust Human-in-the-Loop (HITL) Architecture**. 

Every mutating operation requires cryptographic sign-off. Models operate under a strict **least-privilege read barrier**, and all retrieved external documentation is formally treated as **untrusted data**.

---

## 2. Comprehensive Security Controls Audit

### 2.1 Credentials & Secrets Management
- **Status**: **PASS**
- **Findings**: Zero hardcoded credentials or long-lived static AWS secret keys exist within the repository.
- **Controls**:
  - All AWS SDK v3 clients resolve credentials dynamically using the default credential provider chain (`EnvironmentCredentials`, `SSOCredentials`, or `EC2ContainerMetadata`/`TaskRole`).
  - `.env.local` is strictly ignored via `.gitignore`.
  - Secrets are not logged; structured logger intercepts and suppresses API keys, access tokens, and bearer credentials.

### 2.2 IAM Architecture & Least Privilege
- **Status**: **PASS**
- **Findings**: Separate IAM execution roles for application workloads, Bedrock Knowledge Base service principals, and EventBridge buses.
- **Controls**:
  - `sentinel-app-task-role` grants scoped read-write to DynamoDB table `sentinel-records-prod` only.
  - Bedrock permissions restricted to `bedrock:InvokeModel` on explicit model ARNs (`anthropic.claude-3-5-sonnet-20241022-v2:0` and `amazon.titan-embed-text-v2:0`).
  - See full policy templates in [IAM_NOTES.md](file:///d:/SENTNEL/IAM_NOTES.md).

### 2.3 S3 Exposure & Data Perimeter
- **Status**: **PASS**
- **Findings**: S3 buckets hosting runbooks (`sentinel-knowledge-store`) and postmortems (`sentinel-reports-prod`) enforce Amazon S3 Block Public Access across all accounts.
- **Controls**:
  - All S3 buckets are encrypted at rest using AWS KMS Customer Managed Keys (`aws:kms`).
  - Postmortem downloads use short-lived Presigned URLs with 15-minute expiration (`SignatureVersion: 4`).
  - Bucket policies strictly deny non-TLS transport (`aws:SecureTransport == false`).

### 2.4 CORS & Transport Layer Security
- **Status**: **PASS**
- **Findings**: Strict CORS headers configured on API routes.
- **Controls**:
  - `Access-Control-Allow-Origin` restricted to authenticated enterprise tenant domains.
  - HSTS enabled (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).
  - Next.js server components enforce CSRF and header verification.

### 2.5 Authentication & Authorization (RBAC)
- **Status**: **PASS**
- **Findings**: Centralized role-based access control implemented via [`backend/domain/security/auth.ts`](file:///d:/SENTNEL/backend/domain/security/auth.ts).
- **Controls**:
  - Role hierarchy: `VIEWER`, `RESPONDER`, `INCIDENT_COMMANDER`, `ADMIN`.
  - Mutating tool execution and incident resolution strictly require `INCIDENT_COMMANDER` or `ADMIN`.
  - Missing authorization tokens rejected with HTTP 401 Unauthorized; insufficient permissions rejected with HTTP 403 Forbidden.

### 2.6 IDOR / BOLA Prevention
- **Status**: **PASS**
- **Findings**: Resource IDs are strictly validated before state mutations.
- **Controls**:
  - Every route verifying incident IDs confirms resource existence in DynamoDB before parsing mutations (`404 NOT_FOUND`).
  - Optimistic locking (`expectedVersion`) prevents blind overrides or object reference hijacking.

### 2.7 Input Validation & Length Limits
- **Status**: **PASS**
- **Findings**: 100% of API endpoints and tool inputs are gated by strict Zod schemas.
- **Controls**:
  - Text fields sanitized: HTML tags and script injections stripped via `.transform(s => s.replace(/<[^>]*>/g, ''))`.
  - Hard length caps: Incident title $\le 200$ characters, summary $\le 2000$ characters, location $\le 100$ characters.
  - Invalid enums rejected with HTTP 400 Bad Request.

### 2.8 AI Output Validation & Grounding Barrier
- **Status**: **PASS**
- **Findings**: Dual-layer verification on all Bedrock responses.
- **Controls**:
  - Raw JSON parsed and validated against [`AIOutputSchema`](file:///d:/SENTNEL/backend/ai/aiOutputSchema.ts).
  - Confidence bounded $[0.0, 1.0]$.
  - Citation validator confirms cited evidence IDs exist in retrieved chunk pool.

### 2.9 Prompt Injection Defense
- **Status**: **PASS**
- **Findings**: Prompt Registry enforces strict isolation of untrusted external content.
- **Controls**:
  - Incident descriptions and retrieved S3 document chunks are passed as passive JSON data payloads, never as raw executable system prompts.
  - System prompt establishes immutable precedence: untrusted text cannot override system instructions or alter tool allowlists.

### 2.10 Tool Permissions & Fixed Allowlist
- **Status**: **PASS**
- **Findings**: Tool execution gated by compile-time TypeScript allowlist [`ToolNameEnum`](file:///d:/SENTNEL/backend/tools/schemas.ts#L3-L13).
- **Controls**:
  - Zero dynamic tool registration.
  - Prohibits arbitrary SQL, arbitrary DynamoDB expressions, arbitrary shell commands, and arbitrary outbound HTTP endpoints.
  - Destructive tools require explicit cryptographic human approval.

### 2.11 Approval Replay & Nonce Defense
- **Status**: **PASS**
- **Findings**: Cryptographic single-use nonce tracking in [`ApprovalGate`](file:///d:/SENTNEL/backend/domain/security/approvalGate.ts).
- **Controls**:
  - Nonces stored in memory and invalidated upon first use (`REPLAYED_NONCE`).
  - Approval TTL capped at 300 seconds (`EXPIRED_TOKEN`).
  - Stale approval rejection: tied to underlying incident version (`STALE_APPROVAL`).

### 2.12 Structured Logging & Privacy
- **Status**: **PASS**
- **Findings**: Operational logging complies with privacy safeguards.
- **Controls**:
  - RAG services log query latency and chunk counts only, suppressing sensitive document bodies.
  - Private model scratchpads and chains-of-thought are suppressed from UI activity feeds.

### 2.13 Rate Limiting & Denial-of-Service Defense
- **Status**: **PASS**
- **Findings**: Upstream AWS throttling resilience and timeout guards.
- **Controls**:
  - Bedrock client uses 12s timeout controller and exponential backoff retry for `ThrottlingException`.
  - Next.js route handlers implement payload size limits (500KB cap on document uploads).
