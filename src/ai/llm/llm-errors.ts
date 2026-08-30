export type LLMErrorCode =
  | "LLM_AUTH_ERROR"
  | "LLM_RATE_LIMIT"
  | "LLM_TIMEOUT"
  | "LLM_NETWORK_ERROR"
  | "LLM_INVALID_RESPONSE"
  | "LLM_SCHEMA_VALIDATION_ERROR"
  | "LLM_PROVIDER_ERROR";

export class LLMProviderError extends Error {
  constructor(
    public readonly code: LLMErrorCode,
    message: string,
    public readonly provider: string,
    public readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LLMProviderError";
  }
}
