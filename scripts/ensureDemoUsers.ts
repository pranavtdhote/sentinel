import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '../lib/aws/awsClients';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_Lz4flXPaw';
const DEFAULT_PASSWORD = 'Sentinel2026!';

const client = cognitoClient;

interface DemoUser {
  email: string;
  group: string;
}

const DEMO_USERS: DemoUser[] = [
  { email: 'demo@sentinel.ai', group: 'Commanders' },
  { email: 'commander@sentinel.internal', group: 'Commanders' },
  { email: 'admin@sentinel.ai', group: 'Admins' },
  { email: 'admin@sentinel.internal', group: 'Admins' },
  { email: 'responder@sentinel.ai', group: 'Responders' },
  { email: 'responder@sentinel.internal', group: 'Responders' },
  { email: 'viewer@sentinel.ai', group: 'Viewers' },
  { email: 'viewer@sentinel.internal', group: 'Viewers' },
];

async function ensureUsers() {
  console.log('Ensuring demo users in Cognito User Pool:', USER_POOL_ID);

  for (const u of DEMO_USERS) {
    try {
      await client.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: u.email,
          UserAttributes: [
            { Name: 'email', Value: u.email },
            { Name: 'email_verified', Value: 'true' },
          ],
          MessageAction: 'SUPPRESS',
        })
      );
      console.log(`Created user: ${u.email}`);
    } catch (err: any) {
      if (err.name === 'UsernameExistsException') {
        console.log(`User already exists: ${u.email}`);
      } else {
        console.warn(`Notice for ${u.email}:`, err.message);
      }
    }

    try {
      await client.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: u.email,
          Password: DEFAULT_PASSWORD,
          Permanent: true,
        })
      );
      console.log(`Password set for: ${u.email}`);
    } catch (err: any) {
      console.warn(`Password set error for ${u.email}:`, err.message);
    }

    try {
      await client.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: u.email,
          GroupName: u.group,
        })
      );
      console.log(`Assigned ${u.email} to group: ${u.group}`);
    } catch (err: any) {
      console.warn(`Group assign error for ${u.email}:`, err.message);
    }
  }

  console.log('\nAll demo users successfully configured in Amazon Cognito!');
}

ensureUsers().catch(console.error);
