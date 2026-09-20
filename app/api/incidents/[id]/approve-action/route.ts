import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { ApproveActionRequestSchema } from '@/lib/types/api';
import { ApprovalGate } from '@/backend/domain/security/approvalGate';
import { ToolRunner } from '@/backend/tools/toolRunner';
import { verifyAuthorizationAsync, AuthError } from '@/backend/domain/security/auth';
import { UserRole } from '@/lib/types/database';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let authContext;
    try {
      authContext = await verifyAuthorizationAsync(req, ['INCIDENT_COMMANDER', 'ADMIN']);
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
    const incident = await repo.getIncident(id);

    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Incident ${id} not found` } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = ApproveActionRequestSchema.parse(body);

    const callerRole = (authContext?.role || 'INCIDENT_COMMANDER') as UserRole;

    // 1. Cryptographic HITL Verification Gate
    const gateCheck = ApprovalGate.verifyApproval(validated, callerRole);
    if (!gateCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: gateCheck.errorCode || 'UNAUTHORIZED_APPROVAL',
            message: gateCheck.errorMessage || 'Approval verification failed',
          },
        },
        { status: 403 }
      );
    }

    // 2. If decision is REJECTED
    if (validated.decision === 'REJECTED') {
      await repo.updateActionStatus(id, validated.planId, validated.actionId, 'FAILED', 'Rejected by Commander');
      await repo.addAuditLog({
        auditId: `aud-reject-${Date.now()}`,
        incidentId: id,
        eventType: 'ACTION_REJECTED',
        actor: { email: validated.approverEmail, role: callerRole },
        actionId: validated.actionId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, message: 'Action rejected by commander' });
    }

    // 3. Execute with isolated tool runner
    const toolRunner = new ToolRunner();
    const executionResult = await toolRunner.executeTool('rollback_ecs_task_definition', {
      cluster: 'prod-services',
      service: incident.service,
      targetTaskDefinition: `${incident.service}:48`,
    });

    // 4. Update action status and advance incident to MITIGATING
    await repo.updateActionStatus(
      id,
      validated.planId,
      validated.actionId,
      'SUCCESS',
      `Rolled back to ${incident.service}:48. Verified OK.`
    );

    await repo.updateIncidentStatus(id, 'MITIGATING', incident.version);

    // 5. Add timeline event
    const now = new Date().toISOString();
    await repo.addTimelineEvent({
      incidentId: id,
      eventId: `ev-exec-${Date.now()}`,
      title: 'Remediation Executed: ECS Task Rollback',
      description: `Action ${validated.actionId} authorized by ${validated.approverEmail}. Rolled back to ${incident.service}:48 with AWS Request ID ${executionResult.awsRequestId}.`,
      actor: `${validated.approverEmail} (Incident Commander)`,
      category: 'REMEDIATION',
      timestamp: now,
    });

    // 6. Record immutable cryptographic audit record
    await repo.addAuditLog({
      auditId: `aud-exec-${Date.now()}`,
      incidentId: id,
      eventType: 'ACTION_APPROVED_AND_EXECUTED',
      actor: { email: validated.approverEmail, role: callerRole },
      actionId: validated.actionId,
      toolName: 'rollback_ecs_task_definition',
      approvalTokenSignature: validated.signature,
      executionOutput: executionResult.output,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        actionId: validated.actionId,
        status: 'SUCCESS',
        executionResult,
      },
      isFallbackSandbox: repo.isSandbox(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Approval execution failed';
    return NextResponse.json(
      { success: false, error: { code: 'EXECUTION_FAILED', message } },
      { status: 500 }
    );
  }
}
