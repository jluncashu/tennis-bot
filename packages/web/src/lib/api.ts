const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error ?? `Request failed with status ${res.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}
