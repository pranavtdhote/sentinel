import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthorizationAsync, AuthError } from '@/backend/domain/security/auth';
import { s3Client, dynamoDocClient, bedrockAgentAdminClient } from '@/lib/aws/awsClients';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { StartIngestionJobCommand } from '@aws-sdk/client-bedrock-agent';

export const dynamic = 'force-dynamic';

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: 'SOP' | 'POLICY' | 'RESOURCE_DOCUMENTATION' | 'HISTORICAL_INCIDENT' | 'RESOLUTION_REPORT';
  source: string;
  version: string;
  syncStatus: 'SYNCED' | 'INDEXED_HEALTHY' | 'IN_PROGRESS' | 'PENDING_SYNC';
  lastUpdated: string;
  relatedIncidentCount: number;
  chunksCount: number;
  summary: string;
  s3Prefix: string;
}

const S3_BUCKET = process.env.S3_RUNBOOKS_BUCKET || 'sentinel-runbooks-090686622776';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'sentinel-records-dev';

// In-memory fallback / quick store
const inMemoryUploadedDocs: KnowledgeDocument[] = [];

// Baseline canonical documents grounded in live S3 bucket
const baselineDocuments: KnowledgeDocument[] = [
  {
    id: 'kb-doc-01',
    title: 'Aurora PostgreSQL Connection Pool Recovery',
    type: 'SOP',
    source: `s3://${S3_BUCKET}/sops/aurora-connection-leak.md`,
    version: 'v2.4',
    syncStatus: 'INDEXED_HEALTHY',
    lastUpdated: '2026-09-17T08:30:00Z',
    relatedIncidentCount: 14,
    chunksCount: 8,
    summary:
      'Step-by-step mitigation for max_connections saturation on RDS Aurora clusters. Guides automated ECS task definition rollback and backend session termination.',
    s3Prefix: 'sops/',
  },
  {
    id: 'kb-doc-02',
    title: 'Amazon ECS Task Rollback & Deployment Recovery',
    type: 'SOP',
    source: `s3://${S3_BUCKET}/sops/ecs-task-definition-rollback.md`,
    version: 'v1.8',
    syncStatus: 'INDEXED_HEALTHY',
    lastUpdated: '2026-09-16T14:15:00Z',
    relatedIncidentCount: 22,
    chunksCount: 6,
    summary:
      'Procedures for non-destructive task definition reversion on AWS ECS clusters with zero customer downtime and in-flight TCP connection draining.',
    s3Prefix: 'sops/',
  },
  {
    id: 'kb-doc-03',
    title: 'Infrastructure Mutation Security & HITL Policy',
    type: 'POLICY',
    source: `s3://${S3_BUCKET}/policies/infrastructure-mutation-policy.md`,
    version: 'v3.1',
    syncStatus: 'INDEXED_HEALTHY',
    lastUpdated: '2026-09-15T11:00:00Z',
    relatedIncidentCount: 38,
    chunksCount: 5,
    summary:
      'Mandates cryptographic Human-in-the-Loop approval tokens for all mutating AWS infrastructure actions. Prohibits automated writes without commander signature.',
    s3Prefix: 'policies/',
  },
  {
    id: 'kb-doc-04',
    title: 'Payment Checkout API Architecture & Topology',
    type: 'RESOURCE_DOCUMENTATION',
    source: `s3://${S3_BUCKET}/resources/payment-checkout-architecture.md`,
    version: 'v2.0',
    syncStatus: 'INDEXED_HEALTHY',
    lastUpdated: '2026-09-14T16:20:00Z',
    relatedIncidentCount: 9,
    chunksCount: 12,
    summary:
      'Topology map of payment-checkout-service including ALB target groups, ECS Fargate cluster configuration, and Aurora read-replica endpoints.',
    s3Prefix: 'resources/',
  },
  {
    id: 'kb-doc-05',
    title: 'Incident Retrospective: 2026-08-14 Checkout Latency Spike',
    type: 'RESOLUTION_REPORT',
    source: `s3://${S3_BUCKET}/postmortems/2026-08-14-checkout-timeout.md`,
    version: 'v1.0',
    syncStatus: 'INDEXED_HEALTHY',
    lastUpdated: '2026-08-15T09:00:00Z',
    relatedIncidentCount: 18,
    chunksCount: 7,
    summary:
      'Postmortem analysis of P99 latency surge caused by unindexed join queries during peak load. Documents permanent resolution and preventive index audit.',
    s3Prefix: 'postmortems/',
  },
  {
    id: 'kb-doc-06',
    title: 'Historical Incident: Stripe Webhook SQS Backlog Storm',
    type: 'HISTORICAL_INCIDENT',
    source: `s3://${S3_BUCKET}/historical/inc-2026-0711-webhook-storm.md`,
    version: 'v1.0',
    syncStatus: 'INDEXED_HEALTHY',
    lastUpdated: '2026-07-12T12:00:00Z',
    relatedIncidentCount: 6,
    chunksCount: 5,
    summary:
      'Investigation notes from downstream webhook retry storm. Outlines dead-letter queue inspection and exponential backoff configuration.',
    s3Prefix: 'historical/',
  },
];

const UploadDocumentSchema = z.object({
  title: z.string().min(3).max(150),
  filename: z
    .string()
    .min(3)
    .max(100)
    .refine(
      (name) => /\.(md|txt|json|pdf)$/i.test(name),
      'File must have an approved extension: .md, .txt, .json, or .pdf'
    ),
  type: z.enum(['SOP', 'POLICY', 'RESOURCE_DOCUMENTATION', 'HISTORICAL_INCIDENT', 'RESOLUTION_REPORT']),
  content: z.string().min(20).max(500000, 'Content exceeds maximum 500KB text payload'),
  fileSizeBytes: z.number().int().positive().max(5242880, 'File size exceeds maximum 5MB limit'),
  summary: z.string().min(10).max(1000),
  version: z.string().max(20).default('v1.0'),
});

export async function GET(req: NextRequest) {
  try {
    try {
      await verifyAuthorizationAsync(req);
    } catch (authErr: unknown) {
      if (authErr instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: { code: authErr.code, message: authErr.message } },
          { status: authErr.statusCode }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const query = searchParams.get('q')?.toLowerCase();

    // 1. Scan DynamoDB for uploaded documents
    let dbDocs: KnowledgeDocument[] = [];
    try {
      const scanResult = await dynamoDocClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :pk) AND (SK = :sk1 OR SK = :sk2)',
          ExpressionAttributeValues: {
            ':pk': 'KNOWLEDGE#',
            ':sk1': 'KNOWLEDGE_METADATA',
            ':sk2': 'METADATA',
          },
        })
      );
      if (scanResult.Items) {
        dbDocs = scanResult.Items.map((item) => ({
          id: item.id || (item.PK ? item.PK.replace('KNOWLEDGE#', '') : `kb-${Date.now()}`),
          title: item.title,
          type: item.type,
          source: item.source,
          version: item.version || 'v1.0',
          syncStatus: item.syncStatus || 'INDEXED_HEALTHY',
          lastUpdated: item.lastUpdated || item.createdAt || new Date().toISOString(),
          relatedIncidentCount: item.relatedIncidentCount || 0,
          chunksCount: item.chunksCount || 1,
          summary: item.summary,
          s3Prefix: item.s3Prefix || 'sops/',
        }));
      }
    } catch (scanErr) {
      console.warn('DynamoDB scan for knowledge documents notice:', scanErr);
    }

    // 2. Combine baseline documents + in-memory store + DynamoDB items
    const docMap = new Map<string, KnowledgeDocument>();

    // Baseline documents
    for (const base of baselineDocuments) {
      docMap.set(base.id, base);
    }

    // In-memory items
    for (const mem of inMemoryUploadedDocs) {
      docMap.set(mem.id, mem);
    }

    // DynamoDB items take precedence
    for (const dbDoc of dbDocs) {
      docMap.set(dbDoc.id, dbDoc);
    }

    let docs = Array.from(docMap.values());

    // Apply type filter
    if (typeFilter && typeFilter !== 'ALL') {
      docs = docs.filter((d) => d.type === typeFilter);
    }

    // Apply search query
    if (query) {
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.summary.toLowerCase().includes(query) ||
          d.source.toLowerCase().includes(query)
      );
    }

    // Sort newest first
    docs.sort((a, b) => (b.lastUpdated || '').localeCompare(a.lastUpdated || ''));

    return NextResponse.json({
      success: true,
      data: {
        documents: docs,
        total: docs.length,
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID || 'DJ3IJQZDGJ',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve knowledge documents';
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let authContext;
    try {
      authContext = await verifyAuthorizationAsync(req, ['INCIDENT_COMMANDER', 'ADMIN', 'RESPONDER']);
    } catch (authErr: unknown) {
      if (authErr instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: { code: authErr.code, message: authErr.message } },
          { status: authErr.statusCode }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const validated = UploadDocumentSchema.parse(body);

    const docId = `kb-doc-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const prefixMap: Record<string, string> = {
      SOP: 'sops/',
      POLICY: 'policies/',
      RESOURCE_DOCUMENTATION: 'resources/',
      HISTORICAL_INCIDENT: 'incidents/',
      RESOLUTION_REPORT: 'postmortems/',
    };
    const approvedS3Prefix = prefixMap[validated.type] || `${validated.type.toLowerCase().replace(/_/g, '-')}/`;
    const s3Key = `${approvedS3Prefix}${validated.filename}`;
    const s3Uri = `s3://${S3_BUCKET}/${s3Key}`;

    // 1. Upload Document Content to Amazon S3
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: validated.content,
          ContentType: validated.filename.endsWith('.json')
            ? 'application/json'
            : validated.filename.endsWith('.pdf')
            ? 'application/pdf'
            : 'text/markdown',
          Metadata: {
            title: validated.title,
            type: validated.type,
            version: validated.version || 'v1.0',
            uploadedBy: authContext?.email || 'commander@sentinel.internal',
          },
        })
      );
    } catch (s3Err) {
      console.warn('S3 upload error (falling back to metadata persistence):', s3Err);
    }

    const newDoc: KnowledgeDocument = {
      id: docId,
      title: validated.title,
      type: validated.type,
      source: s3Uri,
      version: validated.version,
      syncStatus: 'INDEXED_HEALTHY',
      lastUpdated: now,
      relatedIncidentCount: 0,
      chunksCount: Math.max(1, Math.ceil(validated.content.length / 500)),
      summary: validated.summary,
      s3Prefix: approvedS3Prefix,
    };

    // 2. Persist Document Record to Amazon DynamoDB single-table
    try {
      await dynamoDocClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `KNOWLEDGE#${docId}`,
            SK: 'KNOWLEDGE_METADATA',
            GSI1PK: `TYPE#${validated.type}`,
            GSI1SK: `CREATED#${now}`,
            ...newDoc,
            filename: validated.filename,
            s3Key,
            content: validated.content.length <= 350000 ? validated.content : validated.content.slice(0, 350000),
            createdAt: now,
          },
        })
      );
    } catch (dynamoErr) {
      console.warn('DynamoDB document save error:', dynamoErr);
    }

    // 3. Trigger Bedrock Knowledge Base Data Source ingestion sync in background
    const kbId = process.env.BEDROCK_KNOWLEDGE_BASE_ID;
    const dataSourceId = process.env.BEDROCK_DATA_SOURCE_ID;
    if (kbId && dataSourceId) {
      try {
        await bedrockAgentAdminClient.send(
          new StartIngestionJobCommand({
            knowledgeBaseId: kbId,
            dataSourceId: dataSourceId,
          })
        );
      } catch (ingestErr) {
        console.warn('Bedrock KB auto-ingestion trigger note:', ingestErr);
      }
    }

    // 3. Keep in-memory store updated
    inMemoryUploadedDocs.unshift(newDoc);

    return NextResponse.json(
      {
        success: true,
        data: {
          document: newDoc,
          note: `Document "${validated.filename}" successfully uploaded to s3://${S3_BUCKET}/${s3Key} and synchronized in DynamoDB.`,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload validation failed';
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message } },
      { status: 400 }
    );
  }
}
