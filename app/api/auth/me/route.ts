import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthorizationAsync, AuthError } from '@/backend/domain/security/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await verifyAuthorizationAsync(req);

    return NextResponse.json({
      success: true,
      data: {
        userId: authContext.userId,
        email: authContext.email,
        role: authContext.role,
        isAuthenticated: true,
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing authentication session.',
        },
      },
      { status: 401 }
    );
  }
}
