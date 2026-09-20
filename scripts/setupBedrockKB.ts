import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'sentinel';
const BUCKET_NAME = process.env.S3_RUNBOOKS_BUCKET || 'sentinel-runbooks-090686622776';
const KB_NAME = 'sentinel-incident-runbooks';
const ROLE_NAME = 'AmazonBedrockExecutionRoleForKB-sentinel';

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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setupBedrockKnowledgeBase() {
  console.log(`\n==================================================`);
  console.log(`⚡ SENTINEL Phase 5: Bedrock Knowledge Base Setup`);
  console.log(`Region:     ${REGION}`);
  console.log(`Profile:    ${PROFILE}`);
  console.log(`S3 Bucket:  ${BUCKET_NAME}`);
  console.log(`KB Name:    ${KB_NAME}`);
  console.log(`==================================================\n`);

  // Step 0: Get Account ID
  console.log(`🔍 Resolving AWS Account ID...`);
  const sts = runAws('sts get-caller-identity');
  const accountId = sts.Account;
  console.log(`✅ AWS Account ID: ${accountId}`);

  // Step 1: Create or Verify IAM Role
  console.log(`\n🔑 Step 1: Setting up IAM Role: ${ROLE_NAME}...`);
  let roleArn = `arn:aws:iam::${accountId}:role/${ROLE_NAME}`;
  let roleExists = false;

  try {
    const roleDesc = runAws(`iam get-role --role-name ${ROLE_NAME}`);
    roleArn = roleDesc.Role.Arn;
    roleExists = true;
    console.log(`ℹ️ Role already exists: ${roleArn}`);
  } catch {
    console.log(`Creating IAM Role '${ROLE_NAME}'...`);
  }

  const tmpDir = os.tmpdir();
  const trustPolicyPath = path.join(tmpDir, 'sentinel-kb-trust.json');
  const permissionsPolicyPath = path.join(tmpDir, 'sentinel-kb-perms.json');

  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'bedrock.amazonaws.com' },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: { 'aws:SourceAccount': accountId },
          ArnLike: { 'aws:SourceArn': `arn:aws:bedrock:${REGION}:${accountId}:knowledge-base/*` },
        },
      },
    ],
  };

  const permissionsPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:ListBucket'],
        Resource: `arn:aws:s3:::${BUCKET_NAME}`,
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject'],
        Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
      },
      {
        Effect: 'Allow',
        Action: ['bedrock:InvokeModel'],
        Resource: `arn:aws:bedrock:${REGION}::foundation-model/amazon.titan-embed-text-v2:0`,
      },
    ],
  };

  fs.writeFileSync(trustPolicyPath, JSON.stringify(trustPolicy, null, 2));
  fs.writeFileSync(permissionsPolicyPath, JSON.stringify(permissionsPolicy, null, 2));

  if (!roleExists) {
    const createRes = runAws(`iam create-role --role-name ${ROLE_NAME} --assume-role-policy-document file://"${trustPolicyPath}"`);
    roleArn = createRes.Role.Arn;
    console.log(`✅ IAM Role created: ${roleArn}`);
    console.log(`⏳ Waiting 10 seconds for IAM eventual consistency...`);
    await sleep(10000);
  }

  console.log(`🔒 Attaching inline permissions policy to role...`);
  runAws(`iam put-role-policy --role-name ${ROLE_NAME} --policy-name SentinelKBAccessPolicy --policy-document file://"${permissionsPolicyPath}"`);
  console.log(`✅ Role policy configured.`);

  // Step 2: Check for Existing Knowledge Base
  console.log(`\n📚 Step 2: Checking existing Knowledge Bases...`);
  const listKbs = runAws('bedrock-agent list-knowledge-bases');
  let kbId = '';

  for (const kb of listKbs.knowledgeBaseSummaries || []) {
    if (kb.name === KB_NAME && kb.status !== 'DELETING') {
      kbId = kb.knowledgeBaseId;
      console.log(`ℹ️ Found existing Knowledge Base '${KB_NAME}' (ID: ${kbId}, Status: ${kb.status})`);
      break;
    }
  }

  // Step 3: Create Knowledge Base if not found
  if (!kbId) {
    console.log(`\n🚀 Step 3: Creating Managed Knowledge Base '${KB_NAME}'...`);
    const kbConfig = {
      type: 'MANAGED',
      managedKnowledgeBaseConfiguration: {
        embeddingModelType: 'MANAGED',
      },
    };
    const kbConfigPath = path.join(tmpDir, 'sentinel-kb-config.json');
    fs.writeFileSync(kbConfigPath, JSON.stringify(kbConfig));

    try {
      const createRes = runAws(
        `bedrock-agent create-knowledge-base --name "${KB_NAME}" --role-arn "${roleArn}" --knowledge-base-configuration file://"${kbConfigPath}"`
      );
      kbId = createRes.knowledgeBase.knowledgeBaseId;
      console.log(`✅ Managed Knowledge Base created with ID: ${kbId}`);
    } catch (createErr: any) {
      console.warn(`⚠️ Managed KB creation returned: ${createErr.message}`);
      console.log(`Attempting create with CUSTOM embedding model titan-embed-text-v2:0...`);
      const customKbConfig = {
        type: 'MANAGED',
        managedKnowledgeBaseConfiguration: {
          embeddingModelType: 'CUSTOM',
          embeddingModelArn: `arn:aws:bedrock:${REGION}::foundation-model/amazon.titan-embed-text-v2:0`,
        },
      };
      fs.writeFileSync(kbConfigPath, JSON.stringify(customKbConfig));
      const createRes = runAws(
        `bedrock-agent create-knowledge-base --name "${KB_NAME}" --role-arn "${roleArn}" --knowledge-base-configuration file://"${kbConfigPath}"`
      );
      kbId = createRes.knowledgeBase.knowledgeBaseId;
      console.log(`✅ Managed Knowledge Base created with ID: ${kbId}`);
    }

    // Poll until ACTIVE
    console.log(`⏳ Waiting for Knowledge Base '${kbId}' to become ACTIVE...`);
    let kbActive = false;
    let attempts = 0;
    while (!kbActive && attempts < 30) {
      attempts++;
      await sleep(3000);
      const desc = runAws(`bedrock-agent get-knowledge-base --knowledge-base-id ${kbId}`);
      if (desc.knowledgeBase?.status === 'ACTIVE') {
        kbActive = true;
        console.log(`✅ Knowledge Base is ACTIVE!`);
      } else {
        process.stdout.write('.');
      }
    }
  }

  // Step 4: Check or Create Data Source
  console.log(`\n🗂️ Step 4: Connecting S3 Data Source...`);
  const listDs = runAws(`bedrock-agent list-data-sources --knowledge-base-id ${kbId}`);
  let dsId = '';
  for (const ds of listDs.dataSourceSummaries || []) {
    if (ds.name === 'sentinel-s3-runbooks') {
      dsId = ds.dataSourceId;
      console.log(`ℹ️ Found existing Data Source (ID: ${dsId}, Status: ${ds.status})`);
      break;
    }
  }

  if (!dsId) {
    const dsConfig = {
      type: 'MANAGED_KNOWLEDGE_BASE_CONNECTOR',
      managedKnowledgeBaseConnectorConfiguration: {
        connectorParameters: {
          type: 'S3',
          version: '1',
          connectionConfiguration: {
            bucketName: BUCKET_NAME,
            bucketOwnerAccountId: accountId,
          },
        },
      },
    };
    const dsConfigPath = path.join(tmpDir, 'sentinel-ds-config.json');
    fs.writeFileSync(dsConfigPath, JSON.stringify(dsConfig));

    const dsRes = runAws(
      `bedrock-agent create-data-source --knowledge-base-id ${kbId} --name "sentinel-s3-runbooks" --data-source-configuration file://"${dsConfigPath}"`
    );
    dsId = dsRes.dataSource.dataSourceId;
    console.log(`✅ Data Source created with ID: ${dsId}`);

    // Poll until AVAILABLE
    console.log(`⏳ Waiting for Data Source '${dsId}' to become AVAILABLE...`);
    let dsAvailable = false;
    let dsAttempts = 0;
    while (!dsAvailable && dsAttempts < 30) {
      dsAttempts++;
      await sleep(3000);
      const desc = runAws(`bedrock-agent get-data-source --knowledge-base-id ${kbId} --data-source-id ${dsId}`);
      if (desc.dataSource?.status === 'AVAILABLE') {
        dsAvailable = true;
        console.log(`✅ Data Source is AVAILABLE!`);
      } else {
        process.stdout.write('.');
      }
    }
  }

  // Step 5: Start Ingestion Job
  console.log(`\n🔄 Step 5: Triggering Ingestion / Vector Chunking Job...`);
  const jobRes = runAws(`bedrock-agent start-ingestion-job --knowledge-base-id ${kbId} --data-source-id ${dsId}`);
  const jobId = jobRes.ingestionJob.ingestionJobId;
  console.log(`✅ Ingestion Job started: ${jobId}`);

  console.log(`⏳ Polling Ingestion Job until COMPLETE...`);
  let jobComplete = false;
  let jobAttempts = 0;
  while (!jobComplete && jobAttempts < 60) {
    jobAttempts++;
    await sleep(4000);
    const jobDesc = runAws(
      `bedrock-agent get-ingestion-job --knowledge-base-id ${kbId} --data-source-id ${dsId} --ingestion-job-id ${jobId}`
    );
    const status = jobDesc.ingestionJob?.status;
    if (status === 'COMPLETE') {
      jobComplete = true;
      console.log(`\n🎉 Ingestion Job COMPLETED!`);
      const stats = jobDesc.ingestionJob?.statistics;
      if (stats) {
        console.log(`   * Documents Scanned: ${stats.numberOfDocumentsScanned}`);
        console.log(`   * Documents Indexed: ${stats.numberOfNewDocumentsIndexed}`);
        console.log(`   * Documents Failed:  ${stats.numberOfDocumentsFailed}`);
      }
    } else if (status === 'FAILED') {
      console.error(`\n❌ Ingestion Job FAILED:`, jobDesc.ingestionJob?.failureReasons);
      break;
    } else {
      process.stdout.write(`[${status}] `);
    }
  }

  // Step 6: Verify Retrieval with Live Query
  console.log(`\n🧪 Step 6: Testing Semantic Retrieval with RetrieveCommand...`);
  const agentRuntime = new BedrockAgentRuntimeClient({ region: REGION });
  const testQuery = 'Aurora PostgreSQL connection pool saturated and 504 timeout';
  console.log(`Query: "${testQuery}"`);

  try {
    const retrieveRes = await agentRuntime.send(
      new RetrieveCommand({
        knowledgeBaseId: kbId,
        retrievalQuery: { text: testQuery },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: 3,
          },
        },
      })
    );

    console.log(`\n✅ Retrieve succeeded! Retrieved ${retrieveRes.retrievalResults?.length || 0} chunks:`);
    for (const res of retrieveRes.retrievalResults || []) {
      console.log(`   - [Score: ${res.score?.toFixed(3)}] ${res.location?.s3Location?.uri}`);
      console.log(`     Snippet: "${res.content?.text?.slice(0, 140)}..."`);
    }
  } catch (retErr: any) {
    console.warn(`⚠️ Retrieve check notice: ${retErr.message}`);
  }

  // Step 7: Update .env.local
  console.log(`\n⚙️ Step 7: Updating .env.local with real BEDROCK_KNOWLEDGE_BASE_ID...`);
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('BEDROCK_KNOWLEDGE_BASE_ID=')) {
      envContent = envContent.replace(/BEDROCK_KNOWLEDGE_BASE_ID=.*/, `BEDROCK_KNOWLEDGE_BASE_ID=${kbId}`);
    } else {
      envContent += `\nBEDROCK_KNOWLEDGE_BASE_ID=${kbId}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated BEDROCK_KNOWLEDGE_BASE_ID=${kbId} in .env.local`);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Phase 5: Bedrock Knowledge Base Setup Complete!`);
  console.log(`   Knowledge Base ID: ${kbId}`);
  console.log(`   Data Source ID:    ${dsId}`);
  console.log(`==================================================\n`);
}

setupBedrockKnowledgeBase().catch((err) => {
  console.error('\n❌ Knowledge Base Setup Failed:', err);
  process.exit(1);
});
