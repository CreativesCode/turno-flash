// Supabase Edge Function: self-signup
//
// Registro self-service de un negocio nuevo. Crea el usuario (email
// auto-confirmado), su organización con un trial de 7 días, lo deja como owner,
// y notifica por WhatsApp al número del admin de la plataforma.
//
// Endpoint público: se invoca con la anon key (Authorization: Bearer <anon> +
// header apikey), igual que invite-user. El control de creación de organización
// vive en el RPC create_organization_with_owner (migración 026), que aquí pasa
// por usar el service_role.
//
// Body: { email, password, full_name, org_name, org_timezone?, org_whatsapp_phone? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { phoneToChatId, sendText } from "../_shared/openwa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 7;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Genera un slug a partir del nombre del negocio (mismo criterio que la UI de
 *  admin) y le agrega un sufijo corto y único para evitar colisiones. */
function buildSlug(orgName: string, userId: string): string {
  const base = orgName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();

  const suffix = userId.replace(/-/g, "").slice(0, 6);
  return base ? `${base}-${suffix}` : `negocio-${suffix}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let createdUserId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return json({ error: "Body inválido" }, 400);
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const orgName = String(body.org_name ?? "").trim();
    const orgTimezone = String(body.org_timezone ?? "America/Mexico_City").trim();
    const orgWhatsappPhone = String(body.org_whatsapp_phone ?? "").trim();

    // 1. Validaciones
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: "Ingresá un email válido" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
    }
    if (!fullName) {
      return json({ error: "Ingresá tu nombre" }, 400);
    }
    if (!orgName) {
      return json({ error: "Ingresá el nombre de tu negocio" }, 400);
    }

    // 2. Anti-abuso v1: rechazar si el email ya tiene cuenta
    const { data: existing } = await admin
      .from("user_profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return json(
        { error: "Ya existe una cuenta con ese email. Iniciá sesión." },
        409
      );
    }

    // 3. Crear el usuario con email auto-confirmado (acceso inmediato)
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError || !created?.user) {
      const msg = createError?.message ?? "";
      if (msg.toLowerCase().includes("already")) {
        return json(
          { error: "Ya existe una cuenta con ese email. Iniciá sesión." },
          409
        );
      }
      console.error("[self-signup] createUser error:", msg);
      return json({ error: "No se pudo crear la cuenta. Intentá de nuevo." }, 400);
    }

    createdUserId = created.user.id;

    // 4 + 5. Crear la organización con trial de 7 días y asignar al owner
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + TRIAL_DAYS);

    const { data: rpcData, error: rpcError } = await admin.rpc(
      "create_organization_with_owner",
      {
        org_name: orgName,
        org_slug: buildSlug(orgName, createdUserId),
        org_timezone: orgTimezone || "America/Mexico_City",
        org_whatsapp_phone: orgWhatsappPhone || null,
        owner_user_id: createdUserId,
        license_start_date: now.toISOString(),
        license_end_date: end.toISOString(),
      }
    );

    const result = rpcData as { organization_id?: string; success?: boolean } | null;

    if (rpcError || !result?.success) {
      // 6. Rollback: borrar el usuario para no dejar cuentas huérfanas
      console.error(
        "[self-signup] RPC error, rolling back user:",
        rpcError?.message ?? "sin éxito"
      );
      await admin.auth.admin.deleteUser(createdUserId).catch((e) =>
        console.error("[self-signup] rollback deleteUser failed:", e)
      );
      return json(
        { error: "No se pudo crear el negocio. Intentá de nuevo." },
        400
      );
    }

    // 7. Aviso por WhatsApp al admin (best-effort, no bloquea el registro)
    const notifyPhone = Deno.env.get("ADMIN_NOTIFY_PHONE");
    const notifySession = Deno.env.get("ADMIN_NOTIFY_SESSION_ID");
    if (notifyPhone && notifySession) {
      try {
        const trialHasta = end.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const text =
          `🎉 Nuevo registro en TurnoFlash\n` +
          `Nombre: ${fullName}\n` +
          `Email: ${email}\n` +
          `Negocio: ${orgName}\n` +
          `Trial hasta: ${trialHasta}`;
        const waResult = await sendText({
          sessionId: notifySession,
          chatId: phoneToChatId(notifyPhone),
          text,
        });
        if (!waResult.success) {
          console.error(
            "[self-signup] aviso WhatsApp falló:",
            waResult.error?.message
          );
        }
      } catch (e) {
        console.error("[self-signup] aviso WhatsApp excepción:", e);
      }
    } else {
      console.warn(
        "[self-signup] ADMIN_NOTIFY_PHONE/ADMIN_NOTIFY_SESSION_ID sin configurar; se omite el aviso"
      );
    }

    // 8. Responder
    return json({
      success: true,
      user_id: createdUserId,
      organization_id: result.organization_id,
    });
  } catch (error) {
    console.error("[self-signup] excepción:", error);
    // Best-effort rollback si ya habíamos creado el usuario
    if (createdUserId) {
      await admin.auth.admin
        .deleteUser(createdUserId)
        .catch((e) => console.error("[self-signup] rollback failed:", e));
    }
    return json({ error: "Error interno del servidor" }, 500);
  }
});
