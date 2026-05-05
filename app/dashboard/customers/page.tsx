"use client";

import { CustomerCard } from "@/components/customers/CustomerCard";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui";
import {
  useCreateCustomer,
  useDeactivateCustomer,
  useDebounce,
  useInfiniteCustomers,
  useToast,
  useUpdateCustomer,
} from "@/hooks";
import { Customer, CustomerFormData } from "@/types/appointments";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, Search, User } from "lucide-react";
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

  const parentRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    error: queryError,
  } = useInfiniteCustomers({ search: debouncedSearch, isActive: true }, 50);

  const customers = useMemo(() => data?.pages.flat() ?? [], [data]);
  const error = queryError?.message ?? null;

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deactivateCustomerMutation = useDeactivateCustomer();

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

  const handleDelete = useCallback(
    async (customer: Customer) => {
      if (
        !confirm(
          `¿Desactivar a ${customer.first_name} ${customer.last_name}?`
        )
      ) {
        return;
      }
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
    estimateSize: () => 92,
    overscan: 6,
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">
              Cargando clientes...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const subtitle = `${customers.length} en la base${
    debouncedSearch ? ` · filtro: "${debouncedSearch}"` : ""
  }`;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Clientes"
        description="Gestiona tu base de clientes. Agrega, edita y administra la información de tus clientes, incluyendo contacto y notas importantes."
      />

      <div className="relative min-h-screen bg-background pb-24">
        {/* Sticky header + search */}
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  Clientes
                </h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              </div>
              <Button
                variant="mesh-primary"
                onClick={handleCreate}
                className="hidden sm:inline-flex"
              >
                <Plus className="h-4 w-4" />
                Nuevo cliente
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {customers.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                <User className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                {searchTerm ? "Sin resultados" : "Aún no hay clientes"}
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {searchTerm
                  ? "Probá con otro término."
                  : "Agregá tu primer cliente para empezar."}
              </p>
              {!searchTerm && (
                <Button
                  variant="mesh-primary"
                  onClick={handleCreate}
                  className="mx-auto mt-4"
                >
                  <Plus className="h-4 w-4" />
                  Crear cliente
                </Button>
              )}
            </div>
          ) : (
            <div
              ref={parentRef}
              className="scrollbar-discreet h-[calc(100vh-12rem)] overflow-auto"
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
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: "8px",
                      }}
                    >
                      <CustomerCard
                        customer={customer}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
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
                variant="soft"
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

        {/* FAB (mobile) */}
        <button
          type="button"
          onClick={handleCreate}
          aria-label="Nuevo cliente"
          className="mesh-primary fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow-primary transition-transform hover:-translate-y-px sm:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
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
    </ProtectedRoute>
  );
}
