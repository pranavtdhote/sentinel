import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { ApprovalGate } from '@/backend/domain/security/approvalGate';
import { ToolRunner } from '@/backend/tools/toolRunner';
import { validateStateTransition, InvalidStateTransitionError } from '@/backend/domain/stateMachine';
import { verifyAuthorizationAsync, AuthError } from '@/backend/domain/security/auth';
import { UserRole } from '@/lib/types/database';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Require authorization (INCIDENT_COMMANDER or ADMIN required to approve actions)
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

    const repo = getIncidentRepository();

    // 2. Verify resource existence
    const incident = await repo.getIncident(id);
    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Incident ${id} not found` } },
        { status: 404 }
      );
    }

    // 3. State transition validation: can transition to IN_PROGRESS?
    validateStateTransition(incident.status, 'IN_PROGRESS');

    const body = await req.json().catch(() => ({}));

    // Optional cryptographic HITL token verification if action plan approval payload provided
    let executionResult: { status: string; output?: unknown; awsRequestId?: string } = {
      status: 'SUCCESS',
      output: { message: 'Incident approved and advanced to IN_PROGRESS' },
    };

    if (body.actionId && body.nonce && body.signature) {
      const gateCheck = ApprovalGate.verifyApproval(body, authContext?.role as UserRole);
      if (!gateCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: gateCheck.errorCode || 'UNAUTHORIZED_APPROVAL',
              message: gateCheck.errorMessage || 'Approval token check failed',
            },
          },
          { status: 403 }
        );
      }

      if (body.decision === 'REJECTED') {
        if (body.planId) {
          await repo.updateActionStatus(id, body.planId, body.actionId, 'FAILED', 'Rejected by Commander');
        }
        await repo.addAuditLog({
          auditId: `aud-reject-${Date.now()}`,
          incidentId: id,
          eventType: 'ACTION_REJECTED',
          actor: { email: authContext?.email || body.approverEmail, role: authContext?.role || 'INCIDENT_COMMANDER' },
          actionId: body.actionId,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, message: 'Action rejected by commander' });
      }

      // Execute mutating remediation tool in isolated runner
      const toolRunner = new ToolRunner();
      executionResult = await toolRunner.executeTool('rollback_ecs_task_definition', {
        cluster: 'prod-services',
        service: incident.service,
        targetTaskDefinition: `${incident.service}:48`,
      });

      if (body.planId) {
        await repo.updateActionStatus(
          id,
          body.planId,
          body.actionId,
          'SUCCESS',
          `Executed with AWS Request ID ${executionResult.awsRequestId}`
        );
      }
    }

    // 4. Update incident status to IN_PROGRESS with optimistic locking
    const updatedIncident = await repo.updateIncidentStatus(id, 'IN_PROGRESS', incident.version);

    const now = new Date().toISOString();

    // 5. Append timeline event
    await repo.addTimelineEvent({
      incidentId: id,
      eventId: `ev-appr-${Date.now()}`,
      title: 'Incident Approved & Advanced to IN_PROGRESS',
      description: `Approved by ${authContext?.email || incident.commander}. Remediation in progress.`,
      actor: authContext?.email || incident.commander,
      category: 'REMEDIATION',
      timestamp: now,
    });

    // 6. Record AuditEvent
    await repo.addAuditLog({
      auditId: `aud-appr-${Date.now()}`,
      incidentId: id,
      eventType: 'ACTION_APPROVED_AND_EXECUTED',
      actor: { email: authContext?.email || incident.commander, role: authContext?.role || 'INCIDENT_COMMANDER' },
      actionId: body.actionId,
      executionOutput: executionResult,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        incident: updatedIncident,
        executionResult,
      },
      isFallbackSandbox: repo.isSandbox(),
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

    const message = err instanceof Error ? err.message : 'Approval failed';
    return NextResponse.json(
      { success: false, error: { code: 'APPROVAL_FAILED', message } },
      { status: 500 }
    );
  }
}
