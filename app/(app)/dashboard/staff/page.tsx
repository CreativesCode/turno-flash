"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { StaffCard } from "@/components/staff/StaffCard";
import { StaffFormModal } from "@/components/staff/StaffFormModal";
import { StaffScheduleSheet } from "@/components/staff/StaffScheduleSheet";
import { Button, ConfirmSheet, ListGroup } from "@/components/ui";
import { SUPPORT_WHATSAPP_PLAN_URL } from "@/config/constants";
import { LICENSE_PLAN_INFO } from "@/config/license-pricing";
import { useAuth } from "@/contexts/auth-context";
import { useCreateParam } from "@/hooks/useCreateParam";
import { useIsStoreApp } from "@/hooks/useIsStoreApp";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { TeamService } from "@/services";
import { useQuery } from "@tanstack/react-query";
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
import { FormEvent, Suspense, useCallback, useMemo, useRef, useState } from "react";

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

function StaffContent() {
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
  const [scheduleStaff, setScheduleStaff] = useState<StaffMember | null>(
    null
  );
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

  // The plan caps the active professionals; the database enforces it (076)
  // and this only tells the owner before trying.
  const { modules, ready: planReady } = useOrganizationModules();
  // The store app does not point to a paid upgrade (see useIsStoreApp)
  const storeApp = useIsStoreApp();
  const planInfo = LICENSE_PLAN_INFO[modules.plan];
  const activeCount = useMemo(
    () => staffMembers.filter((member) => member.is_active).length,
    [staffMembers]
  );
  const atStaffLimit =
    planReady && planInfo.staffLimit !== null && activeCount >= planInfo.staffLimit;
  const staffLimitText =
    planInfo.staffLimit === 1
      ? `Tu plan ${planInfo.label} admite 1 profesional activo.`
      : `Tu plan ${planInfo.label} admite hasta ${planInfo.staffLimit} profesionales activos.`;

  const handleCreate = useCallback(() => {
    if (atStaffLimit) {
      toast.error(
        "No caben más profesionales",
        storeApp
          ? staffLimitText
          : `${staffLimitText} Pide el cambio de plan para sumar más.`
      );
      return;
    }
    resetForm();
    setShowModal(true);
  }, [resetForm, atStaffLimit, staffLimitText, storeApp, toast]);

  useCreateParam(handleCreate, canManageStaff);

  // Same key as TeamCard: one request for both
  const { data: team } = useQuery({
    queryKey: ["team", profile?.organization_id],
    queryFn: () => TeamService.listStaff(profile?.organization_id ?? ""),
    enabled: canManageStaff && !!profile?.organization_id,
  });

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
      user_id: staff.user_id ?? null,
    });
    setEditingStaff(staff);
    setShowModal(true);
  }, []);

  const savingRef = useRef(false);
  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const dataToSave: StaffMemberFormData = {
        ...formData,
        specialties: formData.specialties?.length
          ? formData.specialties
          : undefined,
      };
      // A second tap while the first save is in flight would create a duplicate.
      if (savingRef.current) return;
      savingRef.current = true;
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
          const created = await createStaffMutation.mutateAsync(dataToSave);
          toast.dismiss(loadingToast);
          toast.success(
            "Profesional creado",
            "Ahora elige sus días, horario y servicios para que pueda recibir turnos"
          );
          // Without schedule and services they showed as bookable online
          // without being bookable at all (P1-31)
          if (created) setScheduleStaff(created as StaffMember);
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
      } finally {
        savingRef.current = false;
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

  const [staffToDeactivate, setStaffToDeactivate] =
    useState<StaffMember | null>(null);

  const handleDelete = useCallback(
    async (staff: StaffMember) => {
      setStaffToDeactivate(null);
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
            <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground" />
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
        <div className="lg:sticky lg:top-0 lg:z-20 lg:bg-background/90 lg:backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="font-display text-display text-foreground">
                  Profesionales
                </h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              </div>
              {canManageStaff && (
                <Button
                  variant="secondary"
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
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
                className="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-card bg-danger-100 p-4 text-meta text-danger-600 dark:bg-danger-900 dark:text-danger-400">
              {error}
            </div>
          )}

          {canManageStaff && atStaffLimit && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between">
              <p>
                <span className="font-semibold text-foreground">
                  {staffLimitText}
                </span>
                {storeApp ? "" : " Para sumar más, pásate a un plan mayor."}
              </p>
              {!storeApp && (
              <a
                href={SUPPORT_WHATSAPP_PLAN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-semibold text-primary hover:underline"
              >
                Pedir cambio de plan
              </a>
              )}
            </div>
          )}

          {filteredStaff.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {searchTerm ? "Sin resultados" : "Sin profesionales"}
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {searchTerm
                  ? "Prueba con otro término."
                  : "Suma a tu equipo de trabajo."}
              </p>
              {canManageStaff && !searchTerm && (
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  className="mx-auto mt-4"
                >
                  <Plus className="h-4 w-4" />
                  Agregar profesional
                </Button>
              )}
            </div>
          ) : (
            <ListGroup className="mx-auto max-w-3xl">
              {filteredStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  canManage={canManageStaff}
                  onEdit={handleEdit}
                  onSchedule={setScheduleStaff}
                  onToggleActive={handleToggleActive}
                  onDelete={setStaffToDeactivate}
                />
              ))}
            </ListGroup>
          )}
        </div>

      </div>

      <StaffFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editingStaff}
        formData={formData}
        team={team?.data ?? []}
        onChange={patchForm}
        onSpecialtiesChange={handleSpecialtiesChange}
        onSubmit={handleSave}
        isSubmitting={
          createStaffMutation.isPending || updateStaffMutation.isPending
        }
      />

      <StaffScheduleSheet
        staff={scheduleStaff}
        onClose={() => setScheduleStaff(null)}
      />

      <ConfirmSheet
        open={!!staffToDeactivate}
        onClose={() => setStaffToDeactivate(null)}
        onConfirm={() => void (staffToDeactivate && handleDelete(staffToDeactivate))}
        title="Desactivar profesional"
        confirmLabel="Desactivar"
      >
        ¿Desactivar a{" "}
        <span className="font-semibold text-foreground">
          {staffToDeactivate?.first_name} {staffToDeactivate?.last_name}
        </span>
        ? Dejará de aparecer para nuevos turnos.
      </ConfirmSheet>
    </ProtectedRoute>
  );
}

export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground" />
              <p className="text-sm text-foreground-muted">Cargando profesionales...</p>
            </div>
          </div>
        </ProtectedRoute>
      }
    >
      <StaffContent />
    </Suspense>
  );
}
