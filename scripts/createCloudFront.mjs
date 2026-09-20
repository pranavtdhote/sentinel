import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const profile = 'sentinel';
const publicDns = 'ec2-3-236-153-112.compute-1.amazonaws.com';
const callerReference = `sentinel-cf-${Date.now()}`;

const cfConfig = {
  CallerReference: callerReference,
  Comment: 'CloudFront HTTPS Distribution for Sentinel Platform',
  Enabled: true,
  Origins: {
    Quantity: 1,
    Items: [
      {
        Id: 'Sentinel-EC2-Origin',
        DomainName: publicDns,
        CustomOriginConfig: {
          HTTPPort: 80,
          HTTPSPort: 443,
          OriginProtocolPolicy: 'http-only',
          OriginSslProtocols: {
            Quantity: 1,
            Items: ['TLSv1.2'],
          },
          OriginReadTimeout: 60,
          OriginKeepaliveTimeout: 5,
        },
      },
    ],
  },
  DefaultCacheBehavior: {
    TargetOriginId: 'Sentinel-EC2-Origin',
    ViewerProtocolPolicy: 'redirect-to-https',
    AllowedMethods: {
      Quantity: 7,
      Items: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
      CachedMethods: {
        Quantity: 2,
        Items: ['GET', 'HEAD'],
      },
    },
    CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // Managed-CachingDisabled
    OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac', // Managed-AllViewerExceptHostHeader
    Compress: true,
  },
};

const cfConfigFile = path.join(process.cwd(), 'scripts', 'cf-config.json');
fs.writeFileSync(cfConfigFile, JSON.stringify(cfConfig, null, 2));

console.log('=== Creating CloudFront Distribution ===');
const cfOutput = execSync(
  `aws cloudfront create-distribution --distribution-config file://${cfConfigFile} --profile ${profile} --output json`,
  { encoding: 'utf-8' }
);
const cfData = JSON.parse(cfOutput);
const domainName = cfData.Distribution.DomainName;
const distId = cfData.Distribution.Id;

console.log('\n=====================================================');
console.log('🎉 CLOUDFRONT DISTRIBUTION CREATED!');
console.log(`Distribution ID : ${distId}`);
console.log(`Live HTTPS URL  : https://${domainName}`);
console.log('=====================================================\n');
