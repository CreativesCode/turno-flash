// Edge Function: delete-account
//
// Elimina la cuenta del usuario autenticado (requisito de Google Play:
// las apps con registro deben ofrecer eliminación de cuenta en la app).
//
// Reglas:
// - Cualquier usuario puede eliminar su propia cuenta.
// - Si es owner y su organización tiene OTROS miembros activos, se rechaza:
//   primero debe transferir la propiedad o desactivar a los miembros.
// - Si es owner y es el único miembro, la organización se desactiva
//   (is_active = false); los datos del negocio quedan inaccesibles y pueden
//   eliminarse por completo a petición (ver /account-deletion).
// - Se elimina el user_profile y el usuario de Auth.

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

    // Si es owner con organización, validar que no deje miembros huérfanos
    if (profile?.role === "owner" && profile.organization_id) {
      const { count } = await adminClient
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .neq("user_id", user.id);

      if ((count ?? 0) > 0) {
        return json(409, {
          error:
            "Tu organización tiene otros miembros. Transfiere la propiedad o elimina a los miembros antes de borrar tu cuenta.",
        });
      }

      // Único miembro: desactivar la organización
      await adminClient
        .from("organizations")
        .update({ is_active: false })
        .eq("id", profile.organization_id);
    }

    // Eliminar el perfil (si existe)
    if (profile) {
      const { error: profileDeleteError } = await adminClient
        .from("user_profiles")
        .delete()
        .eq("user_id", user.id);

      if (profileDeleteError) {
        console.error("[delete-account] profile delete", profileDeleteError);
        return json(500, {
          error: `No se pudo eliminar el perfil: ${profileDeleteError.message}`,
        });
      }
    }

    // Eliminar el usuario de Auth
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      console.error("[delete-account] auth delete", authDeleteError);
      return json(500, {
        error: `No se pudo eliminar la cuenta: ${authDeleteError.message}`,
      });
    }

    console.log("[delete-account] deleted", { userId: user.id });
    return json(200, { success: true });
  } catch (err) {
    console.error("[delete-account] fatal", err);
    return json(500, { error: "Error interno del servidor" });
  }
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
