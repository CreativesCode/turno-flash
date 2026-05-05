"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { StaffCard } from "@/components/staff/StaffCard";
import { StaffFormModal } from "@/components/staff/StaffFormModal";
import { Button } from "@/components/ui";
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
import { Plus, Search, Users } from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";

const EMPTY_FORM: StaffMemberFormData = {
  first_name: "",
  last_name: "",
  nickname: "",
  email: "",
  phone: "",
  color: "#3b82f6",
  bio: "",
  specialties: [],
  is_active: true,
  is_bookable: true,
  accepts_online_bookings: true,
  sort_order: 0,
};

export default function StaffPage() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const toast = useToast();

  const canManageStaff = useMemo(
    () => profile?.role === "admin" || profile?.role === "owner",
    [profile]
  );

  const { staff: staffMembers, loading, error } = useStaffQuery({});

  const createStaffMutation = useCreateStaffMember();
  const updateStaffMutation = useUpdateStaffMember();
  const deactivateStaffMutation = useDeactivateStaffMember();
  const reactivateStaffMutation = useReactivateStaffMember();

  const filteredStaff = useMemo(() => {
    if (!debouncedSearch) return staffMembers;
    const term = debouncedSearch.toLowerCase();
    return staffMembers.filter(
      (staff) =>
        staff.first_name.toLowerCase().includes(term) ||
        staff.last_name.toLowerCase().includes(term) ||
        staff.nickname?.toLowerCase().includes(term) ||
        staff.email?.toLowerCase().includes(term) ||
        staff.phone?.includes(term)
    );
  }, [staffMembers, debouncedSearch]);

  const [formData, setFormData] = useState<StaffMemberFormData>(EMPTY_FORM);

  const patchForm = useCallback((patch: Partial<StaffMemberFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSpecialtiesChange = useCallback((csv: string) => {
    const arr = csv
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setFormData((prev) => ({ ...prev, specialties: arr }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditingStaff(null);
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const handleEdit = useCallback((staff: StaffMember) => {
    setFormData({
      first_name: staff.first_name,
      last_name: staff.last_name,
      nickname: staff.nickname ?? "",
      email: staff.email ?? "",
      phone: staff.phone ?? "",
      color: staff.color ?? "#3b82f6",
      bio: staff.bio ?? "",
      specialties: staff.specialties ?? [],
      is_active: staff.is_active ?? true,
      is_bookable: staff.is_bookable ?? true,
      accepts_online_bookings: staff.accepts_online_bookings ?? true,
      sort_order: staff.sort_order ?? 0,
    });
    setEditingStaff(staff);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const dataToSave: StaffMemberFormData = {
        ...formData,
        specialties: formData.specialties?.length
          ? formData.specialties
          : undefined,
      };
      const loadingToast = toast.loading(
        editingStaff ? "Actualizando profesional..." : "Creando profesional..."
      );
      try {
        if (editingStaff) {
          await updateStaffMutation.mutateAsync({
            staffId: editingStaff.id,
            data: dataToSave,
          });
          toast.dismiss(loadingToast);
          toast.success(
            "Profesional actualizado",
            `${dataToSave.first_name} ${dataToSave.last_name} fue actualizado`
          );
        } else {
          await createStaffMutation.mutateAsync(dataToSave);
          toast.dismiss(loadingToast);
          toast.success(
            "Profesional creado",
            `${dataToSave.first_name} ${dataToSave.last_name} fue agregado`
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
            toast.error("Error al guardar profesional", err.message);
          }
        } else {
          toast.error("Error inesperado", "No se pudo guardar el profesional");
        }
      }
    },
    [
      editingStaff,
      formData,
      createStaffMutation,
      updateStaffMutation,
      toast,
      resetForm,
    ]
  );

  const handleToggleActive = useCallback(
    async (staff: StaffMember) => {
      const loadingToast = toast.loading(
        staff.is_active ? "Pausando..." : "Activando..."
      );
      try {
        if (staff.is_active) {
          await deactivateStaffMutation.mutateAsync(staff.id);
          toast.dismiss(loadingToast);
          toast.success(
            "Profesional pausado",
            `${staff.first_name} ${staff.last_name} fue desactivado`
          );
        } else {
          await reactivateStaffMutation.mutateAsync(staff.id);
          toast.dismiss(loadingToast);
          toast.success(
            "Profesional reactivado",
            `${staff.first_name} ${staff.last_name} vuelve al equipo`
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
    [deactivateStaffMutation, reactivateStaffMutation, toast]
  );

  const handleDelete = useCallback(
    async (staff: StaffMember) => {
      if (
        !confirm(
          `¿Desactivar a ${staff.first_name} ${staff.last_name}?`
        )
      ) {
        return;
      }
      const loadingToast = toast.loading("Desactivando profesional...");
      try {
        await deactivateStaffMutation.mutateAsync(staff.id);
        toast.dismiss(loadingToast);
        toast.success(
          "Profesional desactivado",
          `${staff.first_name} ${staff.last_name} fue desactivado`
        );
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          toast.error("Error al desactivar", err.message);
        } else {
          toast.error("Error inesperado", "No se pudo desactivar");
        }
      }
    },
    [deactivateStaffMutation, toast]
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">
              Cargando profesionales...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const subtitle = `${staffMembers.length} en el equipo${
    debouncedSearch ? ` · filtro: "${debouncedSearch}"` : ""
  }`;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Profesionales"
        description="Gestiona tu equipo de profesionales. Administra staff members, sus horarios de disponibilidad y los servicios que pueden ofrecer."
      />

      <div className="relative min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  Profesionales
                </h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              </div>
              {canManageStaff && (
                <Button
                  variant="mesh-primary"
                  onClick={handleCreate}
                  className="hidden sm:inline-flex"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo profesional
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Buscar por nombre, apodo o contacto…"
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

          {filteredStaff.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                {searchTerm ? "Sin resultados" : "Sin profesionales"}
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {searchTerm
                  ? "Probá con otro término."
                  : "Sumá a tu equipo de trabajo."}
              </p>
              {canManageStaff && !searchTerm && (
                <Button
                  variant="mesh-primary"
                  onClick={handleCreate}
                  className="mx-auto mt-4"
                >
                  <Plus className="h-4 w-4" />
                  Agregar profesional
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  canManage={canManageStaff}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {canManageStaff && (
          <button
            type="button"
            onClick={handleCreate}
            aria-label="Nuevo profesional"
            className="mesh-primary fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow-primary transition-transform hover:-translate-y-px sm:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      <StaffFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editingStaff}
        formData={formData}
        onChange={patchForm}
        onSpecialtiesChange={handleSpecialtiesChange}
        onSubmit={handleSave}
        isSubmitting={
          createStaffMutation.isPending || updateStaffMutation.isPending
        }
      />
    </ProtectedRoute>
  );
}
