// Edge Function: delete-account
//
// Elimina la cuenta del usuario autenticado (requisito de Google Play:
// las apps con registro deben ofrecer eliminación de cuenta en la app).
//
// Reglas:
// - Cualquier usuario puede eliminar su propia cuenta.
// - Si es owner y su organización tiene OTROS miembros activos, se rechaza:
//   primero debe quitarles el acceso (Invitar usuario > Tu equipo).
// - Se elimina el usuario de Auth (el user_profile se borra en cascada y los
//   registros que creó quedan sin autor, migración 058).
// - Recién después, si era owner, la organización se desactiva
//   (is_active = false); los datos del negocio quedan inaccesibles y pueden
//   eliminarse por completo a petición (ver /account-deletion).
//   Va al final para no dejar el negocio apagado si el borrado falla.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json(401, { error: "No autorizado" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verificar identidad con el token del usuario
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json(401, { error: "Usuario no autenticado" });
    }

    // Confirmación explícita desde la UI
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== true) {
      return json(400, {
        error: "Falta la confirmación explícita (confirm: true)",
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Cargar perfil con service role (sin depender de RLS)
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("id, role, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const ownedOrgId =
      profile?.role === "owner" ? profile.organization_id : null;

    // Validar todo antes de borrar nada: un owner no puede dejar a su equipo
    // activo sin dueño. Los miembros a los que ya se quitó el acceso no cuentan.
    if (ownedOrgId) {
      const { count, error: countError } = await adminClient
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ownedOrgId)
        .eq("is_active", true)
        .neq("user_id", user.id);

      if (countError) {
        console.error("[delete-account] member count", countError);
        return json(500, { error: GENERIC_ERROR });
      }

      if ((count ?? 0) > 0) {
        return json(409, {
          error:
            "Tu negocio tiene otros miembros con acceso. Quítales el acceso desde Invitar usuario › Tu equipo y vuelve a intentarlo.",
        });
      }
    }

    // Eliminar el usuario de Auth (el perfil se borra en cascada)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      console.error("[delete-account] auth delete", authDeleteError);
      return json(500, { error: GENERIC_ERROR });
    }

    // La cuenta ya no existe: apagar el negocio que quedó sin dueño
    if (ownedOrgId) {
      const { error: orgError } = await adminClient
        .from("organizations")
        .update({ is_active: false })
        .eq("id", ownedOrgId);
      if (orgError) {
        console.error("[delete-account] org deactivate", orgError);
      }
    }

    console.log("[delete-account] deleted", { userId: user.id });
    return json(200, { success: true });
  } catch (err) {
    console.error("[delete-account] fatal", err);
    return json(500, { error: GENERIC_ERROR });
  }
});

const GENERIC_ERROR =
  "No pudimos eliminar tu cuenta. Intenta de nuevo en unos minutos.";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
