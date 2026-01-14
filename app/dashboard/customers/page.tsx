"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import {
  useCreateCustomer,
  useDeactivateCustomer,
  useInfiniteCustomers,
  useToast,
  useUpdateCustomer,
} from "@/hooks";
import { Customer, CustomerFormData } from "@/types/appointments";
import {
  Calendar,
  Edit,
  Mail,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const toast = useToast();

  // 🎉 Use infinite pagination for better performance!
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    error: queryError,
  } = useInfiniteCustomers(
    {
      search: searchTerm,
      isActive: true,
    },
    50 // pageSize
  );

  // Flatten all pages into a single array
  const filteredCustomers = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  const error = queryError?.message || null;

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deactivateCustomerMutation = useDeactivateCustomer();

  // Form data
  const [formData, setFormData] = useState<CustomerFormData>({
    first_name: "",
    last_name: "",
    phone: "",
    phone_country_code: "+1",
    email: "",
    whatsapp_number: "",
    notes: "",
    is_active: true,
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      phone: "",
      phone_country_code: "+1",
      email: "",
      whatsapp_number: "",
      notes: "",
      is_active: true,
    });
    setEditingCustomer(null);
  };

  // Open modal for creating
  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (customer: Customer) => {
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      phone_country_code: customer.phone_country_code || undefined,
      email: customer.email || "",
      whatsapp_number: customer.whatsapp_number || "",
      notes: customer.notes || "",
      is_active: customer.is_active ?? true,
    });
    setEditingCustomer(customer);
    setShowModal(true);
  };

  // Save customer (create or update)
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    console.log("🔵 Guardando cliente...", formData);
    const loadingToast = toast.loading(
      editingCustomer ? "Actualizando cliente..." : "Creando cliente..."
    );

    try {
      if (editingCustomer) {
        console.log("🔵 Actualizando cliente existente:", editingCustomer.id);
        await updateCustomerMutation.mutateAsync({
          customerId: editingCustomer.id,
          data: formData,
        });
        console.log("✅ Cliente actualizado exitosamente");
        toast.dismiss(loadingToast);
        toast.success(
          "Cliente actualizado",
          `${formData.first_name} ${formData.last_name} ha sido actualizado`
        );
      } else {
        console.log("🔵 Creando nuevo cliente");
        await createCustomerMutation.mutateAsync(formData);
        console.log("✅ Cliente creado exitosamente");
        toast.dismiss(loadingToast);
        toast.success(
          "Cliente creado",
          `${formData.first_name} ${formData.last_name} ha sido agregado`
        );
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("❌ Error al guardar cliente:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        if (error.message.includes("Validación fallida")) {
          toast.validationError(error.message);
        } else {
          toast.error("Error al guardar cliente", error.message);
        }
      } else {
        toast.error("Error inesperado", "No se pudo guardar el cliente");
      }
    }
  };

  // Delete customer
  const handleDelete = async (customer: Customer) => {
    if (
      !confirm(
        `¿Estás seguro de desactivar a ${customer.first_name} ${customer.last_name}?`
      )
    ) {
      return;
    }

    console.log("🔵 Desactivando cliente:", customer.id);
    const loadingToast = toast.loading("Desactivando cliente...");

    try {
      await deactivateCustomerMutation.mutateAsync(customer.id);
      console.log("✅ Cliente desactivado exitosamente");
      toast.dismiss(loadingToast);
      toast.success(
        "Cliente desactivado",
        `${customer.first_name} ${customer.last_name} ha sido desactivado`
      );
    } catch (error) {
      console.error("❌ Error al desactivar cliente:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        toast.error("Error al desactivar cliente", error.message);
      } else {
        toast.error("Error inesperado", "No se pudo desactivar el cliente");
      }
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
            <p className="text-sm text-foreground-muted">
              Cargando clientes...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Clientes"
        description="Gestiona tu base de clientes. Agrega, edita y administra la información de tus clientes, incluyendo contacto y notas importantes."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
              <p className="mt-2 text-foreground-muted">
                Gestiona tu base de clientes
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-md bg-danger-50 p-4 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Buscar clientes por nombre, teléfono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
              />
            </div>
          </div>

          {/* Customers Grid */}
          {filteredCustomers.length === 0 && !loading ? (
            <div className="rounded-lg bg-surface p-12 text-center shadow-sm">
              <User className="mx-auto h-12 w-12 text-zinc-400" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {searchTerm ? "No se encontraron clientes" : "No hay clientes"}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {searchTerm
                  ? "Intenta con otro término de búsqueda"
                  : "Comienza agregando tu primer cliente"}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Cliente
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-lg bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {customer.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-info-500 px-2 py-0.5 text-xs font-medium text-white dark:bg-info-900/20 dark:text-info-400"
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {!customer.is_active && (
                      <span className="rounded-full bg-danger-100 px-2 py-0.5 text-xs font-medium text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {customer.total_appointments ?? 0} turnos
                        {customer.missed_appointments != null &&
                        customer.missed_appointments > 0
                          ? ` (${customer.missed_appointments} ausencias)`
                          : ""}
                      </span>
                    </div>
                  </div>

                  {customer.notes && (
                    <p className="mt-3 text-sm text-foreground-muted line-clamp-2">
                      {customer.notes}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(customer)}
                      className="flex items-center justify-center gap-2 rounded-md bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700 transition-colors hover:bg-danger-100 dark:bg-danger-900/20 dark:text-danger-400 dark:hover:bg-danger-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 rounded-md bg-secondary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-secondary-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    Cargar más clientes
                    <span className="text-xs opacity-75">
                      ({filteredCustomers.length} cargados)
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 hover:bg-subtle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    WhatsApp (opcional)
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_number: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  />
                </div>

                <div className="flex items-center sm:col-span-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Cliente activo
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  placeholder="Notas adicionales sobre el cliente..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={
                    createCustomerMutation.isPending ||
                    updateCustomerMutation.isPending
                  }
                  className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createCustomerMutation.isPending ||
                    updateCustomerMutation.isPending
                  }
                  className="flex-1 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createCustomerMutation.isPending ||
                  updateCustomerMutation.isPending
                    ? "Guardando..."
                    : editingCustomer
                    ? "Guardar Cambios"
                    : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
