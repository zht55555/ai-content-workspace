import { LLMProviderError } from "../llm-errors";
import { DEFAULT_MODEL, normalizeUsage, parseJsonContent } from "../llm-utils";
import type { GenerateRequest, GenerateResult, LLMProvider, StreamChunk, StructuredGenerateRequest, StructuredGenerateResult } from "../llm-types";

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
  "content-analysis": { topic: "困难中的解决办法", contentType: "剧情短视频", targetAudience: ["短视频观众"], coreMessage: "清晰表达面对困难并找到解决办法。", summary: "一个人面对困难，最后找到解决办法。" },
  "hook-analysis": { type: "冲突型钩子", content: "开头直接呈现一个人面对困难。", score: 80, reason: "开头迅速建立问题。", strengths: ["冲突明确"], problems: ["背景信息较少"] },
  "structure-analysis": [{ stage: "HOOK", content: "开头提出核心问题。", purpose: "吸引注意力", startOrder: 1, endOrder: 1 }],
  "emotion-analysis": { overallTone: "克服困难后的积极", emotionalArc: "从压力逐步转向解决问题后的释然。", emotionPoints: [{ type: "CONFLICT", content: "面对困难", intensity: 70, reason: "形成主要压力。" }, { type: "SATISFACTION", content: "找到解决办法", intensity: 80, reason: "形成结果上的满足。" }] },
  optimization: { strengths: ["主题清晰"], weaknesses: ["背景信息较少"], keep: ["保留面对困难的主线"], change: ["补充解决过程"], rhythmSuggestions: ["前置冲突"], structureSuggestions: ["强化转折"], contentSuggestions: ["增加具体行动"] },
  "script-generation": { title: "困难中的解决办法", coreDirection: "困难中的解决办法", script: "先呈现困难，再展示关键行动，最后说明如何找到解决办法。", notes: ["保持原主题", "突出行动过程"] },
  "marketing-content": { titles: ["遇到困难时，真正有效的解决办法是什么？"], coverTexts: ["困难也能找到出口"], publishCopy: "困难中的解决办法：从压力出发，找到真正可执行的行动。", keywords: ["解决问题", "成长", "短视频"] },
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
      usageAvailable: true,
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
    return (await this.generateStructuredWithUsage(request)).output;
  }

  async generateStructuredWithUsage(request: StructuredGenerateRequest): Promise<StructuredGenerateResult> {
    this.ensureAvailable();
    await this.delay(request.signal);
    const keyedOutput = request.structuredOutputKey ? this.options.structuredOutputs?.[request.structuredOutputKey] : undefined;
    const content = this.options.mode === "invalid_json" ? "not valid json" : keyedOutput ?? this.options.structuredOutput ?? this.options.responseText ?? defaultStructuredOutputs[request.structuredOutputKey ?? ""] ?? "{}";
    try {
      return { output: typeof content === "string" ? parseJsonContent(content, this.name) : content, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, model: this.options.model ?? DEFAULT_MODEL };
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
