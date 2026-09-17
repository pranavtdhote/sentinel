export type AIServiceErrorCode =
  | 'MALFORMED_OUTPUT'
  | 'INVALID_ENUM'
  | 'TIMEOUT'
  | 'THROTTLED'
  | 'SERVICE_UNAVAILABLE'
  | 'SCHEMA_VALIDATION_FAILED';

export class AIServiceError extends Error {
  constructor(
    public readonly code: AIServiceErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly modelId?: string,
    public readonly promptVersion?: string
  ) {
    super(`[AIServiceError: ${code}] ${message}`);
    this.name = 'AIServiceError';
  }
}
