"use client";

import { DayCalendar, WeekCalendar } from "@/components/calendar";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import {
  useAppointmentsQuery,
  useCreateAppointment,
  useUpdateAppointmentStatus,
  useSendReminder,
  useCustomersQuery,
  useCreateCustomer,
  useServicesQuery,
  useStaffQuery,
  useToast,
} from "@/hooks";
import { AppointmentService } from "@/services";
import {
  AppointmentFormData,
  AppointmentWithDetails,
  CustomerFormData,
} from "@/types/appointments";
import { formatDateShort, getLocalDateString } from "@/utils/date";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  List,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type AppointmentView = "list" | "day" | "week";
type FilterStatus = "all" | "pending" | "confirmed" | "completed" | "cancelled";

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState<string>(getLocalDateString());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<AppointmentView>("day");

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const toast = useToast();

  // New customer form data
  const [newCustomerData, setNewCustomerData] = useState<CustomerFormData>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
    is_active: true,
  });

  // Form data
  const [formData, setFormData] = useState<AppointmentFormData>({
    customer_id: "",
    service_id: "",
    staff_id: null,
    appointment_date: getLocalDateString(),
    start_time: "09:00",
    end_time: "09:30",
    status: "confirmed",
    source: "admin",
    notes: "",
  });

  // Check if user has permission
  const canManageAppointments = useMemo(() => {
    return (
      profile?.role === "admin" ||
      profile?.role === "owner" ||
      profile?.role === "staff"
    );
  }, [profile]);

  // Calculate date range based on view
  const getDateRange = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    if (view === "week") {
      // Start of week (Monday)
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    }

    return {
      start: getLocalDateString(start),
      end: getLocalDateString(end),
    };
  }, [selectedDate, view]);

  // 🎉 Use React Query hooks for all data!
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointmentsQuery({
    startDate: getDateRange.start,
    endDate: getDateRange.end,
  });

  const {
    customers,
    loading: customersLoading,
  } = useCustomersQuery({ isActive: true });

  const { services, loading: servicesLoading } = useServicesQuery({
    isActive: true,
  });

  const { staff: staffMembers, loading: staffLoading } = useStaffQuery({
    isActive: true,
    isBookable: true,
  });

  const createAppointmentMutation = useCreateAppointment();
  const updateAppointmentStatusMutation = useUpdateAppointmentStatus();
  const sendReminderMutation = useSendReminder();
  const createCustomerMutation = useCreateCustomer();

  // Combined loading state
  const loading =
    appointmentsLoading || customersLoading || servicesLoading || staffLoading;

  // Combine hook errors with local errors
  const error = appointmentsError || localError;

  // Helper to set error (local error takes precedence)
  const setError = (errorMsg: string | null) => {
    setLocalError(errorMsg);
  };

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((apt) => apt.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.customer_first_name.toLowerCase().includes(term) ||
          apt.customer_last_name.toLowerCase().includes(term) ||
          apt.customer_phone.includes(term) ||
          apt.service_name.toLowerCase().includes(term) ||
          (apt.staff_first_name &&
            apt.staff_first_name.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [appointments, filterStatus, searchTerm]);

  // Calculate service end time using AppointmentService
  const calculateEndTime = (startTime: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return startTime;

    return AppointmentService.calculateEndTime(startTime, service);
  };

  // Handle service change
  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find((s) => s.id === serviceId);
    const newStatus = selectedService?.requires_approval
      ? "pending"
      : "confirmed";

    setFormData((prev) => ({
      ...prev,
      service_id: serviceId,
      end_time: calculateEndTime(prev.start_time, serviceId),
      status: newStatus,
    }));
  };

  // Handle start time change
  const handleStartTimeChange = (startTime: string) => {
    setFormData((prev) => ({
      ...prev,
      start_time: startTime,
      end_time: calculateEndTime(startTime, prev.service_id),
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      customer_id: "",
      service_id: "",
      staff_id: null,
      appointment_date: getLocalDateString(),
      start_time: "09:00",
      end_time: "09:30",
      status: "confirmed",
      source: "admin",
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
  };

  // Open modal for creating
  const handleCreate = () => {
    if (!canManageAppointments) {
      setError("No tienes permisos para crear turnos");
      return;
    }
    resetForm();
    setShowModal(true);
  };

  // Save appointment using hook
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!canManageAppointments) {
      toast.error("Sin permisos", "No tienes permisos para crear turnos");
      return;
    }

    console.log("🔵 Guardando turno...", formData);
    const loadingToast = toast.loading("Creando turno...");

    try {
      await createAppointmentMutation.mutateAsync(formData);
      console.log("✅ Turno creado exitosamente");
      toast.dismiss(loadingToast);
      toast.success("Turno creado", "El turno ha sido agendado correctamente");
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("❌ Error al crear turno:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        if (error.message.includes("Validación fallida")) {
          toast.validationError(error.message);
        } else {
          toast.error("Error al crear turno", error.message);
        }
      } else {
        toast.error("Error inesperado", "No se pudo crear el turno");
      }
    }
  };

  // Create customer quickly using hook
  const handleCreateCustomer = async () => {
    console.log("🔵 Creando cliente rápido...", newCustomerData);
    const loadingToast = toast.loading("Creando cliente...");

    try {
      const customer = await createCustomerMutation.mutateAsync(newCustomerData);
      console.log("✅ Cliente creado exitosamente:", customer.id);

      // Select the new customer
      setFormData((prev) => ({
        ...prev,
        customer_id: customer.id,
      }));

      // Reset form and close
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
      toast.success("Cliente creado", `${newCustomerData.first_name} ${newCustomerData.last_name} ha sido agregado`);
    } catch (error) {
      console.error("❌ Error al crear cliente:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        if (error.message.includes("Validación fallida")) {
          toast.validationError(error.message);
        } else {
          toast.error("Error al crear cliente", error.message);
        }
      } else {
        toast.error("Error inesperado", "No se pudo crear el cliente");
      }
    }
  };

  // Send reminder for an appointment using hook
  const handleSendReminder = async (appointment: AppointmentWithDetails) => {
    console.log("🔵 Enviando recordatorio para turno:", appointment.id);
    const loadingToast = toast.loading("Enviando recordatorio...");

    try {
      const result = await sendReminderMutation.mutateAsync({
        appointmentId: appointment.id,
        method: "whatsapp",
      });

      console.log("✅ Recordatorio enviado exitosamente");

      // Open WhatsApp if URL is available
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank");
      }

      toast.dismiss(loadingToast);
      toast.success("Recordatorio enviado", `Se envió a ${appointment.customer_first_name}`);

      // Update the selected appointment in the modal
      if (selectedAppointment?.id === appointment.id) {
        const updatedAppointment = {
          ...selectedAppointment,
          status: "reminded",
        };
        setSelectedAppointment(updatedAppointment as AppointmentWithDetails);
      }
    } catch (error) {
      console.error("❌ Error al enviar recordatorio:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        toast.error("Error al enviar recordatorio", error.message);
      } else {
        toast.error("Error inesperado", "No se pudo enviar el recordatorio");
      }
    }
  };

  // Update appointment status using hook
  const updateStatus = async (appointmentId: string, newStatus: string) => {
    console.log("🔵 Actualizando estado del turno:", appointmentId, "->", newStatus);
    const loadingToast = toast.loading("Actualizando estado...");

    try {
      await updateAppointmentStatusMutation.mutateAsync({
        appointmentId,
        newStatus: newStatus as AppointmentWithDetails["status"],
      });

      console.log("✅ Estado actualizado exitosamente");
      toast.dismiss(loadingToast);
      toast.success("Estado actualizado", "El estado del turno ha sido actualizado");

      // Update the selected appointment in the modal
      if (selectedAppointment?.id === appointmentId) {
        const updatedAppointment = {
          ...selectedAppointment,
          status: newStatus,
        };
        setSelectedAppointment(updatedAppointment as AppointmentWithDetails);
      }
    } catch (error) {
      console.error("❌ Error al actualizar estado:", error);
      toast.dismiss(loadingToast);

      if (error instanceof Error) {
        toast.error("Error al actualizar estado", error.message);
      } else {
        toast.error("Error inesperado", "No se pudo actualizar el estado");
      }
      console.error("Error updating status:", err);
      setError("Error al actualizar estado");
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400";
      case "client_confirmed":
        return "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400";
      case "pending":
        return "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400";
      case "reminded":
        return "bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400";
      case "completed":
        return "bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-400";
      case "cancelled":
        return "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400";
      case "no_show":
        return "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400";
      case "checked_in":
      case "in_progress":
        return "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400";
      default:
        return "bg-muted text-foreground-muted";
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳ Pendiente";
      case "confirmed":
        return "✓ Confirmado";
      case "reminded":
        return "🔔 Recordado";
      case "client_confirmed":
        return "👤 Cliente Confirmó";
      case "checked_in":
        return "📍 Check-in";
      case "in_progress":
        return "🚀 En Progreso";
      case "completed":
        return "✅ Completado";
      case "cancelled":
        return "❌ Cancelado";
      case "no_show":
        return "⚠️ No Asistió";
      case "rescheduled":
        return "🔄 Reagendado";
      default:
        return status;
    }
  };

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
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-md bg-info px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-info-700"
            >
              Volver al Dashboard
            </button>
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
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
            <p className="text-sm text-foreground-muted">Cargando turnos...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Turnos"
        description="Gestiona tus turnos y citas. Visualiza tu calendario, crea nuevas citas, confirma o cancela reservas existentes."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Turnos</h1>
              <p className="mt-2 text-foreground-muted">
                Gestiona las citas de tus clientes
              </p>
            </div>
            {canManageAppointments && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Turno
              </button>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-md bg-danger-50 p-4 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}


          {/* Filters */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Buscar turnos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
              />
            </div>

            {/* Date filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
            />

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Completados</option>
              <option value="cancelled">Cancelados</option>
            </select>

            {/* View toggle */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "list"
                    ? "bg-surface text-info shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
                title="Vista de lista"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                onClick={() => setView("day")}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "day"
                    ? "bg-surface text-info shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
                title="Vista diaria"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Día</span>
              </button>
              <button
                onClick={() => setView("week")}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "week"
                    ? "bg-surface text-info shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
                title="Vista semanal"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Semana</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground-muted">
                    Total {view === "week" ? "Semana" : "Día"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {appointments.length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground-muted">Confirmados</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {
                      appointments.filter(
                        (a) =>
                          a.status === "confirmed" ||
                          a.status === "client_confirmed"
                      ).length
                    }
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>

            <div className="rounded-lg bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground-muted">Completados</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {
                      appointments.filter((a) => a.status === "completed")
                        .length
                    }
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground-muted">Cancelados</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {
                      appointments.filter(
                        (a) =>
                          a.status === "cancelled" || a.status === "no_show"
                      ).length
                    }
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Appointments List */}
          {view === "list" && (
            <>
              {filteredAppointments.length === 0 ? (
                <div className="rounded-lg bg-surface p-12 text-center shadow-sm">
                  <Calendar className="mx-auto h-12 w-12 text-foreground-muted" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {searchTerm || filterStatus !== "all"
                      ? "No se encontraron turnos"
                      : "No hay turnos programados"}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-muted">
                    {searchTerm || filterStatus !== "all"
                      ? "Intenta con otros filtros"
                      : "Comienza creando tu primer turno"}
                  </p>
                  {canManageAppointments &&
                    !searchTerm &&
                    filterStatus === "all" && (
                      <button
                        onClick={handleCreate}
                        className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        Crear Turno
                      </button>
                    )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-lg bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold"
                              style={{
                                backgroundColor: appointment.staff_first_name
                                  ? "#3B82F6"
                                  : "#6B7280",
                              }}
                            >
                              {appointment.customer_first_name[0]}
                              {appointment.customer_last_name[0]}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">
                                {appointment.customer_first_name}{" "}
                                {appointment.customer_last_name}
                              </h3>
                              <div className="mt-1 flex items-center gap-2 text-sm text-foreground-muted">
                                <Phone className="h-4 w-4" />
                                {appointment.customer_phone}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-foreground-muted" />
                              <span className="text-foreground-muted">
                                {formatDateShort(appointment.appointment_date)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-foreground-muted" />
                              <span className="text-foreground-muted">
                                {appointment.start_time} -{" "}
                                {appointment.end_time}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Package className="h-4 w-4 text-zinc-400" />
                              <span className="text-foreground-muted">
                                {appointment.service_name}
                              </span>
                            </div>

                            {appointment.staff_first_name && (
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-foreground-muted" />
                                <span className="text-foreground-muted">
                                  {appointment.staff_first_name}{" "}
                                  {appointment.staff_last_name}
                                </span>
                              </div>
                            )}
                          </div>

                          {appointment.notes && (
                            <p className="mt-3 text-sm text-foreground-muted">
                              {appointment.notes}
                            </p>
                          )}
                        </div>

                        <div className="ml-4 flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                              appointment.status
                            )}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>

                          {canManageAppointments &&
                            appointment.status !== "completed" &&
                            appointment.status !== "cancelled" &&
                            appointment.status !== "no_show" && (
                              <div className="flex gap-1">
                                {/* Show next logical step */}
                                {appointment.status === "pending" && (
                                  <button
                                    onClick={() =>
                                      updateStatus(appointment.id, "confirmed")
                                    }
                                    className="rounded-md bg-success-50 px-2 py-1 text-xs font-medium text-success-700 transition-colors hover:bg-success-100 dark:bg-success-900/20 dark:text-success-400"
                                  >
                                    Confirmar
                                  </button>
                                )}
                                {(appointment.status === "confirmed" ||
                                  appointment.status === "reminded") && (
                                  <button
                                    onClick={() =>
                                      updateStatus(
                                        appointment.id,
                                        "client_confirmed"
                                      )
                                    }
                                    className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400"
                                  >
                                    Cliente Confirmó
                                  </button>
                                )}
                                {(appointment.status === "confirmed" ||
                                  appointment.status === "reminded" ||
                                  appointment.status ===
                                    "client_confirmed") && (
                                  <button
                                    onClick={() =>
                                      updateStatus(appointment.id, "checked_in")
                                    }
                                    className="rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400"
                                  >
                                    Check-in
                                  </button>
                                )}
                                {(appointment.status === "checked_in" ||
                                  appointment.status === "client_confirmed" ||
                                  appointment.status === "confirmed") && (
                                  <button
                                    onClick={() =>
                                      updateStatus(
                                        appointment.id,
                                        "in_progress"
                                      )
                                    }
                                    className="rounded-md bg-info-50 px-2 py-1 text-xs font-medium text-info-700 transition-colors hover:bg-info-100 dark:bg-info-900/20 dark:text-info-400"
                                  >
                                    Iniciar
                                  </button>
                                )}
                                {appointment.status === "in_progress" && (
                                  <button
                                    onClick={() =>
                                      updateStatus(appointment.id, "completed")
                                    }
                                    className="rounded-md bg-success-50 px-2 py-1 text-xs font-medium text-success-700 transition-colors hover:bg-success-100 dark:bg-success-900/20 dark:text-success-400"
                                  >
                                    Completar
                                  </button>
                                )}
                                {/* Always show these */}
                                <button
                                  onClick={() =>
                                    updateStatus(appointment.id, "no_show")
                                  }
                                  className="rounded-md bg-warning-50 px-2 py-1 text-xs font-medium text-warning-700 transition-colors hover:bg-warning-100 dark:bg-warning-900/20 dark:text-warning-400"
                                >
                                  No vino
                                </button>
                                <button
                                  onClick={() =>
                                    updateStatus(appointment.id, "cancelled")
                                  }
                                  className="rounded-md bg-danger-50 px-2 py-1 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-100 dark:bg-danger-900/20 dark:text-danger-400"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Day Calendar View */}
          {view === "day" && (
            <DayCalendar
              date={selectedDate}
              appointments={filteredAppointments}
              onDateChange={(newDate) => {
                setSelectedDate(newDate);
                setFilterDate(getLocalDateString(newDate));
              }}
              onAppointmentClick={(apt) => {
                setSelectedAppointment(apt);
                setShowDetailModal(true);
              }}
              onTimeSlotClick={
                canManageAppointments
                  ? (time) => {
                      setFormData((prev) => ({
                        ...prev,
                        appointment_date: getLocalDateString(selectedDate),
                        start_time: time,
                        end_time: calculateEndTime(time, prev.service_id),
                      }));
                      setShowModal(true);
                    }
                  : undefined
              }
            />
          )}

          {/* Week Calendar View */}
          {view === "week" && (
            <WeekCalendar
              date={selectedDate}
              appointments={appointments}
              onDateChange={setSelectedDate}
              onAppointmentClick={(apt) => {
                setSelectedAppointment(apt);
                setShowDetailModal(true);
              }}
              onTimeSlotClick={
                canManageAppointments
                  ? (date, time) => {
                      setFormData((prev) => ({
                        ...prev,
                        appointment_date: date,
                        start_time: time,
                        end_time: calculateEndTime(time, prev.service_id),
                      }));
                      setShowModal(true);
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Nuevo Turno</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 hover:bg-subtle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Customer */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-foreground">
                    Cliente *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCustomerForm(!showNewCustomerForm);
                      setNewCustomerData({
                        first_name: "",
                        last_name: "",
                        phone: "",
                        email: "",
                        notes: "",
                        is_active: true,
                      });
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-secondary-500 hover:text-secondary-600"
                  >
                    <Plus className="h-3 w-3" />
                    {showNewCustomerForm ? "Cancelar" : "Nuevo Cliente"}
                  </button>
                </div>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_id: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                >
                  <option value="">Selecciona un cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name} -{" "}
                      {customer.phone}
                    </option>
                  ))}
                </select>
                {customers.length === 0 && !showNewCustomerForm && (
                  <p className="mt-1 text-xs text-yellow-600">
                    No hay clientes. Crea uno primero en la sección de clientes.
                  </p>
                )}

                {/* New Customer Form */}
                {showNewCustomerForm && (
                  <div className="mt-4 rounded-lg border border-info-200 bg-info-50 p-4 dark:border-info-800 dark:bg-info-900/20">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Nuevo Cliente
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground">
                            Nombre *
                          </label>
                          <input
                            type="text"
                            value={newCustomerData.first_name}
                            onChange={(e) =>
                              setNewCustomerData({
                                ...newCustomerData,
                                first_name: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                            placeholder="Juan"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground">
                            Apellido *
                          </label>
                          <input
                            type="text"
                            required
                            value={newCustomerData.last_name}
                            onChange={(e) =>
                              setNewCustomerData({
                                ...newCustomerData,
                                last_name: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                            placeholder="Pérez"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground">
                            Teléfono *
                          </label>
                          <input
                            type="tel"
                            value={newCustomerData.phone}
                            onChange={(e) =>
                              setNewCustomerData({
                                ...newCustomerData,
                                phone: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                            placeholder="+54 11 1234-5678"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground">
                            Email
                          </label>
                          <input
                            type="email"
                            value={newCustomerData.email || ""}
                            onChange={(e) =>
                              setNewCustomerData({
                                ...newCustomerData,
                                email: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                            placeholder="email@ejemplo.com"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateCustomer}
                          disabled={createCustomerMutation.isPending}
                          className="flex-1 rounded-md bg-secondary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-secondary-600 disabled:opacity-50"
                        >
                          {createCustomerMutation.isPending
                            ? "Creando..."
                            : "Crear y Seleccionar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewCustomerForm(false)}
                          disabled={createCustomerMutation.isPending}
                          className="rounded-md bg-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-subtle disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Servicio *
                </label>
                <select
                  required
                  value={formData.service_id}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.duration_minutes} min) - $
                      {service.price || 0}
                    </option>
                  ))}
                </select>
                {services.length === 0 && (
                  <p className="mt-1 text-xs text-yellow-600">
                    No hay servicios. Crea uno primero en la sección de
                    servicios.
                  </p>
                )}
                {formData.service_id &&
                  (() => {
                    const selectedService = services.find(
                      (s) => s.id === formData.service_id
                    );
                    if (selectedService?.requires_approval) {
                      return (
                        <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                          ⚠️ Este servicio requiere aprobación manual. El turno
                          se creará como &quot;Pendiente&quot; y deberás
                          confirmarlo manualmente.
                        </p>
                      );
                    }
                    return null;
                  })()}
              </div>

              {/* Staff */}
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Profesional (opcional)
                </label>
                <select
                  value={formData.staff_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      staff_id: e.target.value || null,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                >
                  <option value="">Cualquiera disponible</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.first_name} {staff.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.appointment_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appointment_date: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Hora fin
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    readOnly
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  />
                </div>
              </div>

              {/* Notes */}
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
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500"
                  placeholder="Notas adicionales sobre el turno..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={createAppointmentMutation.isPending}
                  className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createAppointmentMutation.isPending || customers.length === 0 || services.length === 0
                  }
                  className="flex-1 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createAppointmentMutation.isPending ? "Guardando..." : "Crear Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-surface p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                Detalles del Turno
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAppointment(null);
                }}
                className="rounded-md p-1 text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
                  selectedAppointment.status
                )}`}
              >
                {getStatusLabel(selectedAppointment.status)}
              </span>
            </div>

            {/* Client Info */}
            <div className="mb-4 p-4 rounded-lg bg-muted border border-border">
              <h3 className="text-sm font-medium text-foreground-muted mb-2">
                Cliente
              </h3>
              <p className="text-lg font-semibold text-foreground">
                {selectedAppointment.customer_first_name}{" "}
                {selectedAppointment.customer_last_name}
              </p>
              <p className="text-sm text-foreground-muted flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4" />
                {selectedAppointment.customer_phone}
              </p>
            </div>

            {/* Service Info */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted border border-border">
                <h3 className="text-sm font-medium text-foreground-muted mb-2">
                  Servicio
                </h3>
                <p className="text-foreground font-medium">
                  {selectedAppointment.service_name}
                </p>
              </div>
              {selectedAppointment.staff_first_name && (
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <h3 className="text-sm font-medium text-foreground-muted mb-2">
                    Profesional
                  </h3>
                  <p className="text-foreground font-medium">
                    {selectedAppointment.staff_first_name}{" "}
                    {selectedAppointment.staff_last_name}
                  </p>
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted border border-border">
                <h3 className="text-sm font-medium text-foreground-muted mb-2">
                  Fecha
                </h3>
                <p className="text-foreground font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-foreground-muted" />
                  {formatDateShort(selectedAppointment.appointment_date)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted border border-border">
                <h3 className="text-sm font-medium text-foreground-muted mb-2">
                  Horario
                </h3>
                <p className="text-foreground font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-foreground-muted" />
                  {selectedAppointment.start_time} -{" "}
                  {selectedAppointment.end_time}
                </p>
              </div>
            </div>

            {/* Notes */}
            {selectedAppointment.notes && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-foreground-muted mb-1">
                  Notas
                </h3>
                <p className="text-sm text-foreground-muted">
                  {selectedAppointment.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            {canManageAppointments &&
              selectedAppointment.status !== "completed" &&
              selectedAppointment.status !== "cancelled" &&
              selectedAppointment.status !== "no_show" && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-medium text-foreground mb-2">
                    Cambiar Estado
                  </h3>

                  {/* Primary Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Confirmar */}
                    {selectedAppointment.status === "pending" && (
                      <button
                        onClick={() => {
                          updateStatus(selectedAppointment.id, "confirmed");
                          setShowDetailModal(false);
                        }}
                        className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        ✓ Confirmar
                      </button>
                    )}

                    {/* Cliente Confirmó */}
                    {(selectedAppointment.status === "pending" ||
                      selectedAppointment.status === "confirmed" ||
                      selectedAppointment.status === "reminded") && (
                      <button
                        onClick={() => {
                          updateStatus(
                            selectedAppointment.id,
                            "client_confirmed"
                          );
                          setShowDetailModal(false);
                        }}
                        className="rounded-md bg-success px-4 py-2.5 text-sm font-medium text-success-foreground hover:bg-success-700"
                      >
                        👤 Cliente Confirmó
                      </button>
                    )}

                    {/* Check-in */}
                    {(selectedAppointment.status === "pending" ||
                      selectedAppointment.status === "confirmed" ||
                      selectedAppointment.status === "reminded" ||
                      selectedAppointment.status === "client_confirmed") && (
                      <button
                        onClick={() => {
                          updateStatus(selectedAppointment.id, "checked_in");
                          setShowDetailModal(false);
                        }}
                        className="rounded-md bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
                      >
                        📍 Check-in
                      </button>
                    )}

                    {/* Iniciar Servicio */}
                    {(selectedAppointment.status === "pending" ||
                      selectedAppointment.status === "confirmed" ||
                      selectedAppointment.status === "reminded" ||
                      selectedAppointment.status === "client_confirmed" ||
                      selectedAppointment.status === "checked_in") && (
                      <button
                        onClick={() => {
                          updateStatus(selectedAppointment.id, "in_progress");
                          setShowDetailModal(false);
                        }}
                        className="rounded-md bg-info px-4 py-2.5 text-sm font-medium text-info-foreground hover:bg-info-700"
                      >
                        🚀 Iniciar Servicio
                      </button>
                    )}

                    {/* Completar */}
                    <button
                      onClick={() => {
                        updateStatus(selectedAppointment.id, "completed");
                        setShowDetailModal(false);
                      }}
                      className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      ✅ Completar
                    </button>
                  </div>

                  {/* Secondary Actions */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h4 className="text-xs font-medium text-foreground-muted">
                      Otras acciones
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {/* Enviar Recordatorio */}
                      {(selectedAppointment.status === "pending" ||
                        selectedAppointment.status === "confirmed" ||
                        selectedAppointment.status === "reminded" ||
                        selectedAppointment.status === "client_confirmed") && (
                        <button
                          onClick={() =>
                            handleSendReminder(selectedAppointment)
                          }
                          className="flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary-700"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Enviar Recordatorio
                        </button>
                      )}

                      {/* No se presentó */}
                      <button
                        onClick={() => {
                          updateStatus(selectedAppointment.id, "no_show");
                          setShowDetailModal(false);
                        }}
                        className="rounded-md bg-warning-100 px-4 py-2 text-sm font-medium text-warning-700 hover:bg-warning-200 dark:bg-warning-900/20 dark:text-warning-400"
                      >
                        ⚠️ No se presentó
                      </button>

                      {/* Cancelar */}
                      <button
                        onClick={() => {
                          updateStatus(selectedAppointment.id, "cancelled");
                          setShowDetailModal(false);
                        }}
                        className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
                      >
                        ❌ Cancelar Turno
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {/* Close Button */}
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedAppointment(null);
              }}
              className="mt-4 w-full rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-subtle"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
