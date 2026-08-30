export const apiOrigin = (import.meta.env.VITE_API_ORIGIN || "http://localhost:9002").replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${apiOrigin}${path}`;
}

export function socketUrl(path: string): string {
  const url = new URL(apiUrl(path));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export async function apiRequest<Result>(path: string, init?: RequestInit): Promise<Result> {
  const response = await fetch(apiUrl(path), init);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status})`);
  }

  return body as Result;
}
