"use client";

import { ProtectedRoute } from "@/components/protected-route";
import {
  Avatar,
  Button,
  Field,
  Select,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { UserProfile } from "@/types/auth";
import {
  CreateOrganizationParams,
  CreateOrganizationResult,
} from "@/types/organization";
import { ORGANIZATION_TIMEZONES as TIMEZONES } from "@/config/constants";
import { getGracePeriodDays } from "@/utils/license";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { Check, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Timeout para verificación de auth (10 segundos)
const AUTH_CHECK_TIMEOUT_MS = 10000;

interface NewOrganizationForm {
  org_name: string;
  org_slug: string;
  org_timezone: string;
  org_whatsapp_phone: string;
  selected_user_id: string;
  license_start_date: string;
  license_end_date: string;
}

const EMPTY_FORM: NewOrganizationForm = {
  org_name: "",
  org_slug: "",
  org_timezone: "UTC",
  org_whatsapp_phone: "",
  selected_user_id: "",
  license_start_date: "",
  license_end_date: "",
};

/** Lowercase, accent-free, hyphen-separated slug derived from a name. */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with single
}

export default function NewOrganizationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState<NewOrganizationForm>(EMPTY_FORM);
  // Once the admin edits the slug by hand, stop deriving it from the name.
  const [slugTouched, setSlugTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasChecked = useRef(false);

  const patchForm = useCallback((patch: Partial<NewOrganizationForm>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      org_name: name,
      org_slug: slugTouched ? prev.org_slug : slugify(name),
    }));
  };

  // Cargar usuarios disponibles (staff sin organización)
  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("role", "staff") // Solo usuarios con rol staff
        .is("organization_id", null) // Solo usuarios sin organización
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
        // Cargar usuarios después de verificar que es admin
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
      // Validar slug (debe ser alfanumérico y guiones)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(formData.org_slug)) {
        setError(
          "El slug solo puede contener letras minúsculas, números y guiones"
        );
        setLoading(false);
        return;
      }

      // Validar que se haya seleccionado un usuario
      if (!formData.selected_user_id) {
        setError("Debes seleccionar un usuario para asignar como dueño");
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

      // Preparar parámetros para la función
      const params: CreateOrganizationParams = {
        org_name: formData.org_name.trim(),
        org_slug: formData.org_slug.trim().toLowerCase(),
        org_timezone: formData.org_timezone || "UTC",
        org_whatsapp_phone: formData.org_whatsapp_phone.trim() || undefined,
        owner_user_id: formData.selected_user_id,
        license_start_date: formData.license_start_date || undefined,
        license_end_date: formData.license_end_date || undefined,
      };

      // Llamar a la función RPC
      const { data, error: rpcError } = await supabase.rpc(
        "create_organization_with_owner",
        params
      );

      if (rpcError) {
        void Logger.error("Error creating organization:", rpcError);
        setError(
          rpcError.message ||
            "Error al crear la organización. Verifica que el slug no esté en uso y que el usuario no tenga ya una organización asignada."
        );
        setLoading(false);
        return;
      }

      const result = data as CreateOrganizationResult | null;
      if (!result || !result.success) {
        setError("Error al crear la organización. Intenta nuevamente.");
        setLoading(false);
        return;
      }

      const selectedUser = users.find((u) => u.user_id === result.user_id);

      setSuccess(
        `Organización "${formData.org_name}" creada exitosamente. El usuario ${selectedUser?.email} ha sido asignado como dueño.`
      );

      // Limpiar formulario
      setFormData(EMPTY_FORM);
      setSlugTouched(false);

      // Recargar lista de usuarios
      await loadUsers();

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      void Logger.error("Exception creating organization:", err);
      setError(
        "Error inesperado al crear la organización. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => router.push("/dashboard/organizations")}
              aria-label="Volver a organizaciones"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Nueva organización
            </h1>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5 sm:px-6"
        >
          <Field label="Nombre del negocio">
            <input
              type="text"
              required
              value={formData.org_name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputClasses}
              placeholder="Mi Negocio"
            />
          </Field>

          <Field
            label="Slug (link de reservas)"
            hint={
              slugTouched
                ? "Solo letras minúsculas, números y guiones. Debe ser único."
                : "Auto-generado desde el nombre. Debe ser único."
            }
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-foreground-muted">
                /book?b=
              </span>
              <input
                type="text"
                required
                pattern="[a-z0-9-]+"
                value={formData.org_slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  patchForm({ org_slug: e.target.value.toLowerCase() });
                }}
                className={inputClasses}
                placeholder="mi-negocio"
              />
            </div>
          </Field>

          <Field
            label="Dueño asignado"
            hint="Solo usuarios con rol empleado y sin organización."
          >
            {loadingUsers ? (
              <p className="text-sm text-foreground-muted">
                Cargando usuarios...
              </p>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface-2 p-3 text-sm text-foreground-muted">
                No hay usuarios disponibles. Primero invítalos desde Usuarios.
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label="Dueño asignado"
                className="scrollbar-discreet flex max-h-72 flex-col gap-2 overflow-y-auto"
              >
                {users.map((user) => {
                  const selected = formData.selected_user_id === user.user_id;
                  const name = user.full_name || user.email;
                  return (
                    <button
                      key={user.user_id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        patchForm({ selected_user_id: user.user_id })
                      }
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-border bg-surface-2 hover:border-border-2"
                      }`}
                    >
                      <Avatar
                        name={name}
                        color="var(--color-info-500)"
                        size={28}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {name}
                        </div>
                        <div className="truncate text-[11px] text-foreground-muted">
                          {user.email}
                        </div>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-primary-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inicio licencia">
                <input
                  type="datetime-local"
                  value={formData.license_start_date}
                  onChange={(e) =>
                    patchForm({ license_start_date: e.target.value })
                  }
                  className={inputClasses}
                />
              </Field>
              <Field label="Fin licencia">
                <input
                  type="datetime-local"
                  value={formData.license_end_date}
                  onChange={(e) =>
                    patchForm({ license_end_date: e.target.value })
                  }
                  className={inputClasses}
                />
              </Field>
            </div>
            <p className="mt-1 text-[11px] text-foreground-subtle">
              Opcional. Sin fechas, la organización no vence. Al vencer tiene{" "}
              {getGracePeriodDays()} días de gracia con avisos de renovación.
            </p>
          </div>

          <Field label="Zona horaria">
            <Select
              value={formData.org_timezone}
              onChange={(e) => patchForm({ org_timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="WhatsApp del negocio (opcional)">
            <input
              type="tel"
              value={formData.org_whatsapp_phone}
              onChange={(e) =>
                patchForm({ org_whatsapp_phone: e.target.value })
              }
              className={inputClasses}
              placeholder="+5491123456789"
            />
          </Field>

          {error && (
            <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-success-50 p-3 text-sm text-success-800 dark:bg-success-900/20 dark:text-success-400">
              {success}
            </div>
          )}

          <Button
            type="submit"
            variant="mesh-primary"
            disabled={loading}
            className="mt-2 w-full justify-center"
          >
            {loading ? "Creando…" : "Crear organización"}
          </Button>
        </form>
      </div>
    </ProtectedRoute>
  );
}
