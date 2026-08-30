export type StructuredOutputErrorCode =
  | "STRUCTURED_OUTPUT_INVALID_JSON"
  | "STRUCTURED_OUTPUT_SCHEMA_ERROR"
  | "STRUCTURED_OUTPUT_RETRY_EXHAUSTED";

export class StructuredOutputError extends Error {
  constructor(
    public readonly code: StructuredOutputErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "StructuredOutputError";
  }
}
