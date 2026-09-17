import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { verifyAuthorization, AuthError } from '@/backend/domain/security/auth';

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

    // 1. Verify resource existence
    const incident = await repo.getIncident(id);
    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Incident ${id} not found` } },
        { status: 404 }
      );
    }

    // 2. Fetch timeline events and audit logs
    const events = await repo.getEvents(id);

    return NextResponse.json({
      success: true,
      data: {
        incidentId: id,
        timeline: events.timeline,
        auditLogs: events.auditLogs,
      },
      isFallbackSandbox: repo.isSandbox(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch incident events';
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_EVENTS_FAILED', message } },
      { status: 500 }
    );
  }
}
