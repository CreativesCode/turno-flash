"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { ServiceCard } from "@/components/services/ServiceCard";
import { ServiceFormModal } from "@/components/services/ServiceFormModal";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import {
  useCreateService,
  useDeactivateService,
  useDebounce,
  useReactivateService,
  useServicesQuery,
  useToast,
  useUpdateService,
} from "@/hooks";
import { Service, ServiceFormData } from "@/types/appointments";
import { Package, Plus, Search } from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";

const EMPTY_FORM: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 30,
  buffer_time_minutes: 0,
  price: null,
  currency: "ARS",
  color: "#3b82f6",
  is_active: true,
  requires_approval: false,
  max_advance_booking_days: 60,
  min_advance_booking_hours: 2,
  available_for_online_booking: true,
  sort_order: 0,
};

export default function ServicesPage() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const toast = useToast();

  const canManageServices = useMemo(
    () => profile?.role === "admin" || profile?.role === "owner",
    [profile]
  );

  const { services, loading, error } = useServicesQuery({});

  const filteredServices = useMemo(() => {
    if (!debouncedSearch) return services;
    const term = debouncedSearch.toLowerCase();
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term)
    );
  }, [services, debouncedSearch]);

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deactivateServiceMutation = useDeactivateService();
  const reactivateServiceMutation = useReactivateService();

  const [formData, setFormData] = useState<ServiceFormData>(EMPTY_FORM);

  const patchForm = useCallback((patch: Partial<ServiceFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditingService(null);
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const handleEdit = useCallback((service: Service) => {
    setFormData({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: service.duration_minutes,
      buffer_time_minutes: service.buffer_time_minutes ?? 0,
      price: service.price ?? null,
      currency: service.currency ?? "ARS",
      color: service.color ?? "#3b82f6",
      is_active: service.is_active ?? true,
      requires_approval: service.requires_approval ?? false,
      max_advance_booking_days: service.max_advance_booking_days ?? 60,
      min_advance_booking_hours: service.min_advance_booking_hours ?? 2,
      available_for_online_booking: service.available_for_online_booking ?? true,
      sort_order: service.sort_order ?? 0,
    });
    setEditingService(service);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const loadingToast = toast.loading(
        editingService ? "Actualizando servicio..." : "Creando servicio..."
      );
      try {
        if (editingService) {
          await updateServiceMutation.mutateAsync({
            serviceId: editingService.id,
            data: formData,
          });
          toast.dismiss(loadingToast);
          toast.success(
            "Servicio actualizado",
            `"${formData.name}" fue actualizado`
          );
        } else {
          await createServiceMutation.mutateAsync(formData);
          toast.dismiss(loadingToast);
          toast.success(
            "Servicio creado",
            `"${formData.name}" está disponible`
          );
        }
        setShowModal(false);
        resetForm();
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          if (err.message.includes("Validación fallida")) {
            toast.validationError(err.message);
          } else {
            toast.error("Error al guardar servicio", err.message);
          }
        } else {
          toast.error("Error inesperado", "No se pudo guardar el servicio");
        }
      }
    },
    [
      editingService,
      formData,
      createServiceMutation,
      updateServiceMutation,
      toast,
      resetForm,
    ]
  );

  const handleToggleActive = useCallback(
    async (service: Service) => {
      const loadingToast = toast.loading(
        service.is_active ? "Pausando..." : "Activando..."
      );
      try {
        if (service.is_active) {
          await deactivateServiceMutation.mutateAsync(service.id);
          toast.dismiss(loadingToast);
          toast.success(
            "Servicio pausado",
            `"${service.name}" ya no se puede reservar`
          );
        } else {
          await reactivateServiceMutation.mutateAsync(service.id);
          toast.dismiss(loadingToast);
          toast.success(
            "Servicio activado",
            `"${service.name}" vuelve a estar disponible`
          );
        }
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          toast.error("Error", err.message);
        } else {
          toast.error("Error inesperado", "No se pudo cambiar el estado");
        }
      }
    },
    [deactivateServiceMutation, reactivateServiceMutation, toast]
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">
              Cargando servicios...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const subtitle = `${services.length} en el catálogo${
    debouncedSearch ? ` · filtro: "${debouncedSearch}"` : ""
  }`;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Servicios"
        description="Gestiona los servicios que ofreces. Configura duración, precios, tiempos de buffer y disponibilidad de cada servicio."
      />

      <div className="relative min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  Servicios
                </h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              </div>
              {canManageServices && (
                <Button
                  variant="mesh-primary"
                  onClick={handleCreate}
                  className="hidden sm:inline-flex"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo servicio
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Buscar servicios…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {filteredServices.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                {searchTerm ? "Sin resultados" : "Sin servicios"}
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {searchTerm
                  ? "Probá con otro término."
                  : "Agregá los servicios que ofrecés."}
              </p>
              {canManageServices && !searchTerm && (
                <Button
                  variant="mesh-primary"
                  onClick={handleCreate}
                  className="mx-auto mt-4"
                >
                  <Plus className="h-4 w-4" />
                  Crear servicio
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  canManage={canManageServices}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </div>

        {canManageServices && (
          <button
            type="button"
            onClick={handleCreate}
            aria-label="Nuevo servicio"
            className="mesh-primary fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow-primary transition-transform hover:-translate-y-px sm:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      <ServiceFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editingService}
        formData={formData}
        onChange={patchForm}
        onSubmit={handleSave}
        isSubmitting={
          createServiceMutation.isPending || updateServiceMutation.isPending
        }
      />
    </ProtectedRoute>
  );
}
