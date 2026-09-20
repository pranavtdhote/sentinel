import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    // Safe audit logging
    console.log(JSON.stringify({
      event: 'AUTH_LOGOUT',
      timestamp: new Date().toISOString(),
      hasToken: Boolean(authHeader),
    }));

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: err?.message || 'Failed to logout.',
        },
      },
      { status: 500 }
    );
  }
}
