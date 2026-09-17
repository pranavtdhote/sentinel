import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { BedrockOrchestrator } from '@/backend/ai/bedrockOrchestrator';
import { TriageIncidentRequestSchema } from '@/lib/types/api';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repo = getIncidentRepository();
    const incident = await repo.getIncident(id);

    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Incident ${id} not found` } },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = TriageIncidentRequestSchema.parse(body);

    const orchestrator = new BedrockOrchestrator();

    // 1. Retrieve grounded runbooks from Bedrock Knowledge Base
    const evidence = await orchestrator.retrieveRunbookEvidence(
      incident,
      validated.telemetrySnippet || incident.summary
    );
    await repo.saveEvidenceChunks(evidence);

    // 2. Triage with Bedrock Converse
    const triage = await orchestrator.triageIncident(
      incident,
      evidence,
      validated.telemetrySnippet
    );

    // 3. Update incident with hypothesis and advance status to INVESTIGATING
    incident.rootCauseHypothesis = triage.rootCauseHypothesis;
    incident.confidenceScore = triage.confidenceScore;
    const updated = await repo.updateIncidentStatus(id, 'INVESTIGATING', incident.version);

    // 4. Record timeline event
    const now = new Date().toISOString();
    await repo.addTimelineEvent({
      incidentId: id,
      eventId: `ev-triage-${Date.now()}`,
      title: 'Bedrock Autonomous Triage & Grounding Completed',
      description: `Amazon Bedrock formulated hypothesis with ${Math.round(triage.confidenceScore * 100)}% confidence grounded in ${evidence.length} runbook citations.`,
      actor: 'Amazon Bedrock (Claude 3.5 Sonnet)',
      category: 'TRIAGE',
      timestamp: now,
    });

    // 5. Append audit log
    await repo.addAuditLog({
      auditId: `aud-triage-${Date.now()}`,
      incidentId: id,
      eventType: 'TRIAGE_COMPLETED',
      actor: {
        email: 'bedrock.sentinel@aws.internal',
        role: 'RESPONDER',
      },
      executionOutput: {
        rootCauseHypothesis: triage.rootCauseHypothesis,
        confidenceScore: triage.confidenceScore,
        citedEvidence: triage.citedEvidenceIds,
      },
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        incident: updated,
        triage,
        evidence,
      },
      isFallbackSandbox: repo.isSandbox(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Triage failed';
    return NextResponse.json(
      { success: false, error: { code: 'TRIAGE_FAILED', message } },
      { status: 500 }
    );
  }
}
