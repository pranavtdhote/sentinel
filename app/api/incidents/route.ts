import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { CreateIncidentRequestSchema } from '@/lib/types/api';
import { IncidentSeverity, IncidentStatus } from '@/lib/types/database';
import { verifyAuthorization, AuthError } from '@/backend/domain/security/auth';

export async function GET(req: NextRequest) {
  try {
    // Validate authorization if header provided
    try {
      if (req.headers.get('authorization') || req.headers.get('x-sentinel-actor-role')) {
        verifyAuthorization(req);
      }
    } catch (authErr: unknown) {
      if (authErr instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: { code: authErr.code, message: authErr.message } },
          { status: authErr.statusCode }
        );
      }
    }

    const repo = getIncidentRepository();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as IncidentStatus | null;
    const severity = searchParams.get('severity') as IncidentSeverity | null;

    const items = await repo.listIncidents({
      status: status || undefined,
      severity: severity || undefined,
    });

    return NextResponse.json({
      success: true,
      data: { items },
      isFallbackSandbox: repo.isSandbox(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'LIST_FAILED', message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const repo = getIncidentRepository();
    const body = await req.json();
    const validated = CreateIncidentRequestSchema.parse(body);

    const incidentId = `inc-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const incident = await repo.createIncident({
      incidentId,
      title: validated.title,
      service: validated.service,
      environment: validated.environment,
      severity: validated.severity as IncidentSeverity,
      status: 'NEW',
      commander: validated.commander,
      summary: validated.summary,
      category: validated.category || 'Database / Storage',
      location: validated.location || 'us-east-1',
      affectedUsers: validated.affectedUsers ?? null,
      confidenceScore: 0.88,
      mttdSeconds: 74,
    });

    // Append initial timeline event
    await repo.addTimelineEvent({
      incidentId,
      eventId: `ev-${Date.now()}`,
      title: 'Incident Ingested & Captured',
      description: `Inbound alert received for service ${validated.service}. Severity set as ${validated.severity}.`,
      actor: authContext?.email || 'Sentinel Ingestion Gateway',
      category: 'ALERT',
      timestamp: now,
    });

    // Append audit log
    await repo.addAuditLog({
      auditId: `aud-${Date.now()}`,
      incidentId,
      eventType: 'INCIDENT_CREATED',
      actor: {
        email: authContext?.email || validated.commander,
        role: authContext?.role || 'RESPONDER',
      },
      timestamp: now,
    });

    return NextResponse.json(
      {
        success: true,
        data: incident,
        isFallbackSandbox: repo.isSandbox(),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Validation or creation failed';
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message } },
      { status: 400 }
    );
  }
}
