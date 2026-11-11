/**
 * Origin of the ClassPing Django API (DJANGO_API_URL) without a trailing slash, or undefined when not configured.
 * Read on every call so tests and deployments can set it after the module loads. Server-side only.
 */
export function backendOrigin() {
  return process.env.DJANGO_API_URL?.replace(/\/$/, "") || undefined;
}

/** Full backend URL for an API path: backendUrl("/api/auth/login/") → "http://127.0.0.1:8000/api/auth/login/". */
export function backendUrl(path: string) {
  const origin = backendOrigin();
  return origin ? `${origin}${path}` : undefined;
}
