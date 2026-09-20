# Sentinel Security Policy: Infrastructure Mutation & HITL Enforcement

- **Policy ID**: `POL-SEC-001`
- **Effective Date**: 2026-09-01
- **Compliance Standard**: SOC-2 Type II / ISO-27001 / AWS Well-Architected Reliability Pillar

---

## 1. Principle of Non-Autonomous Mutation
Under no circumstances may generative AI models or autonomous agents directly mutate, delete, or reconfigure AWS production infrastructure without verified human authorization.

---

## 2. Cryptographic Guardrail Invariants
1. **Authenticated Actor Role**: Only users holding the verified `INCIDENT_COMMANDER` role are authorized to execute remediation tools (`rollback_ecs_service`, `scale_service`, `reboot_database_instance`).
2. **Single-Use Cryptographic Nonce**: Every proposed action plan generates a unique UUID nonce. Replay of an identical nonce is strictly rejected.
3. **Time-To-Live (TTL)**: Authorization tokens expire after 300 seconds (5 minutes). Stale tokens are rejected.
4. **Optimistic Version Lock**: If the incident version changes during deliberation, the approval is invalidated to prevent race conditions.
