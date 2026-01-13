"use client";

import { DayCalendar, WeekCalendar } from "@/components/calendar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import {
  AppointmentFormData,
  AppointmentWithDetails,
  Customer,
  CustomerFormData,
  Service,
  StaffMember,
} from "@/types/appointments";
import { createClient } from "@/utils/supabase/client";
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
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AppointmentView = "list" | "day" | "week";
type FilterStatus = "all" | "pending" | "confirmed" | "completed" | "cancelled";

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>(
    []
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<AppointmentView>("day");

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    appointment_date: new Date().toISOString().split("T")[0],
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
  const getDateRange = useCallback(() => {
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
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }, [selectedDate, view]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateRange();

      // Load appointments
      const { data: appointmentsData, error: appointmentsError } =
        await supabase
          .from("appointments_with_details")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .gte("appointment_date", start)
          .lte("appointment_date", end)
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true });

      if (appointmentsError) {
        console.error("Error loading appointments:", appointmentsError);
      } else {
        setAppointments(appointmentsData || []);
      }

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true)
        .order("first_name");

      if (customersError) {
        console.error("Error loading customers:", customersError);
      } else {
        setCustomers(customersData || []);
      }

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true)
        .order("sort_order");

      if (servicesError) {
        console.error("Error loading services:", servicesError);
      } else {
        setServices(servicesData || []);
      }

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff_members")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true)
        .eq("is_bookable", true)
        .order("sort_order");

      if (staffError) {
        console.error("Error loading staff:", staffError);
      } else {
        setStaffMembers(staffData || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, supabase, getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Calculate service end time
  const calculateEndTime = (startTime: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return startTime;

    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes =
      hours * 60 +
      minutes +
      service.duration_minutes +
      service.buffer_time_minutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    return `${endHours.toString().padStart(2, "0")}:${endMinutes
      .toString()
      .padStart(2, "0")}`;
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
      appointment_date: new Date().toISOString().split("T")[0],
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

  // Save appointment
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!profile?.organization_id) {
      setError("No se encontró la organización");
      return;
    }

    if (!canManageAppointments) {
      setError("No tienes permisos para crear turnos");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate that customer exists
      if (!formData.customer_id) {
        setError("Debes seleccionar un cliente");
        setSaving(false);
        return;
      }

      // Validate that service exists
      if (!formData.service_id) {
        setError("Debes seleccionar un servicio");
        setSaving(false);
        return;
      }

      // Check if service requires approval and set status accordingly
      const selectedService = services.find(
        (s) => s.id === formData.service_id
      );
      const finalStatus = selectedService?.requires_approval
        ? "pending"
        : formData.status;

      // Create appointment
      const { error: insertError } = await supabase
        .from("appointments")
        .insert({
          ...formData,
          status: finalStatus,
          organization_id: profile.organization_id,
          created_by: profile.user_id,
        });

      if (insertError) {
        setError("Error al crear turno: " + insertError.message);
        console.error(insertError);
        return;
      }

      setSuccess("Turno creado exitosamente");
      setShowModal(false);
      resetForm();
      await loadData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving appointment:", err);
      setError("Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Create customer quickly
  const handleCreateCustomer = async () => {
    if (!profile?.organization_id) {
      setError("No se encontró la organización");
      return;
    }

    setSavingCustomer(true);
    setError(null);

    try {
      // Validate required fields
      if (
        !newCustomerData.first_name ||
        !newCustomerData.last_name ||
        !newCustomerData.phone
      ) {
        setError("Nombre, apellido y teléfono son requeridos");
        setSavingCustomer(false);
        return;
      }

      // Create customer
      const { data: newCustomer, error: insertError } = await supabase
        .from("customers")
        .insert({
          ...newCustomerData,
          organization_id: profile.organization_id,
          created_by: profile.user_id,
        })
        .select()
        .single();

      if (insertError) {
        setError("Error al crear cliente: " + insertError.message);
        console.error(insertError);
        setSavingCustomer(false);
        return;
      }

      // Reload customers list
      await loadData();

      // Select the new customer
      if (newCustomer) {
        setFormData((prev) => ({
          ...prev,
          customer_id: newCustomer.id,
        }));
      }

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
      setSuccess("Cliente creado exitosamente");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error creating customer:", err);
      setError("Error inesperado al crear cliente");
    } finally {
      setSavingCustomer(false);
    }
  };

  // Generate WhatsApp message for reminder
  const generateReminderMessage = (appointment: AppointmentWithDetails) => {
    const date = new Date(appointment.appointment_date);
    const formattedDate = date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return `🗓️ *Recordatorio de Turno*

Hola ${appointment.customer_first_name}! 👋

Te recordamos que tienes un turno programado:

📅 *Fecha:* ${formattedDate}
⏰ *Hora:* ${appointment.start_time}
💇 *Servicio:* ${appointment.service_name}
${
  appointment.staff_first_name
    ? `👤 *Con:* ${appointment.staff_first_name}`
    : ""
}

Por favor confirma tu asistencia respondiendo:
✅ *SÍ* - Confirmo mi turno
❌ *NO* - No podré asistir

¡Te esperamos! 🙌`;
  };

  // Send reminder for an appointment
  const handleSendReminder = async (appointment: AppointmentWithDetails) => {
    try {
      setError(null);

      // Log the reminder
      const { error: logError } = await supabase.from("reminder_logs").insert({
        appointment_id: appointment.id,
        reminder_type: "manual",
        method: "whatsapp",
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_by: profile?.user_id,
      });

      if (logError) {
        console.error("Error logging reminder:", logError);
      }

      // Update appointment status to reminded
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "reminded" })
        .eq("id", appointment.id);

      if (updateError) {
        setError("Error al actualizar estado: " + updateError.message);
        return;
      }

      // Generate WhatsApp message
      const message = generateReminderMessage(appointment);
      const phone = appointment.customer_phone.replace(/[^0-9]/g, "");
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`;

      // Open WhatsApp
      window.open(whatsappUrl, "_blank");

      setSuccess(`Recordatorio enviado a ${appointment.customer_first_name}`);
      await loadData();

      // Update the selected appointment in the modal
      if (selectedAppointment?.id === appointment.id) {
        const updatedAppointment = {
          ...selectedAppointment,
          status: "reminded",
        };
        setSelectedAppointment(updatedAppointment as AppointmentWithDetails);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error sending reminder:", err);
      setError("Error al enviar recordatorio");
    }
  };

  // Update appointment status
  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (updateError) {
        setError("Error al actualizar estado: " + updateError.message);
        return;
      }

      setSuccess("Estado actualizado");
      await loadData();

      // Update the selected appointment in the modal
      if (selectedAppointment?.id === appointmentId) {
        const updatedAppointment = {
          ...selectedAppointment,
          status: newStatus,
        };
        setSelectedAppointment(updatedAppointment as AppointmentWithDetails);
      }

      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Error al actualizar estado");
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "client_confirmed":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "reminded":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "no_show":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "checked_in":
      case "in_progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
            <h1 className="mt-4 text-2xl font-bold text-black dark:text-zinc-50">
              Sin Organización
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Necesitas pertenecer a una organización para gestionar turnos
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Cargando turnos...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                Turnos
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Gestiona las citas de tus clientes
              </p>
            </div>
            {canManageAppointments && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Turno
              </button>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar turnos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-4 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>

            {/* Date filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            />

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Completados</option>
              <option value="cancelled">Cancelados</option>
            </select>

            {/* View toggle */}
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "list"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                    ? "bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                    ? "bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
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
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total {view === "week" ? "Semana" : "Día"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
                    {appointments.length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Confirmados
                  </p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
                    {
                      appointments.filter(
                        (a) =>
                          a.status === "confirmed" ||
                          a.status === "client_confirmed"
                      ).length
                    }
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Completados
                  </p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
                    {
                      appointments.filter((a) => a.status === "completed")
                        .length
                    }
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Cancelados
                  </p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
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
                <div className="rounded-lg bg-white p-12 text-center shadow-sm dark:bg-zinc-900">
                  <Calendar className="mx-auto h-12 w-12 text-zinc-400" />
                  <h3 className="mt-4 text-lg font-semibold text-black dark:text-zinc-50">
                    {searchTerm || filterStatus !== "all"
                      ? "No se encontraron turnos"
                      : "No hay turnos programados"}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
                      className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900"
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
                              <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
                                {appointment.customer_first_name}{" "}
                                {appointment.customer_last_name}
                              </h3>
                              <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                <Phone className="h-4 w-4" />
                                {appointment.customer_phone}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-zinc-400" />
                              <span className="text-zinc-700 dark:text-zinc-300">
                                {new Date(
                                  appointment.appointment_date
                                ).toLocaleDateString("es-ES", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-zinc-400" />
                              <span className="text-zinc-700 dark:text-zinc-300">
                                {appointment.start_time} -{" "}
                                {appointment.end_time}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Package className="h-4 w-4 text-zinc-400" />
                              <span className="text-zinc-700 dark:text-zinc-300">
                                {appointment.service_name}
                              </span>
                            </div>

                            {appointment.staff_first_name && (
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-zinc-400" />
                                <span className="text-zinc-700 dark:text-zinc-300">
                                  {appointment.staff_first_name}{" "}
                                  {appointment.staff_last_name}
                                </span>
                              </div>
                            )}
                          </div>

                          {appointment.notes && (
                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
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
                                    className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
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
                                    className="rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400"
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
                                    className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                  >
                                    Iniciar
                                  </button>
                                )}
                                {appointment.status === "in_progress" && (
                                  <button
                                    onClick={() =>
                                      updateStatus(appointment.id, "completed")
                                    }
                                    className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                                  >
                                    Completar
                                  </button>
                                )}
                                {/* Always show these */}
                                <button
                                  onClick={() =>
                                    updateStatus(appointment.id, "no_show")
                                  }
                                  className="rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400"
                                >
                                  No vino
                                </button>
                                <button
                                  onClick={() =>
                                    updateStatus(appointment.id, "cancelled")
                                  }
                                  className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
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
                setFilterDate(newDate.toISOString().split("T")[0]);
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
                        appointment_date: selectedDate
                          .toISOString()
                          .split("T")[0],
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black dark:text-zinc-50">
                Nuevo Turno
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Customer */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
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
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
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
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <h3 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Nuevo Cliente
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
                            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="Juan"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
                            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="Pérez"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
                            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="+54 11 1234-5678"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
                            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="email@ejemplo.com"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateCustomer}
                          disabled={savingCustomer}
                          className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingCustomer
                            ? "Creando..."
                            : "Crear y Seleccionar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewCustomerForm(false)}
                          disabled={savingCustomer}
                          className="rounded-md bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-300"
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Servicio *
                </label>
                <select
                  required
                  value={formData.service_id}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
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
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Hora fin
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    readOnly
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-black shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                  placeholder="Notas adicionales sobre el turno..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={
                    saving || customers.length === 0 || services.length === 0
                  }
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Crear Turno"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black dark:text-zinc-50">
                Detalles del Turno
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAppointment(null);
                }}
                className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
            <div className="mb-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Cliente
              </h3>
              <p className="text-lg font-semibold text-black dark:text-zinc-50">
                {selectedAppointment.customer_first_name}{" "}
                {selectedAppointment.customer_last_name}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4" />
                {selectedAppointment.customer_phone}
              </p>
            </div>

            {/* Service Info */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Servicio
                </h3>
                <p className="text-black dark:text-zinc-50">
                  {selectedAppointment.service_name}
                </p>
              </div>
              {selectedAppointment.staff_first_name && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Profesional
                  </h3>
                  <p className="text-black dark:text-zinc-50">
                    {selectedAppointment.staff_first_name}{" "}
                    {selectedAppointment.staff_last_name}
                  </p>
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Fecha
                </h3>
                <p className="text-black dark:text-zinc-50 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  {new Date(
                    selectedAppointment.appointment_date
                  ).toLocaleDateString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Horario
                </h3>
                <p className="text-black dark:text-zinc-50 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  {selectedAppointment.start_time} -{" "}
                  {selectedAppointment.end_time}
                </p>
              </div>
            </div>

            {/* Notes */}
            {selectedAppointment.notes && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Notas
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
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
                        className="rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
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
                        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        🚀 Iniciar Servicio
                      </button>
                    )}

                    {/* Completar */}
                    {selectedAppointment.status !== "completed" && (
                      <button
                        onClick={() => {
                          updateStatus(selectedAppointment.id, "completed");
                          setShowDetailModal(false);
                        }}
                        className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        ✅ Completar
                      </button>
                    )}
                  </div>

                  {/* Secondary Actions */}
                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
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
                          className="flex items-center justify-center gap-2 rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
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
                        className="rounded-md bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
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
              className="mt-4 w-full rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
