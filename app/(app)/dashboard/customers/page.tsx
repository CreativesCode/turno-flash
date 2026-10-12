"use client";

import { CustomerCard } from "@/components/customers/CustomerCard";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Alert,
  Button,
  ConfirmSheet,
  EmptyState,
  FilterChips,
  KebabMenu,
  PageHeader,
  SearchInput,
  Spinner,
} from "@/components/ui";
import {
  useCreateCustomer,
  useDeactivateCustomer,
  useReactivateCustomer,
  useDebounce,
  useInfiniteCustomers,
  useToast,
  useUpdateCustomer,
} from "@/hooks";
import { useAuth } from "@/contexts/auth-context";
import { Customer, CustomerFormData } from "@/types/appointments";
import { downloadCsv, todayForFilename } from "@/utils/csv";
import { createClient } from "@/utils/supabase/client";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AlertCircle,
  Download,
  HeartHandshake,
  Plus,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useMemo, useRef, useState } from "react";

const EMPTY_FORM: CustomerFormData = {
  first_name: "",
  last_name: "",
  phone: "",
  phone_country_code: "+54",
  email: "",
  whatsapp_number: "",
  notes: "",
  is_active: true,
};

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const toast = useToast();
  const { profile } = useAuth();
  const router = useRouter();
  const canRecover = profile?.role === "owner" || profile?.role === "admin";

  const handleExportCsv = useCallback(async () => {
    if (!profile?.organization_id) return;
    const supabase = createClient();
    const { data, error: exportError } = await supabase
      .from("customers")
      .select(
        "first_name, last_name, phone, phone_country_code, whatsapp_number, email, total_appointments, missed_appointments, last_appointment_date, tags, notes"
      )
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("first_name")
      .limit(5000);

    if (exportError) {
      toast.error("Error al exportar", exportError.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.info("Nada para exportar", "No hay clientes activos");
      return;
    }
    downloadCsv(
      `clientes_${todayForFilename()}`,
      [
        "Nombre",
        "Apellido",
        "Teléfono",
        "WhatsApp",
        "Email",
        "Turnos",
        "No asistió",
        "Última visita",
        "Tags",
        "Notas",
      ],
      data.map((c) => [
        c.first_name,
        c.last_name,
        `${c.phone_country_code ?? ""}${c.phone ?? ""}`,
        c.whatsapp_number ?? "",
        c.email ?? "",
        c.total_appointments ?? 0,
        c.missed_appointments ?? 0,
        c.last_appointment_date
          ? String(c.last_appointment_date).slice(0, 10)
          : "",
        (c.tags ?? []).join(" | "),
        c.notes ?? "",
      ])
    );
    toast.success("CSV exportado", `${data.length} clientes descargados`);
  }, [profile?.organization_id, toast]);

  const parentRef = useRef<HTMLDivElement>(null);
  // Deactivated customers live in their own list, where they can come back
  const [showInactive, setShowInactive] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    error: queryError,
  } = useInfiniteCustomers(
    { search: debouncedSearch, isActive: !showInactive },
    50
  );

  const customers = useMemo(() => data?.pages.flat() ?? [], [data]);
  const error = queryError?.message ?? null;

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deactivateCustomerMutation = useDeactivateCustomer();
  const reactivateCustomerMutation = useReactivateCustomer();

  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM);

  const patchForm = useCallback((patch: Partial<CustomerFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditingCustomer(null);
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const handleEdit = useCallback((customer: Customer) => {
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      phone_country_code: customer.phone_country_code ?? "+54",
      email: customer.email ?? "",
      whatsapp_number: customer.whatsapp_number ?? "",
      notes: customer.notes ?? "",
      is_active: customer.is_active ?? true,
    });
    setEditingCustomer(customer);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const loadingToast = toast.loading(
        editingCustomer ? "Actualizando cliente..." : "Creando cliente..."
      );
      try {
        if (editingCustomer) {
          await updateCustomerMutation.mutateAsync({
            customerId: editingCustomer.id,
            data: formData,
          });
          toast.dismiss(loadingToast);
          toast.success(
            "Cliente actualizado",
            `${formData.first_name} ${formData.last_name} fue actualizado`
          );
        } else {
          await createCustomerMutation.mutateAsync(formData);
          toast.dismiss(loadingToast);
          toast.success(
            "Cliente creado",
            `${formData.first_name} ${formData.last_name} fue agregado`
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
            toast.error("Error al guardar cliente", err.message);
          }
        } else {
          toast.error("Error inesperado", "No se pudo guardar el cliente");
        }
      }
    },
    [
      editingCustomer,
      formData,
      createCustomerMutation,
      updateCustomerMutation,
      toast,
      resetForm,
    ]
  );

  const [customerToDeactivate, setCustomerToDeactivate] =
    useState<Customer | null>(null);

  const handleReactivate = useCallback(
    async (customer: Customer) => {
      try {
        await reactivateCustomerMutation.mutateAsync(customer.id);
        toast.success(
          "Cliente reactivado",
          `${customer.first_name} ${customer.last_name} vuelve a estar en la lista`
        );
      } catch (err) {
        toast.error(
          "Error al reactivar cliente",
          err instanceof Error ? err.message : undefined
        );
      }
    },
    [reactivateCustomerMutation, toast]
  );

  const handleDelete = useCallback(
    async (customer: Customer) => {
      setCustomerToDeactivate(null);
      const loadingToast = toast.loading("Desactivando cliente...");
      try {
        await deactivateCustomerMutation.mutateAsync(customer.id);
        toast.dismiss(loadingToast);
        toast.success(
          "Cliente desactivado",
          `${customer.first_name} ${customer.last_name} fue desactivado`
        );
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          toast.error("Error al desactivar cliente", err.message);
        } else {
          toast.error("Error inesperado", "No se pudo desactivar el cliente");
        }
      }
    },
    [deactivateCustomerMutation, toast]
  );

  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 71,
    overscan: 6,
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <Spinner className="mb-3 text-foreground" />
            <p className="text-meta text-foreground-muted">
              Cargando clientes...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const subtitle = `${customers.length} en tu base${
    debouncedSearch ? ` · filtro: "${debouncedSearch}"` : ""
  }`;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Clientes"
        description="Gestiona tu base de clientes. Agrega, edita y administra la información de tus clientes, incluyendo contacto y notas importantes."
      />

      <div className="mx-auto max-w-3xl px-5 pb-10 pt-4 lg:px-8 lg:pt-8">
        <PageHeader
          title="Clientes"
          subtitle={subtitle}
          actions={
            <>
              <Button variant="secondary" onClick={handleCreate}>
                <Plus className="size-[18px]" />
                Nuevo
              </Button>
              <KebabMenu
                items={[
                  {
                    label: "Exportar CSV",
                    icon: <Download className="size-4" />,
                    onClick: () => void handleExportCsv(),
                  },
                  ...(canRecover
                    ? [
                        {
                          label: "Recuperar clientes",
                          icon: <HeartHandshake className="size-4" />,
                          onClick: () =>
                            router.push("/dashboard/customers/recover"),
                        },
                      ]
                    : []),
                ]}
              />
            </>
          }
        >
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Nombre, teléfono o email"
            aria-label="Buscar clientes"
          />
          <FilterChips
            label="Estado"
            chips={[
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ]}
            value={showInactive ? "inactive" : "active"}
            onChange={(value) => setShowInactive(value === "inactive")}
          />
        </PageHeader>

        {/* Body */}
        <div className="pt-5">
          {error && (
            <Alert variant="danger" icon={<AlertCircle />} className="mb-4">
              {error}
            </Alert>
          )}

          {customers.length === 0 ? (
            <EmptyState
              icon={<User />}
              title={searchTerm ? "Sin resultados" : "Aún no hay clientes"}
              action={
                !searchTerm && (
                  <Button size="sm" variant="secondary" onClick={handleCreate}>
                    <Plus className="size-4" />
                    Crear cliente
                  </Button>
                )
              }
            >
              {searchTerm
                ? "Prueba con otro término."
                : "Agrega tu primer cliente para empezar."}
            </EmptyState>
          ) : (
            <div
              ref={parentRef}
              className="scrollbar-discreet h-[calc(100vh-12rem)] overflow-auto rounded-card border border-border bg-surface shadow-card"
              style={{ contain: "strict" }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const customer = customers[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="border-b border-border has-data-menu-open:z-30"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <CustomerCard
                        customer={customer}
                        onEdit={handleEdit}
                        onDelete={setCustomerToDeactivate}
                        onReactivate={handleReactivate}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? "Cargando…"
                  : `Cargar más (${customers.length})`}
              </Button>
            </div>
          )}
        </div>

      </div>

      <CustomerFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editingCustomer}
        formData={formData}
        onChange={patchForm}
        onSubmit={handleSave}
        isSubmitting={
          createCustomerMutation.isPending || updateCustomerMutation.isPending
        }
      />

      <ConfirmSheet
        open={!!customerToDeactivate}
        onClose={() => setCustomerToDeactivate(null)}
        onConfirm={() =>
          void (customerToDeactivate && handleDelete(customerToDeactivate))
        }
        title="Desactivar cliente"
        confirmLabel="Desactivar"
      >
        ¿Desactivar a{" "}
        <span className="font-semibold text-foreground">
          {customerToDeactivate?.first_name} {customerToDeactivate?.last_name}
        </span>
        ? Podrás reactivarlo desde la lista de inactivos.
      </ConfirmSheet>
    </ProtectedRoute>
  );
}
