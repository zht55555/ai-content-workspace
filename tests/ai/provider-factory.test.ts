import { describe, expect, it } from "vitest";

import { DeepSeekProvider } from "@/src/ai/llm/providers/deepseek-provider";
import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { getLLMProvider } from "@/src/ai/llm/provider-factory";

describe("LLM Provider Factory", () => {
  it("returns DemoProvider for demo configuration", () => {
    expect(getLLMProvider({ provider: "demo" })).toBeInstanceOf(DemoProvider);
  });

  it("returns DeepSeekProvider for deepseek configuration", () => {
    expect(getLLMProvider({ provider: "deepseek", apiKey: "test-key" })).toBeInstanceOf(DeepSeekProvider);
  });

  it("rejects unsupported providers", () => {
    expect(() => getLLMProvider({ provider: "unknown" as never })).toThrow("Unsupported LLM provider");
  });
});
