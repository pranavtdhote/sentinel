import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient, isAwsConfigured } from '@/lib/aws/awsClients';
import { AIServiceError } from './aiServiceError';

export interface BedrockInvokeOptions {
  modelId?: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class BedrockClient {
  private readonly defaultModelId: string;

  constructor() {
    this.defaultModelId =
      process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  }

  public getModelId(override?: string): string {
    return override || this.defaultModelId;
  }

  /**
   * Invokes Amazon Bedrock Converse API with timeout, exponential backoff, and throttling protection
   */
  public async invokeConverse(options: BedrockInvokeOptions): Promise<string> {
    const modelId = this.getModelId(options.modelId);
    const timeoutMs = options.timeoutMs || 12000;
    const maxRetries = options.maxRetries || 2;

    if (!isAwsConfigured()) {
      throw new AIServiceError(
        'SERVICE_UNAVAILABLE',
        'AWS credentials not configured. Engaging deterministic fallback sandbox.',
        null,
        modelId
      );
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await bedrockClient.send(
          new ConverseCommand({
            modelId,
            system: [{ text: options.systemPrompt }],
            messages: [
              {
                role: 'user',
                content: [{ text: options.userPrompt }],
              },
            ],
            inferenceConfig: {
              temperature: 0.1,
              maxTokens: 1500,
            },
          }),
          { abortSignal: controller.signal }
        );

        clearTimeout(timeoutHandle);
        const text = response.output?.message?.content?.[0]?.text;
        if (!text) {
          throw new AIServiceError(
            'MALFORMED_OUTPUT',
            'Bedrock returned an empty response content',
            response,
            modelId
          );
        }
        return text;
      } catch (err: unknown) {
        clearTimeout(timeoutHandle);

        const errorObj = err as any;
        if (errorObj?.name === 'AbortError') {
          throw new AIServiceError(
            'TIMEOUT',
            `Bedrock invocation timed out after ${timeoutMs}ms`,
            err,
            modelId
          );
        }

        if (errorObj?.name === 'ThrottlingException') {
          if (attempt <= maxRetries) {
            const backoff = Math.pow(2, attempt) * 400;
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
          throw new AIServiceError(
            'THROTTLED',
            'Bedrock TPS quota exceeded after retries',
            err,
            modelId
          );
        }

        throw new AIServiceError(
          'SERVICE_UNAVAILABLE',
          errorObj?.message || 'Bedrock service invocation failed',
          err,
          modelId
        );
      }
    }

    throw new AIServiceError('SERVICE_UNAVAILABLE', 'Maximum retries exhausted', null, modelId);
  }
}
