import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';
import { S3Client } from '@aws-sdk/client-s3';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SNSClient } from '@aws-sdk/client-sns';

const region = process.env.AWS_REGION || 'us-east-1';

// Base AWS Client Configurations
const clientConfig = {
  region,
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
export const s3Client = new S3Client(clientConfig);
export const eventBridgeClient = new EventBridgeClient(clientConfig);
export const snsClient = new SNSClient(clientConfig);

export function isAwsConfigured(): boolean {
  // If explicitly configured to mock or missing standard AWS credentials, use mock sandbox
  if (process.env.ENABLE_MOCK_FALLBACK === 'true') {
    return false;
  }
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ) || Boolean(process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI);
}
