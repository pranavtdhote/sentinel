import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const profile = 'sentinel';
const roleName = 'SentinelEc2Role';
const instanceProfileName = 'SentinelEc2InstanceProfile';

console.log('=== Step 1: Creating Trust Policy ===');
const trustPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'ec2.amazonaws.com',
      },
      Action: 'sts:AssumeRole',
    },
  ],
};
const trustPolicyFile = path.join(process.cwd(), 'scripts', 'ec2-trust-policy.json');
fs.writeFileSync(trustPolicyFile, JSON.stringify(trustPolicy, null, 2));

console.log('=== Step 2: Creating Role SentinelEc2Role ===');
try {
  execSync(`aws iam create-role --role-name ${roleName} --assume-role-policy-document file://${trustPolicyFile} --profile ${profile}`, { stdio: 'inherit' });
} catch (e) {
  console.log('Role SentinelEc2Role may already exist, proceeding...');
}

console.log('=== Step 3: Attaching Access Policy ===');
const getPolicyOutput = execSync(`aws iam get-role-policy --role-name SentinelAmplifyComputeRole --policy-name SentinelAmplifyAccessPolicy --profile ${profile} --output json`, { encoding: 'utf-8' });
const { PolicyDocument } = JSON.parse(getPolicyOutput);
const accessPolicyFile = path.join(process.cwd(), 'scripts', 'ec2-access-policy.json');
fs.writeFileSync(accessPolicyFile, JSON.stringify(PolicyDocument, null, 2));

execSync(`aws iam put-role-policy --role-name ${roleName} --policy-name SentinelEc2AccessPolicy --policy-document file://${accessPolicyFile} --profile ${profile}`, { stdio: 'inherit' });

console.log('=== Step 4: Attaching AmazonSSMManagedInstanceCore ===');
try {
  execSync(`aws iam attach-role-policy --role-name ${roleName} --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore --profile ${profile}`, { stdio: 'inherit' });
} catch (e) {
  console.log('SSM policy already attached');
}

console.log('=== Step 5: Creating and Associating Instance Profile ===');
try {
  execSync(`aws iam create-instance-profile --instance-profile-name ${instanceProfileName} --profile ${profile}`, { stdio: 'inherit' });
} catch (e) {
  console.log('Instance profile already exists');
}

try {
  execSync(`aws iam add-role-to-instance-profile --instance-profile-name ${instanceProfileName} --role-name ${roleName} --profile ${profile}`, { stdio: 'inherit' });
} catch (e) {
  console.log('Role already added to instance profile');
}

console.log('=== Step 6: Cleaning up temporary files ===');
if (fs.existsSync(trustPolicyFile)) fs.unlinkSync(trustPolicyFile);
if (fs.existsSync(accessPolicyFile)) fs.unlinkSync(accessPolicyFile);

console.log('\n[SUCCESS] EC2 IAM Role and Instance Profile configured successfully!\n');
