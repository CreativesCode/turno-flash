"use client";

import { LicenseNotification } from "@/components/license-notification";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { UserProfile } from "@/types/auth";
import { OrganizationWithLicenseStatus } from "@/types/organization";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface OrganizationDetails extends OrganizationWithLicenseStatus {
  owner?: UserProfile | null;
  members?: UserProfile[];
}

function OrganizationDetailsContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("id");
  const supabase = useMemo(() => createClient(), []);

  const [organization, setOrganization] = useState<OrganizationDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para agregar usuario
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);

  // Estados para edici?n
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    slug: "",
    timezone: "",
    whatsapp_phone: "",
    is_active: true,
    license_start_date: "",
    license_end_date: "",
  });

  // Cargar organizaci?n con detalles
  const loadOrganization = useCallback(async () => {
    if (!organizationId) {
      setError("ID de organizaci?n no proporcionado");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Cargar organizaci?n con estado de licencia
      const { data: orgData, error: orgError } = await supabase
        .from("organizations_with_license_status")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (orgError || !orgData) {
        setError("Organizaci?n no encontrada");
        console.error(orgError);
        return;
      }

      // Cargar due?o
      const { data: ownerData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .single();

      // Cargar miembros
      const { data: membersData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      const orgWithDetails: OrganizationDetails = {
        ...orgData,
        owner: ownerData || null,
        members: membersData || [],
      };

      setOrganization(orgWithDetails);

      // Inicializar datos de edici?n
      setEditData({
        name: orgData.name,
        slug: orgData.slug,
        timezone: orgData.timezone,
        whatsapp_phone: orgData.whatsapp_phone || "",
        is_active: orgData.is_active,
        license_start_date: orgData.license_start_date
          ? new Date(orgData.license_start_date).toISOString().slice(0, 16)
          : "",
        license_end_date: orgData.license_end_date
          ? new Date(orgData.license_end_date).toISOString().slice(0, 16)
          : "",
      });
    } catch (err) {
      console.error("Error loading organization:", err);
      setError("Error inesperado al cargar la organizaci?n");
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const isAdmin = profile?.role === "admin";

  // Cargar usuarios disponibles (sin organización, no owners)
  const loadAvailableUsers = useCallback(async () => {
    const userIsAdmin = profile?.role === "admin";
    if (!userIsAdmin && profile?.role !== "owner") return;

    try {
      setLoadingAvailableUsers(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .neq("role", "owner") // No owners
        .neq("role", "admin") // No admins
        .is("organization_id", null) // Sin organización
        .eq("is_active", true) // Solo activos
        .order("email", { ascending: true });

      if (error) {
        console.error("Error loading available users:", error);
        setAvailableUsers([]);
      } else {
        setAvailableUsers(data || []);
      }
    } catch (err) {
      console.error("Error loading available users:", err);
      setAvailableUsers([]);
    } finally {
      setLoadingAvailableUsers(false);
    }
  }, [supabase, isAdmin, profile]);

  useEffect(() => {
    if ((isAdmin || profile?.role === "owner") && organizationId) {
      loadAvailableUsers();
    }
  }, [isAdmin, profile, organizationId, loadAvailableUsers]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar fechas de licencia si se proporcionan
      if (editData.license_start_date && editData.license_end_date) {
        const startDate = new Date(editData.license_start_date);
        const endDate = new Date(editData.license_end_date);

        if (endDate <= startDate) {
          setError(
            "La fecha de fin de licencia debe ser posterior a la fecha de inicio"
          );
          setSaving(false);
          return;
        }
      }

      // Preparar datos para actualizar
      const updateData: {
        name: string;
        slug: string;
        timezone: string;
        whatsapp_phone: string | null;
        is_active: boolean;
        license_start_date: string | null;
        license_end_date: string | null;
      } = {
        name: editData.name.trim(),
        slug: editData.slug.trim().toLowerCase(),
        timezone: editData.timezone || "UTC",
        whatsapp_phone: editData.whatsapp_phone.trim() || null,
        is_active: editData.is_active,
        license_start_date: editData.license_start_date
          ? new Date(editData.license_start_date).toISOString()
          : null,
        license_end_date: editData.license_end_date
          ? new Date(editData.license_end_date).toISOString()
          : null,
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", organizationId);

      if (updateError) {
        setError("Error al actualizar: " + updateError.message);
        console.error(updateError);
      } else {
        setSuccess("Organizaci?n actualizada exitosamente");
        setIsEditing(false);
        await loadOrganization();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Error updating organization:", err);
      setError("Error inesperado al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (organization) {
      setEditData({
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
        whatsapp_phone: organization.whatsapp_phone || "",
        is_active: organization.is_active,
        license_start_date: organization.license_start_date
          ? new Date(organization.license_start_date).toISOString().slice(0, 16)
          : "",
        license_end_date: organization.license_end_date
          ? new Date(organization.license_end_date).toISOString().slice(0, 16)
          : "",
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId || !selectedUserId) return;

    setAddingUser(true);
    setAddUserError(null);
    setAddUserSuccess(null);

    try {
      // Actualizar el usuario para asignarlo a la organización
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ organization_id: organizationId })
        .eq("id", selectedUserId);

      if (updateError) {
        setAddUserError("Error al asignar usuario: " + updateError.message);
        console.error(updateError);
        setAddingUser(false);
        return;
      }

      const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
      setAddUserSuccess(
        `Usuario ${
          selectedUser?.email || selectedUserId
        } agregado exitosamente a la organización.`
      );
      setSelectedUserId("");

      // Recargar organización y usuarios disponibles
      await Promise.all([loadOrganization(), loadAvailableUsers()]);

      setTimeout(() => setAddUserSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding user:", err);
      setAddUserError("Error al agregar usuario. Intenta nuevamente.");
    } finally {
      setAddingUser(false);
    }
  };

  if (!organizationId) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
              ID de organizaci?n no proporcionado
            </h1>
            <button
              onClick={() => router.push("/dashboard/organizations")}
              className="mt-4 rounded-md bg-info px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-info-700"
            >
              Volver a organizaciones
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
            <p className="text-sm text-foreground-muted">
              Cargando organizaci?n...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!organization) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
              Organizaci?n no encontrada
            </h1>
            <button
              onClick={() => router.push("/dashboard/organizations")}
              className="mt-4 rounded-md bg-info px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-info-700"
            >
              Volver a organizaciones
            </button>
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
              <button
                onClick={() => router.push("/dashboard/organizations")}
                className="mb-4 text-sm text-foreground-muted hover:text-foreground"
              >
                ? Volver a organizaciones
              </button>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                {isEditing ? "Editar organizaci?n" : organization.name}
              </h1>
              <p className="mt-2 text-foreground-muted">
                {isEditing
                  ? "Modifica la informaci?n de la organizaci?n"
                  : "Detalles y configuraci?n de la organizaci?n"}
              </p>
            </div>
            {isAdmin && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md bg-info px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-info-700 focus:outline-none focus:ring-2 focus:ring-info-500 focus:ring-offset-2"
              >
                Editar organizaci?n
              </button>
            )}
          </div>

          {/* Mensajes */}
          {error && (
            <div className="mb-4 rounded-md bg-danger-50 p-4 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Notificaci?n de licencia (si aplica) */}
          {!isEditing &&
            organization.license_status &&
            organization.license_status !== "no_license" &&
            organization.license_status !== "active" && (
              <div className="mb-6">
                <LicenseNotification
                  licenseStatus={{
                    organization_id: organization.id,
                    organization_name: organization.name,
                    status: organization.license_status,
                    days_remaining: organization.days_remaining,
                    is_usable: organization.is_usable,
                    message: organization.license_message || "",
                  }}
                  dismissible={false}
                />
              </div>
            )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informaci?n b?sica */}
              <div className="rounded-lg bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">
                  Informaci?n b?sica
                </h2>

                {isEditing ? (
                  <form onSubmit={handleSave} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Slug *
                      </label>
                      <input
                        type="text"
                        required
                        pattern="[a-z0-9-]+"
                        value={editData.slug}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            slug: e.target.value.toLowerCase(),
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        Solo letras min?sculas, n?meros y guiones
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Zona horaria
                      </label>
                      <select
                        value={editData.timezone}
                        onChange={(e) =>
                          setEditData({ ...editData, timezone: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/Argentina/Buenos_Aires">
                          America/Argentina/Buenos_Aires
                        </option>
                        <option value="America/Mexico_City">
                          America/Mexico_City
                        </option>
                        <option value="America/Santiago">
                          America/Santiago
                        </option>
                        <option value="America/Bogota">America/Bogota</option>
                        <option value="America/Lima">America/Lima</option>
                        <option value="America/Caracas">America/Caracas</option>
                        <option value="America/New_York">
                          America/New_York
                        </option>
                        <option value="America/Los_Angeles">
                          America/Los_Angeles
                        </option>
                        <option value="Europe/Madrid">Europe/Madrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Tel?fono WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={editData.whatsapp_phone}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            whatsapp_phone: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                        placeholder="+5491123456789"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={editData.is_active}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            is_active: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
                      />
                      <label
                        htmlFor="is_active"
                        className="ml-2 block text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        Organizaci?n activa
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Nombre
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {organization.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Slug
                      </dt>
                      <dd className="mt-1">
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {organization.slug}
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Zona horaria
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {organization.timezone}
                      </dd>
                    </div>
                    {organization.whatsapp_phone && (
                      <div>
                        <dt className="text-sm font-medium text-foreground-muted">
                          Tel?fono WhatsApp
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {organization.whatsapp_phone}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Estado
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            organization.is_active
                              ? "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400"
                              : "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
                          }`}
                        >
                          {organization.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Fecha de creaci?n
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {new Date(organization.created_at).toLocaleString(
                          "es-ES",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>

              {/* Licencia */}
              <div className="rounded-lg bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">
                  Licencia
                </h2>

                {isEditing ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          Fecha de inicio
                        </label>
                        <input
                          type="datetime-local"
                          value={editData.license_start_date}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              license_start_date: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          Fecha de fin
                        </label>
                        <input
                          type="datetime-local"
                          value={editData.license_end_date}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              license_end_date: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Deja las fechas vac?as para acceso ilimitado
                    </p>
                  </div>
                ) : (
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Estado de licencia
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            organization.license_status === "active"
                              ? "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400"
                              : organization.license_status === "grace_period"
                              ? "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400"
                              : organization.license_status === "expired"
                              ? "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
                              : "bg-muted text-foreground-muted"
                          }`}
                        >
                          {organization.license_status === "active"
                            ? "Activa"
                            : organization.license_status === "grace_period"
                            ? "Per?odo de gracia"
                            : organization.license_status === "expired"
                            ? "Expirada"
                            : "Sin licencia"}
                        </span>
                      </dd>
                    </div>
                    {organization.license_start_date && (
                      <div>
                        <dt className="text-sm font-medium text-foreground-muted">
                          Fecha de inicio
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {new Date(
                            organization.license_start_date
                          ).toLocaleString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </dd>
                      </div>
                    )}
                    {organization.license_end_date && (
                      <div>
                        <dt className="text-sm font-medium text-foreground-muted">
                          Fecha de fin
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {new Date(
                            organization.license_end_date
                          ).toLocaleString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </dd>
                      </div>
                    )}
                    {organization.days_remaining !== null && (
                      <div>
                        <dt className="text-sm font-medium text-foreground-muted">
                          D?as restantes
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {organization.days_remaining > 0
                            ? `${organization.days_remaining} d?as`
                            : `Expirada hace ${Math.abs(
                                organization.days_remaining
                              )} d?as`}
                        </dd>
                      </div>
                    )}
                    {organization.license_message && (
                      <div>
                        <dt className="text-sm font-medium text-foreground-muted">
                          Mensaje
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {organization.license_message}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>

            {/* Columna lateral */}
            <div className="space-y-6">
              {/* Due?o */}
              <div className="rounded-lg bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">Due?o</h2>
                {organization.owner ? (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-black dark:text-zinc-50">
                      {organization.owner.full_name || organization.owner.email}
                    </div>
                    <div className="mt-1 text-sm text-foreground-muted">
                      {organization.owner.email}
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                        {organization.owner.role}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    Sin due?o asignado
                  </p>
                )}
              </div>

              {/* Miembros */}
              <div className="rounded-lg bg-surface p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Miembros
                  </h2>
                  <span className="rounded-full bg-info-100 px-2.5 py-0.5 text-xs font-medium text-info-800 dark:bg-info-900/20 dark:text-info-400">
                    {organization.members?.length || 0}
                  </span>
                </div>

                {/* Formulario para agregar usuario */}
                {(isAdmin || profile?.role === "owner") && (
                  <div className="mt-4 rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Agregar usuario
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Selecciona un usuario existente sin organización
                    </p>
                    <form onSubmit={handleAddUser} className="mt-3 space-y-3">
                      <div>
                        {loadingAvailableUsers ? (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Cargando usuarios disponibles...
                          </div>
                        ) : availableUsers.length === 0 ? (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            No hay usuarios disponibles sin organización
                          </div>
                        ) : (
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            required
                            className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                          >
                            <option value="">Selecciona un usuario</option>
                            {availableUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.full_name || user.email} ({user.email}) -{" "}
                                {user.role}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {addUserError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {addUserError}
                        </p>
                      )}
                      {addUserSuccess && (
                        <p className="text-xs text-success-600 dark:text-success-400">
                          {addUserSuccess}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={
                          addingUser ||
                          !selectedUserId ||
                          availableUsers.length === 0
                        }
                        className="w-full rounded-md bg-info px-3 py-2 text-xs font-medium text-info-foreground transition-colors hover:bg-info-700 focus:outline-none focus:ring-2 focus:ring-info-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingUser ? "Agregando..." : "Agregar usuario"}
                      </button>
                    </form>
                  </div>
                )}

                {organization.members && organization.members.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {organization.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-black dark:text-zinc-50">
                            {member.full_name || member.email}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {member.email}
                          </div>
                        </div>
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            member.role === "owner"
                              ? "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400"
                              : member.role === "staff"
                              ? "bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-400"
                              : "bg-muted text-foreground-muted"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    No hay miembros registrados
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function OrganizationDetailsPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Cargando...
              </p>
            </div>
          </div>
        </ProtectedRoute>
      }
    >
      <OrganizationDetailsContent />
    </Suspense>
  );
}
