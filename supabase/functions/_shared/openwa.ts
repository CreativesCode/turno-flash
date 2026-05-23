// Cliente OpenWA compartido entre Edge Functions.
// La URL base y la API key se leen de los secrets de Edge Functions
// (`OPENWA_BASE_URL`, `OPENWA_API_KEY`) — cambiarlas con:
//   npx supabase secrets set OPENWA_BASE_URL=https://nuevo-host.com/api

// Deno global: este archivo corre en Deno (Supabase Edge Functions).
// El editor usa tsconfig de Node y no lo conoce — silenciamos aquí.
declare const Deno: { env: { get(key: string): string | undefined } };

const OPENWA_BASE_URL = Deno.env.get("OPENWA_BASE_URL") ?? "";
const OPENWA_API_KEY = Deno.env.get("OPENWA_API_KEY") ?? "";

if (!OPENWA_BASE_URL || !OPENWA_API_KEY) {
  console.warn(
    "[openwa] OPENWA_BASE_URL u OPENWA_API_KEY no están configuradas"
  );
}

export interface OpenWaSendTextInput {
  sessionId: string;
  chatId: string;
  text: string;
}

export interface OpenWaResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

export interface SendTextData {
  messageId: string;
  status: string;
  timestamp: string;
}

/** Convierte un teléfono a chatId WhatsApp.
 *  - Si el número empieza con `+` → es internacional explícito, se ignora `countryCode`.
 *  - Si ya empieza con el `countryCode` → no se duplica.
 *  - Si no, se prepende el `countryCode`.
 */
export function phoneToChatId(phone: string, countryCode?: string): string {
  const raw = (phone ?? "").trim();

  if (raw.startsWith("+")) {
    return `${raw.slice(1).replace(/[^\d]/g, "")}@c.us`;
  }

  const num = raw.replace(/[^\d]/g, "");
  const cc = (countryCode ?? "").replace(/[^\d]/g, "");
  const full = !cc || num.startsWith(cc) ? num : `${cc}${num}`;
  return `${full}@c.us`;
}

/** Extrae el número (sin sufijo @c.us) de un chatId. */
export function chatIdToPhone(chatId: string): string {
  return chatId.split("@")[0];
}

async function call<T>(
  path: string,
  init: RequestInit
): Promise<OpenWaResponse<T>> {
  const url = `${OPENWA_BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": OPENWA_API_KEY,
        "X-Request-ID": `req_${Date.now()}`,
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    // Fallo de red (ngrok caído, OPENWA_BASE_URL inválida, DNS, etc.)
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: `No se pudo conectar a OpenWA (${url}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
    };
  }

  // Parsear el body como JSON; si no, devolverlo como texto para diagnosticar
  const rawText = await res.text();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return {
      success: false,
      error: {
        code: "INVALID_RESPONSE",
        message: `OpenWA devolvió non-JSON (status ${res.status}): ${rawText.slice(
          0,
          300
        )}`,
      },
    };
  }

  // OpenWA responde en dos formatos según el endpoint/versión:
  //   A) { success: true, data: {...} }        ← lo que dice la doc
  //   B) { messageId, timestamp, ... }         ← lo que devuelve hoy send-text
  //   Error: { success: false, error: "...", message: "...", statusCode }
  //          o { error, message, statusCode } sin success
  if (!res.ok || raw.success === false) {
    return {
      success: false,
      error: {
        code: String(
          raw.error ?? raw.code ?? `HTTP_${res.status}`
        ),
        message: String(
          raw.message ??
            (raw.error as unknown) ??
            `${res.statusText}: ${rawText.slice(0, 200)}`
        ),
        details: raw,
      },
    };
  }

  // Éxito: si vino el formato A, devolverlo; si vino el B, envolverlo.
  if (raw.success === true && raw.data !== undefined) {
    return raw as unknown as OpenWaResponse<T>;
  }
  return { success: true, data: raw as unknown as T };
}

export function sendText(
  input: OpenWaSendTextInput
): Promise<OpenWaResponse<SendTextData>> {
  return call<SendTextData>(
    `/sessions/${input.sessionId}/messages/send-text`,
    {
      method: "POST",
      body: JSON.stringify({
        chatId: input.chatId,
        text: input.text,
      }),
    }
  );
}

export function checkNumber(
  sessionId: string,
  phone: string
): Promise<OpenWaResponse<{ exists: boolean; chatId: string }>> {
  const clean = phone.replace(/[^\d]/g, "");
  return call(`/sessions/${sessionId}/contacts/check/${clean}`, {
    method: "GET",
  });
}

/** Verifica firma HMAC SHA-256 enviada por OpenWA en el header X-OpenWA-Signature. */
export async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const expected = await hmacSha256Hex(secret, rawBody);
  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  return timingSafeEqual(expected, provided);
}

async function hmacSha256Hex(
  secret: string,
  message: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
