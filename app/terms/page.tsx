import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Turno Flash",
  description:
    "Términos y condiciones de uso de Turno Flash: suscripciones, responsabilidades y uso aceptable.",
};

const LAST_UPDATED = "11 de junio de 2026";
const CONTACT_EMAIL = "robert.cabrer92@gmail.com";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
        >
          ← Volver al inicio
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Términos y Condiciones
        </h1>
        <p className="mb-10 text-sm text-foreground-muted">
          Última actualización: {LAST_UPDATED}
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold">1. El servicio</h2>
            <p>
              Turno Flash es una plataforma de gestión de turnos y citas para
              negocios de servicios. Al crear una cuenta o usar la Aplicación
              aceptas estos términos. Si no estás de acuerdo, no uses la
              Aplicación.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">2. Cuentas</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Eres responsable de mantener la confidencialidad de tus
                credenciales y de toda actividad realizada con tu cuenta.
              </li>
              <li>
                Debes proporcionar información veraz y mantenerla actualizada.
              </li>
              <li>
                Puedes eliminar tu cuenta en cualquier momento (ver{" "}
                <Link className="underline" href="/account-deletion">
                  eliminación de cuenta
                </Link>
                ).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              3. Suscripciones y pagos
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Algunas funciones requieren una suscripción de pago, que se
                contrata a través de Google Play y se renueva automáticamente
                al final de cada período.
              </li>
              <li>
                Puedes cancelar en cualquier momento desde la configuración de
                suscripciones de Google Play; mantendrás el acceso hasta el fin
                del período ya pagado.
              </li>
              <li>
                Los reembolsos se rigen por las políticas de Google Play.
              </li>
              <li>
                Los precios pueden cambiar; te avisaremos con antelación y el
                cambio aplicará a partir de la siguiente renovación.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              4. Datos de los clientes del negocio
            </h2>
            <p>
              Como negocio usuario de la Aplicación, eres responsable de los
              datos de tus clientes que registras (nombres, teléfonos, citas) y
              de contar con su consentimiento para usarlos, incluido el envío
              de recordatorios por WhatsApp. Nosotros tratamos esos datos según
              la{" "}
              <Link className="underline" href="/privacy">
                Política de Privacidad
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">5. Uso aceptable</h2>
            <p>No está permitido:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Usar la Aplicación para enviar spam o mensajes no consentidos.</li>
              <li>Intentar acceder a datos de otras organizaciones.</li>
              <li>
                Revender, descompilar o interferir con el funcionamiento del
                servicio.
              </li>
            </ul>
            <p className="mt-2">
              Podemos suspender cuentas que incumplan estos términos.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              6. Disponibilidad y responsabilidad
            </h2>
            <p>
              Trabajamos para mantener el servicio disponible y seguro, pero la
              Aplicación se ofrece &quot;tal cual&quot;, sin garantía de
              disponibilidad ininterrumpida. En la medida permitida por la ley,
              nuestra responsabilidad total queda limitada al importe pagado
              por el servicio en los últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">7. Cambios</h2>
            <p>
              Podemos actualizar estos términos. Si el cambio es sustancial, lo
              notificaremos dentro de la Aplicación antes de que entre en
              vigor.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">8. Contacto</h2>
            <p>
              Para cualquier duda sobre estos términos:{" "}
              <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
