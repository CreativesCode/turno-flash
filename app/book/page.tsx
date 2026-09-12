"use client";

import { BookingFlow } from "@/components/booking/BookingFlow";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Public booking page (PRP-001). Static route: the business travels in the
 * query string (`/book?b=<slug>`) because static export cannot generate
 * `/book/[slug]` for businesses created after the build. No session needed.
 */
function BookContent() {
  const searchParams = useSearchParams();
  const slug = (searchParams.get("b") ?? "").trim().toLowerCase();
  return <BookingFlow slug={slug} />;
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
        </div>
      }
    >
      <BookContent />
    </Suspense>
  );
}
