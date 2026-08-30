import { LLMProviderError } from "../llm-errors";
import { DEFAULT_MODEL, normalizeUsage, parseJsonContent } from "../llm-utils";
import type { GenerateRequest, GenerateResult, LLMProvider, StreamChunk, StructuredGenerateRequest } from "../llm-types";

export type DemoMode = "success" | "timeout" | "invalid_json" | "provider_error";

export type DemoProviderOptions = {
  mode?: DemoMode;
  model?: string;
  responseText?: string;
  structuredOutput?: unknown;
  structuredOutputs?: Record<string, unknown>;
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

  async generateStructured(request: StructuredGenerateRequest): Promise<unknown> {
    void request;
    this.ensureAvailable();
    const keyedOutput = request.structuredOutputKey ? this.options.structuredOutputs?.[request.structuredOutputKey] : undefined;
    const content = this.options.mode === "invalid_json" ? "not valid json" : keyedOutput ?? this.options.structuredOutput ?? this.options.responseText ?? "{}";
    try {
      return typeof content === "string" ? parseJsonContent(content, this.name) : content;
    } catch (cause) {
      throw new LLMProviderError("LLM_INVALID_RESPONSE", "Demo Provider returned invalid structured JSON.", this.name, false, { cause });
    }
  }

  private ensureAvailable() {
    if (this.options.mode === "timeout") throw new LLMProviderError("LLM_TIMEOUT", "Demo Provider timed out.", this.name, true);
    if (this.options.mode === "provider_error") throw new LLMProviderError("LLM_PROVIDER_ERROR", "Demo Provider failed.", this.name, false);
  }
}
