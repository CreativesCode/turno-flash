// Edge Function: revenuecat-webhook
//
// Recibe los eventos del webhook de RevenueCat y actualiza la licencia de la
// organización vía apply_revenuecat_event() (migración 021).
//
// Seguridad: RevenueCat envía un header Authorization configurable. Debe
// coincidir con el secret REVENUECAT_WEBHOOK_AUTH.
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<valor>
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// El app_user_id de RevenueCat es el organization_id (ver utils/revenuecat.ts).
// Docs del payload: https://www.revenuecat.com/docs/integrations/webhooks

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  store?: string;
  environment?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  purchased_at_ms?: number;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  // 1. Verificar el header Authorization configurado en RevenueCat
  const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expectedAuth) {
    console.error("[revenuecat-webhook] REVENUECAT_WEBHOOK_AUTH not set");
    return json(500, { success: false, error: "Webhook auth not configured" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  // RevenueCat envía el valor tal cual se configura; aceptar con o sin "Bearer "
  if (
    authHeader !== expectedAuth &&
    authHeader !== `Bearer ${expectedAuth}`
  ) {
    console.warn("[revenuecat-webhook] invalid Authorization header");
    return json(401, { success: false, error: "Unauthorized" });
  }

  try {
    const body = (await req.json()) as { event?: RevenueCatEvent };
    const event = body.event;

    if (!event?.id || !event.type) {
      return json(400, { success: false, error: "Invalid event payload" });
    }

    console.log("[revenuecat-webhook] event", {
      id: event.id,
      type: event.type,
      app_user_id: event.app_user_id,
      product_id: event.product_id,
      environment: event.environment,
    });

    // Evento de prueba del dashboard de RevenueCat
    if (event.type === "TEST") {
      return json(200, { success: true, test: true });
    }

    // 2. Resolver organization_id: el primer alias con forma de UUID.
    //    (app_user_id puede ser un id anónimo $RCAnonymousID:... si la compra
    //    ocurrió antes del logIn; los aliases incluyen todos los ids vinculados)
    const candidates = [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
    ].filter(Boolean) as string[];

    const organizationId = candidates.find((id) => UUID_REGEX.test(id));

    if (!organizationId) {
      // 200 para que RevenueCat no reintente indefinidamente; queda en sus logs
      console.warn(
        "[revenuecat-webhook] no UUID app_user_id found",
        candidates
      );
      return json(200, {
        success: false,
        skipped: true,
        reason: "No organization id (UUID) in app_user_id/aliases",
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Verificar que la organización exista
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .maybeSingle();

    if (!org) {
      console.warn("[revenuecat-webhook] organization not found", organizationId);
      return json(200, {
        success: false,
        skipped: true,
        reason: `Organization ${organizationId} not found`,
      });
    }

    // 4. Aplicar el evento (idempotente por event_id)
    const { data, error } = await supabase.rpc("apply_revenuecat_event", {
      p_organization_id: organizationId,
      p_event_id: event.id,
      p_event_type: event.type,
      p_product_id: event.product_id ?? null,
      p_store: event.store ?? null,
      p_environment: event.environment ?? null,
      p_expiration_at: event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null,
      p_payload: body,
    });

    if (error) {
      console.error("[revenuecat-webhook] rpc error", error);
      // 500 → RevenueCat reintenta (el RPC es idempotente, sin riesgo de duplicar)
      return json(500, { success: false, error: error.message });
    }

    return json(200, { success: true, result: data });
  } catch (err) {
    console.error("[revenuecat-webhook] fatal", err);
    return json(500, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
