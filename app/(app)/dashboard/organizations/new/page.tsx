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
import {
  LICENSE_GRACE_DAYS,
  LICENSE_PLAN_INFO,
  LICENSE_PLANS,
  type LicensePlan,
  formatUsd,
} from "@/config/license-pricing";
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
  start_mode: StartMode;
  license_plan: LicensePlan;
  owner_phone: string;
}

/** How the business starts: with a free trial, or blocked until it pays. */
type StartMode = "trial_15" | "trial_30" | "pending";

const START_MODES: { key: StartMode; label: string; trialDays: number | null }[] = [
  { key: "trial_15", label: "Prueba gratis de 15 días", trialDays: 15 },
  { key: "trial_30", label: "Prueba gratis de 30 días", trialDays: 30 },
  { key: "pending", label: "En preparación (sin prueba)", trialDays: null },
];

const APPOINTMENT_PLANS = LICENSE_PLANS.filter(
  (plan) => LICENSE_PLAN_INFO[plan].appointments
);

const EMPTY_FORM: NewOrganizationForm = {
  org_name: "",
  org_slug: "",
  org_timezone: "America/Havana",
  org_whatsapp_phone: "",
  selected_user_id: "",
  start_mode: "trial_15",
  license_plan: "personal",
  owner_phone: "",
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

      // A trial ends when the database says (last second of its last day in
      // Cuba). Without dates the business is created "pending".
      const trialDays = START_MODES.find(
        (mode) => mode.key === formData.start_mode
      )?.trialDays;
      let trialEnd: string | null = null;
      if (trialDays) {
        const { data: endData, error: endError } = await supabase.rpc(
          "license_trial_end",
          { p_days: trialDays }
        );
        if (endError || !endData) {
          setError("No se pudo calcular el fin de la prueba. Intenta nuevamente.");
          setLoading(false);
          return;
        }
        trialEnd = endData;
      }

      // Preparar parámetros para la función
      const params: CreateOrganizationParams = {
        org_name: formData.org_name.trim(),
        org_slug: formData.org_slug.trim().toLowerCase(),
        org_timezone: formData.org_timezone || "UTC",
        org_whatsapp_phone: formData.org_whatsapp_phone.trim() || undefined,
        owner_user_id: formData.selected_user_id,
        license_start_date: trialEnd ? new Date().toISOString() : undefined,
        license_end_date: trialEnd ?? undefined,
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

      // create_organization_with_owner has no plan or owner phone parameters
      const { data: planData, error: planError } = await supabase
        .from("organizations")
        .update({
          license_plan: formData.license_plan,
          owner_phone: formData.owner_phone.trim() || null,
        })
        .eq("id", result.organization_id)
        .select("id");

      const selectedUser = users.find((u) => u.user_id === result.user_id);

      if (planError || !planData?.length) {
        void Logger.error("Error setting plan on new organization:", planError);
        setError(
          `La organización "${formData.org_name}" se creó, pero no se guardó el plan ni el WhatsApp del dueño. Corrígelos en su ficha.`
        );
        setLoading(false);
        return;
      }

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
            <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground"></div>
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
        <div className="lg:sticky lg:top-0 lg:z-20 lg:bg-background/90 lg:backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-5 pb-3 pt-4 lg:px-8 lg:pt-8">
            <button
              type="button"
              onClick={() => router.push("/dashboard/organizations")}
              aria-label="Volver a organizaciones"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-display text-foreground">
              Nueva organización
            </h1>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 lg:px-8"
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
                          ? "border-primary bg-primary-50 dark:bg-primary-900"
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
                        <div className="truncate text-caption text-foreground-muted">
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

          <Field label="Plan">
            <Select
              value={formData.license_plan}
              onChange={(e) =>
                patchForm({ license_plan: e.target.value as LicensePlan })
              }
            >
              {APPOINTMENT_PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {LICENSE_PLAN_INFO[plan].label} ·{" "}
                  {formatUsd(LICENSE_PLAN_INFO[plan].price)} al mes
                </option>
              ))}
            </Select>
            <p className="mt-1 text-caption text-foreground-subtle">
              Un negocio que solo vende pasajes pasa al plan Pasajes cuando le
              cambias los módulos en su ficha.
            </p>
          </Field>

          <Field label="Cómo empieza">
            <Select
              value={formData.start_mode}
              onChange={(e) =>
                patchForm({ start_mode: e.target.value as StartMode })
              }
            >
              {START_MODES.map((mode) => (
                <option key={mode.key} value={mode.key}>
                  {mode.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-caption text-foreground-subtle">
              {formData.start_mode === "pending"
                ? "No podrá trabajar hasta que registres su primer pago, y ese pago empieza a contar ese día. Después no se le puede dar una prueba."
                : `Al vencer la prueba tiene ${LICENSE_GRACE_DAYS} días de margen con avisos diarios. La prueba solo se da ahora, al crear el negocio.`}
            </p>
          </Field>

          <Field label="WhatsApp del dueño" hint="Ahí le llegan los avisos de cobro.">
            <input
              type="tel"
              required
              value={formData.owner_phone}
              onChange={(e) => patchForm({ owner_phone: e.target.value })}
              className={inputClasses}
              placeholder="+5351234567"
            />
          </Field>

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
              placeholder="+5351234567"
            />
          </Field>

          {error && (
            <div className="rounded-card bg-danger-100 p-4 text-meta text-danger-600 dark:bg-danger-900 dark:text-danger-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-success-50 p-3 text-sm text-success-800 dark:bg-success-900 dark:text-success-400">
              {success}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
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
