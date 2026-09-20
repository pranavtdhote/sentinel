import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.S3_RUNBOOKS_BUCKET || 'sentinel-runbooks-090686622776';

const s3 = new S3Client({ region });

interface FileToUpload {
  localPath: string;
  s3Key: string;
  contentType: string;
}

async function uploadKnowledgeDocs() {
  console.log(`\n==================================================`);
  console.log(`⚡ SENTINEL Phase 3: Uploading Knowledge Corpus to S3`);
  console.log(`Target Bucket: s3://${bucketName}/`);
  console.log(`AWS Region:    ${region}`);
  console.log(`==================================================\n`);

  const filesToUpload: FileToUpload[] = [
    {
      localPath: 'data/knowledge/sops/aurora-connection-leak.md',
      s3Key: 'sops/aurora-connection-leak.md',
      contentType: 'text/markdown',
    },
    {
      localPath: 'data/knowledge/sops/aurora-connection-leak.md',
      s3Key: 'payments/aurora-connection-leak.md', // Supporting legacy path matching demo citations
      contentType: 'text/markdown',
    },
    {
      localPath: 'data/knowledge/sops/ecs-task-definition-rollback.md',
      s3Key: 'sops/ecs-task-definition-rollback.md',
      contentType: 'text/markdown',
    },
    {
      localPath: 'data/knowledge/policies/infrastructure-mutation-policy.md',
      s3Key: 'policies/infrastructure-mutation-policy.md',
      contentType: 'text/markdown',
    },
    {
      localPath: 'data/knowledge/resources/payment-checkout-architecture.md',
      s3Key: 'resources/payment-checkout-architecture.md',
      contentType: 'text/markdown',
    },
    {
      localPath: 'data/knowledge/incidents/inc-2026-0814-02-aurora-pool-leak.md',
      s3Key: 'incidents/inc-2026-0814-02-aurora-pool-leak.md',
      contentType: 'text/markdown',
    },
  ];

  for (const item of filesToUpload) {
    const fullPath = path.resolve(process.cwd(), item.localPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Warning: Local file not found: ${fullPath}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    console.log(`📤 Uploading '${item.s3Key}' (${content.length} bytes)...`);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: item.s3Key,
        Body: content,
        ContentType: item.contentType,
        Metadata: {
          uploadedBy: 'sentinel-phase3-seed',
          version: '1.0',
        },
      })
    );

    console.log(`✅ Uploaded s3://${bucketName}/${item.s3Key}`);
  }

  console.log(`\n🎉 Knowledge Corpus Upload Completed Successfully!\n`);
}

uploadKnowledgeDocs().catch((err) => {
  console.error('\n❌ Knowledge Corpus Upload Failed:', err);
  process.exit(1);
});
