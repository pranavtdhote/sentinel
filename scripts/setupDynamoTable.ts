import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  UpdateContinuousBackupsCommand,
  UpdateTimeToLiveCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'sentinel-records-dev';

const client = new DynamoDBClient({
  region,
});

async function setupDynamoTable() {
  console.log(`\n==================================================`);
  console.log(`⚡ SENTINEL Phase 2: DynamoDB Provisioning`);
  console.log(`Target Table:  ${tableName}`);
  console.log(`AWS Region:    ${region}`);
  console.log(`==================================================\n`);

  // 1. Check if table already exists
  try {
    const describe = await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`ℹ️ Table '${tableName}' already exists (Status: ${describe.Table?.TableStatus}).`);
    return describe.Table;
  } catch (err: any) {
    if (err.name !== 'ResourceNotFoundException') {
      throw err;
    }
  }

  // 2. Create table with Single-Table schema (PK, SK, GSI1, GSI2)
  console.log(`📦 Creating table '${tableName}' in ${region}...`);
  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
          { AttributeName: 'GSI2PK', AttributeType: 'S' },
          { AttributeName: 'GSI2SK', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1-StatusIndex',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI2-SeverityIndex',
            KeySchema: [
              { AttributeName: 'GSI2PK', KeyType: 'HASH' },
              { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      })
    );
    console.log(`⏳ Table creation requested. Waiting for table to become ACTIVE...`);
  } catch (err: any) {
    if (err instanceof ResourceInUseException) {
      console.log(`ℹ️ Table '${tableName}' is already being created.`);
    } else {
      throw err;
    }
  }

  // 3. Poll until ACTIVE
  let active = false;
  let attempts = 0;
  while (!active && attempts < 30) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const desc = await client.send(new DescribeTableCommand({ TableName: tableName }));
    if (desc.Table?.TableStatus === 'ACTIVE') {
      active = true;
      console.log(`✅ Table '${tableName}' is now ACTIVE!`);
      console.log(`   ARN: ${desc.Table.TableArn}`);
    } else {
      process.stdout.write('.');
    }
  }

  if (!active) {
    throw new Error(`Timed out waiting for table '${tableName}' to become ACTIVE.`);
  }

  // 4. Enable Point-In-Time Recovery (PITR)
  console.log(`🔒 Enabling Point-In-Time Recovery (PITR)...`);
  try {
    await client.send(
      new UpdateContinuousBackupsCommand({
        TableName: tableName,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      })
    );
    console.log(`✅ PITR enabled.`);
  } catch (pitrErr: any) {
    console.warn(`⚠️ Warning: Could not enable PITR: ${pitrErr.message}`);
  }

  // 5. Enable Time To Live (TTL) on 'ttl' attribute
  console.log(`⏱️ Enabling Time-To-Live (TTL) on attribute 'ttl'...`);
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: tableName,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: 'ttl',
        },
      })
    );
    console.log(`✅ TTL enabled.`);
  } catch (ttlErr: any) {
    console.warn(`⚠️ Warning: Could not enable TTL: ${ttlErr.message}`);
  }

  console.log(`\n🎉 DynamoDB Phase 2 provisioning completed successfully!\n`);
}

setupDynamoTable().catch((err) => {
  console.error('\n❌ DynamoDB Setup Failed:', err);
  process.exit(1);
});
