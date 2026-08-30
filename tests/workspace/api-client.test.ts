import { describe, expect, it, vi } from "vitest";

import { ApiClientError, requestJson } from "@/src/lib/api/client";

describe("API client", () => {
  it("returns JSON for a successful request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await expect(requestJson<{ ok: boolean }>("/api/example")).resolves.toEqual({ ok: true });
  });

  it("converts non-2xx responses into a readable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "任务不存在", code: "TASK_NOT_FOUND" }), { status: 404 })));
    await expect(requestJson("/api/example")).rejects.toEqual(new ApiClientError("任务不存在", "TASK_NOT_FOUND", 404));
  });
});
