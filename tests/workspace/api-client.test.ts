import { describe, expect, it, vi } from "vitest";

import { ApiClientError, getApiErrorMessage, requestJson } from "@/src/lib/api/client";

describe("API client", () => {
  it("returns JSON for a successful request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await expect(requestJson<{ ok: boolean }>("/api/example")).resolves.toEqual({ ok: true });
  });

  it("converts non-2xx responses into a readable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "任务不存在", code: "TASK_NOT_FOUND" }), { status: 404 })));
    await expect(requestJson("/api/example")).rejects.toEqual(new ApiClientError("任务不存在", "TASK_NOT_FOUND", 404));
  });

  it("converts non-JSON errors into a stable API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream unavailable", { status: 502 })));
    await expect(requestJson("/api/example")).rejects.toEqual(new ApiClientError("请求失败，请稍后重试。", undefined, 502));
  });

  it("maps known API errors to user-facing messages", () => {
    expect(getApiErrorMessage(new ApiClientError("Task already has a queued or running workflow.", "TASK_ALREADY_RUNNING", 409))).toBe("该任务正在分析中，请稍候。 ".trim());
    expect(getApiErrorMessage(new TypeError("network"))).toBe("网络连接失败，请稍后重试。");
  });
});
