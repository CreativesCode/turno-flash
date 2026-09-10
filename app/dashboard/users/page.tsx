"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Button, Card, ConfirmSheet } from "@/components/ui";
import { InviteUserSheet } from "@/components/users/InviteUserSheet";
import { ROLE_META, ROLE_ORDER, UserCard } from "@/components/users/UserCard";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { UserProfile, UserRole } from "@/types/auth";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { Mail, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

export default function UsersManagementPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Memoizar el cliente de Supabase para evitar re-renders infinitos
  const supabase = useMemo(() => createClient(), []);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados para el formulario de invitación
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Función para cargar usuarios (memoizada para evitar re-renders)
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data, error: fetchError }, { data: orgs }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("organizations").select("id, name"),
      ]);

      if (fetchError) {
        setError("Error al cargar usuarios: " + fetchError.message);
        void Logger.error("Error fetching users", fetchError);
      } else {
        setUsers(data || []);
        setOrgNames(
          Object.fromEntries((orgs || []).map((o) => [o.id, o.name]))
        );
        setError(null);
      }
    } catch (err) {
      setError("Error inesperado al cargar usuarios");
      void Logger.error("Unexpected error loading users", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (profile && profile.role !== "admin") {
      router.push("/dashboard");
    }
  }, [profile, router]);

  // Cargar usuarios
  useEffect(() => {
    if (profile?.role === "admin") {
      loadUsers();
    }
  }, [profile, loadUsers]);

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
    try {
      setUpdating(user.id);

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ role: newRole })
        .eq("id", user.id);

      if (updateError) {
        toast.error("Error al actualizar el rol", updateError.message);
        void Logger.error("Error updating user role", updateError, {
          userId: user.id,
          newRole,
        });
        return;
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast.success(
        "Rol actualizado",
        `${user.full_name || user.email} ahora es ${ROLE_META[newRole].label}`
      );
      // Si es el usuario actual, refrescar su perfil
      if (profile?.user_id === user.user_id) {
        await refreshProfile();
      }
    } catch (err) {
      toast.error("Error inesperado", "No se pudo actualizar el rol");
      void Logger.error("Unexpected error updating user role", err, {
        userId: user.id,
        newRole,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    const user = userToDelete;

    try {
      setDeleting(true);

      // Eliminar el perfil (el usuario de auth.users se eliminará automáticamente por CASCADE)
      const { error: deleteError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", user.id);

      if (deleteError) {
        toast.error("Error al eliminar el usuario", deleteError.message);
        void Logger.error("Error deleting user", deleteError, {
          userId: user.id,
        });
        return;
      }

      // Si es el usuario actual, cerrar sesión y redirigir
      if (profile?.user_id === user.user_id) {
        await signOut();
        router.push("/login");
        return;
      }

      setUsers((prevUsers) => prevUsers.filter((u) => u.id !== user.id));
      toast.success("Usuario eliminado", `${user.email} fue eliminado`);
    } catch (err) {
      toast.error("Error inesperado", "No se pudo eliminar el usuario");
      void Logger.error("Unexpected error deleting user", err, {
        userId: user.id,
      });
    } finally {
      setDeleting(false);
      setUserToDelete(null);
    }
  };

  const openInvite = () => {
    setInviteError(null);
    setInviteSuccess(null);
    setShowInvite(true);
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      // Verificar que la sesión es válida (UX: mensaje claro si expiró)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setInviteError("Sesión expirada. Por favor, vuelve a iniciar sesión.");
        setInviteLoading(false);
        return;
      }

      // Static export: no hay API Routes. Llamamos a la Edge Function directamente.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setInviteError("Falta configuración de Supabase (URL/ANON KEY).");
        setInviteLoading(false);
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setInviteError("Sesión expirada. Por favor, vuelve a iniciar sesión.");
        setInviteLoading(false);
        return;
      }

      // Asegurar token con forma de JWT (a.b.c). Si no, refrescar sesión.
      let accessToken = session.access_token;
      if (accessToken.split(".").length !== 3) {
        const { data: refreshed, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session?.access_token) {
          setInviteError(
            "Sesión expirada. Por favor, vuelve a iniciar sesión."
          );
          setInviteLoading(false);
          return;
        }
        accessToken = refreshed.session.access_token;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          redirectTo: `${window.location.origin}/auth/callback?type=invite`,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        void Logger.error("Error inviting user:", data);
        setInviteError(data?.error || "Error al enviar la invitación");
        setInviteLoading(false);
        return;
      }

      if (data?.error) {
        void Logger.error("Error from function:", data.error);
        setInviteError(data.error);
        setInviteLoading(false);
        return;
      }

      setInviteSuccess(
        `Se ha enviado una invitación a ${inviteEmail}. El usuario podrá hacer clic en el enlace para configurar su contraseña.`
      );
      setInviteEmail(""); // Limpiar el campo

      // Recargar la lista de usuarios después de un breve delay
      setTimeout(() => {
        loadUsers();
      }, 2000);
    } catch {
      setInviteError("Error al enviar la invitación. Intenta nuevamente.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Mostrar loading mientras se verifica el rol
  if (!profile || profile.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">
              Verificando permisos...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const isDeletingSelf = profile.user_id === userToDelete?.user_id;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Usuarios"
        description="Gestiona los usuarios del sistema. Administra roles, permisos, invitaciones y acceso de usuarios."
      />

      <div className="relative min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                Usuarios
              </h1>
              <p className="text-xs text-foreground-muted">
                {users.length} {users.length === 1 ? "cuenta" : "cuentas"}
              </p>
            </div>
            <Button
              variant="soft"
              onClick={openInvite}
              className="w-full justify-center sm:w-auto"
            >
              <Mail className="h-4 w-4" />
              Invitar nuevo usuario
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center p-12 text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
              <p className="text-sm text-foreground-muted">
                Cargando usuarios...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                Sin usuarios
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                No hay usuarios en el sistema.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  orgName={
                    user.organization_id
                      ? (orgNames[user.organization_id] ?? null)
                      : null
                  }
                  isSelf={profile.user_id === user.user_id}
                  updating={updating === user.id}
                  onRoleChange={handleRoleChange}
                  onDelete={setUserToDelete}
                />
              ))}
            </div>
          )}

          <Card className="mt-6 p-4">
            <h2 className="text-sm font-bold text-foreground">
              Roles disponibles
            </h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ROLE_ORDER.map((role) => (
                <div key={role}>
                  <dt>
                    <span
                      className={`rounded-full px-2.25 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${ROLE_META[role].chip}`}
                    >
                      {ROLE_META[role].label}
                    </span>
                  </dt>
                  <dd className="mt-1.5 text-xs text-foreground-muted">
                    {ROLE_META[role].description}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      <InviteUserSheet
        open={showInvite}
        onClose={() => setShowInvite(false)}
        email={inviteEmail}
        onEmailChange={setInviteEmail}
        onSubmit={handleInvite}
        isSubmitting={inviteLoading}
        error={inviteError}
        success={inviteSuccess}
      />

      <ConfirmSheet
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        busy={deleting}
        title="Eliminar usuario"
      >
        <p>
          ¿Seguro que deseas eliminar a{" "}
          <span className="font-semibold text-foreground">
            {userToDelete?.email}
          </span>
          ? Esta acción no se puede deshacer.
        </p>
        {isDeletingSelf && (
          <div className="mt-3 rounded-lg bg-warning-50 p-3 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
            Estás a punto de eliminar tu propia cuenta. Serás redirigido al
            login después de la eliminación.
          </div>
        )}
      </ConfirmSheet>
    </ProtectedRoute>
  );
}
