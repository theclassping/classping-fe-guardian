/**
 * Browser URL of a backend endpoint behind the app's /api/proxy route, which adds the session token.
 * proxyUrl("gateway/payments?student_id=6") → "/api/proxy/gateway/payments?student_id=6".
 * No trailing slash: Next.js would answer it with a redirect; the proxy adds Django's slash itself.
 */
export function proxyUrl(path: string) {
  return `/api/proxy/${path.replace(/^\/+/, "")}`;
}

/** Query string that keeps the selected child on dashboard links ("?student_id=6"; "?child=…" before a student is known). */
export function childQueryFor(studentId: string | undefined, childId: string) {
  return studentId ? `?student_id=${encodeURIComponent(studentId)}` : `?child=${childId}`;
}
