# SENTINEL — UI/UX Redesign Specification & Implementation Plan

**Document Version:** 1.0.0  
**Target Platform:** SENTINEL — AI Incident Intelligence & Autonomous Response Platform  
**Design Philosophy:** Mission-control operational excellence, calm technical authority, editorial typography, enterprise SaaS finish.  
**Scope:** Frontend UI/UX Redesign & Organization Only. Backend, AWS services, APIs, databases, Bedrock RAG, state machine, and security gates remain 100% untouched.

---

## 1. Current Page Structure

| Route | Current Functionality | Current UI Assessment |
| :--- | :--- | :--- |
| `/` | Landing page embedding the full internal workbench, schematic flow, pillars carousel, and telemetry bar. | Hybrid state: looks like an internal workbench rather than a premier public product page. Needs separation into a true enterprise SaaS product landing page with real navigation to `/dashboard`. |
| `/dashboard` | Operational command center displaying KPI grid, priority incident queue, distribution charts, SLA countdown, and embedded workbench. | High utility but visual density and layout hierarchy need enterprise mission-control polish, distinct left/right priority distribution, and clean spacing. |
| `/incidents` | Incident registry listing incidents with search, severity filter tabs, and ingest modal. | Functional card stack, but lacks tabular/card toggle, detailed status chips, SLA countdowns, and quick access to dedicated incident deep-dive pages. |
| `/incidents/[id]` | *Not implemented as a standalone route yet* (users interact via the embedded workbench). | **Missing dedicated investigation route**. Users need an `/incidents/[id]` deep-dive investigation page with 65% left analytical column and 35% sticky metadata sidebar. |
| `/analytics` | SRE reliability metrics: MTTD, MTTM, SLA compliance, severity/category distribution, and recurring pattern analysis. | Functional, but needs modern SVG/CSS metric charts, date range selector, and refined typography hierarchy. |
| `/knowledge` | Knowledge corpus browser, sync status tracker, and S3 upload modal. | Comprehensive backend hookup, but needs enterprise document library layout with category tabs (SOPs, Historical, Policies, Resources) and status badges. |
| `/ai-activity` | Chronological audit feed of AI tool executions, AWS request IDs, and evidence citations. | Clean timeline data, but needs structured operational explanation cards, tool icon badges, and model taggers. |
| `/settings` | Platform configuration, model select, HITL toggle, and demo reset controls. | Basic single column; needs clean tabbed organization (General, AI Config, Knowledge Base, Security, Demo Controls). |

---

## 2. Current Component Structure

### Existing Layout & UI Elements (`components/ui/`):
- `AppShell.tsx`: Top operational bar with brand logo, breadcrumb, reset demo button, sandbox/live pill, user avatar, and 60px desktop sidebar.
- `NavigationHeader.tsx`: Sticky navigation header for the root page.
- `button.tsx`: CVA button construct with `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
- `badge.tsx`: CVA badge with `default`, `amber`, `destructive`, `success`, `outline`.
- `card.tsx`: Pleurat Shala border card with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- `skeleton.tsx`: Pulse loading element.
- `empty-state.tsx`: Generic empty state illustration card.
- `toast.tsx`: Toast notification context and provider.
- `ErrorBoundary.tsx`: React error boundary capturing render exceptions.

### Existing Domain & Dashboard Elements (`components/dashboard/`):
- `InteractiveWorkbench.tsx`: 5-step incident workflow (Detected $\to$ Triage $\to$ Action Plan $\to$ Approval $\to$ Resolve).
- `PriorityIncidentQueue.tsx`: Ranked on-call incident dispatch queue with filter tabs.
- `KPIGrid.tsx`: 4-card metric grid (Active, Critical, SLA at Risk, Avg MTTM).
- `SchematicFlowDiagram.tsx`: Inbound alert to AWS rollback SVG schematic.
- `PillarsCarousel.tsx`: Hardware aesthetic carousel illustrating core capabilities.
- `CircuitTelemetryBar.tsx`: Hardware bus test point bar.
- `DistributionCharts.tsx`: Severity distribution and category breakdown bars.
- `SLACountdownCard.tsx`: Radial/linear SLA countdown timer.
- `RecentAIActivityFeed.tsx`: Compact activity feed for the dashboard.
- `RecurringPatternCard.tsx`: Common failure pattern analyzer.
- `OperationalHealthCard.tsx`: AWS service health card.
- `ReportIncidentModal.tsx`: Incident ingestion form with demo pre-fill.
- `AnalyticsOverview.tsx`: Root-page analytics component.

---

## 3. Visual System & Design Tokens

Preserving the Sentinel identity while modernizing the palette according to the design direction:

```css
:root {
  /* Canvas & Backgrounds */
  --color-canvas: #F7F5EF;              /* Warm linen canvas */
  --color-surface-card: #FFFFFF;        /* Clean card surface */
  --color-surface-subtle: #EFECE3;      /* Subtle tinted background */
  --color-surface-strong: #E6E1D3;      /* Emphasized surface */
  --color-surface-border: #DED9CE;      /* Architectural crisp border */
  --color-surface-border-strong: #C8C2B3;

  /* Typography & Ink */
  --color-ink-primary: #171713;         /* Deep obsidian charcoal */
  --color-ink-secondary: #57534A;       /* Warm editorial secondary text */
  --color-ink-muted: #77736A;           /* Calm muted captions */
  --color-ink-tertiary: #9B968B;        /* Ghost technical labels */

  /* Accents */
  --color-accent-primary: #D99A32;      /* Sentinel warm ochre amber */
  --color-accent-secondary: #E9B95B;    /* Lighter gold ochre */
  --color-accent-light: #FBF0D9;        /* Ochre wash surface */
  --color-accent-hover: #C58824;

  /* Semantic Telemetry States */
  --color-status-success: #2E8B57;      /* Sea green for healthy / resolved */
  --color-status-success-bg: #EAF4EE;
  --color-status-warning: #D88A22;      /* Warning amber */
  --color-status-warning-bg: #FCF4E9;
  --color-status-critical: #C94C4C;     /* Controlled crimson */
  --color-status-critical-bg: #FAEEEE;
  --color-status-info: #4A78A8;         /* Technical steel blue */
  --color-status-info-bg: #EDF2F7;
}
```

### Typography Hierarchy:
- **Headings (Editorial / Display):** `font-sans` (`General Sans`, `Inter`), tracking `-0.02em`, bold to black weights.
- **Body & Subtitles:** `font-sans`, high legibility, line-height `1.5`.
- **Technical & Telemetry Codes:** `font-mono` (`JetBrains Mono`), letter-spacing `+0.05em`, size `10px–12px` uppercase.

---

## 4. Components to Preserve (Business Logic Unchanged)

Every single functional handler and API call must remain intact:
1. `InteractiveWorkbench.tsx`:
   - All 5 steps (Triage, Action Plan, Cryptographic Nonce Approval, Resolution, S3 Retrospective).
   - Real `POST /api/incidents/[id]/triage` and `POST /api/incidents/[id]/action-plans`.
   - Real `POST /api/incidents/[id]/approve-action` with SHA-256 HMAC and single-use UUID nonce.
   - Real `POST /api/incidents/[id]/resolve` with S3 presigned URL generation.
2. `ReportIncidentModal.tsx`:
   - Incident ingestion to DynamoDB with demo pre-fill (`⚡ Load Demo Incident`).
3. `PriorityIncidentQueue.tsx`:
   - SEV ranking, status filter, and incident selection.
4. `AppShell.tsx`:
   - Demo reset endpoint trigger (`POST /api/demo/reset`), role indicators, and live AWS detection.

---

## 5. Components to Redesign & Modernize

1. **Global `AppShell.tsx`**:
   - Modern enterprise dual-tier sidebar: Sentinel icon mark, top navigation routes, persistent system status block (● AWS Connected, ● Bedrock Online, ● Knowledge Base Synced), and command center commander badge.
   - Global Topbar: Breadcrumbs, quick search trigger (`⌘K`), live environment badge (`AWS US-EAST-1 LIVE`), notification trigger, and user command menu.
2. **Landing Page (`/`)**:
   - Redesigned from the ground up as a premier enterprise product website with 10 sections:
     - Section 1: Hero with interactive animated incident command pipeline visualization.
     - Section 2: The Problem ("Incidents move faster than teams").
     - Section 3: How Sentinel Works (6-step interactive sequence: Detect, Understand, Retrieve, Recommend, Approve, Resolve).
     - Section 4: AI Incident Intelligence (Realistic interactive preview of triage, severity, SLA, root cause).
     - Section 5: Grounded AI (Knowledge Base / RAG vector citation architecture).
     - Section 6: Human-in-the-Loop (Controlled automation with cryptographic sign-off).
     - Section 7: Operations Command Center (Full dashboard preview).
     - Section 8: AWS Serverless Architecture (Visual flow with live status detection).
     - Section 9: Enterprise Security (STRIDE, RBAC, tool allowlisting, nonces).
     - Section 10: Final CTA & Editorial Footer.
3. **Command Center Dashboard (`/dashboard`)**:
   - Dedicated mission-control operational interface with large numerical metrics, priority dispatch queue, AWS health telemetry, SLA countdown, and interactive workbench integration.
4. **Incident Registry (`/incidents`)**:
   - Upgraded table/card view with search, severity filter tabs, status pills, SLA deadlines, commander badges, and direct links to incident detail deep-dives.
5. **Analytics (`/analytics`)**:
   - Clean SVG metrics visualizations for incident volume, severity distribution, category breakdown, and MTTR/MTTD trends.
6. **Knowledge Center (`/knowledge`)**:
   - Document catalog with synced/pending badges, category tabs, and validated upload drawer.
7. **AI Activity Feed (`/ai-activity`)**:
   - Operational explanations, model performance indicators, and execution audit logs.
8. **Settings (`/settings`)**:
   - Multi-tabbed configuration panel for AI parameters, security policies, and demo resets.

---

## 6. New Components Required (`components/sentinel/`)

1. `Sidebar.tsx`: Enterprise left navigation bar with collapsible state and system health indicators.
2. `Topbar.tsx`: Header bar with breadcrumbs, system state pill, reset demo button, and `⌘K` command palette trigger.
3. `CommandPalette.tsx`: Modal triggered via `⌘K` or topbar search allowing quick navigation, demo reset, and incident lookup.
4. `StatusIndicator.tsx`: Standardized live pulsing status indicator (Healthy, Warning, Critical, Offline).
5. `SeverityBadge.tsx`: Consistent SEV1/SEV2/SEV3/SEV4 styling with accessible contrast.
6. `SlaCountdown.tsx`: Real-time ticking SLA deadline indicator with warning thresholds.
7. `AiAnalysisCard.tsx`: Polished presentation of Bedrock triage output, root cause hypotheses, and confidence scores.
8. `EvidenceCard.tsx`: Clean runbook citation card displaying source S3 URI, relevance score, and snippet.
9. `ActionPlanView.tsx`: Ordered remediation plan with blast radius risk tags and approval triggers.
10. `VerticalTimeline.tsx`: Connected milestone timeline with category icons.
11. `IncidentTable.tsx`: Tabular incident registry with sortable columns and quick actions.
12. `SystemHealth.tsx`: Real-time AWS service health monitor (DynamoDB, S3, Bedrock, EventBridge).
13. `PageHeader.tsx`: Standardized editorial page title and action bar.

---

## 7. Dedicated Incident Detail Page (`/incidents/[id]`)

Create `app/incidents/[id]/page.tsx` implementing the requested 65% / 35% layout:
- **Header:** Incident ID, title, severity badge, status pill, SLA countdown, service tag, environment.
- **Left Column (65%):**
  - Incident Overview & Telemetry Card
  - AI Root Cause Hypothesis & Confidence Card
  - Grounded Knowledge Evidence Citations
  - Recommended Remediation Action Plan (with Human Approval Gate)
  - Interactive Vertical Audit & Event Timeline
  - S3 Postmortem Retrospective Export
- **Right Column (35% Sticky):**
  - Incident Commander & Responder Roster
  - SLA Target & Escalation Deadline
  - Blast Radius Risk & Affected AWS Resources
  - AWS Execution Latency & Security State
  - Quick Action Controls

---

## 8. Animation & Micro-Interaction Plan

- **Route Transitions:** Subtle fade + 6px vertical translateY (duration: `250ms`, easing: `cubic-bezier(0.16, 1, 0.3, 1)`).
- **Reduced Motion Support:** All framer-motion animations respect `prefers-reduced-motion` media queries via standard CSS/framer variants.
- **Status Indicators:** Gentle pulse on active live telemetry indicators; no jarring neon effects.
- **Buttons & Interactive Elements:** Subtle press depression (`active:scale-[0.98]`), hover border illumination, and loading spinners for asynchronous actions.
- **Sticky Panels:** Smooth scroll tracking with high-performance CSS `position: sticky`.

---

## 9. Responsive Design Plan

- **Desktop ($\ge 1280\text{px}$):** Persistent left sidebar, multi-column dashboard, 65%/35% incident deep-dive.
- **Laptop / Small Desktop ($1024\text{px} - 1279\text{px}$):** Compact sidebar, responsive flex containers.
- **Tablet ($768\text{px} - 1023\text{px}$):** Slide-out navigation drawer, stacked 2-column KPI grids, scrollable horizontal tables.
- **Mobile ($< 768\text{px}$):** Bottom/drawer navigation, single-column stacked cards, full-width touch targets ($\ge 44\text{px}$ height), and overflow-safe containers.

---

## 10. Execution Roadmap

1. **Step 1:** Author design tokens and utilities in `tailwind.config.ts` and `app/globals.css`.
2. **Step 2:** Build reusable enterprise components in `components/sentinel/` (`Sidebar`, `Topbar`, `CommandPalette`, `SeverityBadge`, `StatusIndicator`, `PageHeader`, etc.).
3. **Step 3:** Upgrade `components/ui/AppShell.tsx` to integrate the new dual-tier sidebar, topbar, and command palette.
4. **Step 4:** Redesign the Public Landing Page (`app/page.tsx`) with all 10 required product marketing sections.
5. **Step 5:** Redesign the Command Center Dashboard (`app/dashboard/page.tsx`).
6. **Step 6:** Redesign the Incident Registry (`app/incidents/page.tsx`).
7. **Step 7:** Implement the Dedicated Incident Detail Page (`app/incidents/[id]/page.tsx`).
8. **Step 8:** Redesign Analytics (`app/analytics/page.tsx`), Knowledge (`app/knowledge/page.tsx`), AI Activity (`app/ai-activity/page.tsx`), and Settings (`app/settings/page.tsx`).
9. **Step 9:** Execute full verification (`npm run typecheck`, `npm test`, `npm run build`) and create `UI_FINAL_AUDIT.md`.
