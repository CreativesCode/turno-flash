"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Badge, Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useLicense } from "@/hooks/useLicense";
import { useSubscription } from "@/hooks/useSubscription";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import {
  ArrowLeft,
  BadgeCheck,
  Crown,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/hooks/useToast";

const PACKAGE_LABELS: Record<string, { title: string; note?: string }> = {
  $rc_monthly: { title: "Plan Mensual" },
  $rc_annual: { title: "Plan Anual", note: "Mejor precio" },
};

function packageLabel(pkg: PurchasesPackage): { title: string; note?: string } {
  return (
    PACKAGE_LABELS[pkg.identifier] ?? {
      title: pkg.product.title || pkg.identifier,
    }
  );
}

export default function SubscriptionPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const license = useLicense();
  const {
    isAvailable,
    loading,
    purchasing,
    error,
    packages,
    isPro,
    proExpirationDate,
    purchase,
    restore,
  } = useSubscription();

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

  const handlePurchase = async (pkg: PurchasesPackage) => {
    const result = await purchase(pkg);
    if (result.success) {
      toast.success("¡Suscripción activada! Gracias por tu compra.");
    } else if (!result.cancelled) {
      toast.error(result.error ?? "No se pudo completar la compra");
    }
  };

  const handleRestore = async () => {
    const restored = await restore();
    if (restored) {
      toast.success("Compras restauradas correctamente");
    } else {
      toast.info("No se encontraron compras para restaurar");
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <Crown className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Suscripción
              </h1>
              <p className="text-sm text-foreground-muted">
                Gestiona el plan de tu organización
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
                    {license.message}
                  </p>
                </div>
              </div>
              {isPro ? (
                <Badge variant="success">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                  PRO activo
                </Badge>
              ) : license.isActive ? (
                <Badge variant="success">Licencia activa</Badge>
              ) : (
                <Badge variant="warning">Sin suscripción</Badge>
              )}
            </div>
            {isPro && proExpirationDate && (
              <p className="mt-3 text-xs text-foreground-muted">
                Próxima renovación:{" "}
                {new Date(proExpirationDate).toLocaleDateString("es", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </Card>

          {/* Planes / compra */}
          {!isAvailable && !loading ? (
            <Card className="p-6 text-center">
              <Smartphone className="mx-auto mb-3 h-8 w-8 text-foreground-muted" />
              <h2 className="mb-1 text-lg font-semibold text-foreground">
                Compra disponible en la app móvil
              </h2>
              <p className="text-sm text-foreground-muted">
                Las suscripciones se gestionan a través de Google Play. Abre
                Turno Flash en tu teléfono Android para suscribirte o gestionar
                tu plan.
              </p>
            </Card>
          ) : loading ? (
            <Card className="p-6">
              <div className="flex items-center justify-center gap-3 py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
                <p className="text-sm text-foreground-muted">
                  Cargando planes...
                </p>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {packages.map((pkg) => {
                  const label = packageLabel(pkg);
                  return (
                    <Card key={pkg.identifier} className="flex flex-col p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">
                          {label.title}
                        </h3>
                        {label.note && (
                          <Badge variant="info">
                            <Sparkles className="mr-1 h-3 w-3" />
                            {label.note}
                          </Badge>
                        )}
                      </div>
                      <p className="mb-1 text-2xl font-bold text-foreground">
                        {pkg.product.priceString}
                      </p>
                      <p className="mb-4 flex-1 text-sm text-foreground-muted">
                        {pkg.product.description ||
                          "Acceso completo a Turno Flash para tu organización."}
                      </p>
                      <Button
                        variant="mesh-primary"
                        disabled={purchasing || isPro}
                        onClick={() => handlePurchase(pkg)}
                      >
                        {isPro
                          ? "Ya tienes PRO"
                          : purchasing
                            ? "Procesando..."
                            : "Suscribirme"}
                      </Button>
                    </Card>
                  );
                })}
                {packages.length === 0 && (
                  <Card className="p-6 text-center sm:col-span-2">
                    <p className="text-sm text-foreground-muted">
                      No hay planes disponibles en este momento. Verifica la
                      configuración del offering en RevenueCat.
                    </p>
                  </Card>
                )}
              </div>

              {error && (
                <p className="mt-4 text-sm text-danger-600 dark:text-danger-400">
                  {error}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-foreground-muted">
                  La suscripción se renueva automáticamente. Puedes cancelarla
                  en cualquier momento desde Google Play.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={purchasing}
                  onClick={handleRestore}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Restaurar compras
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
