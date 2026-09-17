import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { PatchIncidentRequestSchema } from '@/lib/types/api';
import { validateStateTransition, InvalidStateTransitionError } from '@/backend/domain/stateMachine';
import { verifyAuthorization, AuthError } from '@/backend/domain/security/auth';
import { IncidentRecord } from '@/lib/types/database';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (req.headers.get('authorization') || req.headers.get('x-sentinel-actor-role')) {
      try {
        verifyAuthorization(req);
      } catch (authErr: unknown) {
        if (authErr instanceof AuthError) {
          return NextResponse.json(
            { success: false, error: { code: authErr.code, message: authErr.message } },
            { status: authErr.statusCode }
          );
        }
      }
    }

    const { id } = await params;
    const repo = getIncidentRepository();
    const bundle = await repo.getFullIncidentBundle(id);

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Incident ${id} not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bundle,
      isFallbackSandbox: repo.isSandbox(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let authContext;
    try {
      authContext = verifyAuthorization(req);
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
    const current = await repo.getIncident(id);
    if (!current) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Incident ${id} not found` } },
        { status: 404 }
      );
    }

    // 2. Validate input schema
    const body = await req.json().catch(() => ({}));
    const validated = PatchIncidentRequestSchema.parse(body);

    // 3. Validate state transition if status is changing
    if (validated.status && validated.status !== current.status) {
      validateStateTransition(current.status, validated.status);
    }

    // 4. Perform conditional update with optimistic concurrency
    let updated: IncidentRecord;
    try {
      const { expectedVersion, ...fieldUpdates } = validated;
      updated = await repo.patchIncident(id, fieldUpdates as Partial<IncidentRecord>, expectedVersion);
    } catch (updateErr: unknown) {
      const message = updateErr instanceof Error ? updateErr.message : 'Update failed';
      if (message.includes('OptimisticLock') || message.includes('Stale version')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'STALE_VERSION_CONFLICT',
              message: `Conflict: Incident was modified by another operation. Expected version ${validated.expectedVersion}, current version is ${current.version}.`,
            },
          },
          { status: 409 }
        );
      }
      throw updateErr;
    }

    const now = new Date().toISOString();

    // 5. Append timeline event on status transition
    if (validated.status && validated.status !== current.status) {
      await repo.addTimelineEvent({
        incidentId: id,
        eventId: `ev-trans-${Date.now()}`,
        title: `Incident State Transitioned: ${current.status} → ${validated.status}`,
        description: `Lifecycle status updated by ${authContext?.email || 'operator'}.`,
        actor: authContext?.email || current.commander,
        category: 'INVESTIGATION',
        timestamp: now,
      });
    }

    // 6. Record AuditEvent for every meaningful mutation
    await repo.addAuditLog({
      auditId: `aud-patch-${Date.now()}`,
      incidentId: id,
      eventType: validated.status ? 'STATUS_TRANSITION' : 'INCIDENT_UPDATED',
      actor: {
        email: authContext?.email || current.commander,
        role: authContext?.role || 'RESPONDER',
      },
      executionOutput: {
        previousStatus: current.status,
        newStatus: updated.status,
        previousVersion: current.version,
        newVersion: updated.version,
        modifiedFields: Object.keys(validated).filter((k) => k !== 'expectedVersion'),
      },
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      data: updated,
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
            allowedTransitions: err.allowedTransitions,
          },
        },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message } },
      { status: 400 }
    );
  }
}
