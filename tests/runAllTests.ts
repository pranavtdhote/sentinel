import {
  IncidentTriageOutputSchema,
  ActionPlanOutputSchema,
  validateGrounding,
} from '../backend/ai/validators';
import { ApprovalGate } from '../backend/domain/security/approvalGate';
import { ToolRunner } from '../backend/tools/toolRunner';
import { getIncidentRepository } from '../backend/repositories';

let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('🧪 Running Sentinel Test Suite...\n');

  // Test Suite 1: AI Contracts & Grounding Validation
  console.log('1. AI Contracts & Grounding Validation:');
  const validTriage = {
    rootCauseHypothesis: 'Database connection pool exhaustion on Aurora PostgreSQL cluster.',
    confidenceScore: 0.94,
    primaryImpact: '504 Gateway Timeouts affecting 12% of Stripe checkout transactions.',
    citedEvidenceIds: ['ev-chunk-302', 'ev-chunk-418'],
    recommendedStrategy: 'ROLLBACK_DEPLOYMENT',
    technicalSummary: 'Connection pool metrics show active connections saturated at max (500/500).',
  };

  const parsed = IncidentTriageOutputSchema.safeParse(validTriage);
  assert(parsed.success, 'Valid triage payload passes Zod schema');

  const groundingSuccess = validateGrounding(validTriage as any, [
    'ev-chunk-302',
    'ev-chunk-418',
    'ev-chunk-999',
  ]);
  assert(groundingSuccess.isValid, 'Grounding check passes when evidence IDs match');

  const groundingFailure = validateGrounding(validTriage as any, ['ev-other-id']);
  assert(!groundingFailure.isValid, 'Grounding check fails when unknown evidence IDs cited');

  // Test Suite 2: Cryptographic HITL Approval Gate
  console.log('\n2. Cryptographic Human-in-the-Loop Security Gate:');
  const freshNonce = crypto.randomUUID();
  const validPayload = {
    planId: 'plan-01',
    actionId: 'act-01',
    decision: 'APPROVED' as const,
    approverEmail: 'commander@sentinel.internal',
    nonce: freshNonce,
    timestamp: new Date().toISOString(),
    signature: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  };

  const commanderCheck = ApprovalGate.verifyApproval(validPayload, 'INCIDENT_COMMANDER');
  assert(commanderCheck.valid, 'Commander approval accepted');

  const replayCheck = ApprovalGate.verifyApproval(validPayload, 'INCIDENT_COMMANDER');
  assert(!replayCheck.valid && replayCheck.errorCode === 'REPLAYED_NONCE', 'Replayed nonce is rejected');

  const viewerCheck = ApprovalGate.verifyApproval(
    { ...validPayload, nonce: crypto.randomUUID() },
    'VIEWER'
  );
  assert(!viewerCheck.valid && viewerCheck.errorCode === 'UNAUTHORIZED_ROLE', 'Viewer role is rejected from approving mutating tools');

  const expiredCheck = ApprovalGate.verifyApproval(
    {
      ...validPayload,
      nonce: crypto.randomUUID(),
      timestamp: new Date(Date.now() - 400 * 1000).toISOString(),
    },
    'INCIDENT_COMMANDER'
  );
  assert(!expiredCheck.valid && expiredCheck.errorCode === 'EXPIRED_TOKEN', 'Expired approval token (>300s) is rejected');

  // Test Suite 3: Isolated Tool Runner
  console.log('\n3. Isolated Tool Runner:');
  const toolRunner = new ToolRunner();
  const ecsResult = await toolRunner.executeTool('rollback_ecs_task_definition', {
    cluster: 'prod-services',
    service: 'payment-checkout-service',
    targetTaskDefinition: 'payment-checkout-service:48',
  });
  assert(ecsResult.status === 'SUCCESS', 'rollback_ecs_task_definition executes successfully');
  assert(Boolean(ecsResult.awsRequestId), 'AWS Request ID is generated');

  const alarmResult = await toolRunner.executeTool('verify_cloudwatch_alarm_state', {
    alarmName: 'PaymentApiLatencyAlarm',
  });
  assert(alarmResult.status === 'SUCCESS', 'verify_cloudwatch_alarm_state executes successfully');

  // Test Suite 4: Repository Operations
  console.log('\n4. Repository & Single-Table Store:');
  const repo = getIncidentRepository();
  const incident = await repo.createIncident({
    incidentId: `test-inc-${Date.now()}`,
    title: 'Test Aurora Cluster Memory Alert',
    service: 'auth-service',
    environment: 'production',
    severity: 'SEV2',
    status: 'DETECTED',
    commander: 'test@sentinel.internal',
    summary: 'Memory threshold exceeded 85%.',
  });
  assert(Boolean(incident.incidentId), 'Incident created in repository');

  const retrieved = await repo.getIncident(incident.incidentId);
  assert(retrieved?.incidentId === incident.incidentId, 'Incident retrieved by ID');

  const updated = await repo.updateIncidentStatus(incident.incidentId, 'INVESTIGATING', 1);
  assert(updated.status === 'INVESTIGATING' && updated.version === 2, 'Incident status updated with optimistic lock');

  console.log('\n----------------------------------------');
  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! System verified and production-ready.');
  } else {
    console.error(`💥 ${failedTests} test(s) failed.`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
