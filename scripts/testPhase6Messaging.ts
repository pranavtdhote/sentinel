import { EventRouter } from '../backend/events/eventRouter';
import { SentinelEventEnvelope } from '../backend/events/eventTypes';

async function testMessaging() {
  console.log('=== SENTINEL Phase 6 (EventBridge & SNS) Live Test ===\n');

  const testEvent: SentinelEventEnvelope = {
    eventId: `evt-test-${Date.now()}`,
    eventType: 'IncidentCreated',
    incidentId: 'inc-2026-0917-01',
    timestamp: new Date().toISOString(),
    source: 'sentinel.incidents',
    payloadVersion: '1.0',
    actor: 'prana@sentinel.internal',
    payload: {
      title: 'Payment Checkout API 504 Gateway Timeout Spikes',
      severity: 'SEV1',
      service: 'payment-checkout-service',
      environment: 'production',
      summary: 'Verified live EventBridge bus and SNS on-call alert dispatch.',
    },
  };

  console.log(`Publishing test event '${testEvent.eventId}' (${testEvent.eventType})...`);
  const result = await EventRouter.publishEvent(testEvent);

  console.log('\n-> Publish Result:');
  console.log(`   * Routed to EventBridge: ${result.routedToEventBridge}`);
  console.log(`   * EventBridge Entry ID:  ${result.eventBridgeEntryId || 'N/A'}`);
  console.log(`   * Routed to SNS:         ${result.routedToSns}`);
  console.log(`   * SNS Message ID:        ${result.snsMessageId || 'N/A'}`);
  console.log(`   * Is Duplicate:          ${result.isDuplicate}`);

  if (result.routedToEventBridge && result.routedToSns) {
    console.log('\n🎉 Phase 6 Messaging Verified Live in AWS!');
  } else {
    console.warn('\n⚠️ Messaging routing partial check.');
  }
}

testMessaging().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
