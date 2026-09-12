import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservar turno",
  description: "Reserva tu turno online en segundos: elige servicio, profesional y horario.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
