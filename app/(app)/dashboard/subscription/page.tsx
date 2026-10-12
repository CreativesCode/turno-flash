"use client";

import { LicensePlanSummary } from "@/components/license-plan-summary";
import { ProtectedRoute } from "@/components/protected-route";
import { SupportWhatsAppLink } from "@/components/support-whatsapp-link";
import { Badge, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useIsStoreApp } from "@/hooks/useIsStoreApp";
import { useLicense, useOrganizationLicense } from "@/hooks/useLicense";
import { ArrowLeft, Crown, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const license = useLicense();
  const { data: organizationLicense } = useOrganizationLicense();
  // The store app never talks about paying (see useIsStoreApp)
  const storeApp = useIsStoreApp();

  // Solo owner/admin gestionan la suscripción (igual que la licencia)
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

  // The database message of a pending business mentions the first payment
  const statusMessage =
    storeApp && organizationLicense?.phase === "pending"
      ? "Tu negocio está en preparación."
      : license.message;

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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900">
              <Crown className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Suscripción
              </h1>
              <p className="text-sm text-foreground-muted">
                El plan de tu negocio
              </p>
            </div>
          </div>

          {/* Estado actual de la licencia */}
          <Card className="mb-6 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-foreground-muted" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Estado actual
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {statusMessage}
                  </p>
                </div>
              </div>
              {license.isActive ? (
                <Badge variant="success">Acceso activo</Badge>
              ) : license.isInGracePeriod ? (
                <Badge variant="warning">En días de margen</Badge>
              ) : (
                <Badge variant="warning">Sin acceso</Badge>
              )}
            </div>
          </Card>

          {/* Plan y, solo en la web, precio por periodo y cómo pagar */}
          <LicensePlanSummary />

          <Card className="p-6 text-center">
            <MessageCircle className="mx-auto mb-3 h-8 w-8 text-foreground-muted" />
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              {storeApp ? "¿Necesitas ayuda?" : "Paga o renueva tu plan"}
            </h2>
            <p className="mb-4 text-sm text-foreground-muted">
              {storeApp
                ? "Escríbenos por WhatsApp y te atendemos."
                : "Escríbenos por WhatsApp y te indicamos cómo pagar. Registramos tu pago el mismo día."}
            </p>
            <SupportWhatsAppLink className="w-full sm:w-auto" />
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
