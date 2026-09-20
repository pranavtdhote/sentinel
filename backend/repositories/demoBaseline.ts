import {
  IncidentRecord,
  TimelineEventRecord,
  EvidenceRecord,
  FullIncidentBundle,
  AuditRecord,
} from '@/lib/types/database';

export function getBaselineDemoIncidents(): IncidentRecord[] {
  const now = new Date().toISOString();
  return [
    {
      PK: 'INCIDENT#inc-2026-0917-01',
      SK: 'METADATA',
      GSI1PK: 'STATUS#INVESTIGATING',
      GSI1SK: `CREATED#${now}`,
      GSI2PK: 'SEV#SEV1',
      GSI2SK: `CREATED#${now}`,
      incidentId: 'inc-2026-0917-01',
      title: 'Payment Checkout API 504 Gateway Timeout Spikes',
      service: 'payment-checkout-service',
      environment: 'production',
      severity: 'SEV1',
      status: 'INVESTIGATING',
      commander: 'prana@sentinel.internal',
      summary:
        'P99 latency surged from 120ms to 4,800ms following release v2.14.0. Upstream Stripe webhook errors reaching 12% failure threshold.',
      category: 'Database / Storage',
      location: 'us-east-1',
      confidenceScore: 0.94,
      mttdSeconds: 88,
      version: 1,
      createdAt: '2026-09-19T07:25:33.122Z',
      updatedAt: now,
    },
    {
      PK: 'INCIDENT#inc-2026-0917-02',
      SK: 'METADATA',
      GSI1PK: 'STATUS#INVESTIGATING',
      GSI1SK: `CREATED#${now}`,
      GSI2PK: 'SEV#SEV2',
      GSI2SK: `CREATED#${now}`,
      incidentId: 'inc-2026-0917-02',
      title: 'Auth Service JWT Verification Latency Degradation',
      service: 'auth-service',
      environment: 'production',
      severity: 'SEV2',
      status: 'INVESTIGATING',
      commander: 'sarah.m@sentinel.internal',
      summary:
        'JWT public key cache miss rate surged to 42%, causing token verification P95 to climb from 8ms to 320ms.',
      category: 'Authentication / Cache',
      location: 'us-east-1',
      rootCauseHypothesis: 'Redis replica node failover evicted cached JWKS public key set.',
      confidenceScore: 0.91,
      mttdSeconds: 65,
      version: 2,
      createdAt: '2026-09-18T14:10:00.000Z',
      updatedAt: now,
    },
    {
      PK: 'INCIDENT#inc-2026-0916-03',
      SK: 'METADATA',
      GSI1PK: 'STATUS#RESOLVED',
      GSI1SK: `CREATED#${now}`,
      GSI2PK: 'SEV#SEV3',
      GSI2SK: `CREATED#${now}`,
      incidentId: 'inc-2026-0916-03',
      title: 'Downstream Webhook Retry Storm on SQS Queue',
      service: 'notification-service',
      environment: 'production',
      severity: 'SEV3',
      status: 'RESOLVED',
      commander: 'alex.k@sentinel.internal',
      summary:
        'Partner endpoint outage triggered automatic 5x retry storm, causing SQS queue backlog of 14,000 messages.',
      category: 'Messaging / SQS',
      location: 'us-east-1',
      confidenceScore: 0.95,
      mttdSeconds: 110,
      mttmSeconds: 340,
      postmortemUrl:
        'https://sentinel-reports-090686622776.s3.us-east-1.amazonaws.com/postmortems/inc-2026-0916-03-retrospective.md',
      version: 3,
      createdAt: '2026-09-17T09:00:00.000Z',
      updatedAt: now,
    },
  ];
}

export function getBaselineDemoBundle(incidentId: string): FullIncidentBundle | null {
  const incidents = getBaselineDemoIncidents();
  const incident = incidents.find((i) => i.incidentId === incidentId);
  if (!incident) return null;

  const now = new Date().toISOString();

  if (incidentId === 'inc-2026-0917-01') {
    return {
      incident,
      timeline: [
        {
          PK: `INCIDENT#${incidentId}`,
          SK: `EVENT#${now}#ev-01`,
          incidentId,
          eventId: 'ev-01',
          title: 'CloudWatch High Latency Alarm Triggered',
          description:
            'PaymentApiLatencyAlarm transitioned to ALARM state. P99 latency = 4,820ms (> 500ms threshold).',
          actor: 'CloudWatch Alarms (AWS)',
          category: 'ALERT',
          timestamp: '2026-09-19T07:26:00.000Z',
        },
        {
          PK: `INCIDENT#${incidentId}`,
          SK: `EVENT#${now}#ev-02`,
          incidentId,
          eventId: 'ev-02',
          title: 'Bedrock Knowledge Base Retrieved Aurora Pool Runbook',
          description:
            'Autonomous RAG retrieval matched runbook "Aurora PostgreSQL Connection Pool Recovery" with 96.2% relevance.',
          actor: 'Amazon Bedrock Agent',
          category: 'INVESTIGATION',
          timestamp: '2026-09-19T07:27:15.000Z',
        },
      ],
      evidence: [
        {
          PK: `INCIDENT#${incidentId}`,
          SK: 'EVIDENCE#ev-chunk-302',
          incidentId,
          chunkId: 'ev-chunk-302',
          sourceType: 'BEDROCK_KNOWLEDGE_BASE',
          sourceUri: 's3://sentinel-runbooks-090686622776/payments/aurora-connection-leak.md',
          documentTitle: 'Runbook: Aurora PostgreSQL Connection Pool Recovery',
          snippet:
            'If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool rollback_ecs_service followed by terminating idle backend sessions.',
          relevanceScore: 0.962,
          retrievedAt: '2026-09-19T07:27:15.000Z',
        },
        {
          PK: `INCIDENT#${incidentId}`,
          SK: 'EVIDENCE#ev-chunk-418',
          incidentId,
          chunkId: 'ev-chunk-418',
          sourceType: 'CLOUDWATCH_LOGS',
          sourceUri: 'log-group:/aws/ecs/prod-services/payment-checkout',
          documentTitle: 'CloudWatch Log Stream: payment-checkout-service:49',
          snippet:
            '[ERROR] ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z. Unindexed query on table "orders".',
          relevanceScore: 0.915,
          retrievedAt: '2026-09-19T07:26:45.000Z',
        },
      ],
      auditLogs: [
        {
          PK: `INCIDENT#${incidentId}`,
          SK: `AUDIT#${now}#aud-01`,
          auditId: 'aud-01',
          incidentId,
          eventType: 'INCIDENT_CREATED',
          actor: {
            email: 'system@sentinel.internal',
            role: 'ADMIN',
          },
          timestamp: '2026-09-19T07:25:33.122Z',
        },
      ],
    };
  }

  if (incidentId === 'inc-2026-0917-02') {
    return {
      incident,
      timeline: [
        {
          PK: `INCIDENT#${incidentId}`,
          SK: `EVENT#${now}#ev-auth-01`,
          incidentId,
          eventId: 'ev-auth-01',
          title: 'ElastiCache Redis Failover Detected',
          description:
            'Cluster auth-cache-replica promoted to primary after node unresponsiveness. JWKS key cache invalidated.',
          actor: 'AWS Health / ElastiCache',
          category: 'ALERT',
          timestamp: '2026-09-18T14:10:05.000Z',
        },
      ],
      evidence: [
        {
          PK: `INCIDENT#${incidentId}`,
          SK: 'EVIDENCE#ev-auth-chunk-1',
          incidentId,
          chunkId: 'ev-auth-chunk-1',
          sourceType: 'BEDROCK_KNOWLEDGE_BASE',
          sourceUri: 's3://sentinel-runbooks-090686622776/auth/jwks-cache-warm.md',
          documentTitle: 'Runbook: JWKS Key Cache Eviction & Recovery',
          snippet:
            'When JWKS miss rate spikes above 20%, trigger cache pre-warming endpoint /internal/jwks/refresh to avoid Cognito rate limits.',
          relevanceScore: 0.94,
          retrievedAt: '2026-09-18T14:11:00.000Z',
        },
      ],
      auditLogs: [
        {
          PK: `INCIDENT#${incidentId}`,
          SK: `AUDIT#${now}#aud-auth-01`,
          auditId: 'aud-auth-01',
          incidentId,
          eventType: 'INCIDENT_CREATED',
          actor: {
            email: 'sarah.m@sentinel.internal',
            role: 'RESPONDER',
          },
          timestamp: '2026-09-18T14:10:00.000Z',
        },
      ],
    };
  }

  return {
    incident,
    timeline: [
      {
        PK: `INCIDENT#${incidentId}`,
        SK: `EVENT#${now}#ev-sqs-01`,
        incidentId,
        eventId: 'ev-sqs-01',
        title: 'SQS ApproximateNumberOfMessagesVisible High Alarm',
        description: 'Dead letter queue received 14,000 backlogged webhook delivery attempts.',
        actor: 'CloudWatch Alarms',
        category: 'ALERT',
        timestamp: '2026-09-17T09:01:00.000Z',
      },
      {
        PK: `INCIDENT#${incidentId}`,
        SK: `EVENT#${now}#ev-sqs-02`,
        incidentId,
        eventId: 'ev-sqs-02',
        title: 'Circuit Breaker Throttling Applied & Incident Resolved',
        description: 'Exponential backoff enabled on partner webhook dispatcher. SQS queue drained.',
        actor: 'alex.k@sentinel.internal',
        category: 'REMEDIATION',
        timestamp: '2026-09-17T09:05:40.000Z',
      },
    ],
    evidence: [],
    auditLogs: [],
  };
}
