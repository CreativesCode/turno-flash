"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { ServiceCard } from "@/components/services/ServiceCard";
import { ServiceFormModal } from "@/components/services/ServiceFormModal";
import {
  Alert,
  Button,
  EmptyState,
  ListGroup,
  PageHeader,
  SearchInput,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useCreateParam } from "@/hooks/useCreateParam";
import {
  useCreateService,
  useDeactivateService,
  useDebounce,
  useReactivateService,
  useServicesQuery,
  useToast,
  useUpdateService,
} from "@/hooks";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { Service, ServiceFormData } from "@/types/appointments";
import { AlertCircle, Package, Plus } from "lucide-react";
import { FormEvent, Suspense, useCallback, useMemo, useRef, useState } from "react";

const EMPTY_FORM: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 30,
  buffer_time_minutes: 0,
  price: null,
  currency: "USD",
  color: "#3b82f6",
  is_active: true,
  requires_approval: false,
  max_advance_booking_days: 60,
  min_advance_booking_hours: 2,
  available_for_online_booking: true,
  sort_order: 0,
};

function ServicesContent() {
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

  const { modules } = useOrganizationModules();
  const [formData, setFormData] = useState<ServiceFormData>(EMPTY_FORM);

  const patchForm = useCallback((patch: Partial<ServiceFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  // A new service is priced in the currency the business charges in, not in
  // whatever the form was hardcoded with.
  const resetForm = useCallback(() => {
    setFormData({ ...EMPTY_FORM, currency: modules.currency });
    setEditingService(null);
  }, [modules.currency]);

  const handleCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  useCreateParam(handleCreate, canManageServices);

  const handleEdit = useCallback((service: Service) => {
    setFormData({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: service.duration_minutes,
      buffer_time_minutes: service.buffer_time_minutes ?? 0,
      price: service.price ?? null,
      currency: service.currency ?? "USD",
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

  const savingRef = useRef(false);
  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      // A second tap while the first save is in flight would create a duplicate.
      if (savingRef.current) return;
      savingRef.current = true;
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
      } finally {
        savingRef.current = false;
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

  const activeCount = services.filter((s) => s.is_active).length;
  const pausedCount = services.length - activeCount;
  const subtitle = `${activeCount} ${
    activeCount === 1 ? "activo" : "activos"
  } · ${pausedCount} ${pausedCount === 1 ? "pausado" : "pausados"}`;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Servicios"
        description="Gestiona los servicios que ofreces. Configura duración, precios, tiempos de buffer y disponibilidad de cada servicio."
      />

      <div className="mx-auto max-w-3xl px-5 pb-10 pt-4 lg:px-8 lg:pt-8">
        <PageHeader
          title="Servicios"
          subtitle={subtitle}
          actions={
            canManageServices && (
              <Button variant="secondary" onClick={handleCreate}>
                <Plus className="size-[18px]" />
                Nuevo
              </Button>
            )
          }
        >
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar servicio"
            aria-label="Buscar servicio"
          />
        </PageHeader>

        <div className="pt-5">
          {error && (
            <Alert variant="danger" icon={<AlertCircle />} className="mb-4">
              {error}
            </Alert>
          )}

          {filteredServices.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title={searchTerm ? "Sin resultados" : "Sin servicios"}
              action={
                canManageServices &&
                !searchTerm && (
                  <Button size="sm" variant="secondary" onClick={handleCreate}>
                    <Plus className="size-4" />
                    Crear servicio
                  </Button>
                )
              }
            >
              {searchTerm
                ? "Prueba con otro término."
                : "Agrega los servicios que ofreces."}
            </EmptyState>
          ) : (
            <>
              <ListGroup>
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    canManage={canManageServices}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </ListGroup>
              <p className="mt-3.5 px-1 text-meta text-foreground-subtle">
                Los servicios pausados no aparecen en tu página de reservas.
              </p>
            </>
          )}
        </div>
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

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
              <p className="text-sm text-foreground-muted">Cargando servicios...</p>
            </div>
          </div>
        </ProtectedRoute>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}
