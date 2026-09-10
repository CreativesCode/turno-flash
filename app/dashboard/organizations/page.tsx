"use client";

import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Button, ConfirmSheet } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { OrganizationWithOwner } from "@/types/organization";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function OrganizationsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [organizations, setOrganizations] = useState<OrganizationWithOwner[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] =
    useState<OrganizationWithOwner | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar organizaciones
  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Dos consultas en paralelo (antes eran 2 por organización):
      // organizaciones con estado de licencia + perfiles con organización asignada.
      const [
        { data: orgsData, error: orgsError },
        { data: membersData, error: membersError },
      ] = await Promise.all([
        supabase
          .from("organizations_with_license_status")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("user_profiles")
          .select("*")
          .not("organization_id", "is", null),
      ]);

      if (orgsError) {
        setError("Error al cargar organizaciones: " + orgsError.message);
        void Logger.error("Error fetching organizations", orgsError);
        return;
      }

      if (membersError) {
        void Logger.error("Error fetching organization members", membersError);
      }

      // Agrupar owner y conteo de miembros por organización
      const ownerByOrg = new Map<
        string,
        NonNullable<OrganizationWithOwner["owner"]>
      >();
      const memberCountByOrg = new Map<string, number>();
      for (const member of membersData || []) {
        const orgId = member.organization_id;
        if (!orgId) continue;
        memberCountByOrg.set(orgId, (memberCountByOrg.get(orgId) ?? 0) + 1);
        if (member.role === "owner" && !ownerByOrg.has(orgId)) {
          ownerByOrg.set(orgId, member);
        }
      }

      const organizationsWithOwners = (orgsData || [])
        .filter(
          (org): org is typeof org & { id: string } => org.id != null
        )
        .map(
          (org) =>
            ({
              ...org,
              name: org.name || "",
              slug: org.slug || "",
              timezone: org.timezone || "",
              created_at: org.created_at || new Date().toISOString(),
              license_status: org.license_status || "no_license",
              license_message: org.license_message || "",
              is_usable: org.is_usable ?? false,
              owner: ownerByOrg.get(org.id) ?? null,
              member_count: memberCountByOrg.get(org.id) ?? 0,
            }) as OrganizationWithOwner
        );

      setOrganizations(organizationsWithOwners);
    } catch (err) {
      setError("Error inesperado al cargar organizaciones");
      void Logger.error("Unexpected error loading organizations", err);
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

  const handleViewDetails = useCallback(
    (org: OrganizationWithOwner) => {
      router.push(`/dashboard/organizations/details?id=${org.id}`);
    },
    [router]
  );

  const handleCreate = useCallback(() => {
    router.push("/dashboard/organizations/new");
  }, [router]);

  const handleDeleteConfirm = async () => {
    if (!organizationToDelete) return;
    const org = organizationToDelete;

    try {
      setDeleting(true);

      // Eliminar la organización (los usuarios se actualizarán automáticamente por ON DELETE SET NULL)
      const { error: deleteError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", org.id);

      if (deleteError) {
        toast.error("Error al eliminar la organización", deleteError.message);
        void Logger.error("Error deleting organization", deleteError, {
          organizationId: org.id,
        });
        return;
      }

      setOrganizations((prevOrgs) => prevOrgs.filter((o) => o.id !== org.id));
      toast.success("Organización eliminada", `${org.name} fue eliminada`);
    } catch (err) {
      toast.error("Error inesperado", "No se pudo eliminar la organización");
      void Logger.error("Unexpected error deleting organization", err, {
        organizationId: org.id,
      });
    } finally {
      setDeleting(false);
      setOrganizationToDelete(null);
    }
  };

  // Mostrar loading mientras se verifica el rol o se cargan los datos
  if (!profile || profile.role !== "admin" || loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">
              {!profile || profile.role !== "admin"
                ? "Verificando permisos..."
                : "Cargando organizaciones..."}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const memberCount = organizationToDelete?.member_count ?? 0;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Organizaciones"
        description="Gestiona las organizaciones del sistema. Administra información, licencias y miembros de cada organización."
      />

      <div className="relative min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                Organizaciones
              </h1>
              <p className="text-xs text-foreground-muted">
                {organizations.length}{" "}
                {organizations.length === 1 ? "negocio" : "negocios"}
              </p>
            </div>
            <Button
              variant="mesh-primary"
              onClick={handleCreate}
              className="hidden sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Nueva organización
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {organizations.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                Sin organizaciones
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                No hay organizaciones en el sistema.
              </p>
              <Button
                variant="mesh-primary"
                onClick={handleCreate}
                className="mx-auto mt-4"
              >
                <Plus className="h-4 w-4" />
                Crear organización
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  org={org}
                  onViewDetails={handleViewDetails}
                  onDelete={setOrganizationToDelete}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          aria-label="Nueva organización"
          className="mesh-primary fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow-primary transition-transform hover:-translate-y-px sm:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <ConfirmSheet
        open={!!organizationToDelete}
        onClose={() => setOrganizationToDelete(null)}
        onConfirm={handleDeleteConfirm}
        busy={deleting}
        title="Eliminar organización"
      >
        <p>
          ¿Seguro que deseas eliminar{" "}
          <span className="font-semibold text-foreground">
            {organizationToDelete?.name}
          </span>
          ? Esta acción no se puede deshacer.
        </p>
        {memberCount > 0 && (
          <div className="mt-3 rounded-lg bg-warning-50 p-3 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
            Tiene {memberCount} {memberCount === 1 ? "miembro" : "miembros"}.
            Los usuarios seguirán existiendo pero perderán su asociación con
            esta organización.
          </div>
        )}
      </ConfirmSheet>
    </ProtectedRoute>
  );
}
