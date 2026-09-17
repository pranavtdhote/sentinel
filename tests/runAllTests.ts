import { NextRequest } from 'next/server';
import {
  IncidentTriageOutputSchema,
  ActionPlanOutputSchema,
  validateGrounding,
} from '../backend/ai/validators';
import { ApprovalGate } from '../backend/domain/security/approvalGate';
import { ToolRunner } from '../backend/tools/toolRunner';
import { getIncidentRepository } from '../backend/repositories';
import { validateStateTransition, InvalidStateTransitionError } from '../backend/domain/stateMachine';
import { verifyAuthorization, AuthError } from '../backend/domain/security/auth';
import { IncidentAnalyzer } from '../backend/ai/incidentAnalyzer';
import { AIServiceError } from '../backend/ai/aiServiceError';
import { AIOutputSchema } from '../backend/ai/aiOutputSchema';

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

  // Test Suite 5: Prompt D — Complete Incident Lifecycle, Concurrency & Audit Events
  console.log('\n5. Incident Lifecycle & State Machine (Prompt D):');
  const lifecycleId = `lifecycle-${Date.now()}`;
  
  // 5.1 Create incident with status NEW
  const newIncident = await repo.createIncident({
    incidentId: lifecycleId,
    title: 'Payment Service Stripe Webhook Latency Spike',
    service: 'payment-service',
    environment: 'production',
    severity: 'CRITICAL',
    status: 'NEW',
    commander: 'commander@sentinel.internal',
    summary: 'Spike in webhook 504 timeouts across checkout flow.',
    location: 'us-east-1',
    affectedUsers: 8400,
  });
  assert(newIncident.status === 'NEW' && newIncident.version === 1, 'Lifecycle: Incident created in NEW state with version 1');
  assert(Boolean(newIncident.createdAt) && Boolean(newIncident.updatedAt), 'Lifecycle: createdAt and updatedAt timestamps stored');

  // 5.2 Get incident
  const fetched = await repo.getIncident(lifecycleId);
  assert(fetched !== null && fetched.incidentId === lifecycleId, 'Lifecycle: Successfully retrieved incident by ID');

  // 5.3 Missing incident verification
  const missing = await repo.getIncident('inc-non-existent-999999');
  assert(missing === null, 'Lifecycle: Missing incident returns null (404 mapping)');

  // 5.4 Update incident fields (patchIncident)
  const patched = await repo.patchIncident(
    lifecycleId,
    { summary: 'Refined summary: Stripe webhook latency confirmed reaching 6.2s P99.', affectedUsers: 9100 },
    1
  );
  assert(patched.version === 2 && patched.affectedUsers === 9100, 'Lifecycle: Patch incident updates fields and increments version to 2');

  // 5.5 Stale version / optimistic lock collision
  let staleConflictCaught = false;
  try {
    await repo.patchIncident(lifecycleId, { summary: 'Stale attempt' }, 1); // expectedVersion 1 is now stale (current is 2)
  } catch (err: unknown) {
    staleConflictCaught = (err as Error).message.includes('OptimisticLockException') || (err as Error).message.includes('Stale');
  }
  assert(staleConflictCaught, 'Lifecycle: Stale version conflict caught and rejected with OptimisticLockException');

  // 5.6 Duplicate update protection
  let duplicateConflictCaught = false;
  try {
    await repo.updateIncidentStatus(lifecycleId, 'ANALYZING', 1); // stale version
  } catch (err: unknown) {
    duplicateConflictCaught = (err as Error).message.includes('OptimisticLockException') || (err as Error).message.includes('Expected version');
  }
  assert(duplicateConflictCaught, 'Lifecycle: Duplicate/stale status transition rejected by optimistic version check');

  // 5.7 Invalid state transitions
  let invalidTransitionCaught = false;
  try {
    validateStateTransition('NEW', 'CLOSED');
  } catch (err: unknown) {
    if (err instanceof InvalidStateTransitionError) {
      invalidTransitionCaught = true;
      assert(err.currentStatus === 'NEW' && err.attemptedStatus === 'CLOSED', 'Lifecycle: Invalid transition metadata captured');
    }
  }
  assert(invalidTransitionCaught, 'Lifecycle: Invalid transition NEW → CLOSED prevented with InvalidStateTransitionError');

  let invalidRegressionCaught = false;
  try {
    validateStateTransition('RESOLVED', 'ANALYZING');
  } catch (err: unknown) {
    invalidRegressionCaught = err instanceof InvalidStateTransitionError;
  }
  assert(invalidRegressionCaught, 'Lifecycle: Invalid regression RESOLVED → ANALYZING prevented');

  // 5.8 Valid complete state machine progression: NEW → ANALYZING → ACTION_REQUIRED → IN_PROGRESS → RESOLVED → CLOSED
  validateStateTransition('NEW', 'ANALYZING');
  const analyzingInc = await repo.updateIncidentStatus(lifecycleId, 'ANALYZING', 2);
  assert(analyzingInc.status === 'ANALYZING' && analyzingInc.version === 3, 'Lifecycle: Valid transition to ANALYZING');

  validateStateTransition('ANALYZING', 'ACTION_REQUIRED');
  const actionReqInc = await repo.updateIncidentStatus(lifecycleId, 'ACTION_REQUIRED', 3);
  assert(actionReqInc.status === 'ACTION_REQUIRED' && actionReqInc.version === 4, 'Lifecycle: Valid transition to ACTION_REQUIRED');

  validateStateTransition('ACTION_REQUIRED', 'IN_PROGRESS');
  const inProgressInc = await repo.updateIncidentStatus(lifecycleId, 'IN_PROGRESS', 4);
  assert(inProgressInc.status === 'IN_PROGRESS' && inProgressInc.version === 5, 'Lifecycle: Valid transition to IN_PROGRESS');

  validateStateTransition('IN_PROGRESS', 'RESOLVED');
  const resolvedInc = await repo.updateIncidentStatus(lifecycleId, 'RESOLVED', 5);
  assert(resolvedInc.status === 'RESOLVED' && resolvedInc.version === 6, 'Lifecycle: Valid transition to RESOLVED');

  validateStateTransition('RESOLVED', 'CLOSED');
  const closedInc = await repo.updateIncidentStatus(lifecycleId, 'CLOSED', 6);
  assert(closedInc.status === 'CLOSED' && closedInc.version === 7, 'Lifecycle: Valid transition to CLOSED');

  // 5.9 Audit Event creation and retrieval
  await repo.addAuditLog({
    auditId: `aud-test-01`,
    incidentId: lifecycleId,
    eventType: 'STATUS_TRANSITION',
    actor: { email: 'auditor@sentinel.internal', role: 'ADMIN' },
    executionOutput: { from: 'RESOLVED', to: 'CLOSED' },
    timestamp: new Date().toISOString(),
  });
  const events = await repo.getEvents(lifecycleId);
  assert(events.auditLogs.length >= 1, 'Lifecycle: AuditEvent recorded and retrieved via getEvents');
  assert(events.auditLogs[0].eventType === 'STATUS_TRANSITION', 'Lifecycle: Audit event contains proper eventType and actor');

  // 5.10 Authorization checks
  let missingAuthCaught = false;
  try {
    const unauthReq = new NextRequest('http://localhost:3000/api/incidents');
    verifyAuthorization(unauthReq);
  } catch (err: unknown) {
    missingAuthCaught = err instanceof AuthError && (err as AuthError).code === 'UNAUTHORIZED';
  }
  assert(missingAuthCaught, 'Lifecycle: Missing authorization header rejected with 401 UNAUTHORIZED');

  let forbiddenRoleCaught = false;
  try {
    const forbiddenReq = new NextRequest('http://localhost:3000/api/incidents/test/approve', {
      headers: {
        authorization: 'Bearer viewer-token',
        'x-sentinel-actor-role': 'VIEWER',
      },
    });
    verifyAuthorization(forbiddenReq, ['INCIDENT_COMMANDER', 'ADMIN']);
  } catch (err: unknown) {
    forbiddenRoleCaught = err instanceof AuthError && (err as AuthError).code === 'FORBIDDEN';
  }
  assert(forbiddenRoleCaught, 'Lifecycle: Unauthorized role for mutating action rejected with 403 FORBIDDEN');

  // Test Suite 6: Prompt E — Bedrock Structured Incident Analyzer
  console.log('\n6. Amazon Bedrock Structured Incident Analyzer (Prompt E):');
  const analyzer = new IncidentAnalyzer();

  // 6.1 Deterministic fallback satisfies AIOutputSchema
  const fallback = analyzer.generateDeterministicFallback({
    title: 'Aurora Connection Pool Exhaustion 504 Outage',
    description: 'P99 latency surged above 4000ms. DB max connections saturated.',
    location: 'us-east-1',
    categoryHint: 'Database / Connection Pool',
    affectedUsersHint: 12500,
  });
  const fallbackParsed = AIOutputSchema.safeParse(fallback);
  assert(fallbackParsed.success, 'Bedrock Analyzer: Fallback output adheres strictly to AIOutputSchema');
  assert(fallback.severity === 'CRITICAL', 'Bedrock Analyzer: Fallback correctly sets severity to CRITICAL for 504 outages');
  assert(fallback.confidence >= 0 && fallback.confidence <= 1, 'Bedrock Analyzer: Confidence is bounded between 0 and 1');
  assert(fallback.rootCauseHypotheses.length >= 1, 'Bedrock Analyzer: Root cause hypotheses contain evidence requirements');
  assert(fallback.recommendedActions.length >= 1, 'Bedrock Analyzer: Recommended actions include priority and approval requirements');

  // 6.2 Valid output parsing & schema validation
  const validBedrockOutputJson = JSON.stringify({
    severity: 'HIGH',
    category: 'Network / Load Balancer',
    confidence: 0.89,
    affectedUsers: 450,
    slaMinutes: 30,
    rootCauseHypotheses: [
      {
        hypothesis: 'Target group health check failures on ECS container tasks.',
        confidence: 0.89,
        evidenceNeeded: ['ALB UnhealthyRoutingCount metric', 'ECS task exit status codes'],
      },
    ],
    recommendedActions: [
      {
        action: 'Restart unhealthy ECS container task instances.',
        priority: 'IMMEDIATE',
        requiresApproval: true,
      },
    ],
    reasoningSummary: 'Health check flaps correlate directly with memory threshold breaches on container instances.',
  });
  const parsedValidOutput = analyzer.parseAndValidateOutput(validBedrockOutputJson);
  assert(parsedValidOutput.severity === 'HIGH' && parsedValidOutput.confidence === 0.89, 'Bedrock Analyzer: Successfully parses and validates structured response');

  // 6.3 Malformed JSON rejection
  let malformedJsonCaught = false;
  try {
    const badJson = '```json { severity: "CRITICAL", category: "Network", broken json content... ';
    analyzer.parseAndValidateOutput(badJson);
  } catch (err: unknown) {
    if (err instanceof AIServiceError) {
      malformedJsonCaught = err.code === 'MALFORMED_OUTPUT';
      assert(err.modelId !== undefined, 'Bedrock Analyzer: Model ID preserved on AIServiceError');
    }
  }
  assert(malformedJsonCaught, 'Bedrock Analyzer: Malformed JSON output throws typed AIServiceError (MALFORMED_OUTPUT)');

  // 6.4 Invalid enum rejection (Severity)
  let invalidEnumCaught = false;
  try {
    const badEnumJson = JSON.stringify({
      severity: 'APOCALYPTIC_CATASTROPHE', // Invalid enum
      category: 'Network',
      confidence: 0.9,
      affectedUsers: 100,
      slaMinutes: 15,
      rootCauseHypotheses: [
        {
          hypothesis: 'Unknown network partition.',
          confidence: 0.9,
          evidenceNeeded: ['VPC flow logs'],
        },
      ],
      recommendedActions: [
        {
          action: 'Inspect VPC routes.',
          priority: 'IMMEDIATE',
          requiresApproval: false,
        },
      ],
      reasoningSummary: 'Test invalid severity enum validation.',
    });
    analyzer.parseAndValidateOutput(badEnumJson);
  } catch (err: unknown) {
    if (err instanceof AIServiceError) {
      invalidEnumCaught = err.code === 'INVALID_ENUM';
    }
  }
  assert(invalidEnumCaught, 'Bedrock Analyzer: Invalid enum for severity throws typed AIServiceError (INVALID_ENUM)');

  // 6.5 Invalid enum rejection (Action Priority)
  let invalidActionPriorityCaught = false;
  try {
    const badPriorityJson = JSON.stringify({
      severity: 'LOW',
      category: 'Storage',
      confidence: 0.8,
      affectedUsers: null,
      slaMinutes: 120,
      rootCauseHypotheses: [
        {
          hypothesis: 'Disk utilization warning.',
          confidence: 0.8,
          evidenceNeeded: ['EBS volume metrics'],
        },
      ],
      recommendedActions: [
        {
          action: 'Expand EBS volume.',
          priority: 'WHENEVER_YOU_CAN', // Invalid priority enum
          requiresApproval: false,
        },
      ],
      reasoningSummary: 'Test invalid action priority enum.',
    });
    analyzer.parseAndValidateOutput(badPriorityJson);
  } catch (err: unknown) {
    if (err instanceof AIServiceError) {
      invalidActionPriorityCaught = err.code === 'INVALID_ENUM';
    }
  }
  assert(invalidActionPriorityCaught, 'Bedrock Analyzer: Invalid action priority enum throws typed AIServiceError (INVALID_ENUM)');

  // 6.6 Out of range confidence rejection (Schema validation)
  let invalidConfidenceCaught = false;
  try {
    const badConfidenceJson = JSON.stringify({
      severity: 'LOW',
      category: 'Storage',
      confidence: 1.85, // Invalid: confidence must be 0-1
      affectedUsers: null,
      slaMinutes: 120,
      rootCauseHypotheses: [
        {
          hypothesis: 'Disk utilization warning.',
          confidence: 0.8,
          evidenceNeeded: ['EBS volume metrics'],
        },
      ],
      recommendedActions: [
        {
          action: 'Expand EBS volume.',
          priority: 'FOLLOW_UP',
          requiresApproval: false,
        },
      ],
      reasoningSummary: 'Test out of bounds confidence schema violation.',
    });
    analyzer.parseAndValidateOutput(badConfidenceJson);
  } catch (err: unknown) {
    if (err instanceof AIServiceError) {
      invalidConfidenceCaught = err.code === 'SCHEMA_VALIDATION_FAILED';
    }
  }
  assert(invalidConfidenceCaught, 'Bedrock Analyzer: Out-of-bounds confidence score (>1.0) throws SCHEMA_VALIDATION_FAILED');

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
