# 🚀 AWS Amplify GitHub Deployment Guide for SENTINEL

This guide outlines the 3-minute process to deploy **SENTINEL** directly from GitHub to **AWS Amplify Hosting** with full Next.js SSR and AWS service integration.

---

## 📋 Prerequisites Verified in Your AWS Account (`090686622776`, Region: `us-east-1`)

All AWS backend services, tables, and roles are pre-provisioned and active:
- **IAM Compute Role**: `SentinelAmplifyComputeRole` (has permissions for DynamoDB, Bedrock, S3, Cognito, EventBridge, SNS).
- **Amazon DynamoDB**: `sentinel-records-dev`
- **Amazon Cognito User Pool**: `us-east-1_Lz4flXPaw` (Client ID: `15qk2aht7ivv8d4s676s18ieu0`)
- **Amazon Bedrock Models**: `amazon.nova-pro-v1:0` (Fallback: `amazon.nova-lite-v1:0`)
- **Amazon Bedrock Knowledge Base**: `DJ3IJQZDGJ` (Data Source: `98PFX1H0BY`)
- **Amazon S3 Buckets**: `sentinel-runbooks-090686622776`, `sentinel-reports-090686622776`
- **Amazon EventBridge Bus**: `sentinel-events-dev`
- **Amazon SNS Topic**: `arn:aws:sns:us-east-1:090686622776:sentinel-oncall-alerts-dev`

---

## 🛠️ Step-by-Step Deployment via AWS Amplify Console

### Step 1: Open Amplify Console
1. Navigate to the [AWS Amplify Console](https://us-east-1.console.aws.amazon.com/amplify/home?region=us-east-1).
2. Click **Create new app** (or select your existing app **sentinel-platform**).
3. Under *Start with your existing code*, select **GitHub** and click **Next**.
4. Authorize AWS Amplify to access your GitHub account.

---

### Step 2: Select Repository & Branch
1. **Repository**: Select `pranavtdhote/sentinel` (or search for `sentinel`).
2. **Branch**: Select `main`.
3. Check the box **Connecting a monorepo?** -> Leave **unchecked** (SENTINEL is at repository root).
4. Click **Next**.

---

### Step 3: Configure Build Settings & Environment Variables
1. **App Name**: `sentinel-platform`
2. **Build and test settings**: Amplify will automatically detect `amplify.yml` (already placed in repository root) with `Next.js - SSR` and `baseDirectory: .next`.
3. Under **Advanced settings**, find **Environment variables** and click **Add variable** to add the following:

| Key | Value | Description |
| :--- | :--- | :--- |
| `STAGE` | `dev` | Deployment environment stage |
| `BEDROCK_MODEL_ID` | `amazon.nova-pro-v1:0` | Primary Amazon Bedrock Foundation Model |
| `BEDROCK_FALLBACK_MODEL_ID` | `amazon.nova-lite-v1:0` | Resilient fallback foundation model |
| `BEDROCK_KNOWLEDGE_BASE_ID` | `DJ3IJQZDGJ` | Bedrock Vector Knowledge Base ID |
| `BEDROCK_DATA_SOURCE_ID` | `98PFX1H0BY` | Bedrock Knowledge Base S3 data source |
| `DYNAMODB_TABLE_NAME` | `sentinel-records-dev` | Live Single-Table DynamoDB database |
| `S3_RUNBOOKS_BUCKET` | `sentinel-runbooks-090686622776` | Operational runbook markdown storage |
| `S3_REPORTS_BUCKET` | `sentinel-reports-090686622776` | Postmortem report markdown storage |
| `EVENTBRIDGE_BUS_NAME` | `sentinel-events-dev` | Enterprise incident event bus |
| `SNS_ALERT_TOPIC_ARN` | `arn:aws:sns:us-east-1:090686622776:sentinel-oncall-alerts-dev` | Real-time on-call alert topic |
| `SNS_ALERTS_TOPIC_ARN` | `arn:aws:sns:us-east-1:090686622776:sentinel-oncall-alerts-dev` | Topic alias |
| `ENABLE_MOCK_FALLBACK` | `false` | Strictly use live AWS cloud services |
| `COGNITO_USER_POOL_ID` | `us-east-1_Lz4flXPaw` | Amazon Cognito User Pool |
| `COGNITO_CLIENT_ID` | `15qk2aht7ivv8d4s676s18ieu0` | Amazon Cognito App Client ID |
| `COGNITO_ISSUER` | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Lz4flXPaw` | Cognito JWT Issuer |
| `NODE_ENV` | `production` | Production environment flag |

4. Under **IAM service role**:
   - Select the existing role: **`SentinelAmplifyComputeRole`** (or create one using the inline policy).
5. Click **Next**, review the configuration, and click **Save and deploy**.

---

### Step 4: Verification
Amplify will execute:
1. **Provision**: Spin up build container.
2. **Build**: Run `npm ci` and `npm run build`.
3. **Deploy**: Auto-provision managed Lambda SSR compute and CloudFront edge distribution.
4. **Verify**: Test endpoints and provide the live URL (e.g. `https://main.d2jogvu777jydt.amplifyapp.com`).

---

## 🔐 Verified Demo User Accounts

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sentinel.ai` | `Sentinel2026!` | Full platform access, security settings, user management |
| **Incident Commander** | `demo@sentinel.ai` | `Sentinel2026!` | Approve critical actions, declare incidents, resolve |
| **Incident Commander** | `commander@sentinel.internal` | `Sentinel2026!` | Approve critical actions, declare incidents, resolve |
| **Responder** | `responder@sentinel.ai` | `Sentinel2026!` | Triage, execute approved action plans, view telemetry |
| **Viewer** | `viewer@sentinel.ai` | `Sentinel2026!` | Read-only dashboards, knowledge center, analytics |

---

## 🌐 Parallel Live AWS Endpoints (Already Running)

- **CloudFront HTTPS Edge**: [https://d1p3wltem4w12q.cloudfront.net](https://d1p3wltem4w12q.cloudfront.net)
- **Direct EC2 Compute**: [http://3.236.153.112](http://3.236.153.112)
- **Direct EC2 DNS**: [http://ec2-3-236-153-112.compute-1.amazonaws.com](http://ec2-3-236-153-112.compute-1.amazonaws.com)
