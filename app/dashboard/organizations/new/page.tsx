"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { UserProfile } from "@/types/auth";
import {
  CreateOrganizationParams,
  CreateOrganizationResult,
} from "@/types/organization";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Logger } from "@/utils/logger";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Timeout para verificaciÃ³n de auth (10 segundos)
const AUTH_CHECK_TIMEOUT_MS = 10000;

export default function NewOrganizationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState<{
    org_name: string;
    org_slug: string;
    org_timezone: string;
    org_whatsapp_phone: string;
    selected_user_id: string;
    license_start_date: string;
    license_end_date: string;
  }>({
    org_name: "",
    org_slug: "",
    org_timezone: "UTC",
    org_whatsapp_phone: "",
    selected_user_id: "",
    license_start_date: "",
    license_end_date: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasChecked = useRef(false);

  // Cargar usuarios disponibles (staff sin organizaciÃ³n)
  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("role", "staff") // Solo usuarios con rol staff
        .is("organization_id", null) // Solo usuarios sin organizaciÃ³n
        .order("email", { ascending: true });

      if (fetchError) {
        void Logger.error("Error loading users:", fetchError);
        setError("Error al cargar usuarios: " + fetchError.message);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      void Logger.error("Error loading users:", err);
      setError("Error inesperado al cargar usuarios");
    } finally {
      setLoadingUsers(false);
    }
  }, [supabase]);

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkAuth = async () => {
      const timeoutId = setTimeout(() => {
        console.warn("Auth check timeout in new organization page");
        router.push("/dashboard");
      }, AUTH_CHECK_TIMEOUT_MS);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          clearTimeout(timeoutId);
          router.push("/login");
          return;
        }

        // Verificar que sea admin
        const { data: userData, error: profileError } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        clearTimeout(timeoutId);

        if (profileError || !userData || userData.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setCheckingAuth(false);
        // Cargar usuarios despuÃ©s de verificar que es admin
        loadUsers();
      } catch (err) {
        clearTimeout(timeoutId);
        void Logger.error("Error checking auth:", err);
        router.push("/dashboard");
      }
    };

    checkAuth();
  }, [router, supabase, loadUsers]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar slug (debe ser alfanumÃ©rico y guiones)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(formData.org_slug)) {
        setError(
          "El slug solo puede contener letras minÃºsculas, nÃºmeros y guiones"
        );
        setLoading(false);
        return;
      }

      // Validar que se haya seleccionado un usuario
      if (!formData.selected_user_id) {
        setError("Debes seleccionar un usuario para asignar como dueÃ±o");
        setLoading(false);
        return;
      }

      // Validar fechas de licencia si se proporcionan
      if (formData.license_start_date && formData.license_end_date) {
        const startDate = new Date(formData.license_start_date);
        const endDate = new Date(formData.license_end_date);

        if (endDate <= startDate) {
          setError(
            "La fecha de fin de licencia debe ser posterior a la fecha de inicio"
          );
          setLoading(false);
          return;
        }
      }

      // Preparar parÃ¡metros para la funciÃ³n
      const params: CreateOrganizationParams = {
        org_name: formData.org_name.trim(),
        org_slug: formData.org_slug.trim().toLowerCase(),
        org_timezone: formData.org_timezone || "UTC",
        org_whatsapp_phone: formData.org_whatsapp_phone.trim() || undefined,
        owner_user_id: formData.selected_user_id,
        license_start_date: formData.license_start_date || undefined,
        license_end_date: formData.license_end_date || undefined,
      };

      // Llamar a la funciÃ³n RPC
      const { data, error: rpcError } = await supabase.rpc(
        "create_organization_with_owner",
        params
      );

      if (rpcError) {
        void Logger.error("Error creating organization:", rpcError);
        setError(
          rpcError.message ||
            "Error al crear la organizaciÃ³n. Verifica que el slug no estÃ© en uso y que el usuario no tenga ya una organizaciÃ³n asignada."
        );
        setLoading(false);
        return;
      }

      const result = data as CreateOrganizationResult | null;
      if (!result || !result.success) {
        setError("Error al crear la organizaciÃ³n. Intenta nuevamente.");
        setLoading(false);
        return;
      }

      const selectedUser = users.find((u) => u.user_id === result.user_id);

      setSuccess(
        `OrganizaciÃ³n "${formData.org_name}" creada exitosamente. El usuario ${selectedUser?.email} ha sido asignado como dueÃ±o.`
      );

      // Limpiar formulario
      setFormData({
        org_name: "",
        org_slug: "",
        org_timezone: "UTC",
        org_whatsapp_phone: "",
        selected_user_id: "",
        license_start_date: "",
        license_end_date: "",
      });

      // Recargar lista de usuarios
      await loadUsers();

      // Redirigir al dashboard despuÃ©s de 2 segundos
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      void Logger.error("Exception creating organization:", err);
      setError(
        "Error inesperado al crear la organizaciÃ³n. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const name = formData.org_name.trim();
    if (!name) return;

    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim();

    setFormData((prev) => ({ ...prev, org_slug: slug }));
  };

  if (checkingAuth || !profile || profile.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
            <p className="text-sm text-foreground-muted">
              {checkingAuth
                ? "Verificando permisos..."
                : "No tienes permisos para crear organizaciones"}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">
                Crear nueva organizaciÃ³n
              </h1>
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle"
              >
                Volver al dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-surface border border-border p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                InformaciÃ³n de la organizaciÃ³n
              </h2>
              <p className="mt-2 text-sm text-foreground-muted">
                Crea una nueva organizaciÃ³n y asigna un dueÃ±o. El dueÃ±o podrÃ¡
                gestionar la organizaciÃ³n, servicios y reservas.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre de la organizaciÃ³n */}
              <div>
                <label
                  htmlFor="org_name"
                  className="block text-sm font-medium text-foreground"
                >
                  Nombre de la organizaciÃ³n *
                </label>
                <input
                  id="org_name"
                  name="org_name"
                  type="text"
                  required
                  value={formData.org_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      org_name: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder-foreground-muted shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500 sm:text-sm"
                  placeholder="Mi Negocio"
                />
              </div>

              {/* Slug */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="org_slug"
                    className="block text-sm font-medium text-foreground"
                  >
                    Slug (identificador Ãºnico) *
                  </label>
                  <button
                    type="button"
                    onClick={generateSlug}
                    className="text-xs text-info-600 hover:text-info-700 dark:text-info-400 dark:hover:text-info-300"
                  >
                    Generar desde nombre
                  </button>
                </div>
                <input
                  id="org_slug"
                  name="org_slug"
                  type="text"
                  required
                  value={formData.org_slug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      org_slug: e.target.value.toLowerCase(),
                    }))
                  }
                  pattern="[a-z0-9-]+"
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder-foreground-muted shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500 sm:text-sm"
                  placeholder="mi-negocio"
                />
                <p className="mt-1 text-xs text-foreground-muted">
                  Solo letras minÃºsculas, nÃºmeros y guiones. Se usarÃ¡ en URLs.
                </p>
              </div>

              {/* Zona horaria */}
              <div>
                <label
                  htmlFor="org_timezone"
                  className="block text-sm font-medium text-foreground"
                >
                  Zona horaria
                </label>
                <select
                  id="org_timezone"
                  name="org_timezone"
                  value={formData.org_timezone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      org_timezone: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500 sm:text-sm"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/Argentina/Buenos_Aires">
                    America/Argentina/Buenos_Aires
                  </option>
                  <option value="America/Mexico_City">
                    America/Mexico_City
                  </option>
                  <option value="America/Santiago">America/Santiago</option>
                  <option value="America/Bogota">America/Bogota</option>
                  <option value="America/Lima">America/Lima</option>
                  <option value="America/Caracas">America/Caracas</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">
                    America/Los_Angeles
                  </option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                </select>
              </div>

              {/* TelÃ©fono WhatsApp (opcional) */}
              <div>
                <label
                  htmlFor="org_whatsapp_phone"
                  className="block text-sm font-medium text-foreground"
                >
                  TelÃ©fono de WhatsApp (opcional)
                </label>
                <input
                  id="org_whatsapp_phone"
                  name="org_whatsapp_phone"
                  type="tel"
                  value={formData.org_whatsapp_phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      org_whatsapp_phone: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder-foreground-muted shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500 sm:text-sm"
                  placeholder="+5491123456789"
                />
              </div>

              {/* SecciÃ³n de Licencia */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  ConfiguraciÃ³n de Licencia
                </h3>
                <p className="mt-1 text-xs text-foreground-muted">
                  Define el perÃ­odo de vigencia de la licencia para esta
                  organizaciÃ³n. Si se deja vacÃ­o, la organizaciÃ³n tendrÃ¡ acceso
                  sin lÃ­mite de tiempo.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Fecha de inicio de licencia */}
                  <div>
                    <label
                      htmlFor="license_start_date"
                      className="block text-sm font-medium text-foreground"
                    >
                      Fecha de inicio
                    </label>
                    <input
                      id="license_start_date"
                      name="license_start_date"
                      type="datetime-local"
                      value={formData.license_start_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          license_start_date: e.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                    />
                  </div>

                  {/* Fecha de fin de licencia */}
                  <div>
                    <label
                      htmlFor="license_end_date"
                      className="block text-sm font-medium text-foreground"
                    >
                      Fecha de fin
                    </label>
                    <input
                      id="license_end_date"
                      name="license_end_date"
                      type="datetime-local"
                      value={formData.license_end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          license_end_date: e.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                    />
                  </div>
                </div>

                <p className="mt-2 text-xs text-foreground-muted">
                  Nota: Si la licencia expira, la organizaciÃ³n tendrÃ¡ un perÃ­odo
                  de gracia de 7 dÃ­as (configurable) para continuar usando la
                  aplicaciÃ³n con notificaciones de renovaciÃ³n.
                </p>
              </div>

              {/* DueÃ±o de la organizaciÃ³n */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  DueÃ±o de la organizaciÃ³n *
                </h3>
                <p className="mt-1 text-xs text-foreground-muted">
                  Selecciona un usuario staff existente sin organizaciÃ³n
                </p>

                <div className="mt-4">
                  {loadingUsers ? (
                    <div className="text-sm text-foreground-muted">
                      Cargando usuarios...
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-sm text-foreground-muted">
                      No hay usuarios staff disponibles sin organizaciÃ³n.
                      Primero debes invitar usuarios desde la secciÃ³n de
                      invitaciones.
                    </div>
                  ) : (
                    <select
                      value={formData.selected_user_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          selected_user_id: e.target.value,
                        }))
                      }
                      required
                      className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                    >
                      <option value="">Selecciona un usuario</option>
                      {users.map((user) => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.full_name || user.email} ({user.email}) -{" "}
                          {user.role}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md bg-success-50 p-3 text-sm text-success-800 dark:bg-success-900/20 dark:text-success-400">
                  {success}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  disabled={loading}
                  className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear organizaciÃ³n"}
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">
                InformaciÃ³n importante
              </h3>
              <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-foreground-muted">
                <li>
                  El slug debe ser Ãºnico y se usarÃ¡ para identificar la
                  organizaciÃ³n en URLs
                </li>
                <li>
                  Solo se muestran usuarios con rol &quot;staff&quot; que no
                  tienen organizaciÃ³n asignada
                </li>
                <li>
                  El dueÃ±o podrÃ¡ gestionar la organizaciÃ³n, servicios y reservas
                </li>
                <li>
                  Si no hay usuarios disponibles, primero debes invitarlos desde
                  la secciÃ³n de invitaciones
                </li>
                <li>
                  Las fechas de licencia son opcionales. Si se dejan vacÃ­as, la
                  organizaciÃ³n tendrÃ¡ acceso ilimitado
                </li>
                <li>
                  El perÃ­odo de gracia permite que los usuarios continÃºen usando
                  la app despuÃ©s de la expiraciÃ³n, pero con notificaciones
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
