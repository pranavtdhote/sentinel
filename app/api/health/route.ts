import { NextResponse } from 'next/server';
import { isAwsConfigured } from '@/lib/aws/awsClients';

export async function GET() {
  const awsActive = isAwsConfigured();
  return NextResponse.json({
    status: 'HEALTHY',
    service: 'SENTINEL',
    timestamp: new Date().toISOString(),
    aws: {
      isConfigured: awsActive,
      region: process.env.AWS_REGION || 'us-east-1',
      mode: awsActive ? 'LIVE_AWS_SERVICES' : 'DETERMINISTIC_SANDBOX_FALLBACK',
    },
  });
}
