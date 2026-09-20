import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const appId = 'd2jogvu777jydt';
const branchName = 'main';
const profile = 'sentinel';
const region = 'us-east-1';
const zipPath = path.join(process.cwd(), 'sentinel-deployment.zip');

if (!fs.existsSync(zipPath)) {
  console.error(`Error: ${zipPath} not found! Run scripts/packageAmplify.mjs first.`);
  process.exit(1);
}

console.log('=== Step 1: Creating Amplify Deployment ===');
const createDeployOutput = execSync(
  `aws amplify create-deployment --app-id ${appId} --branch-name ${branchName} --profile ${profile} --region ${region} --output json`,
  { encoding: 'utf-8' }
);
const { jobId, zipUploadUrl } = JSON.parse(createDeployOutput);
console.log(`Created deployment. Job ID: ${jobId}`);

console.log('=== Step 2: Uploading sentinel-deployment.zip to S3 ===');
const fileBuffer = fs.readFileSync(zipPath);
const response = await fetch(zipUploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/zip',
    'Content-Length': fileBuffer.length.toString(),
  },
  body: fileBuffer,
});

if (!response.ok) {
  const errText = await response.text();
  console.error(`Upload failed with HTTP ${response.status}: ${errText}`);
  process.exit(1);
}
console.log(`Upload complete! HTTP Status: ${response.status}`);

console.log('=== Step 3: Starting Deployment ===');
const startDeployOutput = execSync(
  `aws amplify start-deployment --app-id ${appId} --branch-name ${branchName} --job-id ${jobId} --profile ${profile} --region ${region} --output json`,
  { encoding: 'utf-8' }
);
console.log(`Deployment initiated!`);

console.log('=== Step 4: Monitoring Deployment Progress ===');
let status = 'PENDING';
let attempts = 0;
while (status !== 'SUCCEED' && status !== 'FAILED' && attempts < 60) {
  await new Promise((r) => setTimeout(r, 6000));
  attempts++;
  try {
    const jobOutput = execSync(
      `aws amplify get-job --app-id ${appId} --branch-name ${branchName} --job-id ${jobId} --profile ${profile} --region ${region} --output json`,
      { encoding: 'utf-8' }
    );
    const jobData = JSON.parse(jobOutput);
    status = jobData.job.summary.status;
    const steps = jobData.job.steps || [];
    const activeStep = steps.find((s) => s.status === 'RUNNING' || s.status === 'FAILED') || steps[steps.length - 1];
    console.log(`[Attempt ${attempts}] Overall: ${status} | Active Step: ${activeStep?.stepName || 'Init'} (${activeStep?.status || 'PENDING'})`);
  } catch (err) {
    console.warn(`[Attempt ${attempts}] Error querying job: ${err.message}`);
  }
}

if (status === 'SUCCEED') {
  console.log('\n=============================================');
  console.log('🎉 DEPLOYMENT SUCCEEDED!');
  console.log(`🌐 Live URL: https://${branchName}.${appId}.amplifyapp.com`);
  console.log('=============================================\n');
} else {
  console.error(`\n❌ DEPLOYMENT ENDED WITH STATUS: ${status}`);
  // Retrieve job details to print failure reason
  try {
    const jobOutput = execSync(
      `aws amplify get-job --app-id ${appId} --branch-name ${branchName} --job-id ${jobId} --profile ${profile} --region ${region} --output json`,
      { encoding: 'utf-8' }
    );
    console.error(JSON.stringify(JSON.parse(jobOutput), null, 2));
  } catch (e) {}
  process.exit(1);
}
