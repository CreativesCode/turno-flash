import { ThemeProviderWrapper } from "@/components/ThemeProviderWrapper";
import { getAbsoluteUrl, getSiteUrl } from "@/utils/metadata";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Generar URLs absolutas para metadata (requerido por WhatsApp)
const siteUrl = getSiteUrl();
const ogImageUrl = getAbsoluteUrl("/opengraph-image.jpg");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Turno Flash - Sistema de Reservas Inteligente",
    template: "%s | Turno Flash",
  },
  description:
    "Sistema de reservas inteligente para negocios. Gestiona turnos, clientes y servicios desde cualquier dispositivo. Optimizado para salones, barberías, clínicas y talleres.",
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
  ],
  authors: [{ name: "Turno Flash" }],
  creator: "Turno Flash",
  publisher: "Turno Flash",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover", // Importante para safe areas en iOS
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: getAbsoluteUrl("/"),
    siteName: "Turno Flash",
    title: "Turno Flash - Sistema de Reservas Inteligente",
    description:
      "Gestiona tus turnos desde cualquier lugar. Sistema de reservas optimizado para móvil, ideal para salones, barberías, clínicas y talleres.",
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
    title: "Turno Flash - Sistema de Reservas Inteligente",
    description:
      "Gestiona tus turnos desde cualquier lugar. Optimizado para móvil, bajo consumo de datos.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
      </body>
    </html>
  );
}
