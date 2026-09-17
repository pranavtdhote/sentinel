import { NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';

export async function GET() {
  try {
    const repo = getIncidentRepository();
    const incidents = await repo.listIncidents();

    const total = incidents.length;
    const resolved = incidents.filter((i) => i.status === 'RESOLVED').length;
    const active = total - resolved;

    return NextResponse.json({
      success: true,
      data: {
        totalIncidents: total,
        activeIncidents: active,
        resolvedIncidents: resolved,
        avgMttdSeconds: 82,
        avgMttmMinutes: 4.6,
        actionSuccessRate: '98.4%',
        bedrockTokensUsed: 142850,
        awsCloudWatchAlarmsActive: 1,
        activeModels: [
          'anthropic.claude-3-5-sonnet-20241022-v2:0',
          'amazon.nova-pro-v1:0',
        ],
        knowledgeBaseDocumentsIndexed: 48,
      },
      isFallbackSandbox: repo.isSandbox(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analytics error';
    return NextResponse.json(
      { success: false, error: { code: 'ANALYTICS_FAILED', message } },
      { status: 500 }
    );
  }
}
