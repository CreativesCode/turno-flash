"use client";

import {
  Button,
  Card,
  Field,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { InvitationService } from "@/services";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const STEPS = [
  "Ingresa el correo electrónico del nuevo usuario",
  "El usuario recibirá un correo con un enlace de invitación",
  "Al hacer clic en el enlace, podrá configurar su contraseña",
  "Después, podrá iniciar sesión con su correo y contraseña",
];

export default function InvitePage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verificar que el usuario sea admin u owner
  useEffect(() => {
    if (
      !authLoading &&
      profile &&
      profile.role !== "admin" &&
      profile.role !== "owner"
    ) {
      router.push("/dashboard");
    }
  }, [profile, authLoading, router]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Los owners envían su organization_id para que el invitado se una a su negocio
    const organizationId =
      profile?.role === "owner"
        ? (profile.organization_id ?? undefined)
        : undefined;
    const result = await InvitationService.invite(email, organizationId);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Error al enviar la invitación");
      return;
    }

    setSuccess(
      `Se ha enviado una invitación a ${email}. El usuario podrá hacer clic en el enlace para configurar su contraseña.`
    );
    setEmail(""); // Limpiar el campo
  };

  // Mostrar spinner mientras se carga la autenticación o si no es admin u owner
  if (
    authLoading ||
    !profile ||
    (profile.role !== "admin" && profile.role !== "owner")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
      </div>
    );
  }

  const isOwner = profile.role === "owner";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Invitar usuario
          </h1>
          <p className="text-xs text-foreground-muted">
            {isOwner
              ? "Se sumará a tu negocio como empleado"
              : "Quedará sin organización hasta que lo asignes"}
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5 sm:px-6">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Enviar invitación
              </h2>
              <p className="mt-0.5 text-xs text-foreground-muted">
                El usuario recibirá un correo con un enlace para configurar su
                contraseña y acceder a la plataforma.
              </p>
            </div>
          </div>

          <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-4">
            <Field label="Correo electrónico del nuevo usuario">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder="usuario@ejemplo.com"
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
              className="w-full justify-center"
            >
              {loading ? "Enviando invitación…" : "Enviar invitación"}
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold text-foreground">Cómo funciona</h3>
          <ol className="mt-3 flex flex-col gap-2.5">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-foreground-muted">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground-muted">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
