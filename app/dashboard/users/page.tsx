"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { UserProfile, UserRole } from "@/types/auth";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

export default function UsersManagementPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  // Memoizar el cliente de Supabase para evitar re-renders infinitos
  const supabase = useMemo(() => createClient(), []);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para el formulario de invitación
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Función para cargar usuarios (memoizada para evitar re-renders)
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Error al cargar usuarios: " + fetchError.message);
        console.error(fetchError);
      } else {
        setUsers(data || []);
        setError(null);
      }
    } catch (err) {
      setError("Error inesperado al cargar usuarios");
      console.error(err);
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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdating(userId);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (updateError) {
        setError("Error al actualizar el rol: " + updateError.message);
        console.error(updateError);
      } else {
        setSuccess("Rol actualizado exitosamente");
        // Actualizar la lista local
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
        // Si es el usuario actual, refrescar su perfil
        const updatedUser = users.find((u) => u.id === userId);
        if (updatedUser && profile?.user_id === updatedUser.user_id) {
          await refreshProfile();
        }
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Error inesperado al actualizar el rol");
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteClick = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(userToDelete.id);
      setError(null);
      setSuccess(null);

      // Eliminar el perfil (el usuario de auth.users se eliminará automáticamente por CASCADE)
      const { error: deleteError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (deleteError) {
        setError("Error al eliminar el usuario: " + deleteError.message);
        console.error(deleteError);
        setDeleting(null);
        setUserToDelete(null);
        return;
      }

      setSuccess("Usuario eliminado exitosamente");

      // Si es el usuario actual, cerrar sesión y redirigir
      if (profile?.user_id === userToDelete.user_id) {
        await signOut();
        router.push("/login");
        return;
      }

      // Actualizar la lista local
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.id !== userToDelete.id)
      );

      // Cerrar modal y limpiar
      setUserToDelete(null);
      setDeleting(null);

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Error inesperado al eliminar el usuario");
      console.error(err);
      setDeleting(null);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setUserToDelete(null);
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
        console.error("Error inviting user:", data);
        setInviteError(data?.error || "Error al enviar la invitación");
        setInviteLoading(false);
        return;
      }

      if (data?.error) {
        console.error("Error from function:", data.error);
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

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: "Administrador",
      owner: "Dueño",
      staff: "Empleado",
      special: "Especial",
    };
    return labels[role];
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      owner: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      staff: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      special:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    };
    return colors[role];
  };

  // Mostrar loading mientras se verifica el rol
  if (!profile || profile.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Verificando permisos...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gestión de Usuarios
              </h1>
              <p className="mt-2 text-foreground-muted">
                Administra los usuarios del sistema y sus roles
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle"
            >
              Volver al dashboard
            </button>
          </div>

          {/* Mensajes de éxito/error */}
          {error && (
            <div className="mb-4 rounded-md bg-danger-50 p-4 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-success-50 p-4 text-sm text-success-800 dark:bg-success-900/20 dark:text-success-400">
              {success}
            </div>
          )}

          {/* Formulario de Invitación */}
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Invitar nuevo usuario
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                El usuario recibirá un correo con un enlace para configurar su
                contraseña y acceder a la plataforma.
              </p>
              <div className="mt-3 rounded-md bg-info-50 p-3 text-xs text-info-800 dark:bg-info-900/20 dark:text-info-400">
                <strong>Nota:</strong> Si ves un error 404, la Edge Function no
                está desplegada. Puedes invitar usuarios desde el{" "}
                <a
                  href="https://supabase.com/dashboard/project/gotetvnmnlrsfhsnounn/auth/users"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Dashboard de Supabase → Authentication → Users → Invite
                </a>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label
                    htmlFor="invite-email"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="invite-email"
                    name="invite-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder-foreground-muted shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500 sm:text-sm"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {inviteLoading ? "Enviando..." : "Enviar invitación"}
                  </button>
                </div>
              </div>

              {inviteError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  {inviteSuccess}
                </div>
              )}
            </form>
          </div>

          {/* Tabla de usuarios */}
          <div className="rounded-lg bg-white shadow-sm dark:bg-zinc-900">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Cargando usuarios...
                  </p>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">
                  No hay usuarios en el sistema
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Rol Actual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Cambiar Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Fecha de registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {user.full_name || (
                            <span className="text-foreground-muted">
                              Sin nombre
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              user.is_active
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {user.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(
                                user.id,
                                e.target.value as UserRole
                              )
                            }
                            disabled={updating === user.id}
                            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-info-500 focus:outline-none focus:ring-2 focus:ring-info-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="admin">Administrador</option>
                            <option value="owner">Dueño</option>
                            <option value="staff">Empleado</option>
                            <option value="special">Especial</option>
                          </select>
                          {updating === user.id && (
                            <span className="ml-2 text-xs text-zinc-500">
                              Actualizando...
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                          {new Date(user.created_at).toLocaleDateString(
                            "es-ES",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDeleteClick(user)}
                            disabled={deleting === user.id}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleting === user.id
                              ? "Eliminando..."
                              : "Eliminar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Roles disponibles
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Administrador
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  Acceso total al sistema. Puede gestionar usuarios,
                  organizaciones y todas las funcionalidades.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Dueño
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  Gestiona su organización, servicios y reservas. No puede
                  gestionar usuarios.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Empleado
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  Puede ver y gestionar reservas. Acceso limitado a funciones
                  administrativas.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Especial
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  Usuario con permisos especiales personalizables. Similar a
                  empleado por defecto.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Confirmar eliminación
            </h3>
            <p className="mt-4 text-sm text-foreground-muted">
              ¿Estás seguro de que deseas eliminar al usuario{" "}
              <span className="font-medium text-black dark:text-zinc-50">
                {userToDelete.email}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            {profile?.user_id === userToDelete.user_id && (
              <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                ⚠️ Estás a punto de eliminar tu propia cuenta. Serás redirigido
                al login después de la eliminación.
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting === userToDelete.id}
                className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting === userToDelete.id}
                className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-danger-foreground transition-colors hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting === userToDelete.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
