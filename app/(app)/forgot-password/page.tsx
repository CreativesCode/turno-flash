"use client";

import { PageMetadata } from "@/components/page-metadata";
import { Button, Logo } from "@/components/ui";
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
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Logo size={32} withWordmark />
          </div>
          <h1 className="mb-2 font-display text-[40px] leading-[1.05] text-foreground">
            Recuperar contraseña
          </h1>

          <div>
            {sent ? (
              <div>
                <MailCheck className="h-8 w-8 text-primary" />
                <p className="mt-3 text-body text-foreground">
                  Si hay una cuenta con <strong>{email.trim()}</strong>, te
                  enviamos un enlace para elegir una contraseña nueva. Revisa
                  también la carpeta de spam.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-body text-foreground-muted">
                  Escribe el email con el que entras y te mandamos un enlace
                  para elegir una contraseña nueva.
                </p>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-meta font-medium text-foreground-muted"
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
                    className="block w-full min-h-12 rounded-control border border-border-2 bg-surface px-3.5 py-2.5 text-body text-foreground placeholder:text-foreground-subtle transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900"
                  />
                </div>
                {error && (
                  <div className="rounded-card bg-danger-100 p-4 text-meta text-danger-600 dark:bg-danger-900 dark:text-danger-400">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={sending}
                  className="w-full justify-center"
                >
                  {sending ? "Enviando…" : "Enviar enlace"}
                </Button>
              </form>
            )}
          </div>

          <div className="mt-8">
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
