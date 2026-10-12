---
name: planes-y-precios
description: Planes y precios de licencia decididos el 2026-10-11 (Personal, Salón, Salón grande, Pasajes), reglas portadas de LensSpace y estado del PRP-003
metadata:
  type: project
---

Decidido por Roberto el **2026-10-11** e **implementado ese mismo día** (PRP-003,
`.claude/PRPs/prp-license-plans-billing.md`; commits `7f9649f` a `236b03d`, sin pushear).

**Pendiente al cierre:** desplegar las edge functions `self-signup` (15 días, plan, WhatsApp del dueño) y
`license-notices` (envío de avisos): están escritas y sin desplegar. Hasta entonces el registro da 7 días
y no sale ningún aviso por WhatsApp. Lista completa de lo no verificado en la sección «Cierre» del PRP.

## Dónde vive cada regla

- **Precios para mostrar:** `config/license-pricing.ts` (admin, Suscripción, registro y landing).
- **Precios para cobrar:** `license_plan_monthly_price` y `license_period_months` (074). Cambiar un
  precio = tocar los dos sitios.
- **Margen de 5 días:** `license_grace_days()` (073) y `LICENSE_GRACE_DAYS`. `check_license_status`
  ignora su parámetro de gracia.
- **Fases** `pending / trial / paid` en `organizations.license_phase`; las protege el trigger
  `guard_organization_license` (073): prueba solo al nacer con fechas o en su primer día; nunca se
  vuelve a «pending». Fechas vacías + fase distinta de «pending» = acceso sin vencimiento (heredado).
- **Cobro:** `license_payment_quote` (vista previa) y `record_license_payment` (074), solo admin.
  Historial en `license_payments`. Un periodo termina el último segundo de su día en Cuba.
- **Tope de profesionales:** triggers `enforce_staff_limit` y `license_plan_fits_staff` (076).
- **Avisos:** `run_license_notices()` + cron `license-notices` a las 14:00 UTC + tabla
  `license_notices` (077). Van al `organizations.owner_phone` (si falta, al WhatsApp del negocio).
- **Pantallas:** `components/organizations/LicensePlanCard.tsx`, `RecordPaymentSheet.tsx`,
  `LicensePaymentsCard.tsx`; `components/license-plan-summary.tsx`; `components/landing/PricingSection.tsx`.
- **Para probar:** usuario dueño + usuario admin creados con la clave de servicio,
  `create_organization_with_owner`, Playwright, y borrar todo al final.

## Lista de precios (USD al mes; se cobra en USD)

| Plan | Para quién | Lista | Fundador (fijo 24 meses) |
|---|---|---|---|
| Personal | 1 profesional | 5 | 3 |
| Salón | hasta 5 profesionales | 10 | 6 |
| Salón grande | más de 5 | 15 | 9 |
| Pasajes | gestores y agencias | 5 | 3 |

- Turnos + Pasajes en el mismo negocio: plan de turnos **+3** (8 / 13 / 18). El +3 es igual para fundadores.
- Todo incluido en todos los planes (campañas, reportes, reserva online, WhatsApp); solo cambia el tamaño.
- Periodos: mensual, trimestral, semestral y anual (el anual cobra 10 meses).
- Recomendaciones: 10 días al que recomienda, 15 si tiene precio fundador vigente.
- **El plan lo elige el dueño al registrarse**; el admin puede cambiarlo después.

## Reglas portadas de LensSpace (proyecto hermano `../lensspace`, memoria en `.titan/memory/`)

Prueba de 15 días solo al registrarse, estado «En preparación» para altas sin prueba, 5 días de margen
con cobro justo (`inicio = max(vencimiento + 1, hoy − 5)`), avisos diarios por WhatsApp y en la web,
«Registrar pago» manual. **No** se porta el contrato firmado. Aquí el bloqueo tras el margen es total
(D-10), no solo lectura. Reemplaza la prueba de 7 + 7 de [[license-enforcement]] cuando se implemente.

## Contexto de la decisión

- Los 9,99 / 79,99 USD de Google Play que anuncia la landing quedan obsoletos.
- Dólar informal ≈ 780 CUP (oct 2026): 5 USD ≈ 3.900 CUP, menos de medio asiento de 8.500 CUP.
- **No se sabe cuánto gana un gestor por asiento** (Roberto tampoco): se averigua con los primeros
  gestores fundadores; si 5 USD pesa, se añade un plan ligero con tope de salidas.
- Locales con profesionales independientes: cada uno su plan Personal (un negocio comparte clientes entre
  su equipo); se incentiva con recomendaciones, sin plan nuevo.
- **Los negocios existentes son todos de prueba** (dicho por Roberto): sin trato especial, 15 días de
  prueba al migrar, ninguno fundador.
- Las decisiones A-4, A-5 y A-7 a A-13 del PRP se implementaron con el supuesto de Claude: Roberto las
  vio en el chat y no las cambió. A-14: el WhatsApp del dueño es obligatorio en el registro.
- Los negocios que existían recibieron plan por tamaño y prueba hasta el 26/10/2026; «Barbería Demo»
  conserva su fecha de 2031 y «Organización test» sigue sin vencimiento.
