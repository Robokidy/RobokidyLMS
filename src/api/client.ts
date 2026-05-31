const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, "");

export const API_ROOT = trimTrailingSlash(import.meta.env.VITE_API_URL || "http://localhost:5000");
export const API_BASE = API_ROOT.endsWith("/api") ? API_ROOT : `${API_ROOT}/api`;
export const baseURL = API_BASE;

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = trimLeadingSlash(path);
  return cleanPath.startsWith("api/") ? `${API_ROOT}/${cleanPath}` : `${API_BASE}/${cleanPath}`;
}

function isFormOrBinaryBody(body: BodyInit | null | undefined) {
  return body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || body instanceof URLSearchParams;
}

export async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);
  const body = options.body;

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body && typeof body === "object" && !isFormOrBinaryBody(body as BodyInit) && !(body instanceof ReadableStream)) {
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");
    options = { ...options, body: JSON.stringify(body) };
  } else if (body && !headers.has("Content-Type") && typeof body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(apiUrl(path), { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const fallback =
      res.status === 401 ? "Unauthorized or session expired" :
      res.status === 404 ? "API route not found" :
      res.status >= 500 ? "Server unavailable" :
      "Request failed";
    throw new Error(typeof data === "object" && data?.message ? data.message : fallback);
  }

  return data;
}

export const client = {
  get: (path: string, options: RequestInit = {}) => apiFetch(path, { ...options, method: "GET" }),
  post: (path: string, body?: unknown, options: RequestInit = {}) => apiFetch(path, { ...options, method: "POST", body: body as BodyInit }),
  put: (path: string, body?: unknown, options: RequestInit = {}) => apiFetch(path, { ...options, method: "PUT", body: body as BodyInit }),
  delete: (path: string, options: RequestInit = {}) => apiFetch(path, { ...options, method: "DELETE" })
};
