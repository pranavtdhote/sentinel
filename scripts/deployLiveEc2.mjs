import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const profile = 'sentinel';
const region = 'us-east-1';
const vpcId = 'vpc-0f758c96ed14e748d';
const subnetId = 'subnet-0fe73d0ba148540ad'; // us-east-1a public subnet
const instanceProfileName = 'SentinelEc2InstanceProfile';
const amiId = 'ami-0fef201115eefe936'; // AL2023 x86_64
const instanceType = 't3.small';

console.log('=====================================================');
console.log('🚀 SENTINEL LIVE AWS ARCHITECTURE DEPLOYMENT');
console.log('=====================================================\n');

// 1. Security Group
console.log('=== Step 1: Provisioning Security Group ===');
let sgId;
try {
  const sgOutput = execSync(
    `aws ec2 describe-security-groups --filters "Name=group-name,Values=sentinel-ec2-sg" "Name=vpc-id,Values=${vpcId}" --profile ${profile} --region ${region} --output json`,
    { encoding: 'utf-8' }
  );
  const sgData = JSON.parse(sgOutput);
  if (sgData.SecurityGroups && sgData.SecurityGroups.length > 0) {
    sgId = sgData.SecurityGroups[0].GroupId;
    console.log(`Security Group exists: ${sgId}`);
  }
} catch (e) {}

if (!sgId) {
  const createSgOutput = execSync(
    `aws ec2 create-security-group --group-name sentinel-ec2-sg --description "Security Group for Sentinel Live Platform" --vpc-id ${vpcId} --profile ${profile} --region ${region} --output json`,
    { encoding: 'utf-8' }
  );
  sgId = JSON.parse(createSgOutput).GroupId;
  console.log(`Created Security Group: ${sgId}`);

  // Ingress rules: 80, 443, 3000
  execSync(
    `aws ec2 authorize-security-group-ingress --group-id ${sgId} --protocol tcp --port 80 --cidr 0.0.0.0/0 --profile ${profile} --region ${region}`,
    { stdio: 'inherit' }
  );
  execSync(
    `aws ec2 authorize-security-group-ingress --group-id ${sgId} --protocol tcp --port 443 --cidr 0.0.0.0/0 --profile ${profile} --region ${region}`,
    { stdio: 'inherit' }
  );
  execSync(
    `aws ec2 authorize-security-group-ingress --group-id ${sgId} --protocol tcp --port 3000 --cidr 0.0.0.0/0 --profile ${profile} --region ${region}`,
    { stdio: 'inherit' }
  );
  console.log('Ingress rules configured: 80, 443, 3000 open.');
}

// 2. User Data Script
console.log('=== Step 2: Preparing Bootstrap Script ===');
const userDataScript = `#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
set -ex

# Configure 4GB Swap Space for build stability
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

echo "Starting Sentinel System Setup..."

# Update OS and install prerequisites
dnf update -y
dnf install -y git nginx

# Install Node.js 20 LTS via nodesource
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Setup application directory
mkdir -p /opt/sentinel
cd /opt/sentinel

# Clone repo
git clone https://github.com/pranavtdhote/sentinel.git .

# Configure production environment variables
cat << 'ENVEOF' > .env.local
STAGE=dev
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0
BEDROCK_FALLBACK_MODEL_ID=amazon.nova-lite-v1:0
BEDROCK_KNOWLEDGE_BASE_ID=DJ3IJQZDGJ
BEDROCK_DATA_SOURCE_ID=98PFX1H0BY
DYNAMODB_TABLE_NAME=sentinel-records-dev
S3_RUNBOOKS_BUCKET=sentinel-runbooks-090686622776
S3_REPORTS_BUCKET=sentinel-reports-090686622776
EVENTBRIDGE_BUS_NAME=sentinel-events-dev
SNS_ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:090686622776:sentinel-oncall-alerts-dev
SNS_ALERTS_TOPIC_ARN=arn:aws:sns:us-east-1:090686622776:sentinel-oncall-alerts-dev
ENABLE_MOCK_FALLBACK=false
COGNITO_USER_POOL_ID=us-east-1_Lz4flXPaw
COGNITO_CLIENT_ID=15qk2aht7ivv8d4s676s18ieu0
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Lz4flXPaw
NODE_ENV=production
PORT=3000
AWS_REGION=us-east-1
ENVEOF

# Install dependencies and build
npm ci
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build

# Create systemd service
cat << 'SVCEOF' > /etc/systemd/system/sentinel.service
[Unit]
Description=Sentinel Incident Intelligence Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/sentinel
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=AWS_REGION=us-east-1

[Install]
WantedBy=multi-user.target
SVCEOF

# Enable and start Sentinel
systemctl daemon-reload
systemctl enable sentinel
systemctl start sentinel

# Configure Nginx reverse proxy
cat << 'NGXEOF' > /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    server {
        listen       80 default_server;
        listen       [::]:80 default_server;
        server_name  _;

        location /_next/static/ {
            alias /opt/sentinel/.next/static/;
            expires 365d;
            access_log off;
        }

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
        }
    }
}
NGXEOF

# Test and start Nginx
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "Sentinel deployment complete!"
`;

const userDataBase64 = Buffer.from(userDataScript).toString('base64');
const userDataFile = path.join(process.cwd(), 'scripts', 'userdata.txt');
fs.writeFileSync(userDataFile, userDataScript);

// 3. Launch EC2 Instance
console.log('=== Step 3: Launching EC2 Instance ===');
let instanceId;
let publicIp;
let publicDns;

// Check if instance already running
try {
  const describeInstancesOutput = execSync(
    `aws ec2 describe-instances --filters "Name=tag:Name,Values=sentinel-live-platform" "Name=instance-state-name,Values=running,pending" --profile ${profile} --region ${region} --output json`,
    { encoding: 'utf-8' }
  );
  const data = JSON.parse(describeInstancesOutput);
  if (data.Reservations && data.Reservations.length > 0 && data.Reservations[0].Instances.length > 0) {
    const inst = data.Reservations[0].Instances[0];
    instanceId = inst.InstanceId;
    publicIp = inst.PublicIpAddress;
    publicDns = inst.PublicDnsName;
    console.log(`Found existing instance: ${instanceId} (${inst.State.Name})`);
  }
} catch (e) {}

if (!instanceId) {
  const launchOutput = execSync(
    `aws ec2 run-instances --image-id ${amiId} --count 1 --instance-type ${instanceType} --subnet-id ${subnetId} --security-group-ids ${sgId} --iam-instance-profile Name=${instanceProfileName} --user-data "${userDataBase64}" --block-device-mappings "[{\\"DeviceName\\":\\"/dev/xvda\\",\\"Ebs\\":{\\"VolumeSize\\":25,\\"VolumeType\\":\\"gp3\\"}}]" --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=sentinel-live-platform}]" --profile ${profile} --region ${region} --output json`,
    { encoding: 'utf-8' }
  );
  const launchData = JSON.parse(launchOutput);
  instanceId = launchData.Instances[0].InstanceId;
  console.log(`Instance launched: ${instanceId}`);
}

// Wait for running state
console.log('Waiting for instance to be in running state...');
execSync(
  `aws ec2 wait instance-running --instance-ids ${instanceId} --profile ${profile} --region ${region}`,
  { stdio: 'inherit' }
);

// Get Public IP & DNS
const descOutput = execSync(
  `aws ec2 describe-instances --instance-ids ${instanceId} --profile ${profile} --region ${region} --output json`,
  { encoding: 'utf-8' }
);
const instInfo = JSON.parse(descOutput).Reservations[0].Instances[0];
publicIp = instInfo.PublicIpAddress;
publicDns = instInfo.PublicDnsName;

console.log(`\n=====================================================`);
console.log(`Instance ID : ${instanceId}`);
console.log(`Public IP   : ${publicIp}`);
console.log(`Public DNS  : ${publicDns}`);
console.log(`Direct URL  : http://${publicIp}`);
console.log(`=====================================================\n`);

// 4. Create CloudFront Distribution
console.log('=== Step 4: Creating CloudFront Distribution ===');
let cloudFrontDomain;
const callerReference = `sentinel-cf-${Date.now()}`;
const cfConfig = {
  CallerReference: callerReference,
  Comment: 'CloudFront Distribution for Sentinel AI Incident Platform',
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
    CachePolicyId: '4135ea2d-6df8-44a3-9df3-440684c8d42b', // Managed-CachingDisabled (SSR Dynamic)
    OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac', // Managed-AllViewerExceptHostHeader
    Compress: true,
  },
};

const cfConfigFile = path.join(process.cwd(), 'scripts', 'cf-config.json');
fs.writeFileSync(cfConfigFile, JSON.stringify(cfConfig, null, 2));

try {
  const cfOutput = execSync(
    `aws cloudfront create-distribution --distribution-config file://${cfConfigFile} --profile ${profile} --output json`,
    { encoding: 'utf-8' }
  );
  const cfData = JSON.parse(cfOutput);
  cloudFrontDomain = cfData.Distribution.DomainName;
  console.log(`CloudFront Distribution Created! Domain: https://${cloudFrontDomain}`);
} catch (e) {
  console.warn(`CloudFront creation notice: ${e.message}`);
}

// 5. Poll for application availability
console.log('\n=== Step 5: Waiting for Next.js build and bootstrap on EC2 ===');
console.log('The instance is installing Node.js, cloning repo, running build, and starting systemd...');
let isHealthy = false;
let checkCount = 0;
const maxChecks = 40; // 40 * 10s = ~6-7 minutes

while (!isHealthy && checkCount < maxChecks) {
  checkCount++;
  await new Promise((r) => setTimeout(r, 10000));
  try {
    const res = await fetch(`http://${publicIp}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      console.log(`[Check ${checkCount}] HTTP 200 received! Status:`, data);
      isHealthy = true;
    } else {
      console.log(`[Check ${checkCount}] Server responding with HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`[Check ${checkCount}] Bootstrapping in progress (Connection waiting...)...`);
  }
}

console.log('\n=====================================================');
if (isHealthy) {
  console.log('🎉 SENTINEL PLATFORM IS LIVE ON AWS!');
} else {
  console.log('⏳ Bootstrapping may still be finalizing. Check URLs below.');
}
console.log(`🌐 Live EC2 URL        : http://${publicIp}`);
console.log(`🌐 Live EC2 Public DNS : http://${publicDns}`);
if (cloudFrontDomain) {
  console.log(`🔒 Live CloudFront HTTPS : https://${cloudFrontDomain}`);
}
console.log('=====================================================\n');
