# DECISIONS.md — Architecture Decision Records (ADRs)

> **Platform**: SENTINEL — AI Incident Intelligence & Autonomous Response Platform  
> **Standard**: Lightweight ADR Format (Context, Decision, Consequences, Status)

---

## ADR-001: Next.js 15 App Router with Server Actions vs. Decoupled Express Backend

### Context
We need a responsive, modern web application that interacts with AWS services, renders complex schematic UI components, and handles secure API operations. We had the option of building a decoupled backend (Express / NestJS on AWS Lambda / ECS) or using Next.js 15 App Router with Route Handlers and Server Actions.

### Decision
Adopt **Next.js 15 App Router** as the unified full-stack framework for both the frontend and backend API layers.

### Consequences
- **Positive**: Single codebase, shared TypeScript domain types between UI and backend, zero API drift, streamlined deployment to AWS Amplify or ECS/Lambda via OpenNext.
- **Negative**: Requires careful separation of backend-only AWS SDK dependencies to avoid bloating the client bundle.
- **Mitigation**: Strict code isolation into `/backend` and `/lib/aws` with `'use server'` boundaries.

---

## ADR-002: Single-Table DynamoDB vs. Relational RDS Aurora

### Context
SENTINEL stores incidents, timeline events, retrieved evidence citations, mitigation action plans, and audit logs. Incidents have high-concurrency read/write bursts during outages.

### Decision
Implement an optimized **Single-Table DynamoDB architecture** (`sentinel-records-prod`) with two Global Secondary Indexes (`GSI1-StatusIndex` and `GSI2-SeverityIndex`).

### Consequences
- **Positive**: Consistent sub-10ms read/write latency; zero cold-start database connection pool exhaustion; native integration with AWS IAM; atomic transactions for multi-item approval writes.
- **Negative**: Less flexible ad-hoc querying compared to SQL.
- **Mitigation**: Access patterns are fully modeled and pre-indexed prior to implementation.

---

## ADR-003: Bedrock Converse API vs. Bedrock AgentCore as Primary Engine

### Context
Amazon Bedrock offers both the direct Converse API (supporting structured tool use and JSON schemas) and Bedrock Agents (multi-step autonomous loops). The hackathon has a 3-day hard constraint where the demo must be 100% reliable.

### Decision
Use **Amazon Bedrock Converse API (`@aws-sdk/client-bedrock-runtime`) as the P0 primary engine**, while designing an abstracted interface (`IAIEngine`) that allows **Bedrock AgentCore as an optional P2 enhancement**.

### Consequences
- **Positive**: Absolute determinism, near-instantaneous response times, zero risk of unexpected agent runaway loops during live judging demonstrations, full control over Zod schema validation.
- **Negative**: Multi-step reasoning loops must be choreographed in the application layer rather than delegated entirely to AWS managed agents.
- **Mitigation**: Application-level state machine orchestrates the Triage -> Action Plan -> Execution pipeline cleanly.

---

## ADR-004: Pleurat Shala Design System vs. Generic Dark-Mode UI

### Context
Most SRE and DevOps tools rely on generic dark-mode styling with uninspired blue/green accents. Hackathon judging criteria heavily reward visual excellence, distinct aesthetics, and clear user experience.

### Decision
Adopt the **Pleurat Shala design system**:
- Warm linen/cream canvas (`#fbf7e6`)
- Deep ink charcoal text (`#16140e`)
- Warm ochre / amber accents (`#f3b44a`)
- Elevated surface cards (`#efe9d2`)
- Architectural schematics, circuit connector lines (`C4`, `L3`, `U2`), and technical figure tags (`FIG. 001`).

### Consequences
- **Positive**: Creates an immediate, memorable, state-of-the-art aesthetic that looks like an elite industrial engineering tool; high contrast and WCAG 2.2 AA accessibility.
- **Negative**: Requires custom CSS tokens and handcrafted schematic SVG wireframe components rather than relying on out-of-the-box UI themes.

---

## ADR-005: Cryptographic Nonce & RBAC for Human-in-the-Loop (HITL) Actions

### Context
A core rule of production AI safety and hackathon constraints is that AI must never directly mutate infrastructure or databases. Furthermore, rogue or accidental execution of mutating tools must be impossible.

### Decision
Mutating tools require a **Cryptographically Signed Approval Payload** containing the Commander's authenticated identity, plan ID, action ID, timestamp, and a single-use UUID nonce.

### Consequences
- **Positive**: Prevents prompt injection exploits from triggering unauthorized infrastructure changes; eliminates replay attacks; creates an immutable compliance audit trail.
- **Negative**: Adds a step to the incident response workflow.
- **Mitigation**: Clear, one-click slide-out approval drawer in the UI with automated blast-radius assessment makes sign-off fast (<5 seconds).

---

## ADR-006: Dual-Adapter Bridge with Explicit Fallback Indicator

### Context
Hackathon rule: *"Never replace real AWS integration with fake success responses without clearly marking the fallback."* We must ensure the app functions seamlessly in local environments without AWS credentials while providing real AWS execution when credentials are present.

### Decision
Implement a **Dual-Adapter Bridge Pattern** across Bedrock, DynamoDB, and S3. When real AWS credentials or services are unavailable, the application can switch to a deterministic sandbox adapter, but **visibly displays a prominent amber badge in the UI: `FALLBACK_SANDBOX_ENGAGED`**.

### Consequences
- **Positive**: Total transparency for hackathon judges; zero risk of false advertising; enables offline development and testing.
