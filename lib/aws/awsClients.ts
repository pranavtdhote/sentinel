import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';
import { BedrockAgentClient } from '@aws-sdk/client-bedrock-agent';
import { S3Client } from '@aws-sdk/client-s3';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SNSClient } from '@aws-sdk/client-sns';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

const region = process.env.AWS_REGION || 'us-east-1';
const profile = process.env.AWS_PROFILE;

// Base AWS Client Configurations
const clientConfig = {
  region,
  ...(profile ? { credentials: defaultProvider({ profile }) } : {}),
};

export const rawDynamoClient = new DynamoDBClient(clientConfig);
export const dynamoDocClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export const bedrockClient = new BedrockRuntimeClient(clientConfig);
export const bedrockAgentClient = new BedrockAgentRuntimeClient(clientConfig);
export const bedrockAgentAdminClient = new BedrockAgentClient(clientConfig);
export const s3Client = new S3Client(clientConfig);
export const eventBridgeClient = new EventBridgeClient(clientConfig);
export const snsClient = new SNSClient(clientConfig);
export const cognitoClient = new CognitoIdentityProviderClient(clientConfig);

export function isAwsConfigured(): boolean {
  // If explicitly configured to mock sandbox, return false
  if (process.env.ENABLE_MOCK_FALLBACK === 'true') {
    return false;
  }
  // If explicitly toggled to live AWS
  if (process.env.ENABLE_MOCK_FALLBACK === 'false') {
    return true;
  }
  return Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
    process.env.AWS_PROFILE ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
  );
}
