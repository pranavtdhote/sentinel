import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'sentinel';
const POOL_NAME = 'sentinel-user-pool';
const CLIENT_NAME = 'sentinel-web-client';

function runAws(cmd: string): any {
  const fullCmd = `aws ${cmd} --region ${REGION} --profile ${PROFILE} --output json`;
  try {
    const stdout = execSync(fullCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return stdout.trim() ? JSON.parse(stdout) : {};
  } catch (err: any) {
    const msg = err.stderr || err.message || String(err);
    throw new Error(`AWS CLI execution failed: ${msg}`);
  }
}

async function setupCognitoAuth() {
  console.log(`\n==================================================`);
  console.log(`⚡ SENTINEL Phase 7: Amazon Cognito Auth Provisioning`);
  console.log(`Region:          ${REGION}`);
  console.log(`Profile:         ${PROFILE}`);
  console.log(`User Pool Name:  ${POOL_NAME}`);
  console.log(`App Client Name: ${CLIENT_NAME}`);
  console.log(`==================================================\n`);

  // Step 1: Check or Create User Pool
  console.log(`👥 Step 1: Checking for existing User Pool '${POOL_NAME}'...`);
  const listPools = runAws('cognito-idp list-user-pools --max-results 20');
  let userPoolId = '';

  for (const p of listPools.UserPools || []) {
    if (p.Name === POOL_NAME) {
      userPoolId = p.Id;
      console.log(`ℹ️ Found existing User Pool: ${userPoolId}`);
      break;
    }
  }

  if (!userPoolId) {
    console.log(`Creating User Pool '${POOL_NAME}' in ${REGION}...`);
    const createRes = runAws(
      `cognito-idp create-user-pool --pool-name "${POOL_NAME}" ` +
      `--username-attributes email ` +
      `--auto-verified-attributes email ` +
      `--policies "{\\"PasswordPolicy\\":{\\"MinimumLength\\":8,\\"RequireUppercase\\":true,\\"RequireLowercase\\":true,\\"RequireNumbers\\":true,\\"RequireSymbols\\":false}}"`
    );
    userPoolId = createRes.UserPool.Id;
    console.log(`✅ User Pool created: ${userPoolId}`);
  }

  // Step 2: Check or Create App Client (Public client, NO secret for browser/SPA)
  console.log(`\n💻 Step 2: Configuring App Client '${CLIENT_NAME}'...`);
  const listClients = runAws(`cognito-idp list-user-pool-clients --user-pool-id ${userPoolId} --max-results 20`);
  let clientId = '';

  for (const c of listClients.UserPoolClients || []) {
    if (c.ClientName === CLIENT_NAME) {
      clientId = c.ClientId;
      console.log(`ℹ️ Found existing App Client: ${clientId}`);
      break;
    }
  }

  if (!clientId) {
    console.log(`Creating App Client '${CLIENT_NAME}' (public, no client secret)...`);
    const createClientRes = runAws(
      `cognito-idp create-user-pool-client --user-pool-id ${userPoolId} ` +
      `--client-name "${CLIENT_NAME}" ` +
      `--no-generate-secret ` +
      `--explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH`
    );
    clientId = createClientRes.UserPoolClient.ClientId;
    console.log(`✅ App Client created: ${clientId}`);
  }

  // Step 3: Create RBAC User Groups
  console.log(`\n🛡️ Step 3: Configuring RBAC User Groups...`);
  const groups = [
    { name: 'Admins', precedence: 0, desc: 'Platform Administrators with complete access' },
    { name: 'Commanders', precedence: 1, desc: 'Incident Commanders with triage and mutation rights' },
    { name: 'Responders', precedence: 2, desc: 'SRE Responders with investigative and diagnostic access' },
    { name: 'Viewers', precedence: 3, desc: 'Auditors and observers with read-only dashboard access' },
  ];

  for (const g of groups) {
    try {
      runAws(
        `cognito-idp create-group --user-pool-id ${userPoolId} ` +
        `--group-name "${g.name}" ` +
        `--description "${g.desc}" ` +
        `--precedence ${g.precedence}`
      );
      console.log(`✅ Created group: ${g.name}`);
    } catch {
      console.log(`ℹ️ Group already exists: ${g.name}`);
    }
  }

  // Step 4: Create Seed Users
  console.log(`\n👤 Step 4: Provisioning Seed Users...`);
  const seedUsers = [
    {
      email: 'commander@sentinel.internal',
      group: 'Commanders',
      role: 'INCIDENT_COMMANDER',
    },
    {
      email: 'responder@sentinel.internal',
      group: 'Responders',
      role: 'RESPONDER',
    },
  ];

  for (const user of seedUsers) {
    try {
      runAws(
        `cognito-idp admin-create-user --user-pool-id ${userPoolId} ` +
        `--username "${user.email}" ` +
        `--user-attributes Name=email,Value="${user.email}" Name=email_verified,Value=true ` +
        `--message-action SUPPRESS`
      );
      console.log(`✅ Provisioned user: ${user.email}`);

      // Set permanent password for demo usage
      runAws(
        `cognito-idp admin-set-user-password --user-pool-id ${userPoolId} ` +
        `--username "${user.email}" ` +
        `--password "Sentinel2026!" ` +
        `--permanent`
      );
      console.log(`🔑 Configured credentials for: ${user.email}`);
    } catch {
      console.log(`ℹ️ User already exists: ${user.email}`);
    }

    // Add user to group
    try {
      runAws(
        `cognito-idp admin-add-user-to-group --user-pool-id ${userPoolId} ` +
        `--username "${user.email}" ` +
        `--group-name "${user.group}"`
      );
      console.log(`🏷️ Added ${user.email} to group '${user.group}'`);
    } catch {
      // already in group
    }
  }

  // Step 5: Update .env.local
  console.log(`\n📝 Step 5: Synchronizing .env.local with Cognito configuration...`);
  const issuer = `https://cognito-idp.${REGION}.amazonaws.com/${userPoolId}`;
  const envPath = path.resolve(process.cwd(), '.env.local');

  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');

    const updateOrAdd = (key: string, val: string) => {
      if (envContent.includes(`${key}=`)) {
        envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}\n`;
      }
    };

    updateOrAdd('COGNITO_USER_POOL_ID', userPoolId);
    updateOrAdd('COGNITO_CLIENT_ID', clientId);
    updateOrAdd('COGNITO_ISSUER', issuer);

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Synchronized:`);
    console.log(`   COGNITO_USER_POOL_ID=${userPoolId}`);
    console.log(`   COGNITO_CLIENT_ID=${clientId}`);
    console.log(`   COGNITO_ISSUER=${issuer}`);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Phase 7: Amazon Cognito Auth Setup Complete!`);
  console.log(`   User Pool ID: ${userPoolId}`);
  console.log(`   Client ID:    ${clientId}`);
  console.log(`   Issuer URL:   ${issuer}`);
  console.log(`==================================================\n`);
}

setupCognitoAuth().catch((err) => {
  console.error('\n❌ Cognito Setup Failed:', err);
  process.exit(1);
});
