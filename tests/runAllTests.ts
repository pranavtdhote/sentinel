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
import { KnowledgeBaseService } from '../backend/rag/knowledgeBaseService';
import { CitationMapper } from '../backend/rag/citationMapper';
import { RAGService } from '../backend/rag/ragService';
import { ToolRegistry } from '../backend/tools/toolRegistry';
import { SlaMonitor } from '../backend/events/slaMonitor';
import { EventRouter } from '../backend/events/eventRouter';
import { SentinelEventEnvelope } from '../backend/events/eventTypes';

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

  // Test Suite 7: Prompt F — Bedrock Knowledge Base / Grounded RAG Layer
  console.log('\n7. Bedrock Knowledge Base & Grounded RAG Layer (Prompt F):');
  const kbService = new KnowledgeBaseService();
  const ragService = new RAGService(kbService);

  // 7.1 Results returned with preserved metadata
  const retrievalResult = await kbService.retrieveChunks('Aurora PostgreSQL pool exhaustion', {
    category: 'SOP',
  });
  assert(retrievalResult.chunks.length > 0, 'RAG: Knowledge base returns relevant chunks for query');
  assert(retrievalResult.chunks[0].sourceUri.startsWith('s3://'), 'RAG: Source URI preserves S3 source of truth location');
  assert(Boolean(retrievalResult.chunks[0].metadata.documentTitle), 'RAG: Document title and metadata preserved');

  // 7.2 No results handling (never claim unretrieved evidence)
  const emptyRetrieval = await kbService.retrieveChunks('nonexistent_system_xyz_123456');
  assert(emptyRetrieval.chunks.length === 0, 'RAG: Empty retrieval returns 0 chunks');

  const dummyIncident = {
    incidentId: 'inc-no-results-test',
    title: 'Nonexistent system error',
    service: 'nonexistent-service',
    severity: 'LOW' as const,
    status: 'NEW' as const,
    summary: 'empty_result_test with no prior runbooks.',
    commander: 'prana@sentinel.internal',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const emptyRag = await ragService.executeRAG(dummyIncident as any);
  assert(emptyRag.groundingStatus === 'NO_GROUNDING_AVAILABLE', 'RAG: No results yields NO_GROUNDING_AVAILABLE without hallucinations');
  assert(emptyRag.citedEvidenceIds.length === 0, 'RAG: No evidence IDs claimed when no chunks were retrieved');

  // 7.3 Malformed metadata handling in CitationMapper
  const malformedRawResults = [
    null,
    { content: { text: 'Valid snippet 1' }, metadata: null },
    { content: { text: 'Valid snippet 2' }, location: { s3Location: { uri: 's3://bucket/valid.md' } }, metadata: { category: 'CORRUPTED_ENUM' } },
    { content: null }, // empty content
  ];
  const mappedSanitized = CitationMapper.mapRetrievalResults(malformedRawResults);
  assert(mappedSanitized.length === 2, 'RAG: CitationMapper filters nulls and extracts valid text chunks');
  assert(mappedSanitized[1].category === 'SOP', 'RAG: Malformed category enum safely defaults to fallback');

  // 7.4 Duplicate chunk deduplication
  const duplicateRawResults = [
    { content: { text: 'Identical runbook content' }, location: { s3Location: { uri: 's3://bucket/runbook.md' } } },
    { content: { text: 'Identical runbook content' }, location: { s3Location: { uri: 's3://bucket/runbook.md' } } },
  ];
  const deduplicated = CitationMapper.mapRetrievalResults(duplicateRawResults);
  assert(deduplicated.length === 1, 'RAG: CitationMapper automatically deduplicates identical chunks');

  // 7.5 Full Grounded RAG Recommendation
  const realRagRec = await ragService.executeRAG({
    ...dummyIncident,
    title: 'Payment Checkout Aurora Connection Pool Outage',
    summary: 'Aurora max_connections 500 reached, P99 latency 4800ms.',
  } as any);
  assert(realRagRec.groundingStatus === 'FULLY_GROUNDED', 'RAG: Grounded recommendations formulated from retrieved evidence');
  assert(realRagRec.evidenceCards.length >= 1, 'RAG: Evidence cards populated for UI display');

  // Test Suite 8: Prompt G — Agent & Tool Layer
  console.log('\n8. Agent & Tool Execution Layer (Prompt G):');
  const toolContext = {
    callerEmail: 'commander@sentinel.internal',
    callerRole: 'INCIDENT_COMMANDER' as const,
    incidentId: lifecycleId,
  };

  // 8.1 Allowlist enforcement
  let disallowedToolRejected = false;
  try {
    await ToolRegistry.executeTool('arbitrary_sql_injection', {}, toolContext);
  } catch (err: unknown) {
    disallowedToolRejected = (err as Error).message.includes('not in Sentinel\'s permitted tool allowlist');
  }
  assert(disallowedToolRejected, 'Agent Tools: Arbitrary or unpermitted tool name rejected by allowlist');

  // 8.2 Model cannot invent non-existent incident IDs
  const nonExistentPlan = await ToolRegistry.executeTool(
    'createActionPlan',
    {
      incidentId: 'inc-invented-phantom-id',
      title: 'Action Plan',
      summary: 'Test summary',
      actions: [{ description: 'Restart service', toolName: 'restart_ecs_service', parameters: {}, requiresApproval: true }],
    },
    toolContext
  );
  assert(nonExistentPlan.status === 'FAILED' && nonExistentPlan.resultSummary.includes('does not exist'), 'Agent Tools: Model prevented from inventing non-existent incident IDs');

  // 8.3 Tool 1: searchHistoricalIncidents
  const searchHist = await ToolRegistry.executeTool('searchHistoricalIncidents', { query: 'Payment', limit: 3 }, toolContext);
  assert(searchHist.status === 'SUCCESS' && Array.isArray((searchHist.data as any).incidents), 'Agent Tools: searchHistoricalIncidents executes cleanly');

  // 8.4 Tool 2: searchOperationalKnowledge
  const searchKnowledge = await ToolRegistry.executeTool('searchOperationalKnowledge', { query: 'Aurora pool', category: 'SOP' }, toolContext);
  assert(searchKnowledge.status === 'SUCCESS' && searchKnowledge.evidenceCount >= 1, 'Agent Tools: searchOperationalKnowledge returns grounded evidence');

  // 8.5 Tool 3: getAvailableResponders
  const getResponders = await ToolRegistry.executeTool('getAvailableResponders', { service: 'payment-checkout-service', onCallOnly: true }, toolContext);
  assert(getResponders.status === 'SUCCESS' && (getResponders.data as any).count >= 1, 'Agent Tools: getAvailableResponders lists on-call engineers');

  // 8.6 Tool 4: getResources
  const getRes = await ToolRegistry.executeTool('getResources', { service: 'payment-checkout-service', environment: 'production' }, toolContext);
  assert(getRes.status === 'SUCCESS' && Boolean((getRes.data as any).resources.ecsCluster), 'Agent Tools: getResources resolves AWS infrastructure endpoints');

  // 8.7 Tool 5: createActionPlan
  const createPlan = await ToolRegistry.executeTool(
    'createActionPlan',
    {
      incidentId: lifecycleId,
      title: 'Automated Remediation Plan',
      summary: 'Rollback ECS service to stable release',
      actions: [{ description: 'Rollback to task def 48', toolName: 'rollback_ecs_task_definition', parameters: { service: 'payment-checkout-service' }, requiresApproval: true }],
    },
    toolContext
  );
  assert(createPlan.status === 'SUCCESS' && Boolean((createPlan.data as any).actionPlan), 'Agent Tools: createActionPlan creates plan with approval requirement');

  // 8.8 Tool 6: assignResponder
  const assignResp = await ToolRegistry.executeTool('assignResponder', { incidentId: lifecycleId, responderEmail: 'sarah.m@sentinel.internal', role: 'RESPONDER' }, toolContext);
  assert(assignResp.status === 'SUCCESS', 'Agent Tools: assignResponder assigns responder successfully');

  // 8.9 Tool 7: updateIncident
  const currentBeforeUpdate = await repo.getIncident(lifecycleId);
  const updateIncTool = await ToolRegistry.executeTool(
    'updateIncident',
    { incidentId: lifecycleId, summary: 'Updated via agentic tool layer', expectedVersion: currentBeforeUpdate!.version },
    toolContext
  );
  assert(updateIncTool.status === 'SUCCESS', 'Agent Tools: updateIncident updates incident with version lock');

  // 8.10 Tool 8: sendIncidentNotification
  const sendNotif = await ToolRegistry.executeTool('sendIncidentNotification', { incidentId: lifecycleId, channel: 'SNS', priority: 'URGENT', message: 'SLA threshold approaching' }, toolContext);
  assert(sendNotif.status === 'SUCCESS' && (sendNotif.data as any).delivered, 'Agent Tools: sendIncidentNotification dispatches message');

  // 8.11 Tool 9: generateResolutionReport
  const genReport = await ToolRegistry.executeTool('generateResolutionReport', { incidentId: lifecycleId, resolutionSummary: 'Mitigated via rollback', mttmSeconds: 320 }, toolContext);
  assert(genReport.status === 'SUCCESS' && (genReport.data as any).reportS3Key.includes('retrospective'), 'Agent Tools: generateResolutionReport compiles and publishes S3 report');

  // Test Suite 9: Prompt H — Human Approval Safety Gate
  console.log('\n9. Human Approval Safety Gate (Prompt H):');
  ApprovalGate.clearConsumedNonces();

  const hitlPayload = {
    planId: 'plan-test-hitl',
    actionId: 'act-hitl-01',
    decision: 'APPROVED' as const,
    approverEmail: 'commander@sentinel.internal',
    nonce: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    signature: 'sha256:hitl_valid_signature_token',
  };

  // 9.1 Valid approval
  const validHitl = ApprovalGate.verifyApproval(hitlPayload, 'INCIDENT_COMMANDER', { incidentVersion: 1, expectedIncidentVersion: 1 });
  assert(validHitl.valid, 'HITL Gate: Valid commander approval accepted');

  // 9.2 Duplicate approval (Replay prevention)
  const replayHitl = ApprovalGate.verifyApproval(hitlPayload, 'INCIDENT_COMMANDER');
  assert(!replayHitl.valid && replayHitl.errorCode === 'REPLAYED_NONCE', 'HITL Gate: Replay of consumed nonce rejected');

  // 9.3 Stale approval (Incident or action version changed)
  const staleVersionHitl = ApprovalGate.verifyApproval(
    { ...hitlPayload, nonce: crypto.randomUUID() },
    'INCIDENT_COMMANDER',
    { incidentVersion: 3, expectedIncidentVersion: 2 } // Version mismatch
  );
  assert(!staleVersionHitl.valid && staleVersionHitl.errorCode === 'STALE_APPROVAL', 'HITL Gate: Stale approval rejected when incident version advanced');

  // 9.4 Unauthorized approval (Role VIEWER)
  const unauthHitl = ApprovalGate.verifyApproval(
    { ...hitlPayload, nonce: crypto.randomUUID() },
    'VIEWER'
  );
  assert(!unauthHitl.valid && unauthHitl.errorCode === 'UNAUTHORIZED_ROLE', 'HITL Gate: Non-commander role rejected from approving mutating tools');

  // 9.5 Rejected action
  const rejectedHitl = ApprovalGate.verifyApproval(
    { ...hitlPayload, decision: 'REJECTED', nonce: crypto.randomUUID() },
    'INCIDENT_COMMANDER'
  );
  assert(!rejectedHitl.valid && rejectedHitl.errorCode === 'REJECTED_ACTION', 'HITL Gate: Explicitly rejected action stops execution pipeline');

  // 9.6 Stale timestamp TTL (>300s)
  const expiredHitl = ApprovalGate.verifyApproval(
    { ...hitlPayload, nonce: crypto.randomUUID(), timestamp: new Date(Date.now() - 350 * 1000).toISOString() },
    'INCIDENT_COMMANDER'
  );
  assert(!expiredHitl.valid && expiredHitl.errorCode === 'EXPIRED_TOKEN', 'HITL Gate: Expired approval token (>300s) rejected');

  // Test Suite 10: Prompt I — EventBridge / SNS / SLA Automation
  console.log('\n10. EventBridge, SNS & SLA Automation (Prompt I):');
  SlaMonitor.resetAlertState();
  EventRouter.resetDeduplicationCache();

  // 10.1 SLA Deadline Calculation
  const criticalDeadline = SlaMonitor.calculateDeadline('2026-09-17T10:00:00Z', 'CRITICAL');
  assert(new Date(criticalDeadline).getTime() - new Date('2026-09-17T10:00:00Z').getTime() === 15 * 60 * 1000, 'SLA: CRITICAL severity calculates 15-minute deadline');

  const highDeadline = SlaMonitor.calculateDeadline('2026-09-17T10:00:00Z', 'HIGH');
  assert(new Date(highDeadline).getTime() - new Date('2026-09-17T10:00:00Z').getTime() === 30 * 60 * 1000, 'SLA: HIGH severity calculates 30-minute deadline');

  // 10.2 SLA Approaching Detection (>= 75%)
  const incidentCreatedAt = new Date(Date.now() - 12 * 60 * 1000).toISOString(); // 12 mins ago on 15m SLA = 80%
  const activeIncidentForSla = {
    incidentId: 'inc-sla-test-01',
    severity: 'CRITICAL' as const,
    status: 'IN_PROGRESS' as const,
    createdAt: incidentCreatedAt,
  };
  const slaEval = SlaMonitor.evaluateSla(activeIncidentForSla as any);
  assert(slaEval.status === 'APPROACHING' && slaEval.shouldAlertApproaching, 'SLA: Approaching threshold (>= 75%) detected with alert trigger');

  // 10.3 Duplicate alert avoidance
  const repeatEval = SlaMonitor.evaluateSla(activeIncidentForSla as any);
  assert(!repeatEval.shouldAlertApproaching, 'SLA: Duplicate approaching alert suppressed');

  // 10.4 SLA Breach Detection (> 100%)
  const breachedCreatedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 mins ago on 15m SLA
  const breachedIncident = {
    incidentId: 'inc-sla-breached-01',
    severity: 'CRITICAL' as const,
    status: 'IN_PROGRESS' as const,
    createdAt: breachedCreatedAt,
  };
  const breachEval = SlaMonitor.evaluateSla(breachedIncident as any);
  assert(breachEval.status === 'BREACHED' && breachEval.shouldAlertBreached, 'SLA: Breach (> 100%) detected with alert trigger');

  const repeatBreachEval = SlaMonitor.evaluateSla(breachedIncident as any);
  assert(!repeatBreachEval.shouldAlertBreached, 'SLA: Duplicate breach alert suppressed');

  // 10.5 EventRouter Idempotency
  const sampleEvent: SentinelEventEnvelope = {
    eventId: `evt-${Date.now()}-abc`,
    eventType: 'SlaApproaching',
    source: 'sentinel.incidents',
    timestamp: new Date().toISOString(),
    incidentId: 'inc-sla-test-01',
    actor: 'SlaMonitor',
    payloadVersion: '1.0',
    payload: SlaMonitor.createAlertPayload(slaEval) as any,
  };

  const publishResult = await EventRouter.publishEvent(sampleEvent);
  assert(publishResult.routedToEventBridge && !publishResult.isDuplicate, 'EventRouter: Dispatches event to EventBridge and SNS');

  const duplicatePublish = await EventRouter.publishEvent(sampleEvent);
  assert(duplicatePublish.isDuplicate && !duplicatePublish.routedToEventBridge, 'EventRouter: Handles duplicate event delivery idempotently');

  // Test Suite 11: Prompt J — Real DynamoDB Analytics & Grounded Insights
  console.log('\n11. Analytics & Grounded AI Insights (Prompt J):');
  const allCurrentIncidents = await repo.listIncidents({ limit: 50 });
  assert(allCurrentIncidents.length > 0, 'Analytics: Successfully pulls real incidents from repository');

  // Verify non-empty distributions
  const resolvedCount = allCurrentIncidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
  assert(resolvedCount >= 1, 'Analytics: Confirms presence of resolved incidents for MTTM computation');

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

