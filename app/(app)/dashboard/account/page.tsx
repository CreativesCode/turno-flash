"use client";

import { ProtectedRoute } from "@/components/protected-route";
import {
  Badge,
  Button,
  Card,
  Field,
  PageHeader,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import { ROLE_META } from "@/components/users/UserCard";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/useToast";
import {
  accountNameSchema,
  accountPasswordSchema,
  accountPhoneSchema,
} from "@/schemas/account.schema";
import { AccountService } from "@/services/account.service";
import { Logger } from "@/utils/logger";
import { toInternationalPhone } from "@/utils/phone";
import { createClient } from "@/utils/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const CONFIRM_WORD = "ELIMINAR";

function NameForm() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const current = profile?.full_name ?? "";
  // null until the user types, so the field follows the profile once it loads
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const name = draft ?? current;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || saving) return;

    const parsed = accountNameSchema.safeParse({ full_name: name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    const result = await AccountService.updateName(
      profile.user_id,
      parsed.data.full_name,
    );
    if (result.success) {
      await refreshProfile();
      setDraft(null);
      toast.success("Nombre guardado");
    } else {
      toast.error(result.error ?? "No pudimos guardar tu nombre.");
    }
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Field label="Nombre">
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setDraft(e.target.value)}
            className={inputClasses}
            placeholder="Tu nombre"
          />
        </Field>
      </div>
      <Button
        type="submit"
        loading={saving}
        disabled={name.trim() === current.trim()}
      >
        Guardar
      </Button>
    </form>
  );
}

/** Owners only: the number where the notices about the subscription arrive. */
function OwnerPhoneForm({ organizationId }: { organizationId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: current } = useQuery({
    queryKey: ["owner-phone", organizationId],
    queryFn: () => AccountService.getOwnerPhone(organizationId),
  });
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const phone = draft ?? current ?? "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const parsed = accountPhoneSchema.safeParse({ owner_phone: phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    const result = await AccountService.updateOwnerPhone(
      organizationId,
      toInternationalPhone(parsed.data.owner_phone),
    );
    if (result.success) {
      await queryClient.invalidateQueries({
        queryKey: ["owner-phone", organizationId],
      });
      setDraft(null);
      toast.success("Teléfono guardado");
    } else {
      toast.error(result.error ?? "No pudimos guardar tu teléfono.");
    }
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <Field
          label="Tu WhatsApp"
          hint="Aquí te llegan los avisos de tu suscripción."
        >
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            disabled={current === undefined}
            onChange={(e) => setDraft(e.target.value)}
            className={inputClasses}
            placeholder="+53 5 123 4567"
          />
        </Field>
      </div>
      <Button
        type="submit"
        loading={saving}
        disabled={phone.trim() === (current ?? "").trim()}
        className="sm:mt-6.5"
      >
        Guardar
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { user } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !user?.email) return;

    const parsed = accountPasswordSchema.safeParse({
      current,
      password,
      confirm,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    const result = await AccountService.changePassword(
      user.email,
      parsed.data.current,
      parsed.data.password,
    );
    if (result.success) {
      setCurrent("");
      setPassword("");
      setConfirm("");
      toast.success("Contraseña cambiada");
    } else {
      toast.error(result.error ?? "No pudimos cambiar la contraseña.");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Contraseña actual">
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label="Contraseña nueva">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
            placeholder="Mínimo 6 caracteres"
          />
        </Field>
        <Field label="Repítela">
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>
      <div>
        <Button
          type="submit"
          variant="secondary"
          loading={saving}
          disabled={!current || !password || !confirm}
        >
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}

export default function AccountPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== CONFIRM_WORD || deleting) return;

    setDeleting(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!supabaseUrl || !session?.access_token) {
        toast.error("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "No se pudo eliminar la cuenta");
        return;
      }

      toast.success("Cuenta eliminada. Lamentamos verte partir.");
      await signOut();
      router.push("/");
    } catch (err) {
      void Logger.error("Error eliminando cuenta", err, {
        page: "dashboard/account",
      });
      toast.error("Error al eliminar la cuenta. Intenta de nuevo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-4 lg:px-8 lg:pt-8">
          <PageHeader
            title="Mi cuenta"
            subtitle="Información y gestión de tu cuenta"
            className="mb-6"
          />

          {/* Información de la cuenta */}
          <Card className="mb-6 p-5">
            <NameForm />
            {profile?.role === "owner" && profile.organization_id && (
              <div className="mt-4">
                <OwnerPhoneForm organizationId={profile.organization_id} />
              </div>
            )}
            <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Correo</dt>
                <dd className="min-w-0 break-all text-right font-medium text-foreground">
                  {user?.email}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Rol</dt>
                <dd>
                  <Badge variant="primary">
                    {profile ? ROLE_META[profile.role].label : ""}
                  </Badge>
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="mb-6 p-5">
            <h2 className="mb-3 font-semibold text-foreground">Contraseña</h2>
            <PasswordForm />
          </Card>

          {/* Zona de peligro */}
          <Card className="border-danger-200 p-5 dark:border-danger-800">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-danger-400" />
              <h2 className="font-semibold text-foreground">Eliminar cuenta</h2>
            </div>
            <p className="mb-4 text-sm text-foreground-muted">
              Esta acción es <strong>permanente e irreversible</strong>: se
              eliminarán tu acceso y tu perfil. Si eres dueño de una
              organización sin otros miembros, la organización se desactivará.
              Si tienes una suscripción activa, recuerda cancelarla en Google
              Play. Más detalles en{" "}
              <Link className="underline" href="/account-deletion">
                eliminación de cuenta
              </Link>
              .
            </p>
            <label className="mb-2 block text-sm text-foreground-muted">
              Escribe <strong>{CONFIRM_WORD}</strong> para confirmar:
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-danger-500"
              />
              <Button
                variant="danger"
                disabled={confirmText !== CONFIRM_WORD || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Eliminando..." : "Eliminar mi cuenta"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
