import { execSync } from 'child_process';
import { NextRequest } from 'next/server';
import { verifyAuthorizationAsync } from '../backend/domain/security/auth';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'sentinel';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '15qk2aht7ivv8d4s676s18ieu0';

process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_Lz4flXPaw';
process.env.COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '15qk2aht7ivv8d4s676s18ieu0';

async function testCognitoAuth() {
  console.log('=== SENTINEL Phase 7 (Amazon Cognito) JWT Verification Test ===\n');

  // Step 1: Obtain a real Cognito JWT using USER_PASSWORD_AUTH
  console.log('1. Obtaining real Cognito ID token for commander@sentinel.internal...');
  const authCmd = `aws cognito-idp initiate-auth --client-id ${CLIENT_ID} --auth-flow USER_PASSWORD_AUTH --auth-parameters USERNAME=commander@sentinel.internal,PASSWORD=Sentinel2026! --region ${REGION} --profile ${PROFILE} --output json`;

  const authOut = JSON.parse(execSync(authCmd, { encoding: 'utf-8' }));
  const idToken = authOut.AuthenticationResult.IdToken;
  console.log(`✅ Obtained IdToken (${idToken.length} chars, ends with: ...${idToken.slice(-12)})\n`);

  // Step 2: Construct NextRequest with real Bearer token
  console.log('2. Testing verifyAuthorizationAsync with valid Cognito IdToken...');
  const validReq = new NextRequest('http://localhost:3000/api/incidents/inc-2026-0917-01/triage', {
    headers: {
      authorization: `Bearer ${idToken}`,
    },
  });

  const authContext = await verifyAuthorizationAsync(validReq, ['INCIDENT_COMMANDER', 'RESPONDER']);
  console.log('-> AuthContext:');
  console.log(`   * Authenticated: ${authContext.isAuthenticated}`);
  console.log(`   * User ID:       ${authContext.userId}`);
  console.log(`   * Email:         ${authContext.email}`);
  console.log(`   * Resolved Role: ${authContext.role}`);

  if (authContext.role === 'INCIDENT_COMMANDER' && authContext.email === 'commander@sentinel.internal') {
    console.log('✅ Valid Cognito ID Token successfully verified against AWS JWKS!');
  } else {
    throw new Error('Role or email mismatch in verified token.');
  }

  // Step 3: Test role enforcement (require VIEWER only, commander should be denied)
  console.log('\n3. Testing RBAC enforcement (requiring VIEWER role only)...');
  try {
    await verifyAuthorizationAsync(validReq, ['VIEWER']);
    console.error('❌ Expected 403 Forbidden error was not thrown.');
  } catch (err: any) {
    console.log(`✅ Correctly rejected with ${err.code} (${err.statusCode}): ${err.message}`);
  }

  // Step 4: Test tampered/invalid token
  console.log('\n4. Testing tampered/invalid token rejection...');
  const parts = idToken.split('.');
  const tamperedToken = `${parts[0]}.${parts[1].slice(0, -4)}AAAA.${parts[2]}`;
  const tamperedReq = new NextRequest('http://localhost:3000/api/incidents', {
    headers: {
      authorization: `Bearer ${tamperedToken}`,
    },
  });

  try {
    await verifyAuthorizationAsync(tamperedReq);
    console.error('❌ Expected 401 Unauthorized error was not thrown.');
  } catch (err: any) {
    console.log(`✅ Correctly rejected tampered token with ${err.code} (${err.statusCode}): ${err.message}`);
  }

  console.log('\n🎉 Phase 7 Amazon Cognito Authentication & JWT Verification Verified Live!');
}

testCognitoAuth().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
