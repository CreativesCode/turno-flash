"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { UserProfile } from "@/types/auth";
import { OrganizationWithLicenseStatus } from "@/types/organization";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft,
  Building2,
  Clock,
  Eye,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface OrganizationWithOwner extends OrganizationWithLicenseStatus {
  owner?: UserProfile | null;
  member_count?: number;
}

export default function OrganizationsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [organizations, setOrganizations] = useState<OrganizationWithOwner[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [organizationToDelete, setOrganizationToDelete] =
    useState<OrganizationWithOwner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar organizaciones
  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar organizaciones con estado de licencia
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations_with_license_status")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgsError) {
        setError("Error al cargar organizaciones: " + orgsError.message);
        console.error(orgsError);
        return;
      }

      // Para cada organización, cargar el owner y el conteo de miembros
      const validOrgs = (orgsData || []).filter((org) => org.id != null);

      const organizationsWithOwners = await Promise.all(
        validOrgs.map(async (org) => {
          if (!org.id) {
            throw new Error("Organization ID is null");
          }

          // Buscar el owner (usuario con role='owner' y organization_id=org.id)
          const { data: ownerData } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("organization_id", org.id)
            .eq("role", "owner")
            .single();

          // Contar miembros totales
          const { count } = await supabase
            .from("user_profiles")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          return {
            ...org,
            id: org.id,
            name: org.name || "",
            slug: org.slug || "",
            timezone: org.timezone || "",
            created_at: org.created_at || new Date().toISOString(),
            license_status: org.license_status || "no_license",
            license_message: org.license_message || "",
            is_usable: org.is_usable ?? false,
            owner: ownerData || null,
            member_count: count || 0,
          } as OrganizationWithOwner;
        })
      );

      setOrganizations(organizationsWithOwners);
    } catch (err) {
      setError("Error inesperado al cargar organizaciones");
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

  // Cargar organizaciones
  useEffect(() => {
    if (profile?.role === "admin") {
      loadOrganizations();
    }
  }, [profile, loadOrganizations]);

  const handleDeleteClick = (org: OrganizationWithOwner) => {
    setOrganizationToDelete(org);
  };

  const handleDeleteConfirm = async () => {
    if (!organizationToDelete) return;

    try {
      setDeleting(organizationToDelete.id);
      setError(null);
      setSuccess(null);

      // Eliminar la organización (los usuarios se actualizarán automáticamente por ON DELETE SET NULL)
      const { error: deleteError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationToDelete.id);

      if (deleteError) {
        setError("Error al eliminar la organización: " + deleteError.message);
        console.error(deleteError);
        setDeleting(null);
        setOrganizationToDelete(null);
        return;
      }

      setSuccess("Organización eliminada exitosamente");

      // Actualizar la lista local
      setOrganizations((prevOrgs) =>
        prevOrgs.filter((org) => org.id !== organizationToDelete.id)
      );

      // Cerrar modal y limpiar
      setOrganizationToDelete(null);
      setDeleting(null);

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Error inesperado al eliminar la organización");
      console.error(err);
      setDeleting(null);
      setOrganizationToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setOrganizationToDelete(null);
  };

  // Mostrar loading mientras se verifica el rol
  if (!profile || profile.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
            <p className="text-sm text-foreground-muted">
              Verificando permisos...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Organizaciones"
        description="Gestiona las organizaciones del sistema. Administra información, licencias y miembros de cada organización."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} />
              Volver al dashboard
            </button>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  Gestión de Organizaciones
                </h1>
                <p className="mt-1 text-sm text-foreground-muted">
                  Administra las organizaciones del sistema
                </p>
              </div>
              <Button
                variant="mesh-secondary"
                onClick={() => router.push("/dashboard/organizations/new")}
                className="w-full justify-center sm:w-auto"
              >
                <Plus size={16} />
                Crear organización
              </Button>
            </div>
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

          {/* Lista de organizaciones */}
          {loading ? (
            <Card>
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
                  <p className="text-sm text-foreground-muted">
                    Cargando organizaciones...
                  </p>
                </div>
              </div>
            </Card>
          ) : organizations.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <p className="text-foreground-muted">
                  No hay organizaciones en el sistema
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((org) => {
                const licenseStyle =
                  org.license_status === "active"
                    ? "bg-success-100 text-success-800"
                    : org.license_status === "grace_period"
                    ? "bg-warning-100 text-warning-800"
                    : org.license_status === "expired"
                    ? "bg-danger-100 text-danger-800"
                    : "bg-muted text-foreground-muted";
                const licenseLabel =
                  org.license_status === "active"
                    ? "Activa"
                    : org.license_status === "grace_period"
                    ? "Período de gracia"
                    : org.license_status === "expired"
                    ? "Expirada"
                    : "Sin licencia";

                return (
                  <Card
                    key={org.id}
                    className="flex flex-col p-5 transition-shadow hover:shadow-md"
                  >
                    {/* Header: icon + name + status */}
                    <div className="flex items-start gap-3">
                      <div className="mesh-info flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
                        <Building2 size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-base font-bold text-foreground">
                            {org.name}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              org.is_active
                                ? "bg-success-100 text-success-800"
                                : "bg-danger-100 text-danger-800"
                            }`}
                          >
                            {org.is_active ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground-muted">
                          /{org.slug}
                        </code>
                      </div>
                    </div>

                    {/* Owner */}
                    <div className="mt-4 border-t border-border pt-3">
                      {org.owner ? (
                        <div className="text-sm">
                          <div className="font-medium text-foreground">
                            {org.owner.full_name || org.owner.email}
                          </div>
                          <div className="text-xs text-foreground-muted">
                            {org.owner.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-foreground-muted">
                          Sin dueño asignado
                        </span>
                      )}
                    </div>

                    {/* Meta grid */}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-foreground-muted">
                        <Users size={14} />
                        <span>
                          {org.member_count || 0}{" "}
                          {org.member_count === 1 ? "miembro" : "miembros"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground-muted">
                        <Clock size={14} />
                        <span className="truncate">{org.timezone}</span>
                      </div>
                    </div>

                    {/* License */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${licenseStyle}`}
                      >
                        {licenseLabel}
                      </span>
                      {org.days_remaining !== null && (
                        <span className="text-[11px] text-foreground-muted">
                          {org.days_remaining > 0
                            ? `${org.days_remaining} días restantes`
                            : `Expirada hace ${Math.abs(
                                org.days_remaining
                              )} días`}
                        </span>
                      )}
                    </div>

                    {/* Created date */}
                    <div className="mt-3 text-[11px] text-foreground-subtle">
                      Creada el{" "}
                      {new Date(org.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2 border-t border-border pt-3">
                      <Button
                        variant="info"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          router.push(
                            `/dashboard/organizations/details?id=${org.id}`
                          )
                        }
                      >
                        <Eye size={14} />
                        Ver detalles
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteClick(org)}
                        disabled={deleting === org.id}
                        aria-label="Eliminar organización"
                      >
                        <Trash2 size={14} />
                        {deleting === org.id ? "Eliminando..." : "Eliminar"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {organizationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface border border-border p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">
              Confirmar eliminación
            </h3>
            <p className="mt-4 text-sm text-foreground-muted">
              ¿Estás seguro de que deseas eliminar la organización{" "}
              <span className="font-medium text-foreground">
                {organizationToDelete.name}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            {organizationToDelete.member_count &&
              organizationToDelete.member_count > 0 && (
                <div className="mt-4 rounded-md bg-warning-50 p-3 text-sm text-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
                  ⚠️ Esta organización tiene {organizationToDelete.member_count}{" "}
                  {organizationToDelete.member_count === 1
                    ? "miembro"
                    : "miembros"}
                  . Los usuarios seguirán existiendo pero perderán su asociación
                  con esta organización.
                </div>
              )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting === organizationToDelete.id}
                className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting === organizationToDelete.id}
                className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-danger-foreground transition-colors hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting === organizationToDelete.id
                  ? "Eliminando..."
                  : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
