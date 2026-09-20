# SOP: Amazon ECS Task Definition Rollback & Deployment Recovery

- **Document ID**: `SOP-ECS-012`
- **Classification**: Standard Operating Procedure
- **Target Workload**: Amazon ECS on AWS Fargate (`prod-services-cluster`)
- **Service Name**: `payment-checkout-service`

---

## 1. Scope & Objective
This procedure provides guidance for safe, non-destructive reversion of an Amazon ECS service when an unstable task definition revision causes severe regression or upstream cascading failures.

---

## 2. Execution Prerequisites
- **Human-in-the-Loop Authorization**: Per the Sentinel Mutation Safety Policy, an Incident Commander must cryptographically authorize the revision change with a signed one-time nonce.
- **Draining Timeout**: Must respect ALB deregistration delay (typically 30 seconds) to avoid dropping active in-flight requests.

---

## 3. Rollback Procedure
1. Identify the previous stable task definition revision using ECS DescribeServices.
2. Update the ECS service task definition:
   ```bash
   aws ecs update-service \
     --cluster prod-services-cluster \
     --service payment-checkout-service \
     --task-definition payment-checkout-service:48 \
     --force-new-deployment
   ```
3. Monitor ECS Service Events for steady-state convergence:
   `service payment-checkout-service has reached a steady state.`
4. Verify HTTP 200 response codes on `/health` endpoint.
