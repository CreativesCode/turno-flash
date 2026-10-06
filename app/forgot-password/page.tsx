"use client";

import { PageMetadata } from "@/components/page-metadata";
import { Button, Card, Logo } from "@/components/ui";
import { getSiteUrl } from "@/utils/metadata";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { z } from "zod";

const emailSchema = z.string().trim().email();

/**
 * "¿Olvidaste tu contraseña?" (P1-28). The reset link uses the implicit flow:
 * the email is often opened on another device or outside the native app,
 * where a PKCE code verifier would not exist.
 */
function recoveryClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false } }
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Escribe un email válido.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await recoveryClient().auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${getSiteUrl()}/auth/callback?type=recovery`,
      });
      // Same answer whether the email exists or not
      setSent(true);
    } catch {
      setError("No pudimos enviar el email. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageMetadata
        title="Recuperar contraseña"
        description="Recibe un enlace para elegir una contraseña nueva."
      />
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-7 flex flex-col items-center gap-3">
            <Logo size={56} priority />
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              Recuperar contraseña
            </div>
          </div>

          <Card className="p-6">
            {sent ? (
              <div className="text-center">
                <MailCheck className="mx-auto h-10 w-10 text-primary-600" />
                <p className="mt-3 text-sm text-foreground">
                  Si hay una cuenta con <strong>{email.trim()}</strong>, te
                  enviamos un enlace para elegir una contraseña nueva. Revisa
                  también la carpeta de spam.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-foreground-muted">
                  Escribe el email con el que entras y te mandamos un enlace
                  para elegir una contraseña nueva.
                </p>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.05em] text-foreground-muted"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="block w-full rounded-lg border border-border-2 bg-surface px-3 py-2.5 text-sm text-foreground placeholder-foreground-subtle focus:border-primary-500 focus:outline-none focus:ring-3 focus:ring-primary-500/15"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-danger-50 px-3 py-2.5 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  variant="mesh-primary"
                  size="lg"
                  disabled={sending}
                  className="w-full justify-center"
                >
                  {sending ? "Enviando…" : "Enviar enlace"}
                </Button>
              </form>
            )}
          </Card>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
