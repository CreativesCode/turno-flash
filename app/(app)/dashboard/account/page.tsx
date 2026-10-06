"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Badge, Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/useToast";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { AlertTriangle, ArrowLeft, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const CONFIRM_WORD = "ELIMINAR";

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
        }
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
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al dashboard
          </Link>

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <UserCircle className="h-6 w-6 text-foreground-muted" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mi cuenta</h1>
              <p className="text-sm text-foreground-muted">
                Información y gestión de tu cuenta
              </p>
            </div>
          </div>

          {/* Información de la cuenta */}
          <Card className="mb-6 p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Correo</dt>
                <dd className="font-medium text-foreground">{user?.email}</dd>
              </div>
              {profile?.full_name && (
                <div className="flex items-center justify-between">
                  <dt className="text-foreground-muted">Nombre</dt>
                  <dd className="font-medium text-foreground">
                    {profile.full_name}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Rol</dt>
                <dd>
                  <Badge variant="primary">{profile?.role}</Badge>
                </dd>
              </div>
            </dl>
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
