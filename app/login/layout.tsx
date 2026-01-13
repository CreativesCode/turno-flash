import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description:
    "Inicia sesión en Turno Flash para acceder a tu panel de control y gestionar tus turnos, clientes y servicios.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
