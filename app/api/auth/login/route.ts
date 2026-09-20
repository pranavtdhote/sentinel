import { NextRequest, NextResponse } from 'next/server';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@/lib/aws/awsClients';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { mapGroupsToRole } from '@/backend/domain/security/auth';

export const dynamic = 'force-dynamic';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_Lz4flXPaw';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '15qk2aht7ivv8d4s676s18ieu0';

let verifier: any = null;
function getVerifier() {
  if (!verifier && USER_POOL_ID && CLIENT_ID) {
    try {
      verifier = CognitoJwtVerifier.create({
        userPoolId: USER_POOL_ID,
        tokenUse: 'id',
        clientId: CLIENT_ID,
      });
    } catch (e) {
      console.warn('Could not initialize Cognito verifier in login route:', e);
    }
  }
  return verifier;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email and password are required.',
          },
        },
        { status: 400 }
      );
    }

    // 1. Authenticate with Amazon Cognito
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email.trim().toLowerCase(),
        PASSWORD: password,
      },
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult || !response.AuthenticationResult.IdToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_CHALLENGE',
            message: 'Additional authentication challenge required or credentials rejected.',
          },
        },
        { status: 401 }
      );
    }

    const { IdToken, AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

    // 2. Verify and decode claims from the ID Token
    let groups: string[] = [];
    let sub = '';
    let userEmail = email;

    const v = getVerifier();
    if (v) {
      try {
        const payload = await v.verify(IdToken);
        groups = (payload['cognito:groups'] as string[]) || [];
        sub = payload.sub as string;
        userEmail = (payload.email as string) || email;
      } catch (verifyErr: any) {
        console.warn('ID token post-login verification notice:', verifyErr?.message);
      }
    }

    const role = mapGroupsToRole(groups);

    // Safe logging without tokens or credentials
    console.log(JSON.stringify({
      event: 'AUTH_LOGIN_SUCCESS',
      timestamp: new Date().toISOString(),
      user: userEmail,
      sub,
      role,
    }));

    return NextResponse.json({
      success: true,
      data: {
        idToken: IdToken,
        accessToken: AccessToken,
        refreshToken: RefreshToken,
        expiresIn: ExpiresIn || 3600,
        user: {
          sub,
          email: userEmail,
          role,
          groups,
        },
      },
    });
  } catch (err: any) {
    const name = err?.name || '';
    const message = err?.message || 'Authentication failed';

    // Safe error message mapping (no AWS stack traces exposed to caller)
    let userMessage = 'Invalid email or password.';
    let statusCode = 401;

    if (name === 'NotAuthorizedException') {
      userMessage = 'Incorrect username or password.';
    } else if (name === 'UserNotFoundException') {
      userMessage = 'User does not exist.';
    } else if (name === 'UserNotConfirmedException') {
      userMessage = 'User account is not confirmed.';
    } else if (name === 'PasswordResetRequiredException') {
      userMessage = 'Password reset required.';
    } else if (name === 'TooManyRequestsException') {
      userMessage = 'Too many requests. Please slow down and try again.';
      statusCode = 429;
    } else {
      console.error('Cognito login error:', name, message);
      userMessage = 'Authentication service temporarily unavailable. Please try again.';
      statusCode = 500;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: name || 'AUTH_ERROR',
          message: userMessage,
        },
      },
      { status: statusCode }
    );
  }
}
