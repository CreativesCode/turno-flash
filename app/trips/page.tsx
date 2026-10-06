"use client";

import { TripsFlow } from "@/components/public-trips/TripsFlow";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Public seat booking page (PRP-002). Static route: the business travels in
 * the query string (`/trips?b=<slug>`) because static export cannot generate
 * `/trips/[slug]` for businesses created after the build. No session needed.
 */
function TripsContent() {
  const searchParams = useSearchParams();
  const slug = (searchParams.get("b") ?? "").trim().toLowerCase();
  return <TripsFlow slug={slug} />;
}

export default function TripsPage() {
  return (
    <Suspense
      fallback={
        // Static HTML: on 3G this is what shows while the scripts arrive (P2-02)
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
          <p className="text-sm text-foreground-muted">Cargando los viajes…</p>
        </div>
      }
    >
      <TripsContent />
    </Suspense>
  );
}
