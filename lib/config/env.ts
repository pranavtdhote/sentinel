import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AWS_REGION: z.string().default('us-east-1'),
  STAGE: z.string().default('dev'),
  BEDROCK_MODEL_ID: z.string().default('amazon.nova-pro-v1:0'),
  BEDROCK_FALLBACK_MODEL_ID: z.string().default('amazon.nova-lite-v1:0'),
  BEDROCK_KNOWLEDGE_BASE_ID: z.string().default('KB-SENTINEL-RUNBOOKS'),
  DYNAMODB_TABLE_NAME: z.string().default('sentinel-records-dev'),
  S3_RUNBOOKS_BUCKET: z.string().default('sentinel-runbooks-dev'),
  S3_REPORTS_BUCKET: z.string().default('sentinel-reports-dev'),
  ENABLE_MOCK_FALLBACK: z.string().default('true'),
  MOCK_LATENCY_MS: z.string().default('350'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    return envSchema.parse({});
  }
  return result.data;
}

export const env = validateEnv();
