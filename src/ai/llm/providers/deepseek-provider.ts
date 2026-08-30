import { LLMProviderError } from "../llm-errors";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL, DEFAULT_TEMPERATURE, normalizeFinishReason, normalizeMessages, normalizeUsage, parseJsonContent } from "../llm-utils";
import type { GenerateRequest, GenerateResult, LLMProvider, StreamChunk, StructuredGenerateRequest, StructuredGenerateResult } from "../llm-types";

type DeepSeekProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
};

type DeepSeekResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek" as const;
  private readonly options: Required<DeepSeekProviderOptions>;

  constructor(options: DeepSeekProviderOptions) {
    this.options = { baseUrl: "https://api.deepseek.com", model: DEFAULT_MODEL, timeoutMs: 30_000, ...options };
    if (!this.options.apiKey) throw new LLMProviderError("LLM_AUTH_ERROR", "DeepSeek API key is not configured.", this.name, false);
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const response = await this.request(request, false);
    const choice = response.choices?.[0];
    if (!choice?.message?.content) throw new LLMProviderError("LLM_INVALID_RESPONSE", "DeepSeek returned no message content.", this.name, false);
    return {
      content: choice.message.content,
      finishReason: normalizeFinishReason(choice.finish_reason),
      usage: normalizeUsage({
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      }),
      model: response.model ?? this.options.model,
      usageAvailable: Boolean(response.usage),
    };
  }

  async *stream(request: GenerateRequest): AsyncIterable<StreamChunk> {
    const response = await this.request(request, true);
    if (!response.body) throw new LLMProviderError("LLM_INVALID_RESPONSE", "DeepSeek returned an empty stream.", this.name, false);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const data = line.trim();
        if (!data.startsWith("data:") || data.slice(5).trim() === "[DONE]") continue;
        yield this.toStreamChunk(data.slice(5).trim());
      }
      if (done) break;
    }
  }

  async generateStructured(request: StructuredGenerateRequest): Promise<unknown> {
    return (await this.generateStructuredWithUsage(request)).output;
  }

  async generateStructuredWithUsage(request: StructuredGenerateRequest): Promise<StructuredGenerateResult> {
    const result = await this.generate({ ...request, systemPrompt: `${request.systemPrompt ?? ""}\nReturn only valid JSON.`.trim() });
    try {
      return { output: parseJsonContent(result.content, this.name), usage: result.usageAvailable === false ? null : result.usage, model: result.model };
    } catch (cause) {
      throw new LLMProviderError("LLM_INVALID_RESPONSE", "DeepSeek returned invalid structured JSON.", this.name, false, { cause });
    }
  }

  private request(request: GenerateRequest, stream: false): Promise<DeepSeekResponse>;
  private request(request: GenerateRequest, stream: true): Promise<Response>;
  private async request(request: GenerateRequest, stream: boolean): Promise<DeepSeekResponse | Response> {
    const controller = new AbortController();
    const structuredOutputKey = "structuredOutputKey" in request && typeof request.structuredOutputKey === "string" ? request.structuredOutputKey : undefined;
    const timeout = setTimeout(() => controller.abort(), request.signal ? this.options.timeoutMs : this.options.timeoutMs);
    request.signal?.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      const response = await fetch(`${this.options.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.options.apiKey}` },
        body: JSON.stringify({
          model: request.model ?? this.options.model,
          messages: normalizeMessages(request),
          temperature: request.temperature ?? DEFAULT_TEMPERATURE,
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          response_format: structuredOutputKey ? { type: "json_object" } : undefined,
          stream,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw await this.mapHttpError(response);
      if (stream) return response;
      try {
        return (await response.json()) as DeepSeekResponse;
      } catch (cause) {
        throw new LLMProviderError("LLM_INVALID_RESPONSE", "DeepSeek returned invalid JSON.", this.name, false, { cause });
      }
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") throw new LLMProviderError("LLM_TIMEOUT", "DeepSeek request timed out.", this.name, true, { cause: error });
      throw new LLMProviderError("LLM_NETWORK_ERROR", "DeepSeek request failed.", this.name, true, { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async mapHttpError(response: Response) {
    const code = response.status === 401 || response.status === 403 ? "LLM_AUTH_ERROR" : response.status === 429 ? "LLM_RATE_LIMIT" : "LLM_PROVIDER_ERROR";
    return new LLMProviderError(code, `DeepSeek request failed with status ${response.status}.`, this.name, code === "LLM_RATE_LIMIT" || response.status >= 500);
  }

  private toStreamChunk(raw: string): StreamChunk {
    try {
      const data = JSON.parse(raw) as DeepSeekResponse;
      const choice = data.choices?.[0];
      return {
        delta: choice?.message?.content ?? (choice as { delta?: { content?: string } } | undefined)?.delta?.content ?? "",
        finishReason: normalizeFinishReason(choice?.finish_reason),
        usage: data.usage
          ? normalizeUsage({ promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens })
          : undefined,
        model: data.model ?? this.options.model,
      };
    } catch (cause) {
      throw new LLMProviderError("LLM_INVALID_RESPONSE", "DeepSeek returned an invalid stream chunk.", this.name, false, { cause });
    }
  }
}
