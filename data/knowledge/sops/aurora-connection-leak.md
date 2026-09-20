# SOP: Aurora PostgreSQL Connection Pool Recovery & Emergency Remediation

- **Document ID**: `SOP-DB-004`
- **Classification**: Standard Operating Procedure
- **Target Workload**: Amazon Aurora PostgreSQL (`aurora-pg-prod.c4z`)
- **Primary Consumers**: `payment-checkout-service`, `billing-engine`

---

## 1. Overview & Symptom Profile
When traffic spikes or a deployment introduces unindexed database queries, backend application threads can hold database connections open indefinitely. This causes connection pool starvation across Amazon Aurora PostgreSQL clusters.

### Primary Alert Indicators:
- **CloudWatch Alarm**: `PaymentApiLatencyAlarm` triggers `ALARM` state when P99 latency exceeds 500ms (often surging to 3,000ms – 5,000ms).
- **Application Error Log**:
  `ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z`
- **HTTP Response**: Upstream API Gateway or Application Load Balancer returns `504 Gateway Timeout` or `502 Bad Gateway`.

---

## 2. Blast-Radius Assessment & Pre-Conditions
- **Impact Surface**: Checkout flow, cart conversions, Stripe webhook processing.
- **Safety Invariant**: Under no circumstances should an uncoordinated database reboot be performed during active peak hours, as this terminates active write transactions.

---

## 3. Recommended Remediation Protocol

### Step 1: Automated Workload Reversion
If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool `rollback_ecs_service` followed by terminating idle backend sessions.
- **Action**: Rollback the target Amazon ECS service (`payment-checkout-service`) to the last known stable task definition (e.g. revision `48`).
- **Mechanisms**: Blue/green traffic draining ensures in-flight requests complete cleanly while terminating faulty application containers.

### Step 2: Terminate Idle Backend Connections
Run the following administrative cleanup query on Aurora PostgreSQL to terminate lingering client connections:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < current_timestamp - INTERVAL '2 minutes';
```

### Step 3: Verification & Recovery Sign-Off
- Confirm Aurora CloudWatch metric `DatabaseConnections` drops below 80% threshold (< 400 connections).
- Confirm Application Load Balancer Target Group healthy host count returns to 100%.
- Ensure P99 latency stabilizes under 120ms.
