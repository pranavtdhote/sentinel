import {
  EventBridgeClient,
  CreateEventBusCommand,
  DescribeEventBusCommand,
  PutRuleCommand,
  PutTargetsCommand,
} from '@aws-sdk/client-eventbridge';
import {
  SNSClient,
  CreateTopicCommand,
  AddPermissionCommand,
} from '@aws-sdk/client-sns';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import * as fs from 'fs';
import * as path from 'path';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'sentinel';
const BUS_NAME = process.env.EVENTBRIDGE_BUS_NAME || 'sentinel-events-dev';
const TOPIC_NAME = 'sentinel-oncall-alerts-dev';

const credentials = defaultProvider({ profile: PROFILE });

const ebClient = new EventBridgeClient({ region: REGION, credentials });
const snsClient = new SNSClient({ region: REGION, credentials });

async function setupMessaging() {
  console.log(`\n==================================================`);
  console.log(`⚡ SENTINEL Phase 6: EventBridge & SNS Setup`);
  console.log(`Region:     ${REGION}`);
  console.log(`Profile:    ${PROFILE}`);
  console.log(`Event Bus:  ${BUS_NAME}`);
  console.log(`SNS Topic:  ${TOPIC_NAME}`);
  console.log(`==================================================\n`);

  // Step 1: Create or Verify EventBridge Custom Bus
  console.log(`📡 Step 1: Configuring EventBridge Custom Bus '${BUS_NAME}'...`);
  let busArn = '';
  try {
    const desc = await ebClient.send(new DescribeEventBusCommand({ Name: BUS_NAME }));
    busArn = desc.Arn || '';
    console.log(`ℹ️ EventBridge bus '${BUS_NAME}' already exists: ${busArn}`);
  } catch {
    console.log(`Creating EventBridge bus '${BUS_NAME}' in ${REGION}...`);
    const create = await ebClient.send(new CreateEventBusCommand({ Name: BUS_NAME }));
    busArn = create.EventBusArn || '';
    console.log(`✅ EventBridge bus created: ${busArn}`);
  }

  // Step 2: Create or Verify SNS Topic
  console.log(`\n📣 Step 2: Configuring SNS Alert Topic '${TOPIC_NAME}'...`);
  const createTopic = await snsClient.send(new CreateTopicCommand({ Name: TOPIC_NAME }));
  const topicArn = createTopic.TopicArn || '';
  console.log(`✅ SNS Alert Topic available: ${topicArn}`);

  // Step 3: Grant EventBridge permission to publish to the SNS Topic
  console.log(`\n🔐 Step 3: Granting EventBridge permission to publish to SNS...`);
  try {
    await snsClient.send(
      new AddPermissionCommand({
        TopicArn: topicArn,
        Label: 'AllowEventBridgePublish',
        AWSAccountId: ['*'],
        ActionName: ['Publish'],
      })
    );
    console.log(`✅ Permission policy attached to SNS topic.`);
  } catch (permErr: any) {
    console.log(`ℹ️ Permission notice (already present or managed): ${permErr.message}`);
  }

  // Step 4: Configure EventBridge Rule to route critical events to SNS
  console.log(`\n⚙️ Step 4: Configuring EventBridge routing rule...`);
  const ruleName = 'sentinel-sla-and-critical-rule';
  const eventPattern = JSON.stringify({
    source: ['sentinel.platform'],
    'detail-type': ['IncidentCreated', 'SlaApproaching', 'SlaBreached', 'ActionApproved'],
  });

  const ruleRes = await ebClient.send(
    new PutRuleCommand({
      Name: ruleName,
      EventBusName: BUS_NAME,
      EventPattern: eventPattern,
      State: 'ENABLED',
      Description: 'Routes critical Sentinel SLA alerts and creations to on-call SNS topic',
    })
  );
  console.log(`✅ EventBridge rule '${ruleName}' enabled (ARN: ${ruleRes.RuleArn})`);

  // Step 5: Add SNS Topic as target to the rule
  console.log(`\n🎯 Step 5: Attaching SNS Topic as target to rule...`);
  await ebClient.send(
    new PutTargetsCommand({
      EventBusName: BUS_NAME,
      Rule: ruleName,
      Targets: [
        {
          Id: 'TargetSnsOnCall',
          Arn: topicArn,
        },
      ],
    })
  );
  console.log(`✅ Attached SNS target '${topicArn}' to rule '${ruleName}'.`);

  // Step 6: Update .env.local
  console.log(`\n📝 Step 6: Updating .env.local with live ARNs...`);
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Update or insert EVENTBRIDGE_BUS_NAME
    if (envContent.includes('EVENTBRIDGE_BUS_NAME=')) {
      envContent = envContent.replace(/EVENTBRIDGE_BUS_NAME=.*/, `EVENTBRIDGE_BUS_NAME=${BUS_NAME}`);
    } else {
      envContent += `\nEVENTBRIDGE_BUS_NAME=${BUS_NAME}\n`;
    }

    // Update or insert SNS_ALERT_TOPIC_ARN & SNS_ALERTS_TOPIC_ARN
    if (envContent.includes('SNS_ALERT_TOPIC_ARN=')) {
      envContent = envContent.replace(/SNS_ALERT_TOPIC_ARN=.*/, `SNS_ALERT_TOPIC_ARN=${topicArn}`);
    } else {
      envContent += `\nSNS_ALERT_TOPIC_ARN=${topicArn}\n`;
    }

    if (envContent.includes('SNS_ALERTS_TOPIC_ARN=')) {
      envContent = envContent.replace(/SNS_ALERTS_TOPIC_ARN=.*/, `SNS_ALERTS_TOPIC_ARN=${topicArn}`);
    } else {
      envContent += `\nSNS_ALERTS_TOPIC_ARN=${topicArn}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Synchronized .env.local:`);
    console.log(`   EVENTBRIDGE_BUS_NAME=${BUS_NAME}`);
    console.log(`   SNS_ALERT_TOPIC_ARN=${topicArn}`);
    console.log(`   SNS_ALERTS_TOPIC_ARN=${topicArn}`);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Phase 6: EventBridge & SNS Messaging Setup Complete!`);
  console.log(`   Bus ARN:   ${busArn}`);
  console.log(`   Topic ARN: ${topicArn}`);
  console.log(`==================================================\n`);
}

setupMessaging().catch((err) => {
  console.error('\n❌ EventBridge & SNS Setup Failed:', err);
  process.exit(1);
});
