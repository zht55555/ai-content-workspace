import { ZodError } from "zod";

import { LLMProviderError } from "../llm/llm-errors";
import type { LLMProvider } from "../llm/llm-types";
import { PromptBuildError } from "../prompts/prompt.errors";
import type { PromptDefinition } from "../prompts/prompt.types";
import { StructuredOutputError } from "./structured-output.errors";

const DEFAULT_MAX_RETRIES = 2;
const REPAIR_INSTRUCTION = "上一次返回结果未通过校验，请严格按照指定 JSON 结构重新输出，不要返回 Markdown。";

export class StructuredGenerationService {
  constructor(private readonly provider: LLMProvider) {}

  async generate<TInput, TOutput>(definition: PromptDefinition<TInput, TOutput>, input: TInput, options: { maxRetries?: number } = {}): Promise<TOutput> {
    const maxRetries = Math.min(Math.max(options.maxRetries ?? DEFAULT_MAX_RETRIES, 0), DEFAULT_MAX_RETRIES);
    let userPrompt: string;

    try {
      userPrompt = definition.buildUserPrompt(input);
    } catch (cause) {
      throw new PromptBuildError(`Failed to build prompt ${definition.id}.`, { cause });
    }

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const result = await this.provider.generateStructured({
          systemPrompt: definition.systemPrompt,
          userPrompt: attempt === 0 ? userPrompt : `${userPrompt}\n\n${REPAIR_INSTRUCTION}`,
          structuredOutputKey: definition.id,
        });

        if (result === undefined || result === null) {
          throw new StructuredOutputError("STRUCTURED_OUTPUT_INVALID_JSON", "Structured output is missing.");
        }

        return definition.outputSchema.parse(result);
      } catch (error) {
        const normalized = this.normalizeError(error);
        if (!this.shouldRetry(normalized) || attempt === maxRetries) {
          if (this.shouldRetry(normalized) && attempt === maxRetries) {
            throw new StructuredOutputError("STRUCTURED_OUTPUT_RETRY_EXHAUSTED", `Structured output for ${definition.id} failed after ${maxRetries} retries.`, { cause: normalized });
          }
          throw normalized;
        }
      }
    }

    throw new StructuredOutputError("STRUCTURED_OUTPUT_RETRY_EXHAUSTED", `Structured output for ${definition.id} failed.`);
  }

  private normalizeError(error: unknown): unknown {
    if (error instanceof LLMProviderError && error.code === "LLM_INVALID_RESPONSE") {
      return new StructuredOutputError("STRUCTURED_OUTPUT_INVALID_JSON", "Provider returned invalid structured output.", { cause: error });
    }
    if (error instanceof StructuredOutputError || error instanceof PromptBuildError || error instanceof LLMProviderError) return error;
    if (error instanceof ZodError) return new StructuredOutputError("STRUCTURED_OUTPUT_SCHEMA_ERROR", "Structured output did not match the Prompt schema.", { cause: error });
    return error;
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof StructuredOutputError) return error.code === "STRUCTURED_OUTPUT_INVALID_JSON" || error.code === "STRUCTURED_OUTPUT_SCHEMA_ERROR";
    return error instanceof LLMProviderError && error.retryable;
  }
}
