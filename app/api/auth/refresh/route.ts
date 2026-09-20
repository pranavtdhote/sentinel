import { NextRequest, NextResponse } from 'next/server';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@/lib/aws/awsClients';

export const dynamic = 'force-dynamic';

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '15qk2aht7ivv8d4s676s18ieu0';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required.',
          },
        },
        { status: 400 }
      );
    }

    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult || !response.AuthenticationResult.IdToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REFRESH_FAILED',
            message: 'Unable to refresh session.',
          },
        },
        { status: 401 }
      );
    }

    const { IdToken, AccessToken, ExpiresIn } = response.AuthenticationResult;

    return NextResponse.json({
      success: true,
      data: {
        idToken: IdToken,
        accessToken: AccessToken,
        expiresIn: ExpiresIn || 3600,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: err?.message || 'Session refresh failed.',
        },
      },
      { status: 401 }
    );
  }
}
