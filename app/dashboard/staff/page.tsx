"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import {
  useCreateStaffMember,
  useDeactivateStaffMember,
  useDebounce,
  useReactivateStaffMember,
  useStaffQuery,
  useToast,
  useUpdateStaffMember,
} from "@/hooks";
import { StaffMember, StaffMemberFormData } from "@/types/appointments";
import {
  Edit,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

export default function StaffPage() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const toast = useToast();

  // Check if user can manage staff (only owner and admin)
  const canManageStaff = useMemo(() => {
    return profile?.role === "admin" || profile?.role === "owner";
  }, [profile]);

  // 🎉 Use the new React Query hooks!
  const {
    staff: staffMembers,
    loading,
    error,
  } = useStaffQuery({
    isActive: true,
  });

  const createStaffMutation = useCreateStaffMember();
  const updateStaffMutation = useUpdateStaffMember();
  const deactivateStaffMutation = useDeactivateStaffMember();
  const reactivateStaffMutation = useReactivateStaffMember();

  // Form data
  const [formData, setFormData] = useState<StaffMemberFormData>({
    first_name: "",
    last_name: "",
    nickname: "",
    email: "",
    phone: "",
    color: "#3B82F6",
    bio: "",
    specialties: [],
    is_active: true,
    is_bookable: true,
    accepts_online_bookings: true,
    sort_order: 0,
  });

  // Filter staff by search term (temporary - until hook supports search)
  // ⚡ Debounced search: Reduces unnecessary filtering operations
  const filteredStaff = useMemo(() => {
    if (!debouncedSearch) return staffMembers;

    const term = debouncedSearch.toLowerCase();
    return staffMembers.filter(
      (staff) =>
        staff.first_name.toLowerCase().includes(term) ||
        staff.last_name.toLowerCase().includes(term) ||
        (staff.nickname && staff.nickname.toLowerCase().includes(term)) ||
        (staff.email && staff.email.toLowerCase().includes(term)) ||
        (staff.phone && staff.phone.includes(term))
    );
  }, [staffMembers, debouncedSearch]);

  // Reset form
  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      nickname: "",
      email: "",
      phone: "",
      color: "#3B82F6",
      bio: "",
      specialties: [],
      is_active: true,
      is_bookable: true,
      accepts_online_bookings: true,
      sort_order: 0,
    });
    setEditingStaff(null);
  };

  // Open modal for creating
  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (staff: StaffMember) => {
    setFormData({
      first_name: staff.first_name,
      last_name: staff.last_name,
      nickname: staff.nickname || undefined,
      email: staff.email || undefined,
      phone: staff.phone || undefined,
      color: staff.color || undefined,
      bio: staff.bio || undefined,
      specialties: staff.specialties || undefined,
      is_active: staff.is_active ?? undefined,
      is_bookable: staff.is_bookable ?? undefined,
      accepts_online_bookings: staff.accepts_online_bookings ?? undefined,
      sort_order: staff.sort_order ?? undefined,
    });
    setEditingStaff(staff);
    setShowModal(true);
  };

  // Save staff (create or update)
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    const dataToSave: StaffMemberFormData = {
      ...formData,
      specialties: formData.specialties?.length
        ? formData.specialties
        : undefined,
    };

    console.log("🔵 Guardando personal...", dataToSave);
    const loadingToast = toast.loading(
      editingStaff ? "Actualizando personal..." : "Creando personal..."
    );

    try {
      if (editingStaff) {
        console.log("🔵 Actualizando personal existente:", editingStaff.id);
        await updateStaffMutation.mutateAsync({
          staffId: editingStaff.id,
          data: dataToSave,
        });
        console.log("✅ Personal actualizado exitosamente");
        toast.dismiss(loadingToast);
        toast.success(
          "Personal actualizado",
          `${dataToSave.first_name} ${dataToSave.last_name} ha sido actualizado`
        );
      } else {
        console.log("🔵 Creando nuevo personal");
        await createStaffMutation.mutateAsync(dataToSave);
        console.log("✅ Personal creado exitosamente");
        toast.dismiss(loadingToast);
        toast.success(
          "Personal creado",
          `${dataToSave.first_name} ${dataToSave.last_name} ha sido agregado`
        );
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("❌ Error al guardar personal:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        if (error.message.includes("Validación fallida")) {
          toast.validationError(error.message);
        } else {
          toast.error("Error al guardar personal", error.message);
        }
      } else {
        toast.error("Error inesperado", "No se pudo guardar el personal");
      }
    }
  };

  // Delete staff
  const handleDelete = async (staff: StaffMember) => {
    if (
      !confirm(
        `¿Estás seguro de desactivar a ${staff.first_name} ${staff.last_name}?`
      )
    ) {
      return;
    }

    console.log("🔵 Desactivando personal:", staff.id);
    const loadingToast = toast.loading("Desactivando personal...");

    try {
      await deactivateStaffMutation.mutateAsync(staff.id);
      console.log("✅ Personal desactivado exitosamente");
      toast.dismiss(loadingToast);
      toast.success(
        "Personal desactivado",
        `${staff.first_name} ${staff.last_name} ha sido desactivado`
      );
    } catch (error) {
      console.error("❌ Error al desactivar personal:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        toast.error("Error al desactivar personal", error.message);
      } else {
        toast.error("Error inesperado", "No se pudo desactivar el personal");
      }
    }
  };

  // Toggle active status
  const toggleActive = async (staff: StaffMember) => {
    console.log(
      "🔵 Cambiando estado del personal:",
      staff.id,
      staff.is_active ? "desactivar" : "activar"
    );
    const loadingToast = toast.loading(
      staff.is_active ? "Desactivando..." : "Activando..."
    );

    try {
      if (staff.is_active) {
        await deactivateStaffMutation.mutateAsync(staff.id);
        console.log("✅ Personal desactivado");
        toast.dismiss(loadingToast);
        toast.success(
          "Personal desactivado",
          `${staff.first_name} ${staff.last_name} ha sido desactivado`
        );
      } else {
        await reactivateStaffMutation.mutateAsync(staff.id);
        console.log("✅ Personal activado");
        toast.dismiss(loadingToast);
        toast.success(
          "Personal activado",
          `${staff.first_name} ${staff.last_name} ha sido activado`
        );
      }
    } catch (error) {
      console.error("❌ Error al cambiar estado del personal:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        toast.error("Error", error.message);
      } else {
        toast.error(
          "Error inesperado",
          "No se pudo cambiar el estado del personal"
        );
      }
    }
  };

  // Handle specialties input
  const handleSpecialtiesChange = (value: string) => {
    const specialtiesArray = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setFormData({ ...formData, specialties: specialtiesArray });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
            <p className="text-sm text-foreground-muted">
              Cargando profesionales...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Profesionales"
        description="Gestiona tu equipo de profesionales. Administra staff members, sus horarios de disponibilidad y los servicios que pueden ofrecer."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Profesionales
              </h1>
              <p className="mt-2 text-foreground-muted">
                Gestiona tu equipo de trabajo
              </p>
            </div>
            {canManageStaff && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Profesional
              </button>
            )}
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
                placeholder="Buscar profesionales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
              />
            </div>
          </div>

          {/* Staff Grid */}
          {filteredStaff.length === 0 ? (
            <div className="rounded-lg bg-surface p-12 text-center shadow-sm">
              <Users className="mx-auto h-12 w-12 text-foreground-muted" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {searchTerm
                  ? "No se encontraron profesionales"
                  : "No hay profesionales"}
              </h3>
              <p className="mt-2 text-sm text-foreground-muted">
                {searchTerm
                  ? "Intenta con otro término de búsqueda"
                  : "Comienza agregando tu equipo de trabajo"}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Profesional
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="rounded-lg bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: staff.color || "#3B82F6" }}
                      >
                        {staff.first_name[0]}
                        {staff.last_name[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          {staff.first_name} {staff.last_name}
                        </h3>
                        {staff.nickname && (
                          <p className="text-sm text-foreground-muted">
                            &quot;{staff.nickname}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {!staff.is_active && (
                      <span className="rounded-full bg-danger-100 px-2 py-0.5 text-xs font-medium text-danger-800">
                        Inactivo
                      </span>
                    )}
                    {!staff.is_bookable && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        No reservable
                      </span>
                    )}
                    {staff.accepts_online_bookings && (
                      <span className="rounded-full bg-success-700 px-2 py-0.5 text-xs font-medium text-white">
                        Online
                      </span>
                    )}
                  </div>

                  {staff.bio && (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {staff.bio}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <Phone className="h-4 w-4" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                    {staff.email && (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    )}
                    {staff.specialties && staff.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {staff.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="inline-block rounded-full bg-info-500 px-2 py-0.5 text-xs text-white"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {canManageStaff && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => toggleActive(staff)}
                        className="flex items-center justify-center rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle"
                        title={staff.is_active ? "Desactivar" : "Activar"}
                      >
                        {staff.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(staff)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(staff)}
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
          <div className="scrollbar-discreet max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingStaff ? "Editar Profesional" : "Nuevo Profesional"}
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
                    Apodo
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                    placeholder="Ej: Pepe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  />
                </div>

                <div className="sm:col-span-2">
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

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground">
                    Especialidades (separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={formData.specialties?.join(", ") || ""}
                    onChange={(e) => handleSpecialtiesChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                    placeholder="Ej: Cortes, Color, Peinados"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Biografía
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  placeholder="Breve descripción del profesional..."
                />
              </div>

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

              <div className="space-y-2">
                <div className="flex items-center">
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
                    Profesional activo
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_bookable"
                    checked={formData.is_bookable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_bookable: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
                  />
                  <label
                    htmlFor="is_bookable"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Se pueden reservar turnos con esta persona
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="accepts_online_bookings"
                    checked={formData.accepts_online_bookings}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accepts_online_bookings: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
                  />
                  <label
                    htmlFor="accepts_online_bookings"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Acepta reservas online
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={
                    createStaffMutation.isPending ||
                    updateStaffMutation.isPending
                  }
                  className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createStaffMutation.isPending ||
                    updateStaffMutation.isPending
                  }
                  className="flex-1 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createStaffMutation.isPending ||
                  updateStaffMutation.isPending
                    ? "Guardando..."
                    : editingStaff
                    ? "Guardar Cambios"
                    : "Crear Personal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
