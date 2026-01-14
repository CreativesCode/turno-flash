"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { UserProfile } from "@/types/auth";
import { OrganizationWithLicenseStatus } from "@/types/organization";
import { createClient } from "@/utils/supabase/client";
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gestión de Organizaciones
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Administra las organizaciones del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard/organizations/new")}
                className="rounded-md bg-info px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-info-700 focus:outline-none focus:ring-2 focus:ring-info-500 focus:ring-offset-2"
              >
                Crear organización
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Volver al dashboard
              </button>
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
          <div className="rounded-lg bg-white shadow-sm dark:bg-zinc-900">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
                  <p className="text-sm text-foreground-muted">
                    Cargando organizaciones...
                  </p>
                </div>
              </div>
            ) : organizations.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">
                  No hay organizaciones en el sistema
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Slug
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Dueño
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Miembros
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Licencia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Zona horaria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Fecha de creación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {organizations.map((org) => (
                      <tr
                        key={org.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                          {org.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {org.slug}
                          </code>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {org.owner ? (
                            <div>
                              <div className="font-medium">
                                {org.owner.full_name || org.owner.email}
                              </div>
                              <div className="text-xs text-foreground-muted">
                                {org.owner.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400">Sin dueño</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          <span className="inline-flex items-center rounded-full bg-info-100 px-2.5 py-0.5 text-xs font-medium text-info-800 dark:bg-info-900/20 dark:text-info-400">
                            {org.member_count || 0}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              org.is_active
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {org.is_active ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                org.license_status === "active"
                                  ? "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400"
                                  : org.license_status === "grace_period"
                                  ? "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400"
                                  : org.license_status === "expired"
                                  ? "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
                                  : "bg-muted text-foreground-muted"
                              }`}
                            >
                              {org.license_status === "active"
                                ? "Activa"
                                : org.license_status === "grace_period"
                                ? "Período de gracia"
                                : org.license_status === "expired"
                                ? "Expirada"
                                : "Sin licencia"}
                            </span>
                            {org.days_remaining !== null && (
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {org.days_remaining > 0
                                  ? `${org.days_remaining} días restantes`
                                  : `Expirada hace ${Math.abs(
                                      org.days_remaining
                                    )} días`}
                              </span>
                            )}
                            {org.license_start_date && org.license_end_date && (
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(
                                  org.license_end_date
                                ).toLocaleDateString("es-ES")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                          {org.timezone}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                          {new Date(org.created_at).toLocaleDateString(
                            "es-ES",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/dashboard/organizations/details?id=${org.id}`
                                )
                              }
                              className="rounded-md bg-info px-3 py-1.5 text-xs font-medium text-info-foreground transition-colors hover:bg-info-700 focus:outline-none focus:ring-2 focus:ring-info-500 focus:ring-offset-2"
                            >
                              Ver detalles
                            </button>
                            <button
                              onClick={() => handleDeleteClick(org)}
                              disabled={deleting === org.id}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deleting === org.id
                                ? "Eliminando..."
                                : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {organizationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Confirmar eliminación
            </h3>
            <p className="mt-4 text-sm text-foreground-muted">
              ¿Estás seguro de que deseas eliminar la organización{" "}
              <span className="font-medium text-black dark:text-zinc-50">
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
                className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
