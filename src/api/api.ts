const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const configuredUrl = import.meta.env.VITE_API_URL;

export const API_BASE_URL = configuredUrl
  ? trimTrailingSlash(configuredUrl.endsWith("/api") ? configuredUrl : `${configuredUrl}/api`)
  : "/api";

export const API_ROOT = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL.slice(0, -4) || ""
  : API_BASE_URL;
