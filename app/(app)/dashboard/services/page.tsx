"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { CategoriesSheet } from "@/components/services/CategoriesSheet";
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
  useDuplicateService,
  useReactivateService,
  useReorderServices,
  useServiceCategories,
  useServicesQuery,
  useToast,
  useUpdateService,
} from "@/hooks";
import { isServiceBadge } from "@/config/service-badges";
import { useOrganizationBasics } from "@/hooks/useBookingSetup.query";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { Service, ServiceFormData } from "@/types/appointments";
import { groupServices, hasCategoryGroups } from "@/utils/group-services";
import { getSiteUrl } from "@/utils/metadata";
import { AlertCircle, Package, Plus, Tags } from "lucide-react";
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
  deposit_type: null,
  deposit_value: null,
  deposit_due_hours: null,
  payment_terms: null,
  max_advance_booking_days: 60,
  min_advance_booking_hours: 2,
  available_for_online_booking: true,
  category_id: null,
  badge: null,
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
  const { categories: allCategories } = useServiceCategories();
  // An inactive category behaves as "no category", like on /book
  const categories = useMemo(
    () => allCategories.filter((c) => c.is_active ?? true),
    [allCategories]
  );
  const [showCategories, setShowCategories] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const { data: basics } = useOrganizationBasics(profile?.organization_id ?? "");
  // Always the public web domain: inside the native app window.location is localhost
  const bookingLink = basics ? `${getSiteUrl()}/book?b=${basics.slug}` : null;

  const serviceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) {
      if (s.category_id) {
        counts.set(s.category_id, (counts.get(s.category_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [services]);

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
  const duplicateServiceMutation = useDuplicateService();
  const reorderServicesMutation = useReorderServices();

  const groups = useMemo(
    () => groupServices(filteredServices, categories),
    [filteredServices, categories]
  );
  const showHeadings = hasCategoryGroups(groups);
  // Ordering works on the whole list, not on search results
  const canOrder = canManageServices && !debouncedSearch && services.length > 1;
  const isOrdering = ordering && canOrder;

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
      deposit_type:
        service.deposit_type === "fixed" || service.deposit_type === "percent"
          ? service.deposit_type
          : null,
      deposit_value: service.deposit_value ?? null,
      deposit_due_hours: service.deposit_due_hours ?? null,
      payment_terms: service.payment_terms ?? null,
      max_advance_booking_days: service.max_advance_booking_days ?? 60,
      min_advance_booking_hours: service.min_advance_booking_hours ?? 2,
      available_for_online_booking: service.available_for_online_booking ?? true,
      category_id: service.category_id ?? null,
      badge: isServiceBadge(service.badge) ? service.badge : null,
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

  const handleDuplicate = useCallback(
    async (service: Service) => {
      const loadingToast = toast.loading("Duplicando...");
      try {
        const copy = await duplicateServiceMutation.mutateAsync(service.id);
        toast.dismiss(loadingToast);
        toast.success("Servicio duplicado", "Cambia lo que haga falta y guarda");
        // Straight into the copy: the usual next step is editing it
        if (copy) handleEdit(copy);
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error(
          "No se pudo duplicar",
          err instanceof Error ? err.message : undefined
        );
      }
    },
    [duplicateServiceMutation, handleEdit, toast]
  );

  const handleMove = useCallback(
    (group: Service[], index: number, delta: -1 | 1) => {
      const ids = group.map((s) => s.id);
      [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
      reorderServicesMutation.mutate(ids, {
        onError: (err) => toast.error("No se pudo ordenar", err.message),
      });
    },
    [reorderServicesMutation, toast]
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground" />
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

      <div className="mx-auto max-w-5xl px-5 pb-10 pt-4 lg:px-8 lg:pt-8">
        <PageHeader
          title="Servicios"
          subtitle={subtitle}
          actions={
            canManageServices && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowCategories(true)}
                  aria-label="Categorías"
                >
                  <Tags className="size-[18px]" />
                  {/* Icon only on phones: the subtitle needs the room */}
                  <span className="hidden sm:inline">Categorías</span>
                </Button>
                <Button variant="secondary" onClick={handleCreate}>
                  <Plus className="size-[18px]" />
                  Nuevo
                </Button>
              </div>
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
              {canOrder && (
                <div className="mb-2 flex items-center justify-end gap-3 px-1">
                  {isOrdering && (
                    <span className="mr-auto text-meta text-foreground-muted">
                      Usa las flechas para cambiar el orden
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={isOrdering ? "primary" : "ghost"}
                    onClick={() => setOrdering((v) => !v)}
                  >
                    {isOrdering ? "Listo" : "Ordenar"}
                  </Button>
                </div>
              )}
              <div className="flex flex-col gap-5">
                {groups.map((group) => (
                  <section key={group.category?.id ?? "none"}>
                    {showHeadings && (
                      <div className="mb-2 px-1">
                        <h2 className="text-meta font-semibold uppercase tracking-wide text-foreground-muted">
                          {group.category?.name ?? "Sin categoría"}
                        </h2>
                        {group.category?.description && (
                          <p className="text-meta text-foreground-subtle">
                            {group.category.description}
                          </p>
                        )}
                      </div>
                    )}
                    <ListGroup>
                      {group.services.map((service, index) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          canManage={canManageServices}
                          onEdit={handleEdit}
                          onToggleActive={handleToggleActive}
                          ordering={isOrdering}
                          onMoveUp={
                            index > 0
                              ? () => handleMove(group.services, index, -1)
                              : undefined
                          }
                          onMoveDown={
                            index < group.services.length - 1
                              ? () => handleMove(group.services, index, 1)
                              : undefined
                          }
                        />
                      ))}
                    </ListGroup>
                  </section>
                ))}
              </div>
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
        categories={categories}
        onDuplicate={handleDuplicate}
      />

      {canManageServices && (
        <CategoriesSheet
          open={showCategories}
          onClose={() => setShowCategories(false)}
          categories={categories}
          serviceCounts={serviceCounts}
          bookingLink={bookingLink}
        />
      )}
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
              <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground" />
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
