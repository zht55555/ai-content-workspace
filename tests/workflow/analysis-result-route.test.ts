import { GET } from "@/app/api/tasks/[taskId]/results/latest/route";
import { describe, expect, it } from "vitest";

describe("latest analysis result route", () => {
  it("returns 404 when the task does not exist", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ taskId: "00000000-0000-0000-0000-000000000000" }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "TASK_NOT_FOUND" });
  });
});
