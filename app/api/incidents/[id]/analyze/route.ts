import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { IncidentAnalyzer } from '@/backend/ai/incidentAnalyzer';
import { AnalyzeIncidentRequestSchema } from '@/lib/types/api';
import { validateStateTransition, InvalidStateTransitionError } from '@/backend/domain/stateMachine';
import { verifyAuthorizationAsync, AuthError } from '@/backend/domain/security/auth';
import { AIServiceError } from '@/backend/ai/aiServiceError';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const repo = getIncidentRepository();

    // 1. Verify resource existence
    const incident = await repo.getIncident(id);
    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Incident ${id} not found` } },
        { status: 404 }
      );
    }

    // 2. Validate state transition: can incident transition to ANALYZING?
    validateStateTransition(incident.status, 'ANALYZING');

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const validated = AnalyzeIncidentRequestSchema.parse(body);

    // 3. Temporarily set status to ANALYZING
    const analyzingIncident = await repo.updateIncidentStatus(id, 'ANALYZING', incident.version);

    // 4. Run Amazon Bedrock Structured Incident Analyzer
    const analyzer = new IncidentAnalyzer();
    const result = await analyzer.analyze({
      title: incident.title,
      description: validated.telemetrySnippet
        ? `${incident.summary}\n\nAdditional Telemetry:\n${validated.telemetrySnippet}`
        : incident.summary,
      location: incident.location || 'us-east-1',
      categoryHint: validated.categoryHint || incident.category,
      affectedUsersHint: validated.affectedUsersHint ?? (incident.affectedUsers || undefined),
    });

    const { analysis, modelId, promptVersion, isFallback } = result;

    // 5. Formulate Action Plan from recommended actions
    const planId = `plan-${Date.now().toString().slice(-6)}`;
    const actionPlan = await repo.saveActionPlan({
      planId,
      incidentId: id,
      generatedByModel: modelId,
      status: 'PENDING_APPROVAL',
      summary: analysis.reasoningSummary,
      blastRadiusRisk: analysis.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      blastRadiusDetail: `Target service: ${incident.service}`,
      estimatedMitigationTime: `${analysis.slaMinutes}m`,
      actions: analysis.recommendedActions.map((rec, idx) => ({
        actionId: `act-${planId}-${idx + 1}`,
        order: idx + 1,
        description: rec.action,
        toolName: rec.action.includes('rollback') ? 'rollback_ecs_task_definition' : 'verify_cloudwatch_alarm_state',
        parameters: { target: incident.service },
        requiresApproval: rec.requiresApproval,
        status: 'PENDING_APPROVAL',
      })),
    });

    // 6. Transition state from ANALYZING to ACTION_REQUIRED with updated analysis metadata
    const updatedIncident = await repo.patchIncident(
      id,
      {
        status: 'ACTION_REQUIRED',
        severity: analysis.severity,
        category: analysis.category,
        confidenceScore: analysis.confidence,
        affectedUsers: analysis.affectedUsers,
        rootCauseHypothesis: analysis.rootCauseHypotheses[0]?.hypothesis,
      },
      analyzingIncident.version
    );

    const now = new Date().toISOString();

    // 7. Add timeline event
    await repo.addTimelineEvent({
      incidentId: id,
      eventId: `ev-ai-analysis-${Date.now()}`,
      title: 'Bedrock Incident Intelligence Analysis Complete',
      description: `Model ${modelId} (${promptVersion}) evaluated incident. Root Cause Hypothesis: ${analysis.rootCauseHypotheses[0]?.hypothesis}. ${analysis.recommendedActions.length} recommended action(s) generated.`,
      actor: `Amazon Bedrock (${modelId})`,
      category: 'INVESTIGATION',
      timestamp: now,
    });

    // 8. Record immutable AuditEvent
    await repo.addAuditLog({
      auditId: `aud-ai-${Date.now()}`,
      incidentId: id,
      eventType: 'ANALYSIS_COMPLETED',
      actor: {
        email: authContext?.email || 'bedrock@sentinel.internal',
        role: authContext?.role || 'RESPONDER',
      },
      executionOutput: {
        modelId,
        promptVersion,
        isFallback,
        severity: analysis.severity,
        confidence: analysis.confidence,
        hypothesesCount: analysis.rootCauseHypotheses.length,
        actionsCount: analysis.recommendedActions.length,
        planId,
      },
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        incident: updatedIncident,
        analysis,
        actionPlan,
        modelId,
        promptVersion,
        isFallback,
      },
      isFallbackSandbox: isFallback || repo.isSandbox(),
    });
  } catch (err: unknown) {
    if (err instanceof InvalidStateTransitionError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATE_TRANSITION',
            message: err.message,
            currentStatus: err.currentStatus,
            attemptedStatus: err.attemptedStatus,
          },
        },
        { status: 400 }
      );
    }

    if (err instanceof AIServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
            modelId: err.modelId,
            promptVersion: err.promptVersion,
          },
        },
        { status: 502 }
      );
    }

    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json(
      { success: false, error: { code: 'ANALYSIS_FAILED', message } },
      { status: 500 }
    );
  }
}
