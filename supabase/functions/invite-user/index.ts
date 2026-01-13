// Supabase Edge Function para invitar usuarios
// Usa la Admin API que genera links con tokens (no PKCE)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Obtener el token del usuario que hace la solicitud
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Crear cliente con el token del usuario para verificar permisos
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente con token del usuario para verificar que es admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar que el usuario está autenticado
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuario no autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar permisos: debe ser admin o owner
    const { data: profile, error: profileError } = await userClient
      .from("user_profiles")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          error: "Error al verificar permisos",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isAdmin = profile.role === "admin";
    const isOwner = profile.role === "owner";

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({
          error: "Solo administradores y dueños pueden invitar usuarios",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener el email y organization_id del body
    const { email, redirectTo, organization_id } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "El email es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Si es owner (no admin), debe proporcionar organization_id y debe ser su organización
    if (isOwner && !isAdmin) {
      if (!organization_id) {
        return new Response(
          JSON.stringify({
            error: "Se requiere organization_id para invitar usuarios",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Verificar que el organization_id pertenece al owner
      if (profile.organization_id !== organization_id) {
        return new Response(
          JSON.stringify({
            error:
              "No tienes permiso para invitar usuarios a esta organización",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Si es admin pero se proporciona organization_id, validarlo
    if (isAdmin && organization_id) {
      // Verificar que la organización existe
      const { data: orgData, error: orgError } = await userClient
        .from("organizations")
        .select("id")
        .eq("id", organization_id)
        .single();

      if (orgError || !orgData) {
        return new Response(
          JSON.stringify({
            error: "Organización no encontrada",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Cliente admin para invitar usuarios
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Preparar metadata para guardar organization_id si se proporciona
    const userMetadata = organization_id
      ? { invited_to_organization_id: organization_id }
      : {};

    // Usar la Admin API para invitar al usuario
    // Esto genera un link con token en el hash, no PKCE
    const { data, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo:
          redirectTo ||
          `${req.headers.get("origin")}/auth/callback?type=invite`,
        data: userMetadata,
      });

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitación enviada a ${email}`,
        user: data.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
