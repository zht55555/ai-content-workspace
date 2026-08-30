export type LLMRole = "system" | "user" | "assistant";

export type LLMMessage = {
  role: LLMRole;
  content: string;
};

export type LLMUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LLMFinishReason = "stop" | "length" | "tool_call" | "unknown";

export type GenerateRequest = {
  systemPrompt?: string;
  messages?: LLMMessage[];
  userPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type GenerateResult = {
  content: string;
  finishReason: LLMFinishReason;
  usage: LLMUsage;
  model: string;
};

export type StreamChunk = {
  delta: string;
  finishReason?: LLMFinishReason;
  usage?: LLMUsage;
  model?: string;
};

export type StructuredGenerateRequest = GenerateRequest & {
  structuredOutputKey?: string;
};

export type ProviderName = "demo" | "deepseek";

export interface LLMProvider {
  readonly name: ProviderName;
  generate(request: GenerateRequest): Promise<GenerateResult>;
  stream(request: GenerateRequest): AsyncIterable<StreamChunk>;
  generateStructured(request: StructuredGenerateRequest): Promise<unknown>;
}
