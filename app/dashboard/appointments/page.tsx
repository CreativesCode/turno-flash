"use client";

import { ApptRow } from "@/components/appointments/ApptRow";
import {
  AppointmentCreateModal,
  AppointmentDetailModal,
} from "@/components/appointments/AppointmentModal";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui";
import { CalendarSkeleton } from "@/components/ui/skeleton";
import {
  APPOINTMENT_SOURCE,
  APPOINTMENT_STATUS,
} from "@/config/constants";
import { useAuth } from "@/contexts/auth-context";
import {
  useCreateAppointment,
  useCreateCustomer,
  useDebounce,
  useInfiniteAppointments,
  useNormalizedData,
  useSendReminder,
  useToast,
  useUpdateAppointmentStatus,
} from "@/hooks";
import { AppointmentService } from "@/services";
import {
  AppointmentFormData,
  AppointmentStatus,
  AppointmentWithDetails,
  CustomerFormData,
} from "@/types/appointments";
import { downloadCsv } from "@/utils/csv";
import { getLocalDateString } from "@/utils/date";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Download,
  List,
  Plus,
  Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from "react";

const DayCalendar = dynamic(
  () =>
    import("@/components/calendar").then((mod) => ({ default: mod.DayCalendar })),
  { loading: () => <CalendarSkeleton />, ssr: false }
);

const WeekCalendar = dynamic(
  () =>
    import("@/components/calendar").then((mod) => ({ default: mod.WeekCalendar })),
  { loading: () => <CalendarSkeleton />, ssr: false }
);

type AppointmentView = "list" | "day" | "week";
type FilterStatus = AppointmentStatus | "all";

const FILTER_CHIPS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "confirmed", label: "Confirmados" },
  { key: "reminded", label: "Recordatorio" },
  { key: "client_confirmed", label: "Cliente OK" },
  { key: "checked_in", label: "Check-in" },
  { key: "in_progress", label: "En curso" },
  { key: "completed", label: "Completados" },
  { key: "cancelled", label: "Cancelados" },
];

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const router = useRouter();

  /* ── State ────────────────────────────────────────────────── */
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<AppointmentView>("list");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const toast = useToast();

  const [newCustomerData, setNewCustomerData] = useState<CustomerFormData>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
    is_active: true,
  });

  const [formData, setFormData] = useState<AppointmentFormData>({
    customer_id: "",
    service_id: "",
    staff_id: null,
    appointment_date: getLocalDateString(),
    start_time: "09:00",
    end_time: "09:30",
    status: APPOINTMENT_STATUS.CONFIRMED,
    source: APPOINTMENT_SOURCE.ADMIN,
    notes: "",
  });

  /* ── Permissions ─────────────────────────────────────────── */
  const canManageAppointments = useMemo(
    () =>
      profile?.role === "admin" ||
      profile?.role === "owner" ||
      profile?.role === "staff",
    [profile]
  );

  /* ── Date range based on view ────────────────────────────── */
  const dateRange = useMemo(() => {
    // Vista Lista: mostrar últimos 7 días + próximos 60 días (agenda amplia)
    if (view === "list") {
      const past = new Date(selectedDate);
      past.setDate(past.getDate() - 7);
      const future = new Date(selectedDate);
      future.setDate(future.getDate() + 60);
      return {
        start: getLocalDateString(past),
        end: getLocalDateString(future),
      };
    }
    // Vista Semana: semana que contiene selectedDate
    if (view === "week") {
      const start = new Date(selectedDate);
      const end = new Date(selectedDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
      return { start: getLocalDateString(start), end: getLocalDateString(end) };
    }
    // Vista Día: solo el día seleccionado
    return {
      start: getLocalDateString(selectedDate),
      end: getLocalDateString(selectedDate),
    };
  }, [selectedDate, view]);

  /* ── Data queries ────────────────────────────────────────── */
  const {
    data: appointmentsData,
    fetchNextPage: fetchNextAppointmentsPage,
    hasNextPage: hasNextAppointmentsPage,
    isFetchingNextPage: isFetchingNextAppointmentsPage,
    isLoading: appointmentsLoading,
    error: appointmentsError,
  } = useInfiniteAppointments(
    { startDate: dateRange.start, endDate: dateRange.end },
    50
  );

  const appointments = useMemo(
    () => appointmentsData?.pages.flat() ?? [],
    [appointmentsData]
  );

  const normalizedData = useNormalizedData({
    includeAppointments: false,
    customerFilters: { isActive: true },
    serviceFilters: { isActive: true },
    staffFilters: { isActive: true, isBookable: true },
  });

  const customers = normalizedData.customers;
  const services = normalizedData.services;
  const staffMembers = normalizedData.staff;

  const createAppointmentMutation = useCreateAppointment();
  const updateAppointmentStatusMutation = useUpdateAppointmentStatus();
  const sendReminderMutation = useSendReminder();
  const createCustomerMutation = useCreateCustomer();

  const loading = appointmentsLoading || normalizedData.loading;
  const error =
    appointmentsError?.message || normalizedData.error || localError;

  /* ── Export CSV ──────────────────────────────────────────── */
  const handleExportCsv = useCallback(async () => {
    if (!profile?.organization_id) return;
    const result = await AppointmentService.getByDateRange(
      profile.organization_id,
      dateRange.start,
      dateRange.end
    );
    if (!result.success || !result.appointments) {
      toast.error("Error al exportar", result.error ?? undefined);
      return;
    }
    if (result.appointments.length === 0) {
      toast.info("Nada para exportar", "No hay turnos en el rango visible");
      return;
    }
    downloadCsv(
      `turnos_${dateRange.start}_a_${dateRange.end}`,
      [
        "Fecha",
        "Hora",
        "Cliente",
        "Teléfono",
        "Servicio",
        "Profesional",
        "Estado",
        "Precio",
        "Pagado",
        "Origen",
        "N°",
      ],
      result.appointments.map((a) => [
        a.appointment_date,
        a.start_time?.slice(0, 5),
        `${a.customer_first_name} ${a.customer_last_name}`.trim(),
        a.customer_phone,
        a.service_name,
        [a.staff_first_name, a.staff_last_name].filter(Boolean).join(" "),
        a.status,
        a.price_charged ?? a.service_price ?? "",
        a.was_paid ? "Sí" : "No",
        a.source ?? "",
        a.appointment_number ?? "",
      ])
    );
    toast.success(
      "CSV exportado",
      `${result.appointments.length} turnos descargados`
    );
  }, [profile?.organization_id, dateRange.start, dateRange.end, toast]);

  /* ── Helpers ─────────────────────────────────────────────── */
  const calculateEndTime = useCallback(
    (startTime: string, serviceId: string) => {
      const service = services.find((s) => s.id === serviceId);
      if (!service) return startTime;
      return AppointmentService.calculateEndTime(startTime, service);
    },
    [services]
  );

  const handleServiceChange = useCallback(
    (serviceId: string) => {
      const selectedService = services.find((s) => s.id === serviceId);
      const newStatus = selectedService?.requires_approval
        ? APPOINTMENT_STATUS.PENDING
        : APPOINTMENT_STATUS.CONFIRMED;
      setFormData((prev) => ({
        ...prev,
        service_id: serviceId,
        end_time: calculateEndTime(prev.start_time, serviceId),
        status: newStatus,
      }));
    },
    [services, calculateEndTime]
  );

  const handleStartTimeChange = useCallback(
    (startTime: string) => {
      setFormData((prev) => ({
        ...prev,
        start_time: startTime,
        end_time: calculateEndTime(startTime, prev.service_id),
      }));
    },
    [calculateEndTime]
  );

  const patchFormData = useCallback((patch: Partial<AppointmentFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchNewCustomer = useCallback((patch: Partial<CustomerFormData>) => {
    setNewCustomerData((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      customer_id: "",
      service_id: "",
      staff_id: null,
      appointment_date: getLocalDateString(),
      start_time: "09:00",
      end_time: "09:30",
      status: APPOINTMENT_STATUS.CONFIRMED,
      source: APPOINTMENT_SOURCE.ADMIN,
      notes: "",
    });
    setShowNewCustomerForm(false);
    setNewCustomerData({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      notes: "",
      is_active: true,
    });
  }, []);

  /* ── Handlers ────────────────────────────────────────────── */
  const handleCreate = useCallback(() => {
    if (!canManageAppointments) {
      setLocalError("No tienes permisos para crear turnos");
      return;
    }
    resetForm();
    setShowCreateModal(true);
  }, [canManageAppointments, resetForm]);

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!canManageAppointments) {
        toast.error("Sin permisos", "No tienes permisos para crear turnos");
        return;
      }
      const loadingToast = toast.loading("Creando turno...");
      try {
        await createAppointmentMutation.mutateAsync(formData);
        toast.dismiss(loadingToast);
        toast.success("Turno creado", "El turno fue agendado correctamente");
        setShowCreateModal(false);
        resetForm();
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          if (err.message.includes("Validación fallida")) {
            toast.validationError(err.message);
          } else {
            toast.error("Error al crear turno", err.message);
          }
        } else {
          toast.error("Error inesperado", "No se pudo crear el turno");
        }
      }
    },
    [canManageAppointments, formData, createAppointmentMutation, toast, resetForm]
  );

  const handleCreateCustomer = useCallback(async () => {
    const loadingToast = toast.loading("Creando cliente...");
    try {
      const customer = await createCustomerMutation.mutateAsync(newCustomerData);
      if (!customer?.id) throw new Error("Cliente retornado inválido");

      setFormData((prev) => ({ ...prev, customer_id: customer.id }));
      setNewCustomerData({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        notes: "",
        is_active: true,
      });
      setShowNewCustomerForm(false);
      toast.dismiss(loadingToast);
      toast.success(
        "Cliente creado",
        `${newCustomerData.first_name} ${newCustomerData.last_name} fue agregado`
      );
    } catch (err) {
      toast.dismiss(loadingToast);
      if (err instanceof Error) {
        if (err.message.includes("Validación fallida")) {
          toast.validationError(err.message);
        } else {
          toast.error("Error al crear cliente", err.message);
        }
      } else {
        toast.error("Error inesperado", "No se pudo crear el cliente");
      }
    }
  }, [newCustomerData, createCustomerMutation, toast]);

  const handleSendReminder = useCallback(
    async (appointment: AppointmentWithDetails) => {
      const loadingToast = toast.loading("Enviando recordatorio...");
      try {
        await sendReminderMutation.mutateAsync({
          appointmentId: appointment.id,
          method: "whatsapp",
        });
        toast.dismiss(loadingToast);
        toast.success(
          "Recordatorio enviado",
          `WhatsApp en camino a ${appointment.customer_first_name}`
        );
        if (selectedAppointment?.id === appointment.id) {
          setSelectedAppointment({
            ...selectedAppointment,
            status: "reminded" as AppointmentStatus,
          });
        }
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          toast.error("Error al enviar recordatorio", err.message);
        } else {
          toast.error("Error inesperado", "No se pudo enviar el recordatorio");
        }
      }
    },
    [sendReminderMutation, toast, selectedAppointment]
  );

  const updateStatus = useCallback(
    async (appointmentId: string, newStatus: AppointmentStatus) => {
      if (!newStatus) {
        toast.error("Error", "El estado no puede estar vacío");
        return;
      }
      const loadingToast = toast.loading("Actualizando estado...");
      try {
        await updateAppointmentStatusMutation.mutateAsync({
          appointmentId,
          newStatus,
        });
        toast.dismiss(loadingToast);
        toast.success("Estado actualizado", "El turno fue actualizado");
        if (selectedAppointment?.id === appointmentId) {
          setSelectedAppointment({
            ...selectedAppointment,
            status: newStatus,
          });
        }
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          toast.error("Error al actualizar estado", err.message);
        } else {
          toast.error("Error inesperado", "No se pudo actualizar el estado");
        }
        setLocalError("Error al actualizar estado");
      }
    },
    [updateAppointmentStatusMutation, toast, selectedAppointment]
  );

  /* ── List filtering / grouping ───────────────────────────── */
  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (filterStatus !== "all") {
      list = list.filter((a) => a.status === filterStatus);
    }
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.customer_first_name.toLowerCase().includes(term) ||
          a.customer_last_name.toLowerCase().includes(term) ||
          a.customer_phone.includes(term) ||
          a.service_name.toLowerCase().includes(term) ||
          (a.staff_first_name &&
            a.staff_first_name.toLowerCase().includes(term))
      );
    }
    // Sort by date asc, then start_time asc
    return [...list].sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) {
        return a.appointment_date < b.appointment_date ? -1 : 1;
      }
      return a.start_time.localeCompare(b.start_time);
    });
  }, [appointments, filterStatus, debouncedSearch]);

  const grouped = useMemo(() => {
    // Group by date, then morning/afternoon
    const byDate = new Map<string, AppointmentWithDetails[]>();
    filteredAppointments.forEach((a) => {
      const arr = byDate.get(a.appointment_date) ?? [];
      arr.push(a);
      byDate.set(a.appointment_date, arr);
    });
    const sections: {
      date: string;
      morning: AppointmentWithDetails[];
      afternoon: AppointmentWithDetails[];
    }[] = [];
    Array.from(byDate.keys())
      .sort()
      .forEach((date) => {
        const all = byDate.get(date)!;
        const morning = all.filter((a) => parseInt(a.start_time, 10) < 13);
        const afternoon = all.filter((a) => parseInt(a.start_time, 10) >= 13);
        sections.push({ date, morning, afternoon });
      });
    return sections;
  }, [filteredAppointments]);

  /* ── Calendar handlers ───────────────────────────────────── */
  const handleAppointmentClick = useCallback((apt: AppointmentWithDetails) => {
    setSelectedAppointment(apt);
    setShowDetailModal(true);
  }, []);

  const handleDayTimeSlotClick = useCallback(
    (time: string) => {
      setFormData((prev) => ({
        ...prev,
        appointment_date: getLocalDateString(selectedDate),
        start_time: time,
        end_time: calculateEndTime(time, prev.service_id),
      }));
      setShowCreateModal(true);
    },
    [selectedDate, calculateEndTime]
  );

  const handleWeekTimeSlotClick = useCallback(
    (date: string, time: string) => {
      setFormData((prev) => ({
        ...prev,
        appointment_date: date,
        start_time: time,
        end_time: calculateEndTime(time, prev.service_id),
      }));
      setShowCreateModal(true);
    },
    [calculateEndTime]
  );

  /* ── Detail-modal helpers ────────────────────────────────── */
  const detailServiceColor = useMemo(() => {
    if (!selectedAppointment) return null;
    return (
      services.find((s) => s.id === selectedAppointment.service_id)?.color ??
      null
    );
  }, [selectedAppointment, services]);

  const detailStaffColor = useMemo(() => {
    if (!selectedAppointment?.staff_id) return null;
    return (
      staffMembers.find((s) => s.id === selectedAppointment.staff_id)?.color ??
      null
    );
  }, [selectedAppointment, staffMembers]);

  /* ── Org guard ───────────────────────────────────────────── */
  if (!profile?.organization_id) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-warning-500" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              Sin Organización
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Necesitas pertenecer a una organización para gestionar turnos
            </p>
            <Button
              variant="info"
              onClick={() => router.push("/dashboard")}
              className="mt-4"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
            <p className="text-sm text-foreground-muted">Cargando turnos...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const subtitle =
    view === "week"
      ? `Semana · ${appointments.length} turno${
          appointments.length !== 1 ? "s" : ""
        }`
      : `${appointments.length} turno${appointments.length !== 1 ? "s" : ""}`;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Turnos"
        description="Gestiona tus turnos y citas. Visualiza tu calendario, crea nuevas citas, confirma o cancela reservas existentes."
      />

      <div className="relative min-h-screen bg-background pb-24">
        {/* Sticky controls */}
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            {/* Title + desktop "new" button */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  Turnos
                </h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  title="Exportar turnos del rango visible a CSV"
                  className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground-muted transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                {canManageAppointments && (
                  <Button
                    variant="mesh-primary"
                    onClick={handleCreate}
                    className="hidden sm:inline-flex"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo turno
                  </Button>
                )}
              </div>
            </div>

            {/* View switcher (segmented) */}
            <div className="flex items-center rounded-xl border border-border bg-surface-2 p-1">
              {(
                [
                  { k: "list", l: "Lista", I: List },
                  { k: "day", l: "Día", I: Calendar },
                  { k: "week", l: "Semana", I: CalendarDays },
                ] as const
              ).map(({ k, l, I }) => {
                const active = view === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setView(k)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    <I className="h-4 w-4" />
                    {l}
                  </button>
                );
              })}
            </div>

            {/* Search + chips (only in list view) */}
            {view === "list" && (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, servicio o teléfono…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                  />
                </div>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                  {FILTER_CHIPS.map((c) => {
                    const active = filterStatus === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setFilterStatus(c.key)}
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-surface text-foreground-muted hover:text-foreground"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {/* List view */}
          {view === "list" && (
            <>
              {filteredAppointments.length === 0 ? (
                <EmptyListState
                  hasFilters={!!searchTerm || filterStatus !== "all"}
                  canManage={canManageAppointments}
                  onCreate={handleCreate}
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {grouped.map((section) => {
                    const sectionDate = formatSectionDate(section.date);
                    return (
                      <div key={section.date} className="flex flex-col gap-2">
                        <h2 className="px-1 text-xs font-bold uppercase tracking-[0.05em] text-foreground-subtle">
                          {sectionDate}
                        </h2>
                        {section.morning.length > 0 && (
                          <SectionHeader
                            label="Mañana"
                            count={section.morning.length}
                          />
                        )}
                        {section.morning.map((a) => (
                          <ApptRow
                            key={a.id}
                            appointment={a}
                            onOpen={handleAppointmentClick}
                            onAdvance={
                              canManageAppointments
                                ? (apt, to) =>
                                    updateStatus(apt.id, to as AppointmentStatus)
                                : undefined
                            }
                            serviceColor={
                              services.find((s) => s.id === a.service_id)
                                ?.color ?? null
                            }
                            staffColor={
                              staffMembers.find((s) => s.id === a.staff_id)
                                ?.color ?? null
                            }
                          />
                        ))}
                        {section.afternoon.length > 0 && (
                          <SectionHeader
                            label="Tarde"
                            count={section.afternoon.length}
                          />
                        )}
                        {section.afternoon.map((a) => (
                          <ApptRow
                            key={a.id}
                            appointment={a}
                            onOpen={handleAppointmentClick}
                            onAdvance={
                              canManageAppointments
                                ? (apt, to) =>
                                    updateStatus(apt.id, to as AppointmentStatus)
                                : undefined
                            }
                            serviceColor={
                              services.find((s) => s.id === a.service_id)
                                ?.color ?? null
                            }
                            staffColor={
                              staffMembers.find((s) => s.id === a.staff_id)
                                ?.color ?? null
                            }
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {hasNextAppointmentsPage && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="soft"
                    onClick={() => fetchNextAppointmentsPage()}
                    disabled={isFetchingNextAppointmentsPage}
                  >
                    {isFetchingNextAppointmentsPage
                      ? "Cargando…"
                      : `Cargar más (${filteredAppointments.length})`}
                  </Button>
                </div>
              )}
            </>
          )}

          {view === "day" && (
            <DayCalendar
              date={selectedDate}
              appointments={filteredAppointments}
              onDateChange={setSelectedDate}
              onAppointmentClick={handleAppointmentClick}
              onTimeSlotClick={
                canManageAppointments ? handleDayTimeSlotClick : undefined
              }
            />
          )}

          {view === "week" && (
            <WeekCalendar
              date={selectedDate}
              appointments={appointments}
              onDateChange={setSelectedDate}
              onAppointmentClick={handleAppointmentClick}
              onTimeSlotClick={
                canManageAppointments ? handleWeekTimeSlotClick : undefined
              }
            />
          )}
        </div>

        {/* FAB (mobile) */}
        {canManageAppointments && (
          <button
            type="button"
            onClick={handleCreate}
            aria-label="Nuevo turno"
            className="mesh-primary fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow-primary transition-transform hover:-translate-y-px sm:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Create modal */}
      <AppointmentCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        onChange={patchFormData}
        onServiceChange={handleServiceChange}
        onStartTimeChange={handleStartTimeChange}
        onSubmit={handleSave}
        isSubmitting={createAppointmentMutation.isPending}
        customers={customers}
        services={services}
        staff={staffMembers}
        showNewCustomerForm={showNewCustomerForm}
        onToggleNewCustomerForm={() => setShowNewCustomerForm((v) => !v)}
        newCustomerData={newCustomerData}
        onChangeNewCustomer={patchNewCustomer}
        onCreateCustomer={handleCreateCustomer}
        isCreatingCustomer={createCustomerMutation.isPending}
      />

      {/* Detail modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          serviceColor={detailServiceColor}
          staffColor={detailStaffColor}
          onAdvance={(to) => updateStatus(selectedAppointment.id, to)}
          onSendReminder={() => handleSendReminder(selectedAppointment)}
          onMarkNoShow={() =>
            updateStatus(
              selectedAppointment.id,
              APPOINTMENT_STATUS.NO_SHOW as AppointmentStatus
            )
          }
          onCancel={() =>
            updateStatus(
              selectedAppointment.id,
              APPOINTMENT_STATUS.CANCELLED as AppointmentStatus
            )
          }
          isProcessing={updateAppointmentStatusMutation.isPending}
        />
      )}
    </ProtectedRoute>
  );
}

/* ────────────────────────────────────────────────────────── */
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
      <span>{label}</span>
      <span className="rounded-full bg-surface-2 px-1.5 py-px text-[10px]">
        {count}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function EmptyListState({
  hasFilters,
  canManage,
  onCreate,
}: {
  hasFilters: boolean;
  canManage: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
        <Calendar className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-bold text-foreground">
        {hasFilters ? "Sin turnos" : "Aún no hay turnos"}
      </h3>
      <p className="mt-1 text-sm text-foreground-muted">
        {hasFilters
          ? "No encontramos turnos con esos filtros."
          : "Cuando crees un turno aparecerá acá."}
      </p>
      {canManage && !hasFilters && (
        <Button
          variant="mesh-primary"
          onClick={onCreate}
          className="mx-auto mt-4"
        >
          <Plus className="h-4 w-4" />
          Crear turno
        </Button>
      )}
    </div>
  );
}

function formatSectionDate(date: string): string {
  const today = getLocalDateString();
  if (date === today) return "Hoy";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === getLocalDateString(tomorrow)) return "Mañana";
  const [y, m, d] = date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}
