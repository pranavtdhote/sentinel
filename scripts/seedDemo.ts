import { getIncidentRepository } from '../backend/repositories';

async function seedDemo() {
  console.log('⚡ Initializing Sentinel Deterministic Demo Data...');
  const repo = getIncidentRepository();

  const incidentId = 'inc-2026-0917-01';
  const now = new Date().toISOString();

  // 1. Create or ensure SEV-1 Incident
  const incident = await repo.createIncident({
    incidentId,
    title: 'Payment Checkout API 504 Gateway Timeout Spikes',
    service: 'payment-checkout-service',
    environment: 'production',
    severity: 'SEV1',
    status: 'DETECTED',
    commander: 'prana@sentinel.internal',
    summary:
      'P99 latency surged from 120ms to 4,800ms following release v2.14.0. Upstream Stripe webhook errors reaching 12% failure threshold.',
    confidenceScore: 0.94,
    mttdSeconds: 88,
  });

  console.log(`✅ Seeded Incident: ${incident.incidentId} (${incident.severity})`);

  // 2. Seed Bedrock Knowledge Base Citations
  await repo.saveEvidenceChunks([
    {
      incidentId,
      chunkId: 'ev-chunk-302',
      sourceType: 'BEDROCK_KNOWLEDGE_BASE',
      sourceUri: 's3://sentinel-runbooks-prod/payments/aurora-connection-leak.md',
      documentTitle: 'Runbook: Aurora PostgreSQL Connection Pool Recovery',
      snippet:
        'If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool rollback_ecs_service followed by terminating idle backend sessions.',
      relevanceScore: 0.962,
      retrievedAt: now,
    },
    {
      incidentId,
      chunkId: 'ev-chunk-418',
      sourceType: 'CLOUDWATCH_LOGS',
      sourceUri: 'log-group:/aws/ecs/prod-services/payment-checkout',
      documentTitle: 'CloudWatch Log Stream: payment-checkout-service:49',
      snippet:
        '[ERROR] ConnectionPoolTimeoutException: Timeout waiting for connection from pool of 500 connections on aurora-pg-prod.c4z. Unindexed query on table "orders".',
      relevanceScore: 0.915,
      retrievedAt: now,
    },
  ]);

  console.log('✅ Seeded Grounded Knowledge Base Runbooks (S3)');

  // 3. Seed Initial Timeline Event
  await repo.addTimelineEvent({
    incidentId,
    eventId: 'ev-01',
    title: 'CloudWatch High Latency Alarm Triggered',
    description:
      'PaymentApiLatencyAlarm transitioned to ALARM state. P99 latency = 4,820ms (> 500ms threshold).',
    actor: 'CloudWatch Alarms (AWS)',
    category: 'ALERT',
    timestamp: now,
  });

  console.log('✅ Seeded CloudWatch Alarm Timeline Event');
  console.log('🚀 Ready for 3-minute hackathon demo walkthrough!');
}

seedDemo().catch((err) => {
  console.error('Failed to seed demo data:', err);
  process.exit(1);
});
