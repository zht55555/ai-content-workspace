import { ZodError } from "zod";

import { LLMProviderError } from "../llm-errors";
import { DEFAULT_MODEL, normalizeUsage, parseJsonContent } from "../llm-utils";
import type { GenerateRequest, GenerateResult, LLMProvider, StreamChunk, StructuredGenerateRequest } from "../llm-types";

export type DemoMode = "success" | "timeout" | "invalid_json" | "provider_error";

export type DemoProviderOptions = {
  mode?: DemoMode;
  model?: string;
  responseText?: string;
  structuredOutput?: unknown;
  streamChunkSize?: number;
};

export class DemoProvider implements LLMProvider {
  readonly name = "demo" as const;
  private readonly options: Required<Pick<DemoProviderOptions, "mode" | "model" | "streamChunkSize">> & DemoProviderOptions;

  constructor(options: DemoProviderOptions = {}) {
    this.options = { mode: "success", model: DEFAULT_MODEL, streamChunkSize: 8, ...options };
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    void request;
    this.ensureAvailable();
    const content = this.options.responseText ?? "Demo Provider response";
    return {
      content: this.options.mode === "invalid_json" ? "not valid json" : content,
      finishReason: "stop",
      usage: normalizeUsage({ promptTokens: 10, completionTokens: Math.max(1, content.length), totalTokens: 10 + Math.max(1, content.length) }),
      model: this.options.model ?? DEFAULT_MODEL,
    };
  }

  async *stream(request: GenerateRequest): AsyncIterable<StreamChunk> {
    const result = await this.generate(request);
    const size = this.options.streamChunkSize ?? 8;
    for (let index = 0; index < result.content.length; index += size) {
      yield { delta: result.content.slice(index, index + size), model: result.model };
    }
    yield { delta: "", finishReason: result.finishReason, usage: result.usage, model: result.model };
  }

  async generateStructured<T>(request: StructuredGenerateRequest<T>): Promise<T> {
    const maxRetries = Math.min(Math.max(request.maxRetries ?? 2, 0), 2);
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        this.ensureAvailable();
        const content = this.options.structuredOutput ?? this.options.responseText ?? "{}";
        const candidate = typeof content === "string" ? parseJsonContent(content, this.name) : content;
        return request.schema.parse(candidate);
      } catch (error) {
        lastError = error;
        if (!(error instanceof ZodError) && !(error instanceof Error && error.message.includes("invalid JSON"))) throw error;
      }
    }
    throw new LLMProviderError("LLM_SCHEMA_VALIDATION_ERROR", "Demo Provider structured output failed schema validation.", this.name, false, { cause: lastError });
  }

  private ensureAvailable() {
    if (this.options.mode === "timeout") throw new LLMProviderError("LLM_TIMEOUT", "Demo Provider timed out.", this.name, true);
    if (this.options.mode === "provider_error") throw new LLMProviderError("LLM_PROVIDER_ERROR", "Demo Provider failed.", this.name, false);
  }
}
