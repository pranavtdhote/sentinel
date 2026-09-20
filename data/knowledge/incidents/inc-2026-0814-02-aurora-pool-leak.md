# Historical Postmortem: SEV-1 Aurora PostgreSQL Connection Pool Exhaustion

- **Incident ID**: `inc-2026-0814-02`
- **Date**: 2026-08-14
- **Duration**: 22 minutes
- **Impacted Service**: `payment-checkout-service`

---

## Executive Summary
At 14:10 UTC, payment checkout API P99 latency spiked to 5,200ms following deployment of revision 32. Customers experienced intermittent 504 errors on final checkout submission.

## Root Cause Analysis
A new query on the `orders` table lacked an index on `customer_uuid`, triggering a full table scan while holding database connections open. Under high concurrency, all 500 Aurora connections became saturated within 3 minutes.

## Remediation Steps Taken
1. Reverted ECS task definition from revision 32 to revision 31.
2. Executed `pg_terminate_backend` on idle sessions older than 60 seconds.
3. Latency stabilized back to 95ms within 180 seconds.
