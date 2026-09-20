import { execSync } from 'child_process';

const profile = 'sentinel';
const region = 'us-east-1';
const ec2Host = 'http://3.236.153.112';

console.log('=== Step 1: Creating API Gateway HTTP API ===');
const createApiOutput = execSync(
  `aws apigatewayv2 create-api --name sentinel-backend-proxy --protocol-type HTTP --profile ${profile} --region ${region} --output json`,
  { encoding: 'utf-8' }
);
const { ApiId, ApiEndpoint } = JSON.parse(createApiOutput);
console.log(`Created API Gateway: ${ApiId} (${ApiEndpoint})`);

console.log('=== Step 2: Creating HTTP_PROXY Integration ===');
const createIntegrationOutput = execSync(
  `aws apigatewayv2 create-integration --api-id ${ApiId} --integration-type HTTP_PROXY --integration-uri "${ec2Host}/{proxy}" --integration-method ANY --payload-format-version 1.0 --profile ${profile} --region ${region} --output json`,
  { encoding: 'utf-8' }
);
const { IntegrationId } = JSON.parse(createIntegrationOutput);
console.log(`Created Integration: ${IntegrationId}`);

console.log('=== Step 3: Creating Proxy Route ANY /{proxy+} ===');
execSync(
  `aws apigatewayv2 create-route --api-id ${ApiId} --route-key "ANY /{proxy+}" --target "integrations/${IntegrationId}" --profile ${profile} --region ${region}`,
  { stdio: 'inherit' }
);

console.log('=== Step 4: Creating Auto-Deploy $default Stage ===');
execSync(
  `aws apigatewayv2 create-stage --api-id ${ApiId} --stage-name "$default" --auto-deploy --profile ${profile} --region ${region}`,
  { stdio: 'inherit' }
);

console.log('\n=====================================================');
console.log('🎉 API GATEWAY HTTPS PROXY READY!');
console.log(`Endpoint: ${ApiEndpoint}`);
console.log('=====================================================\n');
