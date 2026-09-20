/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-bedrock-agent-runtime',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-eventbridge',
    '@aws-sdk/client-sns',
    '@aws-sdk/client-cloudwatch',
    '@aws-sdk/credential-provider-node',
    'aws-jwt-verify',
    '@smithy/util-utf8',
    '@smithy/signature-v4',
    '@smithy/protocol-http',
    '@smithy/node-http-handler',
  ],
};

export default nextConfig;
