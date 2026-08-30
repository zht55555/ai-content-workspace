import { describe, expect, it } from "vitest";
import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { LLMProviderError } from "@/src/ai/llm/llm-errors";

const request = { userPrompt: "Return a greeting" };

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

  it("parses structured JSON once and leaves business validation to the Service", async () => {
    const result = await new DemoProvider({ structuredOutput: { greeting: "hello" } }).generateStructured(request);

    expect(result).toEqual({ greeting: "hello" });
  });

  it("throws a provider invalid-response error for malformed JSON without retrying", async () => {
    const provider = new DemoProvider({ mode: "invalid_json" });

    await expect(provider.generateStructured(request)).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE", retryable: false });
  });

  it("exposes simulated provider errors through the common error model", async () => {
    const provider = new DemoProvider({ mode: "provider_error" });

    await expect(provider.generate(request)).rejects.toBeInstanceOf(LLMProviderError);
  });
});
