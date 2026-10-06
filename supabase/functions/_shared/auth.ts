// Who is calling an Edge Function, read from the Authorization bearer.
//
// These functions keep verify_jwt = true (the default), so the Supabase gateway
// has already checked the token signature before the request reaches us: the
// payload can be trusted without verifying it again. What the gateway does NOT
// check is the role, and the public anon key is a valid JWT too.

export function bearerRole(req: Request): string | null {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return typeof claims.role === "string" ? claims.role : null;
  } catch {
    return null;
  }
}

// Triggers (pg_net) and crons call with the service role key from app_config.
export function isServiceRole(req: Request): boolean {
  return bearerRole(req) === "service_role";
}
