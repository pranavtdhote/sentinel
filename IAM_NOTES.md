# Sentinel IAM Architecture & Least-Privilege Policies

> **Classification**: AWS Cloud Security Engineering Reference  
> **Target Environment**: Production / Staging  
> **Standard**: Least Privilege, Zero Wildcard (`*`) Resources where supported  

---

## 1. Application ECS Task Execution Role (`SentinelAppTaskRole`)

This IAM role is attached to the Sentinel Next.js container tasks running in Amazon ECS / AWS App Runner.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBSingleTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/sentinel-records-prod",
        "arn:aws:dynamodb:us-east-1:123456789012:table/sentinel-records-prod/index/*"
      ]
    },
    {
      "Sid": "BedrockModelInferenceAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:Converse"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0"
      ]
    },
    {
      "Sid": "BedrockKnowledgeBaseRetrievalAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:Retrieve"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1:123456789012:knowledge-base/KB-SENTINEL-RUNBOOKS-001"
      ]
    },
    {
      "Sid": "S3ReportsAndRunbooksAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::sentinel-knowledge-store/sops/*",
        "arn:aws:s3:::sentinel-knowledge-store/policies/*",
        "arn:aws:s3:::sentinel-knowledge-store/resources/*",
        "arn:aws:s3:::sentinel-knowledge-store/uploads/*",
        "arn:aws:s3:::sentinel-reports-prod/postmortems/*"
      ]
    },
    {
      "Sid": "EventBridgeRoutingAccess",
      "Effect": "Allow",
      "Action": [
        "events:PutEvents"
      ],
      "Resource": [
        "arn:aws:events:us-east-1:123456789012:event-bus/sentinel-incident-bus-prod"
      ]
    },
    {
      "Sid": "SNSAlertPublishAccess",
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": [
        "arn:aws:sns:us-east-1:123456789012:sentinel-incident-alerts"
      ]
    }
  ]
}
```

---

## 2. Bedrock Knowledge Base Service Role (`BedrockKBExecutionRole`)

Assumed by the `bedrock.amazonaws.com` service principal to vectorize and query OpenSearch Serverless:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockModelEmbeddingAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
      ]
    },
    {
      "Sid": "OpenSearchServerlessVectorStoreAccess",
      "Effect": "Allow",
      "Action": [
        "aoss:APIAccessAll"
      ],
      "Resource": [
        "arn:aws:aoss:us-east-1:123456789012:collection/sentinel-runbooks-vector"
      ]
    },
    {
      "Sid": "S3DataSourceReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sentinel-knowledge-store",
        "arn:aws:s3:::sentinel-knowledge-store/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:ResourceAccount": "123456789012"
        }
      }
    }
  ]
}
```

---

## 3. S3 Bucket Security Policy (`sentinel-knowledge-store`)

Enforces TLS in transit and blocks unencrypted payloads:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceTLSRequestsOnly",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::sentinel-knowledge-store",
        "arn:aws:s3:::sentinel-knowledge-store/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::sentinel-knowledge-store/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

---

## 4. Security Principles Applied

1. **Explicit Resource Boundaries**: No wildcards on IAM actions (`Action: *` is strictly forbidden).
2. **KMS Key Enforced**: S3 data encrypted with Customer Managed Keys with separate key policy auditing.
3. **No Cross-Account Ingress**: Resource account conditions ensure S3 access is confined to `123456789012`.
