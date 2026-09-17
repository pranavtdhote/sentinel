import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { BedrockOrchestrator } from '@/backend/ai/bedrockOrchestrator';

export async function POST(
  _req: NextRequest,
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

    const orchestrator = new BedrockOrchestrator();
    const planOutput = await orchestrator.generateActionPlan(incident, {
      rootCauseHypothesis: incident.rootCauseHypothesis || incident.summary,
      confidenceScore: incident.confidenceScore || 0.9,
      primaryImpact: incident.summary,
      citedEvidenceIds: ['ev-chunk-302'],
      recommendedStrategy: 'ROLLBACK_DEPLOYMENT',
      technicalSummary: 'Connection pool saturated.',
    });

    const planId = `plan-${Date.now().toString().slice(-4)}`;
    const savedPlan = await repo.saveActionPlan({
      incidentId: id,
      planId,
      generatedByModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      status: 'PENDING_APPROVAL',
      summary: planOutput.planSummary,
      blastRadiusRisk: planOutput.overallRisk,
      blastRadiusDetail: 'ECS task revision switch will initiate blue/green task drain; ~1.5s client reconnect.',
      estimatedMitigationTime: `${planOutput.estimatedRecoveryMinutes} minutes`,
      actions: planOutput.actions.map((a) => ({
        ...a,
        status: a.requiresApproval ? 'PENDING_APPROVAL' : 'QUEUED',
      })),
    });

    // Record timeline event
    await repo.addTimelineEvent({
      incidentId: id,
      eventId: `ev-plan-${Date.now()}`,
      title: 'Remediation Action Plan Formulated',
      description: `Bedrock synthesized ${planOutput.actions.length} remediation actions with ${planOutput.overallRisk} blast-radius assessment. Awaiting Incident Commander cryptographic sign-off.`,
      actor: 'Amazon Bedrock Planner',
      category: 'TRIAGE',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: savedPlan,
      isFallbackSandbox: repo.isSandbox(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Action plan generation failed';
    return NextResponse.json(
      { success: false, error: { code: 'PLAN_GENERATION_FAILED', message } },
      { status: 500 }
    );
  }
}
