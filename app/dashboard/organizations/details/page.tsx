"use client";

import { LicenseNotification } from "@/components/license-notification";
import { AddMemberSheet } from "@/components/organizations/AddMemberSheet";
import { getLicenseMeta } from "@/components/organizations/OrganizationCard";
import {
  OrganizationEditSheet,
  type OrganizationEditForm,
} from "@/components/organizations/OrganizationEditSheet";
import { WhatsAppOrgSection } from "@/components/organizations/WhatsAppOrgSection";
import { ProtectedRoute } from "@/components/protected-route";
import { Avatar, Button, Card } from "@/components/ui";
import { ROLE_META } from "@/components/users/UserCard";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { UserProfile } from "@/types/auth";
import { OrganizationWithLicenseStatus } from "@/types/organization";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import {
  Building2,
  ChevronLeft,
  KeyRound,
  Pencil,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  ReactNode,
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

const EMPTY_EDIT_FORM: OrganizationEditForm = {
  name: "",
  slug: "",
  timezone: "",
  whatsapp_phone: "",
  is_active: true,
  license_start_date: "",
  license_end_date: "",
};

/**
 * `datetime-local` value (local wall-clock time) for an ISO date.
 * Must be local, not UTC: on save `new Date(value)` parses it as local time,
 * so a UTC value would shift the stored date by the timezone offset on every save.
 */
function toDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toEditForm(org: OrganizationDetails): OrganizationEditForm {
  return {
    name: org.name,
    slug: org.slug,
    timezone: org.timezone,
    whatsapp_phone: org.whatsapp_phone || "",
    is_active: org.is_active,
    license_start_date: toDateTimeInput(org.license_start_date),
    license_end_date: toDateTimeInput(org.license_end_date),
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysRemainingLabel(days: number | null): string {
  if (days === null) return "—";
  return days > 0 ? `${days} días` : `Vencida hace ${Math.abs(days)} días`;
}

function SectionHeader({
  icon,
  title,
  tone,
  action,
}: {
  icon: ReactNode;
  title: string;
  tone: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}
        >
          {icon}
        </div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function InfoItem({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: UserProfile }) {
  const role = ROLE_META[member.role];
  const name = member.full_name || member.email;
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <Avatar name={name} color={role.color} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {name}
        </div>
        <div className="truncate text-[11px] text-foreground-muted">
          {member.email}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${role.chip}`}
      >
        {role.label}
      </span>
    </li>
  );
}

function CenteredState({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-foreground">{title}</h1>
          <Button variant="ghost" className="mt-4" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Volver a organizaciones
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function OrganizationDetailsContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("id");
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [organization, setOrganization] = useState<OrganizationDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para agregar usuario
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Estados para edición
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] =
    useState<OrganizationEditForm>(EMPTY_EDIT_FORM);

  const goBack = useCallback(
    () => router.push("/dashboard/organizations"),
    [router]
  );

  // Cargar organización y miembros en paralelo (el dueño sale de los miembros)
  const loadOrganization = useCallback(async () => {
    if (!organizationId) {
      setError("ID de organización no proporcionado");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [{ data: orgData, error: orgError }, { data: membersData }] =
        await Promise.all([
          supabase
            .from("organizations_with_license_status")
            .select("*")
            .eq("id", organizationId)
            .single(),
          supabase
            .from("user_profiles")
            .select("*")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false }),
        ]);

      if (orgError || !orgData) {
        setError("Organización no encontrada");
        void Logger.error("Error loading organization", orgError, {
          organizationId,
        });
        return;
      }

      const members = membersData || [];
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
        owner: members.find((m) => m.role === "owner") ?? null,
        members,
      };

      setOrganization(orgWithDetails);
      setEditData(toEditForm(orgWithDetails));
    } catch (err) {
      void Logger.error("Error loading organization:", err);
      setError("Error inesperado al cargar la organización");
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const isAdmin = profile?.role === "admin";
  const canAddMembers = isAdmin || profile?.role === "owner";

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
        void Logger.error("Error loading available users:", error);
        setAvailableUsers([]);
      } else {
        setAvailableUsers(data || []);
      }
    } catch (err) {
      void Logger.error("Error loading available users:", err);
      setAvailableUsers([]);
    } finally {
      setLoadingAvailableUsers(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    if (canAddMembers && organizationId) {
      loadAvailableUsers();
    }
  }, [canAddMembers, organizationId, loadAvailableUsers]);

  const patchEdit = useCallback((patch: Partial<OrganizationEditForm>) => {
    setEditData((prev) => ({ ...prev, ...patch }));
  }, []);

  const closeEdit = () => {
    if (organization) setEditData(toEditForm(organization));
    setShowEdit(false);
    setError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

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

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
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
        })
        .eq("id", organizationId);

      toast.dismiss(loadingToast);
      if (updateError) {
        void Logger.error("Error al actualizar organización:", updateError);
        toast.error("Error al actualizar", updateError.message);
        setError("Error al actualizar: " + updateError.message);
        return;
      }

      toast.success(
        "Organización actualizada",
        "Los cambios se han guardado correctamente"
      );
      setShowEdit(false);
      await loadOrganization();
    } catch (err) {
      void Logger.error("Error inesperado al actualizar organización:", err);
      toast.dismiss(loadingToast);
      toast.error("Error inesperado", "No se pudo actualizar la organización");
      setError("Error inesperado al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const openAddMember = () => {
    setAddUserError(null);
    setShowAddMember(true);
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId || !selectedUserId) return;

    setAddingUser(true);
    setAddUserError(null);

    try {
      // Actualizar el usuario para asignarlo a la organización
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ organization_id: organizationId })
        .eq("id", selectedUserId);

      if (updateError) {
        setAddUserError("Error al asignar usuario: " + updateError.message);
        void Logger.error("Error assigning user to organization", updateError, {
          organizationId,
          selectedUserId,
        });
        return;
      }

      const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
      toast.success(
        "Miembro agregado",
        `${selectedUser?.email || selectedUserId} ahora forma parte de la organización`
      );
      setSelectedUserId("");
      setShowAddMember(false);

      // Recargar organización y usuarios disponibles
      await Promise.all([loadOrganization(), loadAvailableUsers()]);
    } catch (err) {
      void Logger.error("Error adding user:", err);
      setAddUserError("Error al agregar usuario. Intenta nuevamente.");
    } finally {
      setAddingUser(false);
    }
  };

  if (!organizationId) {
    return (
      <CenteredState
        title="ID de organización no proporcionado"
        onBack={goBack}
      />
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">
              Cargando organización...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!organization) {
    return <CenteredState title="Organización no encontrada" onBack={goBack} />;
  }

  const license = getLicenseMeta(
    organization.license_status,
    organization.days_remaining
  );
  const members = organization.members ?? [];
  const owner = organization.owner;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={goBack}
              aria-label="Volver a organizaciones"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Organización
            </h1>
            {isAdmin && (
              <Button
                variant="soft"
                onClick={() => setShowEdit(true)}
                className="shrink-0"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="mesh-info flex size-14 shrink-0 items-center justify-center rounded-2xl text-white">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-lg font-extrabold tracking-tight text-foreground">
                    {organization.name}
                  </span>
                  <span
                    className={`rounded-full px-1.75 py-0.5 text-[10px] font-bold ${license.className}`}
                  >
                    {license.label}
                  </span>
                  {!organization.is_active && (
                    <span className="rounded-full border border-danger-600 px-1.75 py-px text-[10px] font-bold text-danger-600 dark:border-danger-400 dark:text-danger-300">
                      Inactiva
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground-muted">
                  /{organization.slug} · {organization.timezone}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <HeroStat label="Miembros" value={members.length} />
              <HeroStat
                label="Vence"
                value={
                  organization.license_end_date
                    ? formatDate(organization.license_end_date)
                    : "Sin vencimiento"
                }
              />
              <HeroStat
                label="Restan"
                value={daysRemainingLabel(organization.days_remaining)}
              />
            </div>
          </Card>

          {error && (
            <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {/* Notificación de licencia (si aplica) */}
          {organization.license_status !== "no_license" &&
            organization.license_status !== "active" && (
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
            )}

          {/* Sección WhatsApp — solo admin */}
          {isAdmin && <WhatsAppOrgSection organizationId={organizationId} />}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Card className="p-4">
                <SectionHeader
                  icon={<Building2 className="h-4 w-4" />}
                  title="Información"
                  tone="bg-info-100 text-info-700 dark:bg-info-900/20 dark:text-info-400"
                />
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InfoItem label="Nombre">{organization.name}</InfoItem>
                  <InfoItem label="Slug">/{organization.slug}</InfoItem>
                  <InfoItem label="Zona horaria">
                    {organization.timezone}
                  </InfoItem>
                  <InfoItem label="WhatsApp">
                    {organization.whatsapp_phone || "—"}
                  </InfoItem>
                  <InfoItem label="Estado">
                    {organization.is_active ? "Activa" : "Inactiva"}
                  </InfoItem>
                  <InfoItem label="Creada">
                    {formatDateTime(organization.created_at)}
                  </InfoItem>
                </dl>
              </Card>

              <Card className="p-4">
                <SectionHeader
                  icon={<KeyRound className="h-4 w-4" />}
                  title="Licencia"
                  tone="bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400"
                />
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InfoItem label="Estado">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${license.className}`}
                    >
                      {license.label}
                    </span>
                  </InfoItem>
                  <InfoItem label="Días restantes">
                    {daysRemainingLabel(organization.days_remaining)}
                  </InfoItem>
                  <InfoItem label="Inicio">
                    {organization.license_start_date
                      ? formatDateTime(organization.license_start_date)
                      : "—"}
                  </InfoItem>
                  <InfoItem label="Fin">
                    {organization.license_end_date
                      ? formatDateTime(organization.license_end_date)
                      : "Sin vencimiento"}
                  </InfoItem>
                  {organization.license_message && (
                    <InfoItem label="Mensaje" className="sm:col-span-2">
                      {organization.license_message}
                    </InfoItem>
                  )}
                </dl>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card className="p-4">
                <SectionHeader
                  icon={<UserCircle2 className="h-4 w-4" />}
                  title="Dueño"
                  tone="bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                />
                {owner ? (
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar
                      name={owner.full_name || owner.email}
                      color={ROLE_META.owner.color}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-foreground">
                        {owner.full_name || owner.email}
                      </div>
                      <div className="truncate text-xs text-foreground-muted">
                        {owner.email}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-foreground-muted">
                    Sin dueño asignado
                  </p>
                )}
              </Card>

              <Card className="p-4">
                <SectionHeader
                  icon={<Users className="h-4 w-4" />}
                  title="Miembros"
                  tone="bg-info-100 text-info-700 dark:bg-info-900/20 dark:text-info-400"
                  action={
                    <span className="rounded-full bg-info-100 px-2 py-0.5 text-xs font-bold text-info-700 dark:bg-info-900/30 dark:text-info-400">
                      {members.length}
                    </span>
                  }
                />
                {canAddMembers && (
                  <Button
                    variant="soft"
                    onClick={openAddMember}
                    className="mt-3 w-full justify-center"
                  >
                    <UserPlus className="h-4 w-4" />
                    Agregar miembro
                  </Button>
                )}
                {members.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {members.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-foreground-muted">
                    No hay miembros registrados
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <OrganizationEditSheet
          open={showEdit}
          onClose={closeEdit}
          formData={editData}
          onChange={patchEdit}
          onSubmit={handleSave}
          isSubmitting={saving}
        />
      )}

      {canAddMembers && (
        <AddMemberSheet
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
          users={availableUsers}
          loading={loadingAvailableUsers}
          selectedUserId={selectedUserId}
          onSelect={setSelectedUserId}
          onSubmit={handleAddUser}
          isSubmitting={addingUser}
          error={addUserError}
        />
      )}
    </ProtectedRoute>
  );
}

export default function OrganizationDetailsPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
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
