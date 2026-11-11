/**
 * Decodes base64url JSON (JWT payloads, the identity cookie). Uses atob/TextDecoder, so it runs
 * in route handlers, server components and proxy.ts alike. Returns undefined for anything unreadable.
 */
export function decodeBase64UrlJson<T>(value?: string): T | undefined {
  if (!value) return undefined;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))) as T;
  } catch {
    return undefined;
  }
}

/** Claims of a SimpleJWT access token, read without verifying it; the backend remains the authority. */
export function accessTokenClaims(token?: string): { user_id?: number | string; exp?: number } {
  const claims = decodeBase64UrlJson<{ user_id?: unknown; exp?: unknown }>(token?.split(".")[1]);
  return {
    user_id: typeof claims?.user_id === "number" || typeof claims?.user_id === "string" ? claims.user_id : undefined,
    exp: typeof claims?.exp === "number" ? claims.exp : undefined,
  };
}
