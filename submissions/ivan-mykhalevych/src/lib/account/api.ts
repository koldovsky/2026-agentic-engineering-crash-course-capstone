export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export async function callApi<T>(
  fetcher: Fetcher,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const init: RequestInit = { method, credentials: "same-origin" };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers = { "Content-Type": "application/json" };
    }
    const response = await fetcher(path, init);
    const data = (await response.json()) as unknown;
    if (response.ok) return { ok: true, data: data as T };
    const error = (data as { error?: unknown } | null)?.error;
    return { ok: false, error: typeof error === "string" ? error : "network-error" };
  } catch {
    return { ok: false, error: "network-error" };
  }
}
