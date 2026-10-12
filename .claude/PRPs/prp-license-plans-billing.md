# PRP-003: Planes y cobro de licencias

> **Estado**: IMPLEMENTADO el 2026-10-11 (fases 1 a 9; migraciones 073-077 aplicadas; funciones `self-signup` v9 y `license-notices` v1 desplegadas ese día). Pendiente lo listado en «Cierre»
> **Fecha**: 2026-10-11
> **Proyecto**: Turno Flash
> **Origen**: se porta la lógica de negocio de LensSpace (`../lensspace`, commits `6879d15` y `bc5fb96`,
> migraciones `20261011202949` a `20261011212452`). No se porta el contrato firmado ni la proforma.

---

## Objetivo

Que cada negocio tenga un **plan con precio** (Personal, Salón, Salón grande, Pasajes), un **estado de
licencia claro** (En preparación, Prueba, Activa, En margen de pago, Bloqueada) y que el administrador
cobre a mano en USD con un solo botón «Registrar pago» que calcula el importe, el periodo cubierto, el
precio fundador y las recomendaciones. Al cerrar el plan, el landing muestra los precios nuevos.

## Por Qué

| Problema | Solución |
|----------|----------|
| Hoy la licencia son dos fechas sueltas en el negocio. La base no sabe si es una prueba o un pago, ni cuánto paga cada uno | Plan, periodo y fase guardados en el negocio, y un libro de pagos con el importe cobrado en cada uno |
| El admin extiende la licencia escribiendo fechas a mano en un formulario: es fácil regalar o quitar días sin querer | «Registrar pago» calcula solo desde cuándo y hasta cuándo cubre, y muestra la vista previa antes de confirmar |
| Quien paga tarde gana días gratis (el margen no se cobra) y quien paga antes de tiempo podría perderlos | Cobro justo: los días de margen usados se cobran, los días bloqueado no, y pagar antes nunca quita días |
| El dueño se entera de que venció cuando ya está bloqueado: solo hay un aviso en Inicio | Aviso diario por WhatsApp y en la web desde 2 días antes hasta el último día de margen; el admin también recibe el suyo |
| Un negocio dado de alta por el admin sin fechas tiene acceso ilimitado sin pagar | Estado «En preparación»: no opera hasta el primer pago, y ese pago empieza a contar ese día |
| El landing anuncia 9,99 USD al mes por Google Play, que desde Cuba no se puede pagar | Sección de precios con los planes reales y el pago por transferencia o efectivo |
| No hay forma de premiar a los primeros negocios ni a quien trae a otro | Precio fundador fijo 24 meses y días de regalo por cada recomendado que paga |

**Valor de negocio**: es lo que convierte el piloto en ingresos. Hoy 6 negocios reales llevan más de
100 días vencidos y no hay un precio ni un circuito de cobro que ofrecerles.

## Qué

### Lista de precios (USD por mes)

| Plan | Para quién | Precio | Fundador (24 meses) |
|------|-----------|--------|---------------------|
| Personal | Turnos, 1 profesional | 5 | 3 |
| Salón | Turnos, hasta 5 profesionales | 10 | 6 |
| Salón grande | Turnos, más de 5 profesionales | 15 | 9 |
| Pasajes | Venta de pasajes | 5 | 3 |
| Segundo módulo | Turnos + Pasajes en el mismo negocio | +3 | ver decisión A-2 |

Periodos de pago: mensual (×1), trimestral (×3), semestral (×6) y anual (**×10**: se pagan 10 meses y
cubre 12). Ejemplo: Salón anual = 100 USD; Salón fundador anual = 60 USD.

### Criterios de Éxito

- [ ] Cada negocio tiene un plan y se ve en su ficha (admin) y en Suscripción (dueño), con el precio
      que le corresponde por mes y por cada periodo.
- [ ] **Prueba de 15 días solo al registrarse.** El registro crea el negocio con 15 días de prueba.
      Ningún camino (pantalla, API ni SQL directo de un admin) vuelve a poner un negocio en prueba
      después, ni convierte en prueba a uno que ya pagó alguna vez.
- [ ] Un negocio dado de alta por el admin sin prueba nace **«En preparación»**: el dueño entra y ve
      por qué no puede trabajar, no recibe avisos de vencimiento, y su primer pago empieza a contar el
      día que se registra. Ningún negocio puede volver a «En preparación» desde otro estado.
- [ ] **Margen de 5 días** (antes 7) en todos los sitios donde hoy está el 7: el bloqueo en la base,
      la vista de organizaciones, las estadísticas de Plataforma, los textos de la app y el manual.
- [ ] **Cobro justo**, probado con casos: vence el 5 y paga el 3 → cubre desde el 6 (no pierde días);
      vence el 5 y paga el 8 (en margen) → cubre desde el 6 (el margen se cobra); vence el 5 y paga
      el 20 (bloqueado desde el 11) → cubre desde el 15 (5 días de margen usados, 9 bloqueado sin
      cobrar); «En preparación» paga el 20 → cubre desde el 20.
- [ ] «Registrar pago» muestra **antes de confirmar** el importe en USD y las fechas «cubre del… al…»,
      y esa vista previa coincide siempre con lo que guarda la base.
- [ ] Cada pago queda en un historial por negocio: fecha, importe, plan, periodo, fechas cubiertas,
      si fue precio fundador, nota y quién lo registró. Solo lo ve el admin.
- [ ] **Precio fundador**: un negocio marcado fundador paga 3/6/9/3 durante 24 meses desde su primer
      pago; el primer pago posterior a esa fecha cobra el precio de lista sin que nadie lo toque.
- [ ] **Recomendaciones**: cuando un negocio recomendado paga su primer periodo, a quien lo recomendó
      se le suman 10 días (15 si tiene el precio fundador vigente). Una sola vez por recomendado, se
      acumulan si recomienda a varios, y queda registrado.
- [ ] **Límite de profesionales**: Personal no admite un segundo profesional activo y Salón no admite
      un sexto, ni creando ni reactivando, ni por pantalla ni por API. El dueño ve un mensaje que le
      dice a qué plan pasar y cómo pedirlo. Salón grande y Pasajes no tienen tope.
- [ ] **Avisos diarios por WhatsApp**: el dueño recibe uno por día desde 2 días antes del vencimiento
      hasta el último día de margen, y uno el día del bloqueo; el admin recibe uno el día que vence y
      otro el día del bloqueo. Volver a correr el proceso el mismo día no manda nada dos veces.
- [ ] **Aviso en la web**: el dueño ve el mismo calendario de avisos al entrar; puede cerrarlo y
      vuelve a salir al día siguiente. El empleado solo ve el bloqueo, sin fechas ni importes.
- [ ] Un dueño no puede cambiarse el plan, el periodo, la marca de fundador ni registrar pagos
      (probado llamando a la API directo, no solo por pantalla).
- [ ] Los negocios que ya existen quedan con un plan asignado y sin cambiar su fecha de vencimiento.
- [ ] Lo que no cambia sigue igual: bloqueo total tras el margen (D-10), reservas públicas cerradas
      para un negocio bloqueado, y una compra de Google Play nunca acorta una licencia.
- [ ] El landing muestra los cuatro planes, el segundo módulo, los periodos y las condiciones, y ya
      no menciona 9,99 ni 7 días. Se publica **al final**, con todo lo anterior funcionando.

### Comportamiento Esperado (Happy Path)

1. **Registro.** El dueño crea su cuenta y elige qué hace su negocio. Empieza con **15 días de
   prueba** y el plan que le corresponde (ver decisión A-1).
2. **Durante la prueba** trabaja con normalidad, con el tope de profesionales de su plan. Si intenta
   agregar un profesional de más, la app le dice que su plan admite hasta N y le ofrece escribir a
   soporte para cambiarlo.
3. **Dos días antes de vencer** empieza a recibir un WhatsApp diario y ve un aviso al entrar: cuándo
   vence, cuánto paga y a quién escribir. El día que vence, el admin recibe su aviso con el nombre
   del negocio y el contacto del dueño.
4. **Paga** por transferencia o en efectivo y avisa por WhatsApp. El admin abre la ficha del negocio,
   toca «Registrar pago», elige el periodo (mensual, trimestral, semestral, anual), ve «Se cobra
   30,00 USD. Cubre del 6 de noviembre al 5 de febrero», escribe una nota y confirma.
5. El negocio queda **Activo**, los avisos se detienen y el pago aparece en su historial. Si era su
   primer pago y alguien lo recomendó, a ese negocio se le suman sus días.
6. **Si no paga**, sigue trabajando 5 días más con avisos diarios. Al sexto día queda bloqueado:
   dueño y admin reciben el aviso, y el dueño solo puede entrar a Suscripción y Mi cuenta.
7. **Si paga estando bloqueado**, vuelve a trabajar en el momento; se le cobran los 5 días de margen
   que usó y no los que estuvo bloqueado.
8. **Alta por el admin sin prueba:** el negocio nace «En preparación». El dueño ve «Tu negocio está
   en preparación: empezará a funcionar cuando registremos tu primer pago».

---

## Contexto

### Qué hay hoy en Turno Flash (verificado en el código)

- **La licencia son dos columnas** de `organizations`: `license_start_date` y `license_end_date`
  (`timestamptz`), más `is_active`. No hay plan, precio, periodo ni fase. La base no distingue una
  prueba de una licencia paga (por eso los textos actuales son neutros).
- **Estados calculados**, no guardados: `check_license_status(org, gracia)` devuelve
  `active | grace_period | expired | no_license` (enum `license_status`, migración 008; versión
  vigente en la 067). Fechas vacías = `no_license` = **acceso ilimitado**.
- **Gracia de 7 días escrita a mano** en cuatro sitios que hay que mover juntos:
  `org_license_usable` (027), la vista `organizations_with_license_status` (última versión en 057),
  `get_platform_stats` (022, `interval '7 days'`) y `getGracePeriodDays()` (`utils/license.ts`).
- **Prueba de 7 días**: constante `TRIAL_DAYS` en `supabase/functions/self-signup/index.ts`.
- **Bloqueo en dos capas**: RLS de escritura con `org_license_usable` (027, 033, 037, 061) y
  `components/license-gate.tsx` en el layout del panel. Tras el margen el bloqueo es **total**
  (decisión D-10), no solo lectura como en LensSpace. Eso no se toca.
- **Cobro actual**: el admin edita las dos fechas en `OrganizationEditSheet` (ficha de la
  organización). El dueño ve en Suscripción un botón de WhatsApp a soporte.
- **Solo el admin toca la licencia**: el trigger `enforce_module_change_is_admin` (048) rechaza
  cambios de un dueño en `license_*`, `subscription_*`, `is_active` y los módulos.
- **Google Play sigue conectado**: `apply_revenuecat_event` (072) extiende `license_end_date` con
  `GREATEST`. El landing anuncia 9,99 USD/mes y 79,99 USD/año por ese canal.
- **Profesionales** = filas de `staff_members` con `is_active = true`. Los crea y reactiva el dueño
  desde `services/staff.service.ts` (`create`, `reactivate`). No hay ningún tope hoy.
- **WhatsApp de plataforma**: `self-signup` ya manda un aviso al admin con `ADMIN_NOTIFY_PHONE` y
  `ADMIN_NOTIFY_SESSION_ID` (secretos de las edge functions) y `_shared/openwa.ts`.
- **Crons**: `pg_cron` + `pg_net` llaman a una edge function con la clave de servicio guardada en
  `app_config` (025). Las funciones validan con `isServiceRole` (`_shared/auth.ts`).
- **Static export**: sin API routes. Las acciones del admin son RPC llamadas desde el navegador,
  con la comprobación de admin dentro de la función.

### Qué se porta de LensSpace y qué se adapta

| LensSpace | Turno Flash |
|-----------|-------------|
| `license-pricing.ts`: lista de precios, meses cobrados/cubiertos, `nextPaymentPreview` | Igual, con los planes de Turno Flash. Un solo archivo de precios que usan el admin, Suscripción y el landing |
| `record_subscription_payment`: `covered_from = greatest(expires_on + 1, today - gracia)`; «pending» empieza hoy | Igual. El importe sale del plan del negocio, no de un contrato |
| Contrato firmado obligatorio antes de cobrar, proforma, bucket | **No se porta** |
| Precio fundador con fecha de fin de bloqueo y precio posterior | Igual: fecha «fundador hasta» en el negocio; después aplica la lista |
| Recomendación: 10 días, 15 si el que recomienda tiene fundador vigente; una vez; acumulable | Igual (ver decisión A-5 sobre si es automática) |
| Estados `pending / trial / active / expired / suspended` + triggers de guarda | `pending / trial / paid`; «suspendido» ya existe como `is_active = false` |
| Tras el margen: solo lectura | Bloqueo total (D-10), sin cambios |
| `subscription_notices` con `notice_key` único + cron diario + edge function | Igual, con el patrón de cron y de OpenWA de Turno Flash |
| Banner web que se cierra hasta el día siguiente (localStorage) | Igual, sobre el aviso de licencia que ya existe |
| Sin libro de pagos (usa auditoría de plataforma) | **Libro de pagos propio**: Turno Flash no tiene auditoría de plataforma, y hace falta saber si un negocio pagó alguna vez |
| Fechas `date` | Las cuentas se hacen en días de calendario de Cuba; `license_end_date` sigue siendo `timestamptz` |

### Referencias

- `../lensspace/src/features/admin/license-pricing.ts` — lista de precios y vista previa del pago.
- `../lensspace/supabase/migrations/20261011212452_pending_start_and_fair_payment.sql` — cobro
  justo, estado «pending» y triggers de guarda (versión final).
- `../lensspace/supabase/migrations/20261011210800_subscription_grace_and_notices.sql` — tabla de
  avisos, calendario de envíos y cron.
- `../lensspace/supabase/migrations/20261011203634_trial_only_at_onboarding.sql` — prueba solo al alta.
- `../lensspace/supabase/functions/send-subscription-notice/index.ts` — envío de un aviso.
- `../lensspace/src/shared/components/SubscriptionBanner.tsx` — aviso web diario.
- `../lensspace/src/features/admin/components/SubscriptionActions.tsx` — «Registrar pago» con vista previa.
- `../lensspace/src/features/landing/components/PricingSection.tsx` — sección de precios.
- `../lensspace/supabase/tests/{trial_and_paid_subscriptions,pending_start_and_fair_payment,subscription_grace_and_notices}.sql`
  — casos de prueba a traducir.
- `supabase/migrations/067_license_days_rounding.sql` — `check_license_status` vigente.
- `supabase/migrations/027_enforce_license_on_writes.sql` — `org_license_usable`.
- `supabase/migrations/057_org_contact_for_customers.sql` — última versión de la vista con `o.*`.
- `supabase/migrations/048_security_hardening.sql` — `is_platform_admin()` y el trigger que protege
  las columnas de licencia.
- `supabase/migrations/072_revenuecat_sandbox_and_greatest.sql` — convivencia con Google Play.
- `supabase/migrations/025_enable_cron_jobs.sql` — patrón de cron hacia una edge function.
- `supabase/functions/self-signup/index.ts` — registro, prueba y aviso al admin.
- `supabase/functions/_shared/{openwa,auth}.ts` — envío y control de quién llama.
- `components/license-gate.tsx`, `components/license-notification.tsx`, `hooks/useLicense.ts`,
  `utils/license.ts` — bloqueo y avisos en el cliente.
- `app/(app)/dashboard/subscription/page.tsx` — Suscripción del dueño.
- `app/(app)/dashboard/organizations/details/page.tsx` (788 líneas) y
  `components/organizations/` — ficha del negocio para el admin.
- `app/(app)/dashboard/organizations/new/page.tsx` — alta de un negocio por el admin.
- `app/(app)/dashboard/platform/page.tsx` — estadísticas de licencias.
- `services/staff.service.ts`, `app/(app)/dashboard/staff/page.tsx` — alta y reactivación de profesionales.
- `app/(app)/home-client.tsx` (líneas 208-241, 255-257, 292, 648-712) — precios y preguntas del landing.
- `app/(app)/register/page.tsx` — copy de la prueba.
- `docs/user-manual/turno-flash-user-manual.html` — «Suscripción y licencia» (7 días en 4 sitios).
- `.claude/memory/project/license-enforcement.md` — historia y decisiones del bloqueo.

### Arquitectura Propuesta (estructura real del proyecto, sin `src/`)

```
config/license-pricing.ts            # nuevo: precios, periodos, topes, vista previa del pago
schemas/license.schema.ts            # nuevo: Zod del formulario «Registrar pago»
services/license.service.ts          # nuevo: RPC de pago, historial, avisos, recomendados
hooks/useLicenseBilling.query.ts     # nuevo: queries y mutaciones del admin
components/organizations/
├── LicensePlanCard.tsx              # nuevo: plan, fase, fundador, recomendado por
├── RecordPaymentSheet.tsx           # nuevo: periodo + vista previa + nota
└── LicensePaymentsCard.tsx          # nuevo: historial de pagos y avisos enviados
components/license-notification.tsx  # se adapta: aviso diario que se puede cerrar
components/license-gate.tsx          # se adapta: texto de «En preparación»
utils/license.ts                     # se adapta: margen 5, fases nuevas
supabase/migrations/073+             # nuevo: columnas, tablas, RPC, triggers, cron
supabase/functions/license-notices/  # nuevo: envío de avisos por WhatsApp
supabase/functions/self-signup/      # se adapta: 15 días, plan, fase «trial»
```

La ficha del negocio ya pasa de 500 líneas: todo lo nuevo va en componentes aparte y solo se monta ahí.

### Modelo de Datos (orientativo; el SQL definitivo se escribe en la fase 1)

```sql
-- Plan y fase del negocio. license_start_date / license_end_date siguen siendo
-- la única fuente de la fecha de vencimiento (más de 50 usos dependen de ellas).
ALTER TABLE public.organizations
  ADD COLUMN license_plan TEXT NOT NULL DEFAULT 'personal'
    CHECK (license_plan IN ('personal', 'salon', 'salon_large', 'trips')),
  ADD COLUMN license_phase TEXT NOT NULL DEFAULT 'trial'
    CHECK (license_phase IN ('pending', 'trial', 'paid')),
  ADD COLUMN billing_period TEXT
    CHECK (billing_period IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  ADD COLUMN founder_price_until DATE,
  ADD COLUMN referred_by_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN referral_credit_applied_at TIMESTAMPTZ;

-- Libro de pagos: una fila por pago registrado. El importe queda congelado,
-- así un cambio de precios no altera lo ya cobrado.
CREATE TABLE public.license_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount_usd NUMERIC(10,2) NOT NULL CHECK (amount_usd >= 0),
  license_plan TEXT NOT NULL,
  second_module BOOLEAN NOT NULL DEFAULT false,
  billing_period TEXT NOT NULL,
  founder_price BOOLEAN NOT NULL DEFAULT false,
  covered_from DATE NOT NULL,
  covered_until DATE NOT NULL,
  note TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.license_payments ENABLE ROW LEVEL SECURITY;   -- solo admin de plataforma

-- Avisos de licencia: notice_key único hace que el proceso diario no repita envíos.
CREATE TABLE public.license_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notice_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN
    ('owner_reminder', 'owner_due', 'owner_grace', 'owner_blocked', 'admin_due', 'admin_blocked')),
  recipient TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'sent', 'failed')),
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.license_notices ENABLE ROW LEVEL SECURITY;    -- solo admin de plataforma
```

Funciones previstas: `license_grace_days()` (devuelve 5, única fuente), `record_license_payment(...)`
(admin; cobro justo, fundador y recomendación en una sola transacción), `run_license_notices()`
(proceso diario), un trigger de guarda de fases (prueba solo al alta, «pending» sin retorno) y un
trigger de tope de profesionales sobre `staff_members`.

---

## Blueprint (Assembly Line)

> IMPORTANTE: solo FASES. Las subtareas se generan al entrar a cada fase con el bucle agéntico
> (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Plan y fase de licencia en la base
**Objetivo**: cada negocio tiene plan, fase, periodo, marca de fundador y recomendador; existe el
libro de pagos; el margen es de 5 días desde una única fuente; «En preparación» existe como estado
bloqueado con su propio mensaje; las fases están protegidas por triggers; los negocios existentes
quedan con plan y fase asignados sin mover sus fechas.
**Validación**: script SQL de casos ensayado en `BEGIN/ROLLBACK` por rol (admin, dueño, empleado,
servicio): un dueño no cambia plan ni fase; nadie vuelve a «trial» ni a «pending»; un negocio que
vencía en 6 días de margen ahora se bloquea al sexto; la vista y `get_my_organization_license_status`
devuelven los campos nuevos; `npx tsc --noEmit` pasa con los tipos regenerados.

### Fase 2: Lista de precios y «Registrar pago»
**Objetivo**: la lista de precios vive en un solo archivo y la base cobra con las mismas reglas:
importe por plan, segundo módulo, periodo (anual ×10), precio fundador con su fecha de fin, cobro
justo y días de recomendación, todo en una transacción y con su fila en el libro de pagos.
**Validación**: los cuatro casos de cobro justo de los criterios de éxito más fundador antes y después
de los 24 meses, anual, segundo módulo y recomendación (10 y 15 días, una sola vez) pasan en SQL; la
vista previa en TypeScript devuelve el mismo importe y las mismas fechas que la base para cada caso.

### Fase 3: Alta de negocios — prueba de 15 días y «En preparación»
**Objetivo**: el registro crea el negocio en prueba de 15 días con su plan; el alta por el admin
permite elegir «con prueba» o «en preparación» y el plan; ya no se pueden crear negocios con acceso
ilimitado por descuido; los textos de registro dicen 15 días.
**Validación**: un registro real sobre un negocio desechable `qa-fixture-*` queda en prueba con 15
días; un alta del admin sin prueba queda «En preparación» y el dueño ve la pantalla que lo explica;
su primer pago lo activa desde ese día.

### Fase 4: Límite de profesionales por plan
**Objetivo**: la base rechaza el profesional que supera el tope del plan (al crear y al reactivar) y
la pantalla de Profesionales lo explica antes de que el dueño lo intente, con el camino para cambiar
de plan.
**Validación**: en un negocio Personal, crear o reactivar un segundo profesional falla por API y por
pantalla con el mensaje correcto; al pasarlo el admin a Salón, entra; en Salón, el sexto falla. Los
negocios existentes no quedan con profesionales bloqueados (ver decisión A-6).

### Fase 5: Ficha del negocio para el admin
**Objetivo**: desde la ficha de un negocio el admin ve plan, fase, vencimiento, fin del margen y
precio; cambia el plan; marca fundador y «recomendado por»; registra un pago con vista previa; y
consulta el historial de pagos, los avisos enviados y los negocios que ese negocio recomendó. La
edición manual de fechas queda como recurso excepcional, no como forma de cobrar. Plataforma cuenta
«en margen» con 5 días y distingue prueba de pago.
**Validación**: Playwright con un admin sobre un negocio desechable: registrar un pago trimestral,
ver el importe y las fechas, confirmar, y comprobar que la ficha, el historial y la fecha de
vencimiento coinciden. Capturas a 390 px y escritorio.

### Fase 6: Suscripción y avisos en la web para el dueño
**Objetivo**: el dueño ve en Suscripción su plan, lo que paga, hasta cuándo tiene acceso, cómo pagar
y cómo ganar días recomendando; el aviso de licencia sigue el calendario nuevo (desde 2 días antes
hasta el último día de margen), se puede cerrar hasta el día siguiente, y la pantalla de bloqueo
distingue «venció» de «en preparación». El empleado solo ve el bloqueo.
**Validación**: Playwright con dueño y empleado en cada estado (prueba, 2 días antes, vence hoy, en
margen, bloqueado, en preparación) moviendo la fecha de un negocio desechable; el aviso cerrado no
vuelve hasta el día siguiente.

### Fase 7: Avisos diarios por WhatsApp
**Objetivo**: un proceso diario genera los avisos del día para dueños y admin sin repetirlos, los
envía por el WhatsApp de la plataforma y deja registro de cada uno, visible en la ficha del negocio.
**Validación**: el proceso corrido dos veces el mismo día sobre negocios desechables en cada tramo
genera una sola fila por aviso; un negocio sin teléfono queda como «sin teléfono» y no rompe el
resto; un envío real a los teléfonos de prueba (+5352564206) llega con el texto correcto; un negocio
«en preparación» o sin vencimiento no genera nada.

### Fase 8: Manual, guía y memoria
**Objetivo**: el manual de usuario (`docs/user-manual/`), los textos de ayuda y la memoria del
proyecto describen planes, 15 días de prueba, 5 de margen, avisos y cómo pagar.
**Validación**: ninguna mención a «7 días» de prueba o de gracia en app, manual ni memoria; `/help`
se construye y muestra la sección nueva.

### Fase 9: Sección de precios del landing
**Objetivo**: el landing muestra los cuatro planes, el segundo módulo, el selector de periodo con el
ahorro del anual y las condiciones (15 días de prueba, 5 días de margen, pago en USD), leyendo los
precios del mismo archivo que usa el cobro. La pregunta «¿Cuánto cuesta?» y el texto de registro
quedan al día. Va al final, con todo lo anterior cerrado.
**Validación**: Playwright a 320, 390 y 1280 px en claro y oscuro; los importes del landing son los
de `config/license-pricing.ts`; no queda ninguna mención a 9,99, 79,99 ni Google Play como forma de pago.

### Fase 10: Validación Final
**Objetivo**: sistema funcionando de punta a punta.
**Validación**:
- [ ] `npx tsc --noEmit` pasa
- [ ] `npx eslint .` sin errores nuevos
- [ ] `npm run build:next` exitoso
- [ ] Recorrido completo con Playwright: registro → prueba → avisos → margen → bloqueo → pago → activo
- [ ] `get_advisors` de Supabase sin avisos nuevos de seguridad
- [ ] Todos los criterios de éxito cumplidos

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.

### 2026-10-11: La fase de la licencia se decide con un trigger, no con una función de alta
- **Error**: el diseño inicial pedía una función para iniciar la prueba; habría roto el registro ya desplegado (inserta con fechas) y la app vieja de Play.
- **Fix**: `guard_organization_license` (073) deduce la fase: nacer con fechas, o recibirlas en el primer día, es «prueba»; sin fechas es «en preparación». Nada más entra en prueba ni vuelve a preparación.
- **Aplicar en**: cualquier cambio de reglas de alta: debe seguir funcionando con el `self-signup` y la APK anteriores.

### 2026-10-11: La vista previa del pago la calcula la base
- **Error**: el PRP pedía duplicar el cálculo de fechas en TypeScript y compararlo con SQL.
- **Fix**: `license_payment_quote` (074) es la vista previa y `record_license_payment` cobra con esa misma función. `config/license-pricing.ts` solo muestra la lista.
- **Aplicar en**: importes o fechas que el admin confirma: previsualizar con la misma función que guarda.

### 2026-10-11: `check_license_status` conserva la firma e ignora el parámetro de gracia
- **Error**: cambiar la firma obligaba a recrear la vista, `org_license_usable` y todas las políticas de escritura.
- **Fix**: mismo `CREATE OR REPLACE`; el margen sale de `license_grace_days()` y el parámetro queda solo por compatibilidad. La vista se reemplaza en sitio con las columnas nuevas al final.
- **Aplicar en**: funciones de las que cuelgan políticas RLS.

### 2026-10-11: OpenWA informa el 500 en el cuerpo
- **Error**: `sendText` devuelve como `code` el texto de `raw.error`, no `HTTP_500`.
- **Fix**: `license-notices` mira también `details.statusCode === 500` para marcar «enviado sin confirmar».
- **Aplicar en**: cualquier función nueva que decida si reintentar un envío.

### 2026-10-11: Scripts de edición por heredoc
- **Error**: cuatro scripts de edición escritos con heredoc de Bash fallaron (comillas sin cerrar, barras colapsadas).
- **Fix**: escribir el script con Write en el scratchpad y ejecutarlo desde ahí.
- **Aplicar en**: toda edición por script en Windows.

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] **La vista `organizations_with_license_status` usa `o.*`**: congela las columnas al crearse.
      Cada `ADD COLUMN` en `organizations` obliga a recrearla en la misma migración, con
      `security_invoker = true` y sus `REVOKE/GRANT` (reglas de la 040, 048 y 057). Si no, se rompe el build.
- [ ] **Añadir un valor a un enum** (`license_status`) y usarlo no puede ir en la misma transacción:
      va en una migración aparte, o se evita el enum guardando la fase en una columna de texto.
- [ ] **Cambiar lo que devuelve `check_license_status`** exige `DROP FUNCTION`, y de ella cuelgan la
      vista, `org_license_usable` (y de esta, todas las políticas de escritura de 027/033/037/061) y
      `get_my_organization_license_status`. Preferir añadir funciones nuevas antes que cambiar esa firma.
- [ ] **Copiar siempre la definición viva** antes de un `CREATE OR REPLACE` (como en 059 y 072): las
      migraciones viejas no son necesariamente lo que hay en producción. No pude consultar la base en
      esta sesión (el conector de Supabase pide autorización); el estado se leyó de las migraciones 001-072.
- [ ] **El trigger `enforce_module_change_is_admin` (048) enumera columnas una por una**: hay que
      sumar las nuevas (`license_plan`, `license_phase`, `billing_period`, `founder_price_until`,
      `referred_by_organization_id`, `referral_credit_applied_at`) o un dueño podrá cambiarlas por API.
- [ ] **`no_license` (fechas vacías) hoy es acceso ilimitado.** La cuenta de revisión de Google Play
      (`scripts/create-review-account.mjs`) y quizá algún negocio dependen de eso. Decidir qué pasa
      con ellos antes de cerrar ese camino (decisión A-7).
- [ ] **`service_role` omite RLS y los triggers que miran `auth.uid()`**: `self-signup` y el webhook de
      RevenueCat escriben la licencia así. El trigger de fases debe dejar pasar el alta del registro
      y nada más.
- [ ] **Google Play sigue vivo**: `apply_revenuecat_event` extiende `license_end_date` sin pasar por
      el libro de pagos. Hay que decidir qué fase deja (hoy no toca ninguna) para que un negocio que
      compre por Play no se quede «en prueba» ni «en preparación» (decisión A-8).
- [ ] **El dueño no tiene teléfono propio en la base**: `user_profiles` no tiene columna de teléfono.
      El aviso va a `organizations.whatsapp_phone`, que casi ningún negocio real tiene cargado. Sin
      número, el aviso queda registrado como «sin teléfono» y el admin lo ve.
- [ ] **OpenWA responde HTTP 500 y entrega igual**: no reintentar nunca un aviso (duplicaría). Un 500
      se registra como «sin confirmar», no como fallo de entrega.
- [ ] **Una función nueva que mande WhatsApp usa `isServiceRole`** de `_shared/auth.ts`, que acepta
      tanto el JWT de `app_config` como la clave `sb_secret_...` del entorno. Desplegar edge functions
      **se pregunta antes** a Roberto; aplicar migraciones no.
- [ ] **Fechas**: LensSpace usa `date`; aquí `license_end_date` es `timestamptz`. Las cuentas de
      días (margen, cobro justo, «vence hoy») se hacen en días de calendario de `America/Havana`, y
      los mensajes de días ya salen de `check_license_status`: no rearmarlos en el cliente.
- [ ] **RLS rechaza en silencio** (0 filas, sin error): toda escritura nueva pide `.select("id")` y
      falla si no vuelve nada. El tope de profesionales debe dar un error legible, no un «no pasó nada».
- [ ] **El cobro justo aplica también a los 6 negocios vencidos hace más de 100 días**: su primer
      pago empezaría 5 días antes de hoy. Es la regla portada; confirmar que se quiere así (decisión A-9).
- [ ] **`useLicense` es una query compartida** (`refetchOnWindowFocus: "always"`, clave `["license", org]`):
      tras registrar un pago hay que invalidarla, y lo nuevo que deba verse sin señal se agrega a
      `PERSISTED_ROOTS`.
- [ ] **Sin tests ni CI en el repo**: la red de seguridad son los scripts SQL en `BEGIN/ROLLBACK` y
      Playwright sobre un negocio desechable `qa-fixture-*` creado y borrado en la misma prueba.
      Nunca probar sobre negocios reales.
- [ ] **Heredocs largos rompen los scripts en Windows**: escribir el SQL de prueba con Write y ejecutarlo.

## Anti-Patrones

- NO portar el contrato firmado, la proforma ni el bucket de LensSpace: no se pidieron.
- NO duplicar la lista de precios: admin, Suscripción y landing leen `config/license-pricing.ts`, y
  la base cobra con las mismas reglas, verificadas caso por caso en la fase 2.
- NO dejar el margen de 5 días escrito a mano en varios sitios, como pasó con el 7.
- NO calcular el importe ni las fechas en el navegador para guardarlas: el navegador solo previsualiza.
- NO cambiar el bloqueo total por solo lectura (D-10 está decidido).
- NO tocar `create_organization_with_owner` añadiendo parámetros (dejaría ambiguas las llamadas
  viejas; `self-signup` ya lo evita con un `UPDATE` posterior).
- NO meter consultas nuevas dentro de la ficha del negocio: van a `services/license.service.ts`.
- NO refactorizar de paso la ficha del negocio, el aviso de licencia ni el landing.
- NO añadir dependencias nuevas.
- NO publicar el landing hasta cerrar las fases 1 a 8.

---

## Decisiones abiertas (responder aquí con «R:»)

Lo que sigue son supuestos que tomé para poder escribir el plan. Los marcados **(bloquea)** hay que
contestarlos antes de empezar la fase indicada.

- **A-1 · ¿Quién elige el plan?** Supuesto: al registrarse, un negocio de turnos nace en **Personal**
  y uno de pasajes en **Pasajes**; cuando necesita más profesionales, escribe a soporte y el admin lo
  pasa a Salón o Salón grande. Alternativa: que el dueño elija el plan en el registro. **(bloquea fase 3)**
  R: (Roberto, 2026-10-11) **Lo elige el dueño** al registrarse, entre Personal, Salón, Salón grande o
  Pasajes. El supuesto queda descartado; el admin puede cambiarlo después desde la ficha del negocio.
- **A-2 · Segundo módulo con precio fundador.** ¿Un fundador con Turnos y Pasajes paga +3 por el
  segundo módulo (por ejemplo Salón fundador 6 + 3 = 9), o el segundo módulo también tiene descuento?
  Supuesto: +3 siempre. **(bloquea fase 2)**
  R: (Roberto, 2026-10-11) Confirmado: **+3 siempre**, también para fundadores.
- **A-3 · Negocio con los dos módulos.** Supuesto: paga el plan de turnos según su tamaño más 3 por
  Pasajes (Personal 8, Salón 13, Salón grande 18). **(bloquea fase 2)**
  R: (Roberto, 2026-10-11) Confirmado: plan de turnos + 3 (Personal 8, Salón 13, Salón grande 18).
- **A-4 · ¿Quién es fundador?** Supuesto: lo marca el admin a mano en la ficha del negocio antes del
  primer pago, sin cupo ni fecha límite automáticos, y los 24 meses cuentan desde ese primer pago.
  R:
- **A-5 · Recomendaciones.** (a) ¿Cómo se sabe quién recomendó? Supuesto: el admin lo anota en la
  ficha del negocio recomendado. Alternativa: campo «¿Quién te recomendó?» en el registro.
  (b) ¿Los días se suman solos al registrar el primer pago del recomendado, o el admin los aplica con
  un botón como en LensSpace? Supuesto: solos, y se muestran en la confirmación del pago.
  R:
- **A-6 · Negocios que ya existen.** Supuesto: se les asigna plan por sus profesionales activos de
  hoy (1 → Personal, 2 a 5 → Salón, más de 5 → Salón grande; solo pasajes → Pasajes), conservan su
  fecha de vencimiento y quedan como «prueba» los que nunca pagaron. ¿Alguno debe ser fundador desde ya?
  **(bloquea fase 1)**
  R: (Roberto, 2026-10-11) «Olvidémonos de los existentes, tengo en un plan free por 15 días pero
  realmente son todos de prueba, no deben tener actividad realmente». Interpretación de Claude: los
  negocios actuales son de prueba y no necesitan trato especial; reciben plan por tamaño y **15 días de
  prueba desde el día del cambio**, ninguno es fundador. Esto también responde A-9 para ellos: no hay
  caso especial para los vencidos hace mucho.
- **A-7 · Negocios sin fecha de vencimiento (acceso ilimitado).** ¿Se conserva ese modo solo para la
  cuenta de revisión de Google Play y las de prueba, o desaparece del todo? Supuesto: se conserva
  para las que ya lo tienen y el admin deja de poder crearlo por descuido.
  R:
- **A-8 · Google Play.** Los planes nuevos no coinciden con los productos de Play (9,99 y 79,99).
  Supuesto: no se toca el código de Play, se quita del landing y de la pregunta «¿Cuánto cuesta?», y
  una compra por Play deja el negocio como «pago». ¿O prefieres ocultar también la compra dentro de la app?
  R:
- **A-9 · Negocios bloqueados hace mucho.** Con el cobro justo, un negocio vencido hace 100 días que
  paga hoy empieza su periodo 5 días atrás (se le cobran los 5 de margen que usó). ¿Así, o a los que
  ya están vencidos al estrenar el sistema se les empieza a contar desde el día que paguen?
  R:
- **A-10 · Cambio de plan a mitad de periodo.** Supuesto: el plan nuevo se aplica al instante (el
  tope de profesionales cambia ya) y el precio nuevo se cobra desde el siguiente pago, sin prorrateo.
  R:
- **A-11 · Importe distinto al de la lista.** ¿El admin puede escribir otro importe al registrar un
  pago (acuerdos especiales), o siempre es el calculado? Supuesto: siempre el calculado.
  R:
- **A-12 · Hora del aviso diario.** Supuesto: una vez al día a las 10:00 de Cuba, y los avisos al
  admin van al número que ya recibe los registros nuevos.
  R:
- **A-13 · Plan Pasajes y profesionales.** Supuesto: un negocio solo de pasajes no tiene tope de
  profesionales (no usa esa sección). Si además tiene Turnos, manda el tope de su plan de turnos.
  R:

- **A-14 · Teléfono del dueño.** Hoy no se guarda, y los avisos de cobro no tendrían adónde llegar.
  R: (Roberto, 2026-10-11) «Necesitamos guardar el teléfono con WhatsApp del dueño». Se pide como dato
  **obligatorio en el registro** y se puede editar después; los avisos de cobro van a ese número.

Roberto aprobó el plan el 2026-10-11. Las decisiones sin «R:» (A-4, A-5, A-7 a A-13) se ejecutan con el
supuesto escrito: se le presentaron en el chat y no las cambió.

---

## Cierre (2026-10-11)

**Hecho y verificado**
- Migraciones 073-077 aplicadas, cada una ensayada antes en `BEGIN/ROLLBACK` con dueño, admin y anónimo.
- Cobro justo, fundador (antes y después de los 24 meses), anual, segundo módulo y recomendaciones (10 y 15 días, una sola vez): probados en SQL.
- Tope de profesionales: probado en SQL y en pantalla.
- Avisos diarios: 11 avisos correctos en la primera corrida y 0 en la segunda; sin teléfono queda «sin WhatsApp».
- En navegador, sobre un negocio `qa-fixture` ya borrado: Suscripción del dueño (390 px), aviso de tope en Profesionales, «Registrar pago» trimestral del admin (vista previa = lo guardado) y landing a 1280 y 320 px en claro y oscuro.
- `npx tsc --noEmit` y `npm run build:next` pasan; `npx eslint` sin errores en los archivos tocados.

**Sin hacer o sin verificar**
- Las funciones se desplegaron después, con permiso de Roberto, y se probaron con un registro desechable (plan, prueba de 15 días y WhatsApp del dueño guardados; `license-notices` rechaza a anónimos y responde bien al rol de servicio).
- Todavía no ha salido ningún aviso real por WhatsApp: el primero será el 24/10/2026, dos días antes de que venzan las pruebas actuales.
- No se probaron en navegador el aviso web en cada tramo, la pantalla «En preparación» ni el alta de un negocio por el admin.
- `get_advisors` no se pudo consultar (conector de Supabase sin autorizar).
- Los Términos y la Política de privacidad siguen hablando de Google Play como forma de pago: son texto legal y no se tocaron.
- El landing no anuncia el precio fundador.
- La compra por Google Play sigue visible dentro de la app Android (decisión A-8).

*PRP aprobado e implementado el 2026-10-11.*
