export class ApiClientError extends Error {
  constructor(message: string, readonly code: string | undefined, readonly status: number) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const raw = await response.text();
  const body = raw ? (JSON.parse(raw) as { error?: string; code?: string } & T) : undefined;
  if (!response.ok) throw new ApiClientError(body?.error ?? "请求失败，请稍后重试。", body?.code, response.status);
  return body as T;
}
