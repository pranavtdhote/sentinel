import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutPublicAccessBlockCommand,
  PutBucketVersioningCommand,
  PutBucketCorsCommand,
  PutBucketEncryptionCommand,
} from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';
const runbooksBucket = process.env.S3_RUNBOOKS_BUCKET || 'sentinel-runbooks-090686622776';
const reportsBucket = process.env.S3_REPORTS_BUCKET || 'sentinel-reports-090686622776';

const s3 = new S3Client({ region });

async function configureBucket(bucketName: string, purpose: string) {
  console.log(`\n📦 Configuring Bucket: ${bucketName} (${purpose})...`);

  // 1. Check or Create
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`ℹ️ Bucket '${bucketName}' already exists.`);
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.log(`Creating bucket '${bucketName}' in ${region}...`);
      await s3.send(
        new CreateBucketCommand({
          Bucket: bucketName,
          // Note: us-east-1 does not accept LocationConstraint in CreateBucketConfiguration
        })
      );
      console.log(`✅ Bucket '${bucketName}' created.`);
    } else {
      throw err;
    }
  }

  // 2. Block Public Access
  console.log(`🔒 Applying Public Access Block on '${bucketName}'...`);
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );
  console.log(`✅ Public access blocked.`);

  // 3. Default Encryption (AES256)
  console.log(`🛡️ Enforcing AES256 Server-Side Encryption on '${bucketName}'...`);
  await s3.send(
    new PutBucketEncryptionCommand({
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    })
  );
  console.log(`✅ Default encryption active.`);

  // 4. Bucket Versioning
  console.log(`📜 Enabling Bucket Versioning on '${bucketName}'...`);
  await s3.send(
    new PutBucketVersioningCommand({
      Bucket: bucketName,
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    })
  );
  console.log(`✅ Versioning enabled.`);

  // 5. CORS Configuration (Allows web presigned GET and uploads)
  console.log(`🌐 Configuring CORS for '${bucketName}'...`);
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'HEAD'],
            AllowedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'https://*.amazonaws.com'],
            ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  console.log(`✅ CORS configuration applied.`);
}

async function main() {
  console.log(`==================================================`);
  console.log(`⚡ SENTINEL Phase 3: Amazon S3 Storage Provisioning`);
  console.log(`AWS Region: ${region}`);
  console.log(`==================================================`);

  await configureBucket(runbooksBucket, 'Runbook & Knowledge Store');
  await configureBucket(reportsBucket, 'Postmortems & Incident Exports');

  console.log(`\n🎉 S3 Storage Provisioning Completed Successfully!\n`);
}

main().catch((err) => {
  console.error('\n❌ S3 Provisioning Failed:', err);
  process.exit(1);
});
