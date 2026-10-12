import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProviderWrapper } from "@/components/ThemeProviderWrapper";
import { QueryProvider } from "@/contexts/query-client-provider";
import { getAbsoluteUrl, getSiteUrl } from "@/utils/metadata";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Generar URLs absolutas para metadata (requerido por WhatsApp)
const siteUrl = getSiteUrl();
const ogImageUrl = getAbsoluteUrl("/opengraph-image.jpg");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Turno Flash - Turnos y venta de pasajes para tu negocio",
    template: "%s | Turno Flash",
  },
  description:
    "Sistema de reservas para negocios: agenda de turnos con recordatorios por WhatsApp y venta de pasajes para viajes y excursiones, con página pública de reservas. Para salones, barberías, clínicas, talleres y agencias de viajes.",
  keywords: [
    "sistema de reservas",
    "gestión de turnos",
    "agenda online",
    "reservas móvil",
    "turnos para negocios",
    "salones de belleza",
    "barberías",
    "clínicas",
    "talleres",
    "app de citas",
    "venta de pasajes",
    "reserva de asientos",
    "reservas de viajes",
    "excursiones",
    "agencias de viajes",
    "transporte de pasajeros",
    "recordatorios por WhatsApp",
  ],
  authors: [{ name: "Turno Flash" }],
  creator: "Turno Flash",
  publisher: "Turno Flash",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Turno Flash",
    title: "Turno Flash - Turnos y venta de pasajes para tu negocio",
    description:
      "Agenda de turnos y venta de pasajes con página de reservas y avisos por WhatsApp. Para salones, barberías, clínicas, talleres y agencias de viajes.",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Turno Flash - Sistema de Reservas",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Turno Flash - Turnos y venta de pasajes para tu negocio",
    description:
      "Agenda de turnos y venta de pasajes con avisos por WhatsApp. Optimizado para móvil, bajo consumo de datos.",
    images: [ogImageUrl],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  category: "business",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Importante para safe areas en iOS
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="theme-color"
          content="#f5f4f0"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#0f100f"
          media="(prefers-color-scheme: dark)"
        />
        {/* Meta tags adicionales para WhatsApp - URLs absolutas explícitas */}
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Turno Flash - Sistema de Reservas"
        />
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ErrorBoundary>
          <QueryProvider>
            {/* No AuthProvider here: the public pages (/book, /trips) don't
                need a session, and it brought supabase-js and Capacitor to
                them (P2-02). The app routes get it from app/(app)/layout. */}
            <ThemeProviderWrapper>
              {children}
              <Toaster
                position="top-center"
                duration={4000}
                expand={true}
                visibleToasts={5}
                toastOptions={{
                  className:
                    "!rounded-[14px] !border-border !bg-surface !text-foreground !shadow-card !font-sans",
                  style: {
                    zIndex: 9999,
                  },
                }}
              />
            </ThemeProviderWrapper>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
