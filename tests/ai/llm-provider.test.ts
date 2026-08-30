import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { LLMProviderError } from "@/src/ai/llm/llm-errors";

const request = { userPrompt: "Return a greeting" };
const greetingSchema = z.object({ greeting: z.string() });

describe("DemoProvider", () => {
  it("generates text with normalized usage", async () => {
    const result = await new DemoProvider({ responseText: "hello" }).generate(request);

    expect(result.content).toBe("hello");
    expect(result.finishReason).toBe("stop");
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });

  it("streams multiple chunks instead of one complete response", async () => {
    const chunks = [];
    for await (const chunk of new DemoProvider({ responseText: "hello world", streamChunkSize: 5 }).stream(request)) {
      if (chunk.delta) chunks.push(chunk.delta);
    }

    expect(chunks).toEqual(["hello", " worl", "d"]);
  });

  it("parses and validates structured output", async () => {
    const result = await new DemoProvider({ structuredOutput: { greeting: "hello" } }).generateStructured({ ...request, schema: greetingSchema });

    expect(result).toEqual({ greeting: "hello" });
  });

  it("throws a schema error after the bounded retry count", async () => {
    const provider = new DemoProvider({ mode: "invalid_json" });

    await expect(provider.generateStructured({ ...request, schema: greetingSchema })).rejects.toMatchObject({
      code: "LLM_SCHEMA_VALIDATION_ERROR",
      retryable: false,
    });
  });

  it("exposes simulated provider errors through the common error model", async () => {
    const provider = new DemoProvider({ mode: "provider_error" });

    await expect(provider.generate(request)).rejects.toBeInstanceOf(LLMProviderError);
  });
});
