import { NextRequest, NextResponse } from 'next/server';
import { getIncidentRepository } from '@/backend/repositories';
import { logger } from '@/lib/logging/logger';

export async function POST(req: NextRequest) {
  try {
    const repo = getIncidentRepository();
    if (repo.resetDemo) {
      await repo.resetDemo();
    }

    logger.info('Demo environment reset triggered', {
      isSandbox: repo.isSandbox(),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Sentinel demo environment reset to pristine baseline.',
        isSandbox: repo.isSandbox(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Demo reset failed';
    logger.error('Failed to reset demo environment', { error: message });
    return NextResponse.json(
      { success: false, error: { code: 'DEMO_RESET_ERROR', message } },
      { status: 500 }
    );
  }
}
