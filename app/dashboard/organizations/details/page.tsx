"use client";

import { LicenseNotification } from "@/components/license-notification";
import { WhatsAppOrgSection } from "@/components/organizations/WhatsAppOrgSection";
import { ProtectedRoute } from "@/components/protected-route";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { UserProfile } from "@/types/auth";
import { OrganizationWithLicenseStatus } from "@/types/organization";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  Pencil,
  ShieldCheck,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
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
  const toast = useToast();

  // Estados para agregar usuario
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);

  // Estados para edición
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

  // Cargar organización con detalles
  const loadOrganization = useCallback(async () => {
    if (!organizationId) {
      setError("ID de organización no proporcionado");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Cargar organización con estado de licencia
      const { data: orgData, error: orgError } = await supabase
        .from("organizations_with_license_status")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (orgError || !orgData) {
        setError("Organización no encontrada");
        console.error(orgError);
        return;
      }

      // Cargar dueño
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
        id: orgData.id || "",
        name: orgData.name || "",
        slug: orgData.slug || "",
        timezone: orgData.timezone || "",
        created_at: orgData.created_at || new Date().toISOString(),
        is_active: orgData.is_active ?? true,
        license_status: orgData.license_status || "no_license",
        license_message: orgData.license_message || "",
        is_usable: orgData.is_usable ?? false,
        owner: ownerData || null,
        members: membersData || [],
      };

      setOrganization(orgWithDetails);

      // Inicializar datos de edición
      setEditData({
        name: orgData.name || "",
        slug: orgData.slug || "",
        timezone: orgData.timezone || "",
        whatsapp_phone: orgData.whatsapp_phone || "",
        is_active: orgData.is_active ?? true,
        license_start_date: orgData.license_start_date
          ? new Date(orgData.license_start_date).toISOString().slice(0, 16)
          : "",
        license_end_date: orgData.license_end_date
          ? new Date(orgData.license_end_date).toISOString().slice(0, 16)
          : "",
      });
    } catch (err) {
      console.error("Error loading organization:", err);
      setError("Error inesperado al cargar la organización");
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

    console.log("🔵 Guardando organización...", editData);
    setSaving(true);
    setError(null);
    const loadingToast = toast.loading("Actualizando organización...");

    try {
      // Validar fechas de licencia si se proporcionan
      if (editData.license_start_date && editData.license_end_date) {
        const startDate = new Date(editData.license_start_date);
        const endDate = new Date(editData.license_end_date);

        if (endDate <= startDate) {
          toast.dismiss(loadingToast);
          toast.error(
            "Error de validación",
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
        console.error("❌ Error al actualizar organización:", updateError);
        toast.dismiss(loadingToast);
        toast.error("Error al actualizar", updateError.message);
        setError("Error al actualizar: " + updateError.message);
      } else {
        console.log("✅ Organización actualizada exitosamente");
        toast.dismiss(loadingToast);
        toast.success(
          "Organización actualizada",
          "Los cambios se han guardado correctamente"
        );
        setIsEditing(false);
        await loadOrganization();
      }
    } catch (err) {
      console.error("❌ Error inesperado al actualizar organización:", err);
      toast.dismiss(loadingToast);
      toast.error("Error inesperado", "No se pudo actualizar la organización");
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
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              ID de organización no proporcionado
            </h1>
            <Button
              variant="info"
              className="mt-4"
              onClick={() => router.push("/dashboard/organizations")}
            >
              <ArrowLeft size={16} />
              Volver a organizaciones
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
            <p className="text-sm text-foreground-muted">
              Cargando organización...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!organization) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Organización no encontrada
            </h1>
            <Button
              variant="info"
              className="mt-4"
              onClick={() => router.push("/dashboard/organizations")}
            >
              <ArrowLeft size={16} />
              Volver a organizaciones
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back link */}
          <button
            onClick={() => router.push("/dashboard/organizations")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Volver a organizaciones
          </button>

          {/* Header card */}
          <Card className="mb-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="mesh-info flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm">
                  <Building2 size={26} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-foreground">
                      {isEditing ? "Editar organización" : organization.name}
                    </h1>
                    {!isEditing && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          organization.is_active
                            ? "bg-success-100 text-success-800"
                            : "bg-danger-100 text-danger-800"
                        }`}
                      >
                        {organization.is_active ? "Activa" : "Inactiva"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {isEditing
                      ? "Modifica la información de la organización"
                      : "Detalles y configuración de la organización"}
                  </p>
                  {!isEditing && (
                    <code className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs text-foreground-muted">
                      /{organization.slug}
                    </code>
                  )}
                </div>
              </div>
              {isAdmin && !isEditing && (
                <Button
                  variant="mesh-secondary"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={16} />
                  Editar
                </Button>
              )}
            </div>
          </Card>

          {/* Mensajes */}
          {error && (
            <div className="mb-4 rounded-md bg-danger-50 p-4 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {/* Notificación de licencia (si aplica) */}
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

          {/* Sección WhatsApp — solo admin, ancho completo */}
          {isAdmin && !isEditing && (
            <div className="mb-6">
              <WhatsAppOrgSection organizationId={organizationId} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información básica */}
              <Card className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-100 text-info-700 dark:bg-info-900/20 dark:text-info-400">
                    <Building2 size={18} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Información básica
                  </h2>
                </div>

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
                      <p className="mt-1 text-xs text-foreground-muted">
                        Solo letras minúsculas, números y guiones
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
                        Teléfono WhatsApp
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
                        className="ml-2 block text-sm font-medium text-foreground"
                      >
                        Organización activa
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        variant="mesh-secondary"
                        disabled={saving}
                        className="flex-1"
                      >
                        <CheckCircle2 size={16} />
                        {saving ? "Guardando..." : "Guardar cambios"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={saving}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-sm font-semibold text-foreground-muted">
                        Nombre
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">
                        {organization.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-foreground-muted">
                        Slug
                      </dt>
                      <dd className="mt-1">
                        <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-foreground">
                          {organization.slug}
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-foreground-muted">
                        Zona horaria
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">
                        {organization.timezone}
                      </dd>
                    </div>
                    {organization.whatsapp_phone && (
                      <div>
                        <dt className="text-sm font-semibold text-foreground-muted">
                          Teléfono WhatsApp
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">
                          {organization.whatsapp_phone}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-semibold text-foreground-muted">
                        Estado
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            organization.is_active
                              ? "bg-success-100 text-success-800"
                              : "bg-danger-100 text-danger-800"
                          }`}
                        >
                          {organization.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-foreground-muted">
                        Fecha de creación
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">
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
              </Card>

              {/* Licencia */}
              <Card className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
                    <KeyRound size={18} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Licencia
                  </h2>
                </div>

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
                    <p className="text-xs text-foreground-muted">
                      Deja las fechas vacías para acceso ilimitado
                    </p>
                  </div>
                ) : (
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-sm font-semibold text-foreground-muted">
                        Estado de licencia
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            organization.license_status === "active"
                              ? "bg-success-100 text-success-800"
                              : organization.license_status === "grace_period"
                              ? "bg-warning-100 text-warning-800"
                              : organization.license_status === "expired"
                              ? "bg-danger-100 text-danger-800"
                              : "bg-muted text-foreground-muted"
                          }`}
                        >
                          {organization.license_status === "active"
                            ? "Activa"
                            : organization.license_status === "grace_period"
                            ? "Período de gracia"
                            : organization.license_status === "expired"
                            ? "Expirada"
                            : "Sin licencia"}
                        </span>
                      </dd>
                    </div>
                    {organization.license_start_date && (
                      <div>
                        <dt className="text-sm font-semibold text-foreground-muted">
                          Fecha de inicio
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">
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
                        <dt className="text-sm font-semibold text-foreground-muted">
                          Fecha de fin
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">
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
                        <dt className="text-sm font-semibold text-foreground-muted">
                          Días restantes
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">
                          {organization.days_remaining > 0
                            ? `${organization.days_remaining} días`
                            : `Expirada hace ${Math.abs(
                                organization.days_remaining
                              )} días`}
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
              </Card>
            </div>

            {/* Columna lateral */}
            <div className="space-y-6">
              {/* Dueño */}
              <Card className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                    <UserCircle2 size={18} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Dueño
                  </h2>
                </div>
                {organization.owner ? (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-foreground">
                      {organization.owner.full_name || organization.owner.email}
                    </div>
                    <div className="mt-1 text-sm text-foreground-muted">
                      {organization.owner.email}
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                        <ShieldCheck size={12} />
                        {organization.owner.role}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-foreground-muted">
                    Sin dueño asignado
                  </p>
                )}
              </Card>

              {/* Miembros */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-100 text-info-700 dark:bg-info-900/20 dark:text-info-400">
                      <Users size={18} />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Miembros
                    </h2>
                  </div>
                  <span className="rounded-full bg-info-100 px-2.5 py-0.5 text-xs font-bold text-info-800">
                    {organization.members?.length || 0}
                  </span>
                </div>

                {/* Formulario para agregar usuario */}
                {(isAdmin || profile?.role === "owner") && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Agregar usuario
                    </h3>
                    <p className="mt-1 text-xs text-foreground-muted">
                      Selecciona un usuario existente sin organización
                    </p>
                    <form onSubmit={handleAddUser} className="mt-3 space-y-3">
                      <div>
                        {loadingAvailableUsers ? (
                          <div className="text-xs text-foreground-muted">
                            Cargando usuarios disponibles...
                          </div>
                        ) : availableUsers.length === 0 ? (
                          <div className="text-xs text-foreground-muted">
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
                        <p className="text-xs text-danger-600">
                          {addUserError}
                        </p>
                      )}
                      {addUserSuccess && (
                        <p className="text-xs text-success-600">
                          {addUserSuccess}
                        </p>
                      )}
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={
                          addingUser ||
                          !selectedUserId ||
                          availableUsers.length === 0
                        }
                        className="w-full"
                      >
                        <UserPlus size={14} />
                        {addingUser ? "Agregando..." : "Agregar usuario"}
                      </Button>
                    </form>
                  </div>
                )}

                {organization.members && organization.members.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {organization.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-foreground">
                            {member.full_name || member.email}
                          </div>
                          <div className="mt-1 text-xs text-foreground-muted">
                            {member.email}
                          </div>
                        </div>
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            member.role === "owner"
                              ? "bg-primary-100 text-primary-800"
                              : member.role === "staff"
                              ? "bg-info-100 text-info-800"
                              : "bg-muted text-foreground-muted"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-foreground-muted">
                    No hay miembros registrados
                  </p>
                )}
              </Card>
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
          <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
              <p className="text-sm text-foreground-muted">Cargando...</p>
            </div>
          </div>
        </ProtectedRoute>
      }
    >
      <OrganizationDetailsContent />
    </Suspense>
  );
}
