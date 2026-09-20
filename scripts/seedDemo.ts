import { getIncidentRepository } from '../backend/repositories';

async function seedDemo() {
  console.log('⚡ Initializing Sentinel Deterministic Demo Data...');
  const repo = getIncidentRepository();
  const now = new Date().toISOString();

  // 1. Seed or ensure SEV-1 Payment Incident
  const id1 = 'inc-2026-0917-01';
  try {
    await repo.createIncident({
      incidentId: id1,
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
    });
    console.log(`✅ Seeded Incident: ${id1} (SEV1)`);
  } catch {
    console.log(`ℹ️ Incident ${id1} already exists in database`);
  }

  // 2. Seed or ensure SEV-2 Auth Incident
  const id2 = 'inc-2026-0917-02';
  try {
    await repo.createIncident({
      incidentId: id2,
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
      confidenceScore: 0.91,
      mttdSeconds: 65,
    });
    console.log(`✅ Seeded Incident: ${id2} (SEV2)`);
  } catch {
    console.log(`ℹ️ Incident ${id2} already exists in database`);
  }

  // 3. Seed or ensure SEV-3 SQS Incident
  const id3 = 'inc-2026-0916-03';
  try {
    await repo.createIncident({
      incidentId: id3,
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
    });
    console.log(`✅ Seeded Incident: ${id3} (SEV3)`);
  } catch {
    console.log(`ℹ️ Incident ${id3} already exists in database`);
  }

  // 4. Seed Bedrock Knowledge Base Citations for id1
  try {
    await repo.saveEvidenceChunks([
      {
        incidentId: id1,
        chunkId: 'ev-chunk-302',
        sourceType: 'BEDROCK_KNOWLEDGE_BASE',
        sourceUri: 's3://sentinel-runbooks-090686622776/payments/aurora-connection-leak.md',
        documentTitle: 'Runbook: Aurora PostgreSQL Connection Pool Recovery',
        snippet:
          'If P99 latency spikes above 3000ms immediately post-deploy and active connections hit max_connections (500), immediately invoke tool rollback_ecs_service followed by terminating idle backend sessions.',
        relevanceScore: 0.962,
        retrievedAt: now,
      },
      {
        incidentId: id1,
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
  } catch (err) {
    console.warn('Evidence chunks already seeded or error:', err);
  }

  // 5. Seed Initial Timeline Event for id1
  try {
    await repo.addTimelineEvent({
      incidentId: id1,
      eventId: 'ev-01',
      title: 'CloudWatch High Latency Alarm Triggered',
      description:
        'PaymentApiLatencyAlarm transitioned to ALARM state. P99 latency = 4,820ms (> 500ms threshold).',
      actor: 'CloudWatch Alarms (AWS)',
      category: 'ALERT',
      timestamp: now,
    });
    console.log('✅ Seeded CloudWatch Alarm Timeline Event');
  } catch (err) {
    console.warn('Timeline event already seeded or error:', err);
  }

  console.log('🚀 Ready for 3-minute hackathon demo walkthrough!');
}

seedDemo().catch((err) => {
  console.error('Failed to seed demo data:', err);
  process.exit(1);
});
