"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { Service, ServiceFormData } from "@/types/appointments";
import { createClient } from "@/utils/supabase/client";
import {
  Clock,
  DollarSign,
  Edit,
  Eye,
  EyeOff,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

export default function ServicesPage() {
  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [services, setServices] = useState<Service[]>([]);

  // Check if user can manage services (only owner and admin)
  const canManageServices = useMemo(() => {
    return profile?.role === "admin" || profile?.role === "owner";
  }, [profile]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    description: "",
    duration_minutes: 30,
    buffer_time_minutes: 0,
    price: null,
    currency: "USD",
    color: "#3B82F6",
    is_active: true,
    requires_approval: false,
    max_advance_booking_days: 60,
    min_advance_booking_hours: 2,
    available_for_online_booking: true,
    sort_order: 0,
  });

  // Load services
  const loadServices = useCallback(async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("sort_order", { ascending: true });

      if (fetchError) {
        setError("Error al cargar servicios: " + fetchError.message);
        console.error(fetchError);
        return;
      }

      setServices(data || []);
    } catch (err) {
      console.error("Error loading services:", err);
      setError("Error inesperado al cargar servicios");
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, supabase]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Filter services by search term
  const filteredServices = useMemo(() => {
    if (!searchTerm) return services;

    const term = searchTerm.toLowerCase();
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(term) ||
        (service.description &&
          service.description.toLowerCase().includes(term))
    );
  }, [services, searchTerm]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      duration_minutes: 30,
      buffer_time_minutes: 0,
      price: null,
      currency: "USD",
      color: "#3B82F6",
      is_active: true,
      requires_approval: false,
      max_advance_booking_days: 60,
      min_advance_booking_hours: 2,
      available_for_online_booking: true,
      sort_order: 0,
    });
    setEditingService(null);
  };

  // Open modal for creating
  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      buffer_time_minutes: service.buffer_time_minutes,
      price: service.price,
      currency: service.currency,
      color: service.color,
      is_active: service.is_active,
      requires_approval: service.requires_approval,
      max_advance_booking_days: service.max_advance_booking_days,
      min_advance_booking_hours: service.min_advance_booking_hours,
      available_for_online_booking: service.available_for_online_booking,
      sort_order: service.sort_order,
    });
    setEditingService(service);
    setShowModal(true);
  };

  // Save service (create or update)
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!profile?.organization_id) {
      setError("No se encontró la organización");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingService) {
        // Update existing service
        const { error: updateError } = await supabase
          .from("services")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingService.id);

        if (updateError) {
          setError("Error al actualizar: " + updateError.message);
          console.error(updateError);
          return;
        }

        setSuccess("Servicio actualizado exitosamente");
      } else {
        // Create new service
        const { error: insertError } = await supabase.from("services").insert({
          ...formData,
          organization_id: profile.organization_id,
        });

        if (insertError) {
          setError("Error al crear: " + insertError.message);
          console.error(insertError);
          return;
        }

        setSuccess("Servicio creado exitosamente");
      }

      setShowModal(false);
      resetForm();
      await loadServices();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving service:", err);
      setError("Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Delete service
  const handleDelete = async (service: Service) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar el servicio "${service.name}"?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id);

      if (deleteError) {
        setError("Error al eliminar: " + deleteError.message);
        console.error(deleteError);
        return;
      }

      setSuccess("Servicio eliminado exitosamente");
      await loadServices();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting service:", err);
      setError("Error inesperado al eliminar");
    }
  };

  // Toggle active status
  const toggleActive = async (service: Service) => {
    try {
      const { error: updateError } = await supabase
        .from("services")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);

      if (updateError) {
        setError("Error al actualizar: " + updateError.message);
        return;
      }

      await loadServices();
    } catch (err) {
      console.error("Error toggling active:", err);
      setError("Error inesperado");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
            <p className="text-sm text-foreground-muted">
              Cargando servicios...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Servicios"
        description="Gestiona los servicios que ofreces. Configura duración, precios, tiempos de buffer y disponibilidad de cada servicio."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Servicios</h1>
              <p className="mt-2 text-foreground-muted">
                Gestiona los servicios que ofreces
              </p>
            </div>
            {canManageServices && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Servicio
              </button>
            )}
          </div>

          {/* Messages */}
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

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
              />
            </div>
          </div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="rounded-lg bg-surface p-12 text-center shadow-sm">
              <Package className="mx-auto h-12 w-12 text-foreground-muted" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {searchTerm
                  ? "No se encontraron servicios"
                  : "No hay servicios"}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {searchTerm
                  ? "Intenta con otro término de búsqueda"
                  : "Comienza agregando los servicios que ofreces"}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Servicio
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-lg"
                        style={{ backgroundColor: service.color }}
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          {service.name}
                        </h3>
                        {!service.is_active && (
                          <span className="inline-block mt-1 rounded-full bg-danger-100 px-2 py-0.5 text-xs font-medium text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {service.description && (
                    <p className="mt-3 text-sm text-foreground-muted line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-foreground-muted">
                      <Clock className="h-4 w-4" />
                      <span>
                        {service.duration_minutes} min
                        {service.buffer_time_minutes > 0 &&
                          ` (+${service.buffer_time_minutes} min buffer)`}
                      </span>
                    </div>
                    {service.price && (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {service.currency} {service.price}
                        </span>
                      </div>
                    )}
                    {!service.available_for_online_booking && (
                      <div className="text-xs text-warning-600 dark:text-warning-400">
                        No disponible para reserva online
                      </div>
                    )}
                    {service.requires_approval && (
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        Requiere aprobación manual
                      </div>
                    )}
                  </div>

                  {canManageServices && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => toggleActive(service)}
                        className="flex items-center justify-center rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle"
                        title={service.is_active ? "Desactivar" : "Activar"}
                      >
                        {service.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(service)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(service)}
                        className="flex items-center justify-center gap-2 rounded-md bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700 transition-colors hover:bg-danger-100 dark:bg-danger-900/20 dark:text-danger-400 dark:hover:bg-danger-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingService ? "Editar Servicio" : "Nuevo Servicio"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 hover:bg-subtle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  placeholder="Ej: Corte de pelo, Manicure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  placeholder="Descripción del servicio..."
                />
              </div>

              {/* Duration and Price */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Duración (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Buffer (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formData.buffer_time_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        buffer_time_minutes: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Precio
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="h-10 w-20 cursor-pointer rounded border border-border"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Servicio activo
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="available_for_online_booking"
                    checked={formData.available_for_online_booking}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        available_for_online_booking: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="available_for_online_booking"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Disponible para reserva online
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requires_approval"
                    checked={formData.requires_approval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requires_approval: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="requires_approval"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Requiere aprobación manual
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
