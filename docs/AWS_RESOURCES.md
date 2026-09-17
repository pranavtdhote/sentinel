# AWS_RESOURCES.md — AWS Infrastructure, Resource Manifest & Provisioning

> **Target Region**: `us-east-1` (Primary Bedrock & OpenSearch Serverless region)  
> **Naming Standard**: `sentinel-${STAGE}-${RESOURCE_NAME}`  
> **Deployment Tooling**: AWS CloudFormation / AWS CDK v2 / Serverless Framework

---

## 1. AWS Resource Inventory & Hackathon Rationale

| Service | Specific Resource Identifier | Purpose & Demonstration in Final Video |
| :--- | :--- | :--- |
| **Amazon Bedrock** | `anthropic.claude-3-5-sonnet-20241022-v2:0`<br>`amazon.nova-pro-v1:0` | Performs deep multi-step root-cause analysis, blast-radius risk modeling, and postmortem generation. Visible via live token telemetry and reasoning logs. |
| **Bedrock Knowledge Bases** | `KB-SENTINEL-RUNBOOKS` (backed by OpenSearch Serverless) | RAG over S3 runbooks (`s3://sentinel-runbooks-prod`). Visible in the UI as clickable citations with relevance scores (>0.85) and source document links. |
| **Amazon DynamoDB** | `sentinel-records-${STAGE}` | Single-table storage for incidents, timeline events, evidence, action plans, and audit logs. Demonstrates single-digit millisecond latency and optimistic concurrency locking. |
| **Amazon S3** | `sentinel-runbooks-${STAGE}`<br>`sentinel-reports-${STAGE}` | Hosts markdown runbooks for vector embedding ingestion, and stores generated postmortem markdown/PDF reports with secure presigned URLs. |
| **Amazon Cognito** | User Pool: `sentinel-user-pool-${STAGE}`<br>Client: `sentinel-web-client` | Provides user identity, JWT verification, and RBAC role groups (`IncidentCommander`, `Responder`, `Viewer`). |
| **Amazon EventBridge** | Custom Bus: `sentinel-events-${STAGE}` | Publishes status change events (`incident.detected`, `action.approved`, `incident.resolved`) to trigger downstream alerting. |
| **Amazon SNS** | Topic: `sentinel-oncall-alerts-${STAGE}` | Delivers high-priority email/SMS alerts to on-call engineers when SEV-1 incidents or pending approvals are published. |
| **Amazon CloudWatch** | Log Group: `/aws/sentinel/${STAGE}` | Captures execution audit logs, tool invocations, and model performance metrics. |

---

## 2. Infrastructure as Code: AWS CDK TypeScript Blueprint

Below is the CDK construct defining the core serverless backbone:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class SentinelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDB Single Table
    const table = new dynamodb.Table(this, 'SentinelTable', {
      tableName: 'sentinel-records-prod',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1-StatusIndex',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI2-SeverityIndex',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 2. S3 Storage Buckets
    const runbooksBucket = new s3.Bucket(this, 'RunbooksBucket', {
      bucketName: `sentinel-runbooks-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const reportsBucket = new s3.Bucket(this, 'ReportsBucket', {
      bucketName: `sentinel-reports-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // 3. EventBridge & SNS
    const eventBus = new events.EventBus(this, 'SentinelBus', {
      eventBusName: 'sentinel-events-prod',
    });

    const onCallTopic = new sns.Topic(this, 'OnCallTopic', {
      topicName: 'sentinel-oncall-alerts-prod',
      displayName: 'Sentinel SRE Alert Notification Stream',
    });

    // 4. Cognito User Pool & Groups
    const userPool = new cognito.UserPool(this, 'SentinelUserPool', {
      userPoolName: 'sentinel-users-prod',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
    });

    new cognito.CfnUserPoolGroup(this, 'CommanderGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'IncidentCommander',
      description: 'Authorized to sign off on mutating infrastructure changes',
    });
  }
}
```

---

## 3. Environment Variables Specification (`.env.example`)

```bash
# ==========================================
# SENTINEL ENVIRONMENT CONFIGURATION
# ==========================================

# Deployment Stage & Region
NODE_ENV=development
AWS_REGION=us-east-1
STAGE=dev

# Amazon Bedrock Settings
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_FALLBACK_MODEL_ID=amazon.nova-pro-v1:0
BEDROCK_KNOWLEDGE_BASE_ID=KB-SENTINEL-RUNBOOKS
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0

# Amazon DynamoDB
DYNAMODB_TABLE_NAME=sentinel-records-dev

# Amazon S3
S3_RUNBOOKS_BUCKET=sentinel-runbooks-dev
S3_REPORTS_BUCKET=sentinel-reports-dev

# Amazon Cognito
COGNITO_USER_POOL_ID=us-east-1_example123
COGNITO_CLIENT_ID=1example23client45id67
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example123

# Amazon EventBridge & SNS
EVENTBRIDGE_BUS_NAME=sentinel-events-dev
SNS_ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:sentinel-oncall-alerts-dev

# Mock / Dev Sandbox Settings
# Set to 'false' to make live network calls to AWS Bedrock & DynamoDB
ENABLE_MOCK_FALLBACK=false
MOCK_LATENCY_MS=400
```

---

## 4. Real vs. Mock Integration Boundary Policy

Under the hackathon rules:
> *"Never replace real AWS integration with fake success responses without clearly marking the fallback."*

1. **Dual-Adapter Architecture**: Every AWS service adapter (Bedrock, DynamoDB, S3) implements a strict TypeScript interface (`IIncidentRepository`, `IAIEngine`, `IStorageService`).
2. **Live Execution by Default**: If valid AWS credentials and configuration exist in the environment, the real AWS SDK v3 client is invoked.
3. **Explicit Fallback Indicator**: If AWS credentials expire or Bedrock encounters a service throttling event (`ThrottlingException`), the system can gracefully engage a fixture adapter, **but will visibly badge the UI with `FALLBACK_SANDBOX_ENGAGED`** so judges and operators know the live AWS endpoint was diverted.
