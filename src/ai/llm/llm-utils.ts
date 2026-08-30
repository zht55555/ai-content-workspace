import type { GenerateRequest, LLMFinishReason, LLMMessage, LLMUsage } from "./llm-types";

export const DEFAULT_MODEL = "deepseek-chat";
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 2_000;

export function normalizeMessages(request: GenerateRequest): LLMMessage[] {
  const messages: LLMMessage[] = [];
  if (request.systemPrompt) messages.push({ role: "system", content: request.systemPrompt });
  if (request.messages) messages.push(...request.messages);
  if (request.userPrompt) messages.push({ role: "user", content: request.userPrompt });
  return messages;
}

export function normalizeUsage(usage?: Partial<LLMUsage>): LLMUsage {
  const promptTokens = usage?.promptTokens ?? 0;
  const completionTokens = usage?.completionTokens ?? 0;
  return { promptTokens, completionTokens, totalTokens: usage?.totalTokens ?? promptTokens + completionTokens };
}

export function normalizeFinishReason(reason?: string | null): LLMFinishReason {
  if (reason === "stop" || reason === "length") return reason;
  if (reason === "tool_calls" || reason === "tool_call") return "tool_call";
  return "unknown";
}

export function parseJsonContent(content: string, provider: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch (cause) {
    throw new SyntaxError(`Provider ${provider} returned invalid JSON.`, { cause });
  }
}
