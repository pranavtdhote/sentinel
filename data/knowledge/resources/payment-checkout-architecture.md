# Resource Architecture: Payment Checkout Microservice

- **Service Identifier**: `payment-checkout-service`
- **Environment**: Production (`us-east-1`)
- **VPC Subnets**: `subnet-prod-priv-1a`, `subnet-prod-priv-1b`

---

## Architecture Topology
- **Compute Layer**: Amazon ECS on AWS Fargate (`prod-services-cluster`)
  - Target Group: `arn:aws:elasticloadbalancing:us-east-1:090686622776:targetgroup/payment-checkout-service-tg`
  - Current Task Definition: `payment-checkout-service:49`
  - Stable Fallback Revision: `payment-checkout-service:48`
- **Persistence Layer**: Amazon Aurora PostgreSQL Serverless v2 (`aurora-pg-prod.c4z`)
  - Max Connections: 500
  - Default Connection Pool Size per container: 25
  - Minimum ACUs: 0.5, Maximum ACUs: 32.0
- **Monitoring & Telemetry**:
  - CloudWatch Alarm: `payment-checkout-service-LatencyAlarm`
  - CloudWatch Alarm: `payment-checkout-service-5xxRate`
  - Log Group: `/aws/ecs/prod-services/payment-checkout`
