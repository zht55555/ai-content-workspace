export class ApiClientError extends Error {
  constructor(message: string, readonly code: string | undefined, readonly status: number) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function getApiErrorMessage(error: unknown, fallback = "请求失败，请稍后重试。") {
  if (error instanceof ApiClientError) {
    const messages: Record<string, string> = {
      TASK_ALREADY_RUNNING: "该任务正在分析中，请稍候。",
      WORKFLOW_INVALID_STATE: "当前任务状态不允许执行此操作。",
      TASK_NOT_FOUND: "任务不存在或已被删除。",
      WORKFLOW_NOT_FOUND: "任务不存在或已被删除。",
    };
    return (error.code && messages[error.code]) || error.message || fallback;
  }
  if (error instanceof TypeError) return "网络连接失败，请稍后重试。";
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const raw = await response.text();
  let body: ({ error?: string; code?: string } & T) | undefined;
  if (raw) {
    try {
      body = JSON.parse(raw) as { error?: string; code?: string } & T;
    } catch {
      body = undefined;
    }
  }
  if (!response.ok) throw new ApiClientError(body?.error ?? "请求失败，请稍后重试。", body?.code, response.status);
  return body as T;
}
