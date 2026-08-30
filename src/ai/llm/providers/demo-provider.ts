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
  demoDelayMs?: number;
  streamChunkSize?: number;
};

const defaultStructuredOutputs: Record<string, unknown> = {
  "content-analysis": { topic: "示例主题", contentType: "剧情短视频", targetAudience: ["短视频观众"], coreMessage: "清晰表达核心内容。", summary: "这是 Demo Provider 返回的结构化内容分析。" },
  "hook-analysis": { type: "冲突型钩子", content: "一个明确的冲突在开头出现。", score: 80, reason: "开头迅速建立问题。", strengths: ["冲突明确"], problems: ["背景信息较少"] },
  "structure-analysis": [{ stage: "HOOK", content: "开头提出核心问题。", purpose: "吸引注意力", startOrder: 1, endOrder: 1 }],
};

export class DemoProvider implements LLMProvider {
  readonly name = "demo" as const;
  private readonly options: Required<Pick<DemoProviderOptions, "mode" | "model" | "streamChunkSize">> & DemoProviderOptions;

  constructor(options: DemoProviderOptions = {}) {
    this.options = { mode: "success", model: DEFAULT_MODEL, streamChunkSize: 8, ...options };
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    this.ensureAvailable();
    await this.delay(request.signal);
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
    this.ensureAvailable();
    await this.delay(request.signal);
    const keyedOutput = request.structuredOutputKey ? this.options.structuredOutputs?.[request.structuredOutputKey] : undefined;
    const content = this.options.mode === "invalid_json" ? "not valid json" : keyedOutput ?? this.options.structuredOutput ?? this.options.responseText ?? defaultStructuredOutputs[request.structuredOutputKey ?? ""] ?? "{}";
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

  private async delay(signal?: AbortSignal): Promise<void> {
    const duration = Math.max(0, this.options.demoDelayMs ?? 0);
    if (duration === 0) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, duration);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(new LLMProviderError("LLM_TIMEOUT", "Demo Provider timed out.", this.name, true));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}
