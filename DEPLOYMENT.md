# Sentinel — Production Deployment Guide

> **Target Architecture**: AWS Amplify Hosting (SSR Web Compute) & AWS ECS Fargate with Amazon DynamoDB, Amazon Bedrock, OpenSearch Serverless, Amazon EventBridge, Amazon SNS, and Amazon S3.  
> **Security Mandate**: Never store, commit, or print secrets or AWS credentials in plaintext. Use AWS Secrets Manager, SSM Parameter Store, and IAM Task Roles.  
>  
> 🌐 **Live AWS Deployment**: [https://main.d3puckfek6iecn.amplifyapp.com](https://main.d3puckfek6iecn.amplifyapp.com)  
> 🌐 **High-Availability Edge Endpoint (CloudFront)**: [https://d1p3wltem4w12q.cloudfront.net](https://d1p3wltem4w12q.cloudfront.net)

---

## 1. Prerequisites

Before deploying Sentinel to production, ensure you have the following installed and configured:
- **Node.js**: v18.17.0+ or v20.x LTS
- **Package Manager**: `npm` v9+ or `pnpm` v8+
- **AWS CLI**: v2.15+ authenticated via AWS SSO or short-lived STS tokens (`aws sts get-caller-identity`)
- **Docker**: v24+ (if deploying via ECS Fargate container)
- **AWS CDK or Terraform**: Optional, for Infrastructure-as-Code provisioning

---

## 2. Target AWS Region Selection

- **Primary Recommended Region**: `us-east-1` (US East, N. Virginia) or `us-west-2` (US West, Oregon)
- **Rationale**:
  - Full availability of **Amazon Bedrock** foundation models: `anthropic.claude-3-5-sonnet-20241022-v2:0`
  - Full availability of **Bedrock Knowledge Bases** backed by **Amazon OpenSearch Serverless** vector search.
  - Native cross-service low latency to DynamoDB, S3, EventBridge, and SNS.

---

## 3. IAM Execution & Task Roles

Sentinel enforces the Principle of Least Privilege across all runtime resources. Never use admin credentials.

### Roles Required
1. **`SentinelAppTaskRole`** (Assumed by Next.js application container in ECS/App Runner):
   - DynamoDB: `GetItem`, `PutItem`, `UpdateItem`, `Query`, `BatchWriteItem` on `SentinelIncidents` table and GSIs.
   - Bedrock: `InvokeModel`, `Converse` on `anthropic.claude-3-5-sonnet-20241022-v2:0`.
   - Bedrock Agent Runtime: `Retrieve` on `arn:aws:bedrock:*:*:knowledge-base/*`.
   - EventBridge: `PutEvents` on `arn:aws:events:*:*:event-bus/sentinel-incident-bus`.
   - SNS: `Publish` on `arn:aws:sns:*:*:sentinel-incident-alerts`.
   - S3: `GetObject`, `PutObject` on approved buckets (`sentinel-reports-prod`, `sentinel-runbooks-prod`).
2. **`BedrockKBExecutionRole`** (Assumed by Bedrock Knowledge Base service):
   - S3 read access to vector document source buckets.
   - OpenSearch Serverless `aoss:APIAccessAll` permissions.

Refer to [`SECURITY.md`](./SECURITY.md) and [`docs/AWS_RESOURCES.md`](./docs/AWS_RESOURCES.md) for detailed policy architectures.

---

## 4. AWS Resource Provisioning

Provision the required AWS resources using the AWS Management Console or AWS CLI:

```bash
# 1. DynamoDB Single-Table
aws dynamodb create-table \
  --table-name SentinelIncidents \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
      AttributeName=GSI1PK,AttributeType=S \
      AttributeName=GSI1SK,AttributeType=S \
      AttributeName=GSI2PK,AttributeType=S \
      AttributeName=GSI2SK,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
      "[{\"IndexName\":\"GSI1\",\"KeySchema\":[{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI1SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"GSI2\",\"KeySchema\":[{\"AttributeName\":\"GSI2PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI2SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --sse-specification Enabled=true,SSEType=KMS

# 2. S3 Document & Report Buckets (Private, encrypted, public access blocked)
aws s3api create-bucket --bucket sentinel-reports-prod --region us-east-1
aws s3api put-public-access-block --bucket sentinel-reports-prod \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
aws s3api put-bucket-encryption --bucket sentinel-reports-prod \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'

# 3. EventBridge Custom Bus
aws events create-event-bus --name sentinel-incident-bus

# 4. SNS Topic for Incident Alerts
aws sns create-topic --name sentinel-incident-alerts
```

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env.production` or configure secrets via AWS Systems Manager (SSM) Parameter Store:

```bash
# Application Mode
NODE_ENV=production
ENABLE_MOCK_FALLBACK=false

# AWS Region & Credentials (In ECS/Amplify, credentials come from IAM Task Role)
AWS_REGION=us-east-1

# Amazon DynamoDB
DYNAMODB_TABLE_NAME=SentinelIncidents

# Amazon Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_KNOWLEDGE_BASE_ID=KB-SENTINEL-RUNBOOKS-001

# Amazon EventBridge & SNS
EVENTBRIDGE_BUS_NAME=sentinel-incident-bus
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:sentinel-incident-alerts

# Amazon S3
S3_BUCKET_REPORTS=sentinel-reports-prod
S3_BUCKET_RUNBOOKS=sentinel-runbooks-prod

# Cryptographic Token HMAC Secret (Store in AWS Secrets Manager)
APPROVAL_HMAC_SECRET=your-secure-random-64-character-hex-secret
```

Refer to [`ENVIRONMENT.md`](./ENVIRONMENT.md) for the complete variable dictionary.

---

## 6. Build & Deployment Commands

### Option A: Standalone Docker on AWS ECS Fargate
```bash
# 1. Clean installation of dependencies
npm ci

# 2. Run quality checks
npm run typecheck
npm run lint
npm test

# 3. Build Docker container
docker build -t sentinel:latest .

# 4. Authenticate to Amazon ECR and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker tag sentinel:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sentinel:latest
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sentinel:latest

# 5. Update ECS Service
aws ecs update-service --cluster sentinel-prod --service sentinel-web --force-new-deployment
```

### Option B: Local / Staging Next.js Build
```bash
npm ci
npm run build
npm run start
```

---

## 7. Verification Checklist

Execute the automated verification sequence to confirm end-to-end service readiness:

1. **Health Check Endpoint**:
   ```bash
   curl -s http://localhost:3000/api/health | jq .
   # Expected: { "status": "healthy", "service": "sentinel", ... }
   ```
2. **DynamoDB Connectivity**:
   ```bash
   curl -s http://localhost:3000/api/incidents | jq .success
   # Expected: true
   ```
3. **Analytics Pipeline**:
   ```bash
   curl -s http://localhost:3000/api/analytics | jq .data.totalIncidents
   ```
4. **Automated Test Matrix**:
   ```bash
   npm test
   # Expected: All 88+ assertions passing
   ```

---

## 8. Cleanup & Teardown Procedures

To prevent incurring unnecessary AWS charges when tearing down a non-production deployment:

```bash
# 1. Delete DynamoDB table
aws dynamodb delete-table --table-name SentinelIncidents

# 2. Empty and delete S3 buckets
aws s3 rm s3://sentinel-reports-prod --recursive
aws s3api delete-bucket --bucket sentinel-reports-prod

# 3. Delete EventBridge bus & SNS topic
aws events delete-event-bus --name sentinel-incident-bus
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:<ACCOUNT_ID>:sentinel-incident-alerts
```

---

## 9. Demo Data Seeding & State Reset

- **Seed Baseline Incidents**:
  ```bash
  npx ts-node --project tsconfig.json scripts/seedDemo.ts
  ```
- **Reset Demo State (API)**:
  ```bash
  curl -X POST http://localhost:3000/api/demo/reset -H "Content-Type: application/json"
  ```
- **UI Reset**: Click **Reset Demo** in the top navigation bar or under `/settings`.

---

## 10. Troubleshooting Guide

| Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `ResourceNotFoundException: Cannot do operations on a non-existent table` | DynamoDB table name mismatch or table not created in target region | Ensure `DYNAMODB_TABLE_NAME=SentinelIncidents` matches created table and `AWS_REGION` is aligned. |
| `AccessDeniedException: User is not authorized to perform: bedrock:Converse` | Missing Foundation Model access in AWS Bedrock Console | Open AWS Bedrock Console $\rightarrow$ **Model Access** $\rightarrow$ Request access for Anthropic Claude 3.5 Sonnet. |
| `KnowledgeBaseNotFound: The Knowledge Base specified does not exist` | Bedrock KB ID invalid or still syncing in OpenSearch Serverless | Confirm KB ID in AWS Bedrock Console $\rightarrow$ Knowledge bases $\rightarrow$ update `BEDROCK_KNOWLEDGE_BASE_ID`. |
| `ValidationException: Event size exceeds 256KB limit` | EventBridge payload too large | Keep event payload focused on IDs, status transitions, and summaries. Detailed telemetry remains in S3/DynamoDB. |
| `403 Forbidden on mutative actions` | Missing or invalid actor role header | Ensure requests include header `x-sentinel-actor-role: INCIDENT_COMMANDER` or authenticate with valid session. |
