import { afterEach, describe, expect, it, vi } from "vitest";
import { DeepSeekProvider } from "@/src/ai/llm/providers/deepseek-provider";

const provider = () => new DeepSeekProvider({ apiKey: "test-key", baseUrl: "https://api.deepseek.test", model: "deepseek-chat" });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("DeepSeekProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps a normal completion and usage fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ model: "deepseek-chat", choices: [{ message: { content: "hello" }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } })));

    const result = await provider().generate({ userPrompt: "hello" });

    expect(result).toMatchObject({ content: "hello", model: "deepseek-chat", finishReason: "stop", usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 } });
    expect(fetch).toHaveBeenCalledWith("https://api.deepseek.test/chat/completions", expect.objectContaining({ method: "POST" }));
  });

  it("maps rate limits to a retryable common error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { message: "slow down" } }, 429)));

    await expect(provider().generate({ userPrompt: "hello" })).rejects.toMatchObject({ code: "LLM_RATE_LIMIT", retryable: true });
  });

  it("maps invalid JSON responses to LLM_INVALID_RESPONSE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));

    await expect(provider().generate({ userPrompt: "hello" })).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE" });
  });

  it("maps aborted requests to a retryable timeout error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError")));

    await expect(provider().generate({ userPrompt: "hello" })).rejects.toMatchObject({ code: "LLM_TIMEOUT", retryable: true });
  });

  it("parses structured JSON returned by DeepSeek once", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ model: "deepseek-chat", choices: [{ message: { content: '{"value":42}' }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })));

    const result = await provider().generateStructured({ userPrompt: "json" });
    expect(result).toEqual({ value: 42 });
  });

  it("maps auth failures without exposing request details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { message: "invalid api key" } }, 401)));

    await expect(provider().generate({ userPrompt: "hello" })).rejects.toMatchObject({ code: "LLM_AUTH_ERROR", provider: "deepseek", retryable: false });
    await expect(provider().generate({ userPrompt: "hello" })).rejects.not.toThrow("test-key");
  });

  it("enables JSON mode for structured generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ model: "deepseek-chat", choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await provider().generateStructured({ userPrompt: "return json", structuredOutputKey: "test-output" });

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as { response_format?: { type?: string } };
    expect(requestBody.response_format).toEqual({ type: "json_object" });
  });

  it("maps a streamed completion into common chunks", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"model":"deepseek-chat","choices":[{"delta":{"content":"hel"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"lo"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));

    const chunks = [];
    for await (const chunk of provider().stream({ userPrompt: "hello" })) chunks.push(chunk);

    expect(chunks.map((chunk) => chunk.delta)).toEqual(["hel", "lo"]);
    expect(chunks[1]?.finishReason).toBe("stop");
    expect(chunks[1]?.usage?.totalTokens).toBe(2);
  });
});
