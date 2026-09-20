import assert from 'assert';
import { NextRequest } from 'next/server';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '../lib/aws/awsClients';
import { verifyAuthorizationAsync, AuthError } from '../backend/domain/security/auth';

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '15qk2aht7ivv8d4s676s18ieu0';
const PASSWORD = 'Sentinel2026!';

async function authenticateCognito(email: string): Promise<string> {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: PASSWORD,
    },
  });
  const res = await cognitoClient.send(command);
  if (!res.AuthenticationResult?.IdToken) {
    throw new Error(`Failed to authenticate ${email}`);
  }
  return res.AuthenticationResult.IdToken;
}

async function runSecurityTests() {
  console.log('============================================================');
  console.log('SENTINEL — Amazon Cognito Authentication & Security Tests');
  console.log('============================================================\n');

  // Test 1: Missing Token Rejection
  console.log('Test 1: Missing Authorization Header...');
  let missingAuthRejected = false;
  try {
    const unauthReq = new NextRequest('http://localhost:3000/api/incidents');
    await verifyAuthorizationAsync(unauthReq);
  } catch (err: any) {
    missingAuthRejected = err instanceof AuthError && err.code === 'UNAUTHORIZED' && err.statusCode === 401;
  }
  assert(missingAuthRejected, 'FAIL: Missing authorization header was not rejected with 401 UNAUTHORIZED');
  console.log('  ✓ PASS: Missing token rejected with HTTP 401 Unauthorized');

  // Test 2: Tampered JWT Signature Rejection
  console.log('\nTest 2: Tampered JWT Signature...');
  let tamperedRejected = false;
  try {
    const fakeToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODEyMzQiLCJlbWFpbCI6ImFkbWluQHNlbnRpbmVsLmFpIiwiY29nbml0bzpncm91cHMiOlsiQWRtaW5zIl0sImV4cCI6OTk5OTk5OTk5OX0.TAMPERED_INVALID_SIGNATURE_SEGMENT';
    const tamperedReq = new NextRequest('http://localhost:3000/api/incidents', {
      headers: { authorization: `Bearer ${fakeToken}` },
    });
    await verifyAuthorizationAsync(tamperedReq);
  } catch (err: any) {
    tamperedRejected = err instanceof AuthError && err.code === 'UNAUTHORIZED' && err.statusCode === 401;
  }
  assert(tamperedRejected, 'FAIL: Tampered JWT was not rejected with 401 UNAUTHORIZED');
  console.log('  ✓ PASS: Tampered JWT signature rejected with HTTP 401 Unauthorized');

  // Test 3: Authenticate Demo Incident Commander via Cognito
  console.log('\nTest 3: Live Cognito Authentication — Incident Commander (demo@sentinel.ai)...');
  const commanderToken = await authenticateCognito('demo@sentinel.ai');
  assert(commanderToken && commanderToken.split('.').length === 3, 'Commander ID token must be a 3-segment JWT');
  console.log('  ✓ PASS: Live Cognito authentication successful for demo@sentinel.ai');

  // Test 4: Cryptographic Verification of Commander JWT
  console.log('\nTest 4: Cryptographic Verification of Commander Token & Group Extraction...');
  const commanderReq = new NextRequest('http://localhost:3000/api/incidents', {
    headers: { authorization: `Bearer ${commanderToken}` },
  });
  const commanderContext = await verifyAuthorizationAsync(commanderReq, ['INCIDENT_COMMANDER', 'ADMIN']);
  assert(commanderContext.role === 'INCIDENT_COMMANDER', 'Role must be INCIDENT_COMMANDER');
  assert(commanderContext.email === 'demo@sentinel.ai', 'Email must match token claim');
  console.log(`  ✓ PASS: Verified token. Role: ${commanderContext.role}, Email: ${commanderContext.email}`);

  // Test 5: Authenticate Viewer via Cognito
  console.log('\nTest 5: Live Cognito Authentication — Viewer (viewer@sentinel.ai)...');
  const viewerToken = await authenticateCognito('viewer@sentinel.ai');
  const viewerReq = new NextRequest('http://localhost:3000/api/incidents', {
    headers: { authorization: `Bearer ${viewerToken}` },
  });
  const viewerContext = await verifyAuthorizationAsync(viewerReq);
  assert(viewerContext.role === 'VIEWER', 'Role must be VIEWER');
  console.log(`  ✓ PASS: Verified token. Role: ${viewerContext.role}, Email: ${viewerContext.email}`);

  // Test 6: RBAC Gate — Viewer Attempting Mutating Approval
  console.log('\nTest 6: Authorization Gate — Viewer Attempting HITL Approval...');
  let viewerApprovalBlocked = false;
  try {
    const viewerApproveReq = new NextRequest('http://localhost:3000/api/incidents/inc-test/approve', {
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    await verifyAuthorizationAsync(viewerApproveReq, ['INCIDENT_COMMANDER', 'ADMIN']);
  } catch (err: any) {
    viewerApprovalBlocked = err instanceof AuthError && err.code === 'FORBIDDEN' && err.statusCode === 403;
  }
  assert(viewerApprovalBlocked, 'FAIL: Viewer was not blocked from approval with 403 FORBIDDEN');
  console.log('  ✓ PASS: Viewer blocked from approval with HTTP 403 Forbidden');

  // Test 7: RBAC Gate — Viewer Attempting Knowledge Upload
  console.log('\nTest 7: Authorization Gate — Viewer Attempting Knowledge Upload...');
  let viewerUploadBlocked = false;
  try {
    const viewerUploadReq = new NextRequest('http://localhost:3000/api/knowledge', {
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    await verifyAuthorizationAsync(viewerUploadReq, ['INCIDENT_COMMANDER', 'ADMIN', 'RESPONDER']);
  } catch (err: any) {
    viewerUploadBlocked = err instanceof AuthError && err.code === 'FORBIDDEN' && err.statusCode === 403;
  }
  assert(viewerUploadBlocked, 'FAIL: Viewer was not blocked from knowledge upload with 403 FORBIDDEN');
  console.log('  ✓ PASS: Viewer blocked from knowledge upload with HTTP 403 Forbidden');

  // Test 8: Security Attack Test — Role Spoofing Header Injection
  console.log('\nTest 8: Attack Simulation — Spoofed x-sentinel-actor-role: ADMIN with Viewer JWT...');
  let spoofingBlocked = false;
  try {
    const spoofedReq = new NextRequest('http://localhost:3000/api/incidents/inc-test/approve', {
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'x-sentinel-actor-role': 'ADMIN',
        'x-sentinel-user-email': 'admin@sentinel.ai',
      },
    });
    // Attempting an action requiring ADMIN
    await verifyAuthorizationAsync(spoofedReq, ['ADMIN']);
  } catch (err: any) {
    spoofingBlocked = err instanceof AuthError && err.code === 'FORBIDDEN' && err.statusCode === 403;
  }
  assert(spoofingBlocked, 'FAIL: Spoofed x-sentinel-actor-role header bypassed authorization!');
  console.log('  ✓ PASS: Spoofed x-sentinel-actor-role header REJECTED! Verified Cognito claims prevail.');

  // Test 9: Authenticate Responder via Cognito
  console.log('\nTest 9: Live Cognito Authentication — Responder (responder@sentinel.ai)...');
  const responderToken = await authenticateCognito('responder@sentinel.ai');
  const responderReq = new NextRequest('http://localhost:3000/api/incidents', {
    headers: { authorization: `Bearer ${responderToken}` },
  });
  const responderContext = await verifyAuthorizationAsync(responderReq);
  assert(responderContext.role === 'RESPONDER', 'Role must be RESPONDER');
  console.log(`  ✓ PASS: Verified token. Role: ${responderContext.role}, Email: ${responderContext.email}`);

  // Test 10: RBAC Gate — Responder Blocked from Commander-Only Approval
  console.log('\nTest 10: Authorization Gate — Responder Attempting Commander Approval...');
  let responderBlocked = false;
  try {
    const responderApproveReq = new NextRequest('http://localhost:3000/api/incidents/inc-test/approve', {
      headers: { authorization: `Bearer ${responderToken}` },
    });
    await verifyAuthorizationAsync(responderApproveReq, ['INCIDENT_COMMANDER', 'ADMIN']);
  } catch (err: any) {
    responderBlocked = err instanceof AuthError && err.code === 'FORBIDDEN' && err.statusCode === 403;
  }
  assert(responderBlocked, 'FAIL: Responder was not blocked from commander-only approval with 403 FORBIDDEN');
  console.log('  ✓ PASS: Responder blocked from commander-only approval with HTTP 403 Forbidden');

  // Test 11: Authenticate Admin via Cognito
  console.log('\nTest 11: Live Cognito Authentication — Admin (admin@sentinel.ai)...');
  const adminToken = await authenticateCognito('admin@sentinel.ai');
  const adminReq = new NextRequest('http://localhost:3000/api/incidents', {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const adminContext = await verifyAuthorizationAsync(adminReq, ['ADMIN']);
  assert(adminContext.role === 'ADMIN', 'Role must be ADMIN');
  console.log(`  ✓ PASS: Verified token. Role: ${adminContext.role}, Email: ${adminContext.email}`);

  // Test 12: Commander Approved Action on Valid Request
  console.log('\nTest 12: Permitted Role — Commander Allowed to Approve...');
  const permittedCommanderReq = new NextRequest('http://localhost:3000/api/incidents/inc-test/approve', {
    headers: { authorization: `Bearer ${commanderToken}` },
  });
  const permittedContext = await verifyAuthorizationAsync(permittedCommanderReq, ['INCIDENT_COMMANDER', 'ADMIN']);
  assert(permittedContext.role === 'INCIDENT_COMMANDER', 'Commander must be permitted');
  console.log('  ✓ PASS: Incident Commander verified and allowed through HITL approval gate');

  console.log('\n============================================================');
  console.log('🎉 ALL 12 COGNITO AUTHENTICATION & ATTACK TESTS PASSED!');
  console.log('============================================================');
}

runSecurityTests().catch((err) => {
  console.error('Test failed with unhandled error:', err);
  process.exit(1);
});
