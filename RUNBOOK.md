# Sentinel — Operational Runbook

> **Audience**: Sentinel SRE On-Call Engineers & Incident Commanders  
> **Classification**: Internal Operational Runbook  
> **System**: Sentinel Autonomous Incident Intelligence & Human-in-the-Loop Remediation Platform

---

## 1. System Health & Critical Signals

Sentinel relies on six core subsystems. The operational status can be confirmed via the `/api/health` probe:

```bash
curl -f http://localhost:3000/api/health
```

### Key Alert Thresholds

| Metric / Signal | Warning Threshold | Critical Threshold | Action Required |
| :--- | :--- | :--- | :--- |
| **Bedrock API Latency (P95)** | $> 4,000\text{ms}$ | $> 12,000\text{ms}$ | Check Bedrock throttling quotas; engage fallback or exponential backoff. |
| **Bedrock Knowledge Base Failures** | $> 2\%$ 5xx errors | $> 10\%$ 5xx errors | Check OpenSearch Serverless collection status and KB sync state. |
| **DynamoDB Throttled Requests** | $> 0$ per min | $> 5$ per min | Verify on-demand billing mode or increase provisioned RCU/WCU limits. |
| **SLA Approaching Alerts** | $\ge 75\%$ elapsed | $> 90\%$ elapsed | Escalate to secondary on-call responder; trigger notification burst. |
| **Stale Approval Rejections** | $> 3$ in 10 mins | $> 10$ in 10 mins | Investigate concurrent incident edits advancing version numbers unexpectedly. |

---

## 2. Standard Operating Procedures (SOPs)

### SOP-01: Handling Amazon Bedrock Model Throttling (`ThrottlingException`)
1. **Diagnosis**: Logs indicate `429 Too Many Requests` or `ThrottlingException` from `bedrock-runtime.amazonaws.com`.
2. **Automated Mitigation**: Sentinel's AWS SDK client is configured with exponential jitter backoff (up to 3 retries).
3. **Manual Escalation**:
   - Check Service Quotas in AWS Console $\rightarrow$ Amazon Bedrock $\rightarrow$ Foundation Models $\rightarrow$ *Converse requests per minute*.
   - If quota reached, temporarily activate fallback sandbox mode by setting `ENABLE_MOCK_FALLBACK=true` in ECS task definition while requesting quota increase.
   - Alternatively, failover to secondary model (`anthropic.claude-3-haiku-20240307-v1:0`) via SSM parameter `BEDROCK_MODEL_ID`.

---

### SOP-02: Recovering from Knowledge Base Ingestion Sync Failures
1. **Diagnosis**: Documents uploaded to S3 remain in `PENDING_SYNC` status and do not appear in vector retrieval.
2. **Procedure**:
   - Verify document was written to approved prefix (`sops/`, `policies/`, `resources/`).
   - Check Bedrock Console $\rightarrow$ Knowledge bases $\rightarrow$ Data source $\rightarrow$ **Sync history**.
   - If sync failed, review CloudWatch logs for `OpenSearchServerlessException`.
   - Re-trigger sync manually via AWS CLI:
     ```bash
     aws bedrock-agent start-ingestion-job \
       --knowledge-base-id <KB_ID> \
       --data-source-id <DATA_SOURCE_ID>
     ```

---

### SOP-03: Investigating Approval Token Replay or Stale Version Conflicts
1. **Diagnosis**: Commander attempts to approve an action and receives `409 Conflict: Incident version has advanced`.
2. **Root Cause**: Another responder or automated process updated the incident between action preparation and human approval.
3. **Resolution**:
   - Reload incident details workbench to pull the latest state (`version = N+1`).
   - Re-evaluate proposed action against current infrastructure state.
   - Click **Generate Updated Action Plan** to formulate a fresh plan tied to the current version.
   - Confirm approval with a fresh cryptographic token.

---

### SOP-04: Emergency Demo State Reset
1. **Situation**: A demonstration needs to be restarted immediately from a clean baseline.
2. **Execution**:
   ```bash
   # Via CLI
   curl -X POST http://localhost:3000/api/demo/reset -H "Content-Type: application/json"
   
   # Or via UI
   # Navigate to Settings -> Click "Reset Demo State"
   # Or click the "Reset Demo" button in the Top Header
   ```
3. **Outcome**: Clears all transient mutations and restores the default incidents and timeline events.

---

### SOP-05: Rotating Approval HMAC Signing Secret
1. **Frequency**: Every 90 days, or immediately upon suspected compromise.
2. **Procedure**:
   - Generate a new 64-character cryptographic key:
     ```bash
     openssl rand -hex 32
     ```
   - Update `APPROVAL_HMAC_SECRET` in AWS Secrets Manager:
     ```bash
     aws secretsmanager put-secret-value \
       --secret-id sentinel/approval-hmac-key \
       --secret-string "{\"APPROVAL_HMAC_SECRET\":\"<NEW_KEY>\"}"
     ```
   - Re-deploy ECS service tasks to pick up the rotated secret.
   - Existing valid approvals within the 300-second TTL window will expire normally.
