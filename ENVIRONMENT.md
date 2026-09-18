# Sentinel — Environment Variables Reference

> **Security Mandate**: Never commit `.env` or `.env.local` files containing live credentials. Store production secrets in AWS Secrets Manager or AWS Systems Manager Parameter Store.

---

## 1. Environment Variables Specification

All environment variables in Sentinel are strictly validated at application boot via [`lib/config/env.ts`](file:///d:/SENTNEL/lib/config/env.ts) using Zod schema parsing. If any required variable fails validation, the process exits immediately with a typed error.

| Variable Name | Required? | Default / Example Value | Security Classification | Purpose & Usage |
| :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` \| `development` \| `test` | Public | Node.js execution environment. Controls optimizations, sourcemaps, and logging verbosity. |
| `ENABLE_MOCK_FALLBACK` | No | `true` (dev) / `false` (prod) | Public | When `true`, enables the in-memory dual-adapter sandbox when AWS credentials are absent. Displays the visible fallback badge in the UI. |
| `AWS_REGION` | Yes | `us-east-1` | Public | Target AWS Region where Bedrock, DynamoDB, EventBridge, SNS, and S3 resources reside. |
| `AWS_ACCESS_KEY_ID` | Conditional | `AKIAIOSFODNN7EXAMPLE` | **Confidential Secret** | AWS Access Key ID. Not required in ECS/Fargate when using IAM Task Roles. |
| `AWS_SECRET_ACCESS_KEY` | Conditional | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | **Restricted Secret** | AWS Secret Access Key. Not required when using IAM Task Roles. |
| `DYNAMODB_TABLE_NAME` | Yes | `SentinelIncidents` | Public | Name of the single-table DynamoDB database storing incidents, timeline events, evidence, and audit trails. |
| `BEDROCK_MODEL_ID` | Yes | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Public | Amazon Bedrock foundation model ID for reasoning, triage, action planning, and postmortem generation. |
| `BEDROCK_KNOWLEDGE_BASE_ID` | Yes | `KB-SENTINEL-RUNBOOKS-001` | Public | Bedrock Knowledge Base identifier backed by OpenSearch Serverless for RAG vector search. |
| `BEDROCK_KB_ID_INCIDENTS` | No | `KB-SENTINEL-INCIDENTS-001` | Public | Optional dedicated KB ID for historical incidents. Defaults to `BEDROCK_KNOWLEDGE_BASE_ID`. |
| `BEDROCK_KB_ID_SOPS` | No | `KB-SENTINEL-SOPS-001` | Public | Optional dedicated KB ID for Standard Operating Procedures. Defaults to `BEDROCK_KNOWLEDGE_BASE_ID`. |
| `BEDROCK_KB_ID_POLICIES` | No | `KB-SENTINEL-POLICIES-001` | Public | Optional dedicated KB ID for enterprise compliance policies. Defaults to `BEDROCK_KNOWLEDGE_BASE_ID`. |
| `EVENTBRIDGE_BUS_NAME` | Yes | `sentinel-incident-bus` | Public | Custom Amazon EventBridge bus name for routing lifecycle events (`IncidentCreated`, `SlaApproaching`, etc.). |
| `SNS_TOPIC_ARN` | Yes | `arn:aws:sns:us-east-1:123456789012:sentinel-incident-alerts` | Public | Amazon SNS Topic ARN for real-time responder alerting and escalation paging. |
| `S3_BUCKET_REPORTS` | Yes | `sentinel-reports-prod` | Public | Private S3 bucket for storing generated postmortem resolution reports (`postmortems/YYYY-MM/`). |
| `S3_BUCKET_RUNBOOKS` | Yes | `sentinel-runbooks-prod` | Public | Private S3 bucket housing SOPs and engineering documentation ingested into Bedrock KB. |
| `APPROVAL_HMAC_SECRET` | Yes | `<64_HEX_CHARACTERS>` | **Restricted Secret** | Secret key used to generate and verify single-use cryptographic approval nonces for mutating actions. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public | Fully qualified origin URL for CORS headers and deep links in SNS notifications. |

---

## 2. Environments Profile Comparison

### Development (`.env.local`)
```ini
NODE_ENV=development
ENABLE_MOCK_FALLBACK=true
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=SentinelIncidents
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_KNOWLEDGE_BASE_ID=KB-SENTINEL-RUNBOOKS-001
EVENTBRIDGE_BUS_NAME=sentinel-incident-bus
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:sentinel-incident-alerts
S3_BUCKET_REPORTS=sentinel-reports-dev
S3_BUCKET_RUNBOOKS=sentinel-runbooks-dev
APPROVAL_HMAC_SECRET=dev-hmac-secret-test-seed-only-do-not-use-in-prod-0000000000000000
```

### Production (`AWS ECS / AWS Systems Manager`)
```ini
NODE_ENV=production
ENABLE_MOCK_FALLBACK=false
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=SentinelIncidents
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_KNOWLEDGE_BASE_ID=KB-SENTINEL-RUNBOOKS-PROD
EVENTBRIDGE_BUS_NAME=sentinel-incident-bus
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:<PROD_ACCOUNT_ID>:sentinel-incident-alerts
S3_BUCKET_REPORTS=sentinel-reports-prod
S3_BUCKET_RUNBOOKS=sentinel-runbooks-prod
# APPROVAL_HMAC_SECRET retrieved dynamically from AWS Secrets Manager
```
