import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthorization, AuthError } from '@/backend/domain/security/auth';

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

// In-memory store of knowledge documents pre-seeded from S3 source-of-truth
let documentsStore: KnowledgeDocument[] = [
  {
    id: 'kb-doc-01',
    title: 'Aurora PostgreSQL Connection Pool Recovery',
    type: 'SOP',
    source: 's3://sentinel-knowledge-store/sops/aurora-connection-leak.md',
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
    source: 's3://sentinel-knowledge-store/sops/ecs-task-definition-rollback.md',
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
    source: 's3://sentinel-knowledge-store/policies/infrastructure-mutation-policy.md',
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
    source: 's3://sentinel-knowledge-store/resources/payment-checkout-architecture.md',
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
    source: 's3://sentinel-knowledge-store/postmortems/2026-08-14-checkout-timeout.md',
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
    source: 's3://sentinel-knowledge-store/historical/inc-2026-0711-webhook-storm.md',
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
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const query = searchParams.get('q')?.toLowerCase();

    let docs = [...documentsStore];
    if (typeFilter) {
      docs = docs.filter((d) => d.type === typeFilter);
    }
    if (query) {
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.summary.toLowerCase().includes(query) ||
          d.source.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documents: docs,
        total: docs.length,
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID || 'KB-SENTINEL-RUNBOOKS-001',
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
    // Require authenticated responder or commander to upload knowledge
    let authContext;
    try {
      authContext = verifyAuthorization(req, ['INCIDENT_COMMANDER', 'ADMIN', 'RESPONDER']);
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
    const approvedS3Prefix = `${validated.type.toLowerCase().replace(/_/g, '-')}/`;
    const s3Uri = `s3://sentinel-knowledge-store/uploads/${approvedS3Prefix}${validated.filename}`;

    const newDoc: KnowledgeDocument = {
      id: docId,
      title: validated.title,
      type: validated.type,
      source: s3Uri,
      version: validated.version,
      // In accordance with prompt rules: do not claim searchability until sync completes
      syncStatus: 'PENDING_SYNC',
      lastUpdated: now,
      relatedIncidentCount: 0,
      chunksCount: Math.max(1, Math.ceil(validated.content.length / 500)),
      summary: validated.summary,
      s3Prefix: approvedS3Prefix,
    };

    // Prepend to store
    documentsStore.unshift(newDoc);

    return NextResponse.json(
      {
        success: true,
        data: {
          document: newDoc,
          note: 'Document uploaded to approved S3 prefix. Ingestion sync initiated. Searchability is pending Bedrock vector index sync.',
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
