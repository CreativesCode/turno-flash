# PRP-002: Módulo de reserva de asientos (viajes en guagua)

> **Estado**: APROBADO — decisiones cerradas 2026-09-11, listo para `bucle-agentico`
> **Fecha**: 2026-09-11
> **Proyecto**: Turno Flash

---

## Objetivo

Un módulo **aparte** del motor de turnos, activable por negocio, donde el dueño publica **salidas**
(fecha, hora, descripción del viaje, plazas y precio) y un cliente final reserva **N asientos** desde
una página pública sin cuenta, dejando una **seña**; el negocio ve la lista de pasajeros por salida y
las plazas se descuentan sin posibilidad de sobreventa.

## Por Qué

| Problema | Solución |
|----------|----------|
| El motor actual es *1 reserva = 1 hueco exclusivo en la agenda de un profesional*. Un negocio de guaguas vende 55 asientos de la misma salida: hoy eso es imposible sin romper peluquerías y clínicas | Tablas y RPC propios (`trips` / `trip_bookings`) al lado de `appointments`, sin tocar `is_staff_slot_free` ni `create_public_booking` |
| Las salidas se coordinan hoy por WhatsApp y una libreta: nadie sabe en tiempo real cuántas plazas quedan y se sobrevende | Capacidad en la base, reserva atómica bajo lock: dos clientes por la última plaza → uno gana, el otro ve "quedan 0" |
| El negocio pierde el viaje cuando la gente no aparece y no dejó nada | Seña por asiento: la plaza queda retenida y se libera sola si la seña no llega a tiempo |
| El chofer no tiene lista de quién sube | Lista de pasajeros por salida (nombre, teléfono, asientos, seña) desde el dashboard |

**Valor de negocio**: abre un vertical nuevo (excursiones / transporte) con el mismo producto,
misma licencia y mismo WhatsApp. El caso "alquilar la guagua entera" ya funciona hoy (guagua =
profesional, viaje = servicio); esto cubre el caso 2, el que hoy hace perder ventas.

## Qué

### Criterios de Éxito

- [ ] **Un negocio puede tener Turnos, Viajes o los dos.** Se elige al registrarse y solo un
      administrador de plataforma puede cambiarlo después: ni la UI ni la API permiten que un owner
      se active un módulo (probado llamando al update directo, no solo por pantalla).
- [ ] Las 7 organizaciones existentes quedan con Turnos activo y Viajes apagado, sin intervención.
- [ ] La navegación muestra Turnos y/o Viajes según los módulos del negocio; un negocio solo-viajes
      no ve Turnos, Clientes y Servicios siguen visibles para ambos.
- [ ] Con el módulo desactivado (default), **nada cambia** para los negocios actuales: no aparece
      navegación nueva, `/trips?b=<slug>` responde "no disponible" y el motor de turnos sigue igual
      (los criterios de PRP-001 siguen pasando).
- [ ] Un owner activa "Reserva de asientos" en Ajustes, crea una salida (fecha, hora, descripción,
      plazas, precio, seña) y la ve publicada en su link público.
- [ ] Un navegador **sin sesión** abre el link, ve las próximas salidas con plazas libres reales,
      elige una, elige cantidad de asientos, deja sus datos y recibe la confirmación con las
      instrucciones para pagar la seña.
- [ ] **Sin sobreventa**: dos reservas simultáneas por las últimas plazas → exactamente una entra;
      la otra recibe "ya no quedan plazas suficientes" (garantizado en Postgres, no en el cliente).
- [ ] El cliente se reutiliza por teléfono normalizado (`booking_phone_key`) o se crea, igual que
      en la reserva online de turnos.
- [ ] **La confirmación y el pago son dos cosas distintas**: marcar la seña como cobrada no aprueba
      la reserva, y aprobarla no da el dinero por recibido. Cada salida decide si sus reservas hay
      que aprobarlas (como `services.requires_approval`) o entran confirmadas solas.
- [ ] La lista de pasajeros de una salida se **exporta a CSV** con `downloadCsv` (`utils/csv.ts`) y
      se imprime para el chofer.
- [ ] Los listados de viajes del dashboard se actualizan **en vivo** (Realtime), igual que los de
      turnos: si entra una reserva desde la web, la salida abierta en otra pantalla lo refleja sola.
- [ ] Las páginas públicas (`/book` y `/trips`) **refrescan la disponibilidad solas** mientras el
      cliente decide, sin abrir ninguna policy de `anon` (ver Gotcha de Realtime).
- [ ] La lista del chofer es **nominal**: cada reserva web trae un nombre por asiento y la salida
      se puede exportar/imprimir con todos los pasajeros y el teléfono de quien reservó.
- [ ] El owner ve la lista de pasajeros de cada salida, marca la seña como cobrada (la reserva pasa
      a `confirmed`) y puede cancelar una reserva: las plazas vuelven al instante.
- [ ] Una reserva con seña impaga vence sola a las N horas y libera las plazas (cron), y eso queda
      visible en el dashboard.
- [ ] Con la licencia vencida (`org_license_usable = false`) o el módulo apagado, la página pública
      rechaza reservas y el dashboard no deja escribir.
- [ ] Ninguna tabla nueva tiene políticas RLS para `anon`.

### Comportamiento Esperado (Happy Path)

1. **Al registrarse:** el dueño elige qué hace su negocio — Turnos, Viajes o ambos — y la
   organización nace con esos módulos. Si más adelante quiere sumar el otro, lo pide y un
   administrador de plataforma se lo activa desde la ficha de la organización.
2. **Dueño, una vez:** con el módulo de Viajes activo, en Ajustes publica su página, escribe las
   instrucciones de pago de la seña (transferencia/Bizum/efectivo) y copia el link
   `https://<sitio>/trips?b=<slug>`.
3. **Dueño, por salida:** en "Viajes" crea la salida: título ("Excursión a la playa"), descripción
   (ruta, qué incluye), fecha, hora de salida, punto de encuentro, plazas totales, precio por
   asiento, seña por asiento y **si las reservas de esa salida hay que aprobarlas o entran
   confirmadas solas**. Puede duplicarla para los próximos días de un tirón.
4. **Cliente:** abre el link → ve las próximas salidas con plazas libres → elige una → elige cuántos
   asientos → nombre, apellido, teléfono (obligatorio), email y nota (opcionales) → **escribe el
   nombre de cada pasajero** (el primero viene pre-rellenado con el suyo) → confirma.
5. **Sistema:** la edge function `public-trips` valida, llama al RPC atómico: lock por salida,
   re-verifica plazas, crea/reutiliza el cliente e inserta la reserva. Nace **`pending` si la salida
   pide aprobación y `confirmed` si no** —igual que un turno— y **por separado** la seña nace
   pendiente con su `hold_expires_at`. WhatsApp avisa al cliente (cómo pagar la seña) y al negocio.
6. **Cliente ve:** el mensaje que corresponda a su caso — "Reserva confirmada" o "Tu solicitud quedó
   a la espera de que el negocio la apruebe" — y, en los dos casos, "tienes hasta las HH:MM del DD/MM
   para enviar la seña de $X: <instrucciones>".
7. **Dueño:** son **dos acciones distintas y sin relación entre sí**. Cuando recibe el dinero marca
   "Seña cobrada" (solo cambia el estado del pago). Si la salida pedía aprobación, además "Aprobar"
   (solo cambia el estado de la reserva). Cada una avisa al cliente por WhatsApp. Si la seña no llega
   antes del vencimiento, el cron cancela la reserva y libera las plazas, esté aprobada o no.
8. **Día del viaje:** el dueño abre la salida, ve la lista nominal de pasajeros con el teléfono de
   quien reservó, el estado de la reserva y el de la seña, y **la exporta** (CSV para la planilla o
   impresión para el chofer).

---

## Contexto

### Restricciones (verificadas en el código, no asumidas)

- **Static export** (`next.config.ts` → `output: "export"`): sin API routes, sin middleware, sin
  rutas dinámicas. La página pública es **estática** y el negocio viaja por query param
  (`/trips?b=<slug>`), igual que `/book?b=<slug>`. La ficha de una salida en el dashboard también
  va por query param (`/dashboard/trips/details?id=<uuid>`), patrón de
  `app/dashboard/organizations/details/page.tsx`.
- **Sin RLS para `anon`**: todo lo público pasa por una edge function con `service_role`.
- **`service_role` omite RLS**, incluido el guard de licencia de la 027: hay que llamar a
  `public.org_license_usable(org_id)` a mano dentro de los RPC públicos.
- **No tocar el motor de turnos.** `is_staff_slot_free`, `public_booking_slots` y
  `create_public_booking` (migración 029) quedan intactos. Esto es un módulo al lado.
- **`wa-send` es appointment-céntrico**: carga `appointments_with_details` por `appointmentId`.
  No sirve para viajes sin deformarlo → edge function propia.

### Referencias (código existente)

- `.claude/memory/project/modulo-reserva-asientos.md` — la idea aprobada, qué se reutiliza y qué es nuevo.
- `.claude/PRPs/prp-public-booking.md` (PRP-001) — el patrón completo que este PRP copia: página
  estática + edge function + lógica en Postgres.
- `supabase/migrations/029_public_booking.sql` — `booking_phone_key` (teléfono normalizado, misma
  regla que `phoneToChatId`), `public_booking_org_open` (opt-in + `is_active` + licencia),
  `pg_advisory_xact_lock(hashtextextended('public_booking:' || org_id, 0))`, `SECURITY DEFINER` +
  `SET search_path = public` + `REVOKE ... FROM PUBLIC, anon, authenticated` + `GRANT ... TO service_role`.
- `supabase/functions/public-booking/index.ts` — edge function pública: anon key en `Authorization`
  + `apikey`, CORS, `service_role` adentro, Zod con `discriminatedUnion("action")`, honeypot
  `website`, mapa `ERROR_MESSAGES` código → mensaje en español.
- `supabase/functions/self-signup/index.ts` — el otro precedente de función pública.
- `supabase/migrations/010_appointment_system.sql` — `customers` (teléfono + `phone_country_code`,
  sin UNIQUE), `business_settings` (columna por feature, fila opcional por org), enum
  `appointment_source` (reutilizable: `web` / `admin` / `whatsapp` / `phone` / `walk_in`).
- `supabase/migrations/027_enforce_license_on_writes.sql` — patrón exacto de política de escritura
  con `org_license_usable`, a copiar para las tablas nuevas.
- `supabase/migrations/014_whatsapp_integration.sql` + `016` + `032` — `wa_outbound_messages`
  (`appointment_id` es NULLABLE; índice de idempotencia por `appointment_id, intent`), enum
  `wa_outbound_intent`, y el patrón trigger → `pg_net` → edge function que **no rompe** la
  operación si WhatsApp falla.
- `supabase/migrations/025_enable_cron_jobs.sql` — `cron.schedule` para el vencimiento de señas.
- `services/appointments.service.ts`, `hooks/useAppointments.query.ts`,
  `components/appointments/`, `components/ui/` (`Sheet`, `Field`, `Card`, `ConfirmSheet`,
  `KebabMenu`, `StatusBadge`) — convenciones de dashboard a seguir tal cual.
- `components/Sidebar.tsx` (`NAV_ITEMS` con `roles` y `requiresOrg`), `MobileTabBar`, `Drawer` —
  dónde se engancha la entrada "Viajes".
- `utils/metadata.ts` (`getSiteUrl`) — para armar el link público (en la app nativa
  `window.location` es `https://localhost`).
- `utils/format.ts` (`fmtMoney`), `app/globals.css` (tokens `st-*` / `mesh-*`).

### Arquitectura Propuesta (estructura real de Turno Flash, sin `src/features/`)

```
supabase/
├── migrations/033_seat_booking.sql       # tablas trips + trip_bookings, RLS, RPCs atómicos
├── migrations/034_wa_trip_intents.sql    # ALTER TYPE de intents + columna trip_booking_id + trigger
└── functions/
    ├── public-trips/index.ts             # endpoint público (acciones: info | book)
    └── wa-trip-send/index.ts             # WhatsApp de viajes (no toca wa-send)

app/trips/page.tsx                        # página pública estática (?b=<slug>), fuera de ProtectedRoute
app/dashboard/trips/page.tsx              # lista de salidas del negocio
app/dashboard/trips/details/page.tsx      # ficha de salida + lista de pasajeros (?id=<uuid>)

components/trips/                         # TripCard, TripFormSheet, TripBookingSheet, PassengerList...
components/public-trips/                  # pasos del flujo público (salida → asientos → datos → éxito)

services/trips.service.ts                 # CRUD de salidas (dashboard, RLS normal)
services/trip-bookings.service.ts         # reservas: crear a mano, cobrar seña, cancelar
services/public-trips.service.ts          # cliente fetch de la edge function
hooks/useTrips.query.ts  hooks/useTripBookings.query.ts  hooks/usePublicTrips.query.ts
schemas/trip.schema.ts  schemas/trip-booking.schema.ts
types/public-trips.ts

app/dashboard/settings/page.tsx           # + toggle del módulo + instrucciones de seña + link
components/Sidebar.tsx / MobileTabBar.tsx # + "Viajes" (solo si el módulo está activo)
```

**Decisiones clave de arquitectura**

1. **Módulo paralelo, no extensión del turno.** Una reserva de asientos no es un `appointment`:
   no tiene profesional, no bloquea agenda y es N a 1 contra la salida. Meter capacidad en
   `appointments` obligaría a tocar el motor que hoy funciona (Comportamiento 3: quirúrgico).
2. **La capacidad se calcula, no se denormaliza.** `trips.total_seats` menos `SUM(seats)` de las
   reservas vivas. Un contador `seats_taken` se desincroniza con cada cancelación/vencimiento y
   obliga a triggers en tres caminos; el `SUM` con índice parcial es exacto y barato a esta escala
   (7 orgs, decenas de reservas).
3. **La anti-sobreventa vive en Postgres**, igual que la anti-doble-reserva de PRP-001:
   `pg_advisory_xact_lock` por salida → recontar → insertar, todo en la misma transacción.
4. **La seña v1 es offline** (ver Decisión Abierta 1): la reserva nace `pending` con
   `deposit_status = 'pending'` y `hold_expires_at`; el dueño la marca cobrada. Cero dependencias
   nuevas, cero costo, y la pasarela puede entrar después sin cambiar el modelo (solo se agrega
   quién marca `deposit_status = 'paid'`).
5. **Opt-in por negocio** con una columna en `business_settings`, como `booking_page_enabled`.
   Default `false`: los 7 negocios actuales no ven nada nuevo.

### Modelo de Datos

```sql
-- 033_seat_booking.sql (esbozo; el detalle se mapea en la Fase 1)

-- EJE 1 — la plaza: ¿el negocio acepta a este pasajero?
CREATE TYPE trip_booking_status AS ENUM (
  'pending',     -- esperando que el negocio la apruebe (solo si trips.requires_approval)
  'confirmed',   -- aceptada; NO dice nada sobre si pagó
  'cancelled',   -- cancelada por el cliente, el negocio o por vencimiento (libera plazas)
  'completed',   -- viajó
  'no_show'      -- no se presentó (NO libera plazas: la salida ya ocurrió)
);

-- EJE 2 — el dinero: ¿llegó la seña? Se mueve por su cuenta, sin tocar el eje 1.
CREATE TYPE trip_deposit_status AS ENUM ('pending', 'paid', 'refunded', 'waived');

-- Una fila = una SALIDA concreta (no una plantilla de ruta).
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,                       -- ruta, qué incluye
  pickup_location TEXT,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  return_time TIME,                       -- opcional, mismo día (ver Decisión Abierta 3)
  timezone TEXT NOT NULL,                 -- copia de organizations.timezone al crear
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  max_seats_per_booking INTEGER NOT NULL DEFAULT 8 CHECK (max_seats_per_booking > 0),
  price_per_seat DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposit_per_seat DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Mismo patrón que services.requires_approval (migración 010): lo elige el negocio
  -- por salida. true = la reserva nace 'pending' y hay que aprobarla; false = 'confirmed'.
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_published BOOLEAN NOT NULL DEFAULT true,   -- visible en la página pública
  cancelled_at TIMESTAMPTZ,               -- salida cancelada por el negocio
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (deposit_per_seat <= price_per_seat OR price_per_seat = 0)
);
CREATE INDEX idx_trips_org_date ON public.trips(organization_id, departure_date);

CREATE TABLE public.trip_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_number TEXT,
  seats INTEGER NOT NULL CHECK (seats > 0),
  passenger_names TEXT[] NOT NULL DEFAULT '{}',   -- lista nominal para el chofer (Decision 6)
  status trip_booking_status NOT NULL DEFAULT 'pending',
  source appointment_source NOT NULL DEFAULT 'admin',   -- se reutiliza el enum existente
  price_total DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_status trip_deposit_status NOT NULL DEFAULT 'pending',
  deposit_paid_at TIMESTAMPTZ,
  deposit_method TEXT,
  hold_expires_at TIMESTAMPTZ,            -- NULL si no hay seña
  notes TEXT,                             -- del cliente
  internal_notes TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- La reserva pública exige un nombre por asiento; el dueño puede cargar una reserva
  -- telefónica y completar los nombres después, nunca más nombres que plazas.
  CHECK (cardinality(passenger_names) <= seats)
);
-- Índice parcial: el SUM de ocupación solo mira las reservas vivas.
CREATE INDEX idx_trip_bookings_live ON public.trip_bookings(trip_id)
  WHERE status <> 'cancelled';
CREATE INDEX idx_trip_bookings_customer ON public.trip_bookings(customer_id);

-- MÓDULOS DEL NEGOCIO (qué puede usar la organización). Se elige al registrarse
-- y SOLO un administrador de plataforma puede cambiarlo después.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS appointments_module_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trips_module_enabled BOOLEAN NOT NULL DEFAULT false;
-- Un negocio sin ningún módulo no puede operar.
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_at_least_one_module
  CHECK (appointments_module_enabled OR trips_module_enabled);

-- La política de UPDATE de la 002 permite a un OWNER editar su propia organización,
-- así que sin esto un dueño podría auto-activarse un módulo por API aunque la UI no
-- se lo ofrezca. El trigger es la única barrera real.
CREATE OR REPLACE FUNCTION public.enforce_module_change_is_admin()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  IF (NEW.appointments_module_enabled IS DISTINCT FROM OLD.appointments_module_enabled
      OR NEW.trips_module_enabled IS DISTINCT FROM OLD.trips_module_enabled)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles
       WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
     )
  THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar los modulos de la organizacion';
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_module_change
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_module_change_is_admin();

-- create_organization_with_owner (026) suma un parámetro para el registro:
--   org_modules TEXT DEFAULT 'appointments'   -- 'appointments' | 'trips' | 'both'
-- Es el ÚNICO camino por el que un no-admin fija los módulos, y solo al crear la org.

-- business_settings: publicación de la página pública + datos de la seña.
-- OJO: esto NO es el módulo. Es "¿publico mi link?", y solo tiene efecto si
-- organizations.trips_module_enabled = true.
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS seat_booking_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seat_booking_hold_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS deposit_instructions TEXT;

-- Realtime para los listados del dashboard (patrón de la migración 020):
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.trip_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_bookings;
-- Realtime respeta RLS: esto solo llega a usuarios con sesión de la org. La página
-- pública NO lo usa (ver Gotcha) y no necesita ninguna policy de anon.

-- RLS (copiando el patrón de 027): SELECT para miembros de la org;
-- INSERT/UPDATE/DELETE solo owner/admin Y org_license_usable(organization_id).
-- Ninguna política para anon.

-- RPCs (SECURITY DEFINER, SET search_path = public, solo service_role):
--   trip_seats_taken(p_trip_id) -> INTEGER          (SUM de reservas vivas)
--   public_trips_info(p_slug)   -> JSONB            (negocio + salidas publicadas + plazas libres)
--   create_trip_booking(p_org_id, p_trip_id, p_seats, p_first_name, p_last_name,
--                       p_phone, p_email, p_notes, p_passenger_names TEXT[]) -> JSONB
--     valida cardinality(p_passenger_names) = p_seats (obligatorio desde la web)
--     lock por salida -> recuenta -> cliente por booking_phone_key o nuevo -> INSERT
--     status := CASE WHEN trips.requires_approval THEN 'pending' ELSE 'confirmed' END
--       (copiado de create_public_booking, migración 029 línea ~517)
--     deposit_status := CASE WHEN deposit_per_seat > 0 THEN 'pending' ELSE 'waived' END
--     {success, booking_number, status, deposit_amount, hold_expires_at} | {success:false, error}
--   release_expired_trip_holds() -> INTEGER         (cron cada 15 min)
```

**Qué NO entra en v1 (no-goals explícitos)**: que el dueño se active o desactive módulos por su
cuenta (lo hace un admin), selección de asiento concreto (mapa de butacas),
cobro online con pasarela, lista de espera, analítica de viajes en `/dashboard/reports`,
plantillas de ruta recurrente (se resuelve duplicando una salida), viajes de varios días.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo se definen FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Modelo de datos, módulos del negocio y motor de reservas en Postgres — HECHA (2026-09-11)
Migraciones aplicadas: **033** (todo el modelo), **034** (revoke de la función trigger) y **035**
(vista de licencia recreada). Verificado en la base real: sobreventa imposible, trigger de módulos
bloquea al owner y deja pasar al admin, las 7 orgs quedaron con Turnos on / Viajes off.
**Objetivo**: migración `033_seat_booking.sql` con `trips`, `trip_bookings`, columnas nuevas de
`business_settings`, RLS con guard de licencia, y los RPC `trip_seats_taken`, `public_trips_info`,
`create_trip_booking`, `release_expired_trip_holds`. Tipos regenerados.
**Validación**: SQL de prueba en transacción revertida (patrón del aprendizaje de PRP-001):
la ocupación cuadra con altas/cancelaciones; dos `create_trip_booking` concurrentes por las últimas
plazas → uno falla con `no_seats`; `anon`/`authenticated` no pueden ejecutar los RPC; un usuario de
otra org no ve ni escribe filas; con licencia vencida la escritura falla; `get_advisors` sin alertas nuevas.

### Fase 2: Edge function `public-trips` — HECHA (2026-09-11)
Desplegada y probada end-to-end contra la función real: `info` lista las salidas con plazas reales,
una reserva de 3 asientos con 3 nombres devuelve `V-0001`/`pending`/seña 30, los nombres que no
cuadran con los asientos se rechazan con 400, la sobreventa con 409 + `seats_left`, y con el módulo
apagado todo responde `booking_closed`. Datos de prueba creados y borrados; la org de prueba quedó
como estaba. Se sumaron `types/public-trips.ts` y `services/public-trips.service.ts` (cliente del
endpoint, listo para la Fase 8). Dos acciones en vez de tres: una salida es una fila fija, no hay
huecos que calcular.
**Objetivo**: endpoint público con acciones `info` (negocio + próximas salidas publicadas con plazas
libres, precio y seña) y `book`; resuelve slug, exige módulo activo + `org_license_usable`, valida
con Zod, honeypot y límite de reservas por teléfono; no expone datos internos.
**Validación**: `curl` con anon key: happy path, slug inexistente, módulo apagado, licencia vencida,
input inválido, más asientos que el máximo por reserva y salida llena devuelven el código y estado HTTP esperados.

### Fase 3: Salidas en el dashboard — HECHA (2026-09-12)
`/dashboard/trips` con el layout estándar del proyecto (header sticky, buscador, FAB móvil, estados
vacíos, grid de tarjetas), formulario en `Sheet` ancho (`sm:max-w-3xl`), Realtime enganchado y el ítem
"Viajes" en Sidebar y Drawer condicionado al módulo. **Ajustes pedidos por el usuario y aplicados:**
descripción y punto de encuentro son textarea; los inputs numéricos ya no saltan a 0 al vaciarlos
(`TripFormState` acepta `""` mientras se escribe y la página convierte al guardar).
El `MobileTabBar` queda para la Fase 6: tiene 4 pestañas fijas y hay que decidir cuál cede el lugar.
**Objetivo**: `/dashboard/trips` con alta/edición/duplicado/publicación de salidas (sheet con
react-hook-form + Zod), el switch **"Las reservas de esta salida hay que aprobarlas"**, ocupación
visible por salida (plazas libres / totales), y la entrada de navegación condicionada al módulo
activo. Los listados se enganchan a Realtime extendiendo `useRealtimeEntities` con `trips` y
`trip_bookings` → `tripKeys.all` (el hook ya se monta en `app/dashboard/layout.tsx`).
**Validación**: Playwright: crear salida, recargar, persiste; duplicar a los 5 días siguientes crea 5
salidas; fecha pasada o plazas ≤ 0 se rechazan con mensaje; con licencia vencida la escritura falla;
con la lista abierta en dos pestañas, una reserva creada en una aparece sola en la otra.

### Fase 4: Pasajeros, seña y cancelaciones — HECHA (2026-09-12)
`/dashboard/trips/details?id=` con la lista nominal, los dos ejes en columnas separadas, carga manual
de reservas, edición de nombres, export CSV (`downloadCsv`) e impresión. Migración **036**: trigger
`set_trip_booking_number`, porque 033 solo numeraba las reservas que pasan por el RPC público y una
reserva cargada a mano es un INSERT normal (mismo patrón que `set_appointment_number` de la 010).
El teléfono es obligatorio en la carga manual: `customers.phone` es NOT NULL y sin teléfono no hay
forma de avisarle al pasajero. Verificado en la base: marcar la seña no aprueba, aprobar no toca la
seña, cancelar libera asientos y el cron cancela una reserva confirmada pero impaga.
**Objetivo**: `/dashboard/trips/details?id=` con la lista **nominal** de pasajeros (un nombre por
asiento, agrupados por reserva, con teléfono de quien reservó, estado de la reserva y estado de la
seña en **columnas separadas**); alta manual de una reserva (cliente que llama o llega) con nombres
opcionales y editables después; cancelar reserva (libera plazas) y cancelar la salida entera.
Dos acciones **independientes**, cada una tocando su propio campo y nada más:
- **"Seña cobrada"** → `deposit_status = 'paid'` + `deposit_paid_at` + `deposit_method`. No aprueba.
- **"Aprobar" / "Rechazar"** → `status = 'confirmed'` / `'cancelled'`. No toca el dinero.
  Solo visible si la salida tenía `requires_approval`.
**Exportar**: botón que baja la lista en CSV con `downloadCsv` de `utils/csv.ts` (una fila por
pasajero: nombre, quién reservó, teléfono, asientos, estado, seña, monto) y vista de impresión para
el chofer.
**Validación**: Playwright: marcar la seña deja `status` intacto y solo cambia el pago; aprobar deja
la seña intacta; una reserva pagada pero no aprobada se ve como tal en la lista; cancelar devuelve las
plazas al instante; una salida llena no deja cargar más; una reserva de 3 asientos muestra sus 3
nombres y avisa si faltan; el CSV abre en Excel con todas las filas y acentos correctos.

### Fase 5: Vencimiento automático de señas
**Objetivo**: `release_expired_trip_holds()` agendada con `cron.schedule` (patrón de la 025). El
criterio es **la seña, no la aprobación**: las reservas con `deposit_status = 'pending'` y
`hold_expires_at` vencido pasan a `cancelled` con motivo `deposit_expired` y liberan plazas, estén
`pending` o `confirmed`. Las `paid` y las `waived` no se tocan nunca.
**Validación**: una reserva **confirmada pero impaga** y vencida se cancela y libera las plazas; una
`pending` con la seña `paid` sobrevive; una `waived` (salida sin seña) sobrevive; el job figura en
`cron.job`.

### Fase 6: Módulos por negocio (registro, administración y navegación) — HECHA (2026-09-12)
**Objetivo**: que un negocio pueda tener Turnos, Viajes o ambos, elegido al registrarse y cambiable
solo por un administrador.
- `/register`: selector "¿Qué hace tu negocio?" (Turnos / Viajes / Los dos) en lenguaje de negocio,
  no de módulos. **`create_organization_with_owner` (026) NO se toca** (decidido en Fase 1): sumarle un
  parámetro obligaba a una firma sobrecargada —las llamadas con los 8 argumentos viejos quedarían
  ambiguas— o a copiar sus ~130 líneas en la migración nueva, donde las dos copias se irían separando.
  En su lugar `self-signup`, que ya corre como `service_role` y ya llama a ese RPC, actualiza las dos
  columnas justo después de crear la organización. El trigger lo deja pasar porque `auth.uid()` es NULL
  para `service_role`.
- `/dashboard/organizations/details`: en la sección que ya es solo-admin (junto a licencia y
  WhatsApp), los dos switches de módulo. El owner los ve en lectura con la nota de a quién pedirlo.
- Navegación (`Sidebar`, `Drawer`, `MobileTabBar`): `isItemVisible` pasa a considerar también los
  módulos de la organización, no solo el rol. Clientes y Servicios siguen visibles para ambos módulos.
- Los ítems de Viajes dependen de `trips_module_enabled`; los de Turnos, de `appointments_module_enabled`.
**Validación**: Playwright: alta de un negocio "solo viajes" → no aparece Turnos y sí Viajes; un admin
le activa Turnos y aparecen; un owner que llama al update directo de `organizations` cambiando un
módulo recibe el error del trigger; las 7 orgs existentes siguen viendo exactamente lo de siempre.

### Fase 7: Publicación de la página y datos de la seña en Ajustes — HECHA (2026-09-12)
**Objetivo**: en `/dashboard/settings`, y **solo si el negocio tiene el módulo de Viajes**, el toggle
"Publicar página de reservas de viajes", el campo de instrucciones de pago de la seña, las horas de
retención, y el link `getSiteUrl()/trips?b=<slug>` con copiar y compartir por WhatsApp.
Son dos cosas distintas y conviene no mezclarlas: el **módulo** dice qué puede usar el negocio (lo fija
el registro o un admin); este **toggle** solo decide si su link público está abierto.
**Validación**: Playwright: activar → recargar → sigue activo y aparece "Viajes" en la navegación;
el link copiado abre la página pública correcta; desactivar oculta la navegación y cierra la página.

### Fase 8: Página pública `/trips` — HECHA (2026-09-12)
**Objetivo**: flujo mobile-first sin sesión (lista de salidas → cantidad de asientos → datos →
**un campo de nombre por asiento**, generados al cambiar la cantidad y con el primero pre-rellenado →
éxito con monto de seña, fecha límite e instrucciones), estados vacíos y de error ("no disponible",
"sin salidas próximas", "quedan N plazas"), con el sistema de diseño existente.
**Disponibilidad al día** (lo que el usuario pidió como "realtime" en las páginas de reserva): las
plazas libres se revalidan solas contra la edge function mientras el cliente decide —
`refetchInterval` con la pestaña visible, `refetchOnWindowFocus`, y un refetch antes de mostrar el
paso de confirmación— sin abrir ninguna policy de `anon` (ver Gotcha). El mismo tratamiento se aplica
a `/book`, que hoy solo refetchea al navegar entre pasos: es un cambio acotado en
`hooks/usePublicBooking.query.ts` (código de PRP-001, tocarlo solo ahí).
La página muestra también, cuando están cargados, **chofer, vehículo y la foto del ómnibus**
(`vehicle_photo_path`, público en el bucket `trip-photos`), que es lo que el pasajero usa para
reconocerlo en la parada.
**Validación**: Playwright sin sesión y a 390px: reserva completa end-to-end con 3 pasajeros; los 3
nombres llegan a la salida del dashboard con `source = web` y seña pendiente; bajar la cantidad de
asientos descarta los campos sobrantes y no deja enviar con un nombre vacío; con la página abierta,
otra reserva que agota la salida hace que las plazas bajen solas sin recargar; y si el cliente igual
llega tarde, el RPC responde "ya no quedan plazas" en vez de sobrevender.

### Fase 9: WhatsApp de viajes — HECHA (2026-09-12)
**Objetivo**: migración nueva (la 034 y la 035 ya se usaron en la Fase 1) con los nuevos valores de
`wa_outbound_intent`, la columna
`wa_outbound_messages.trip_booking_id`, trigger de alta) + edge function `wa-trip-send` con los
mensajes, **uno por eje**: reserva recibida (con instrucciones de seña y, si aplica, "queda a la
espera de aprobación"), **reserva aprobada**, **seña recibida**, aviso al negocio y recordatorio antes
de la salida. Aprobar y cobrar son eventos distintos y mandan mensajes distintos. `wa-send` no se toca.
**Validación**: reserva creada desde la página → mensaje encolado en `wa_outbound_messages` con el
intent y el texto correctos; marcar la seña encola el de confirmación; con WhatsApp apagado no se
encola nada y la reserva igual se crea.

### Fase 10: Validación Final
**Objetivo**: sistema funcionando end-to-end sin regresiones en el motor de turnos.
**Validación**:
- [ ] `npx tsc --noEmit` pasa
- [ ] `npx eslint` sin errores nuevos en los archivos tocados
- [ ] `npm run build:next` exitoso (el export genera `out/trips/index.html` y `out/dashboard/trips/`)
- [ ] Playwright: dueño activa módulo → crea salida → cliente anónimo reserva → seña marcada →
      lista de pasajeros correcta
- [ ] Regresión: la reserva online de turnos (PRP-001) sigue funcionando igual
- [ ] Todos los Criterios de Éxito cumplidos
- [ ] Memoria actualizada (`modulo-reserva-asientos.md` pasa de IDEA a implementado; `estado-actual`)

---

## Aprendizajes (Self-Annealing)

### 2026-09-11: `supabase functions deploy` se cuelga sin `--use-api`
- **Error**: `supabase functions deploy public-trips` quedó más de 10 minutos sin emitir una sola
  línea. Por defecto la CLI empaqueta la función con Docker en local.
- **Fix**: `supabase functions deploy <nombre> --use-api` (empaqueta en el servidor). Subió en segundos.
- **Aplicar en**: cualquier deploy de edge function en este proyecto, también al redeployar
  `wa-send` / `wa-inbound`.


### 2026-09-11: Una vista con `o.*` no ve las columnas nuevas
- **Error**: tras agregar las columnas de módulo a `organizations`, `npx tsc --noEmit` falló en
  `app/dashboard/organizations/details/page.tsx`: `organizations_with_license_status` no las traía.
  Postgres congela la lista de columnas de una vista al crearla, y esa vista usa `o.*`.
- **Fix**: migración 035, DROP + CREATE de la vista (no `CREATE OR REPLACE`, que no reordena
  columnas). Es exactamente lo que ya había pasado en la 023 con las columnas de suscripción.
- **Aplicar en**: cualquier `ALTER TABLE public.organizations ADD COLUMN` futuro. La vista se recrea
  en la misma tanda o el build se rompe.

### 2026-09-11: La vista devuelve todo anulable
- **Error**: al leer las columnas desde la vista llegan como `boolean | null` aunque en la tabla sean
  `NOT NULL`, y el tipo del front las espera `boolean`.
- **Fix**: normalizar en el punto de lectura con `?? true` / `?? false` usando el mismo default de la
  tabla, que es el patrón que ya seguía ese archivo para `is_active` e `is_usable`.
- **Aplicar en**: todo lo que se lea de `organizations_with_license_status`.

### 2026-09-11: `supabase db advisors` después de cada migración
- **Error**: la función trigger `enforce_module_change_is_admin()` quedó expuesta como RPC
  (`/rest/v1/rpc/...`) para `anon` y `authenticated`, porque los REVOKE se escribieron para las
  funciones "de negocio" y esta se pasó por alto. Riesgo práctico nulo (llamarla fuera de un trigger
  falla), pero es ruido y mala higiene.
- **Fix**: migración 034 con el REVOKE. El hallazgo salió de `supabase db advisors --linked --type security`.
- **Aplicar en**: correr ese comando después de cada migración que cree funciones, y filtrar por los
  nombres nuevos — el proyecto ya arrastra advisors preexistentes que son ruido de fondo.


> Esta sección CRECE con cada error encontrado durante la implementación.

*(vacía: la implementación no ha empezado)*

---

## Gotchas

### Realtime en las páginas públicas: por qué NO es Realtime
Realtime de Supabase **respeta RLS**: solo emite lo que el que escucha podría leer con un SELECT.
En las páginas públicas el visitante es `anon`, y la decisión de PRP-001 —que se mantiene— es que
`anon` **no tiene ninguna policy**: todo pasa por la edge function. Enchufar Realtime ahí obligaría a
abrir SELECT a `anon` sobre `trip_bookings` / `appointments`, que son nombres y teléfonos de clientes.
No se hace.

Lo que sí se hace, y le da al cliente la misma sensación: **revalidación automática** contra la edge
function (intervalo con la pestaña visible + al volver el foco + antes de confirmar). El contador de
plazas se mueve solo, sin exponer nada.

Y aunque la pantalla quedara desactualizada, la sobreventa sigue siendo imposible: el RPC vuelve a
contar las plazas dentro del lock antes de insertar. La revalidación es comodidad, no seguridad.

En el **dashboard** sí hay Realtime de verdad (hay sesión y RLS de la org), y el enganche ya existe:
`useRealtimeEntities` montado en `app/dashboard/layout.tsx` invalida las queryKeys de TanStack Query.
Para viajes solo hay que sumar las dos tablas nuevas a la publicación y al hook.


- [ ] **Timezone**: `departure_date` / `departure_time` son fecha y hora locales sin zona. "Ahora"
      (para ocultar salidas pasadas y calcular `hold_expires_at`) se calcula en
      `organizations.timezone`, nunca en UTC ni en la zona del navegador del cliente. Copiar
      `trips.timezone` al crear, como hace PRP-001 con `appointments.timezone`.
- [ ] **Inputs de fecha/hora**: `datetime-local` debe recibir hora **local** (`toDateTimeInput`),
      nunca `toISOString().slice(0,16)`: ese bug ya corrió fechas de licencias en producción.
- [ ] **`ALTER TYPE ... ADD VALUE`**: el valor nuevo del enum **no se puede usar en la misma
      transacción** en que se agrega. Por eso los intents de WhatsApp van en su propia migración
      (034) y el trigger los pasa como texto en el `jsonb` de `pg_net`, igual que la 032.
- [ ] **Idempotencia de WhatsApp**: el índice actual es `(appointment_id, intent, sent_at)`. Con
      `appointment_id` NULL no deduplica nada: hay que agregar `trip_booking_id` y su índice, o los
      reintentos del cron mandarán el mensaje dos veces.
- [ ] **`business_settings` puede no existir** para la org (solo 1 de 7 la tiene): defaults en el
      código (`seat_booking_enabled = false`, `hold_hours = 24`) y **upsert** por `organization_id`.
- [ ] **No hay UNIQUE en `customers(organization_id, phone)`** y hay duplicados históricos: buscar
      con `booking_phone_key` y tomar el más reciente, sin agregar UNIQUE.
- [ ] **`org_license_usable` hay que llamarlo a mano** en los RPC públicos: `service_role` omite la RLS de la 027.
- [ ] **Ocupación**: `no_show` y `completed` **no** liberan plazas; solo `cancelled`. El `SUM` y el
      índice parcial tienen que usar exactamente el mismo criterio o la página ofrecerá plazas que no existen.
- [ ] **Capacitor**: `/trips` también entra en el bundle nativo (inofensivo), pero el link que se
      comparte debe salir de `getSiteUrl()`, nunca de `window.location.origin`.
- [ ] **Navegación**: `Sidebar`, `Drawer` y `MobileTabBar` (5 slots, uno es el "+" central) son tres
      lugares distintos; el `MobileTabBar` ya está lleno: decidir si "Viajes" entra ahí o solo en el Drawer.
- [ ] **Escribir archivos con la herramienta Write**, no con heredocs de Bash en Windows: ya se
      coló un salto de línea real dentro de un string de una edge function.
- [ ] **Enum + trigger van en migraciones separadas**: Postgres no deja **usar** un valor de enum en
      la misma transacción en que se agrega. Por eso la 043 agrega los `wa_outbound_intent` y la 044
      los usa. El mismo motivo por el que la 032 no pudo hacerlo todo junto.
- [ ] **Probar triggers de WhatsApp sin mandar nada**: la cola de `pg_net`
      (`net.http_request_queue`) es una tabla, así que dentro de `BEGIN … ROLLBACK` el mensaje se
      encola y se deshace. Para leer el body encolado hace falta `convert_from(body,'UTF8')::jsonb`:
      es `bytea`, no `jsonb`.
- [ ] **Toda función SECURITY DEFINER en `public` queda publicada como RPC** por PostgREST, incluidas
      las de trigger: hay que REVOKE (034 y 045). Correr `supabase db advisors` después de cada
      migración que cree funciones.
- [ ] **Storage**: las policies de `storage.objects` se escriben en la migración como cualquier
      otra (`supabase db push` corre como `postgres` y puede). El tenant se valida con
      `(storage.foldername(name))[1]`, así que **el path tiene que empezar por el
      `organization_id`**. Un bucket `public = true` sirve los archivos sin sesión: se nota
      porque pedir un archivo inexistente devuelve `NoSuchKey` y no `NoSuchBucket`.
- [ ] **Probar SQL sin ensuciar producción**: `supabase db query --linked -f archivo.sql` con
      `begin;` + migración + bloque `DO` que termina en `RAISE EXCEPTION 'TEST_RESULTS:%'`.

## Anti-Patrones

- NO modificar `appointments`, `is_staff_slot_free`, `public_booking_slots` ni `create_public_booking`
  para meter capacidad: es el motor que hoy sostiene a las peluquerías.
- NO extender la edge function `public-booking` ni `wa-send` con lógica de viajes; funciones propias.
- NO crear API routes, route handlers, middleware ni rutas dinámicas `[id]` (rompe el static export).
- NO agregar políticas RLS para `anon`.
- NO calcular plazas libres solo en el cliente: la base es la autoridad y re-verifica bajo lock.
- NO confiar en el `status` ni en el importe que mande el cliente: se calculan en el RPC.
- NO denormalizar `seats_taken` en `trips` (se desincroniza con cancelaciones y vencimientos).
- NO introducir dependencias nuevas (pasarelas, date pickers, mapas de asientos) sin aprobación.
- NO poner queries de Supabase en componentes (usar `services/` + hooks `.query`).
- NO omitir validación Zod en inputs de usuario (formulario y edge function).

---

## Decisiones Cerradas (2026-09-11)

Las 4 primeras las respondió Roberto; las 5 restantes quedaron con la propuesta por defecto del PRP.

1. **Seña — cómo se cobra** → **Fuera de la app en v1.** El cliente reserva, la plaza queda retenida
   N horas y paga por transferencia/Bizum/efectivo según las instrucciones que escriba el negocio; el
   dueño marca "Seña cobrada". Sin pasarela, sin comisiones, sin KYC. El modelo de datos
   (`deposit_status`, `deposit_method`, `deposit_paid_at`) ya deja lugar para enchufar una pasarela
   después sin migrar nada.

2. **Asiento concreto o cantidad** → **Solo la cantidad.** Sin mapa de butacas. Es no-goal de v1.

3. **Viajes de varios días** → **No.** Fecha + hora de salida, y hora de regreso opcional el mismo día.

4. **Seña fija o porcentaje** → **Fija por asiento** (`deposit_per_seat`). *Por defecto del PRP.*

5. **Horas de retención y devoluciones** → **24 h configurable por negocio**
   (`seat_booking_hold_hours`); la política de devolución es texto libre del negocio, no se automatiza
   ninguna devolución. *Por defecto del PRP.*

6. **Nombre de cada pasajero** → **Sí, lista nominal.** Cambia respecto a la propuesta original:
   - `trip_bookings.passenger_names TEXT[]` con `CHECK (cardinality(passenger_names) <= seats)`.
   - Desde la web es **obligatorio**: el RPC valida `cardinality = seats` y la página genera un campo
     por asiento (el primero pre-rellenado con quien reserva).
   - Desde el dashboard es **opcional al crear**: el dueño carga una reserva telefónica rápido y
     completa los nombres antes del viaje. La lista del chofer avisa si faltan.

   **Why:** el usuario lo necesita para el seguro/la lista del chofer; el CHECK laxo es lo que evita
   que una carga telefónica apurada sea imposible.

7. **Turnos y viajes en el mismo negocio** → **Sí: uno, el otro o los dos.** Cada organización lleva
   sus módulos habilitados (`organizations.appointments_module_enabled` / `trips_module_enabled`, con
   un CHECK de que al menos uno esté activo). La navegación y los permisos de escritura se derivan de
   ahí, no de una config suelta.

8. **Quién elige y quién cambia los módulos** → **Se eligen al registrarse; después solo los cambia un
   administrador de plataforma.**
   - En `/register` el dueño responde qué hace su negocio (Turnos / Viajes / Los dos) y la org nace
     con esos módulos, vía `create_organization_with_owner` ampliado.
   - Después, los cambia un admin desde `/dashboard/organizations/details`, en la misma sección
     solo-admin donde ya están la licencia y WhatsApp. El dueño los ve en lectura.
   - **La UI no alcanza:** la policy de la migración 002 deja que un owner haga UPDATE de su propia
     organización, así que la barrera real es el trigger `enforce_module_change_is_admin`, que
     rechaza el cambio si quien edita no es admin activo.
   - Las 7 orgs actuales quedan con Turnos activo y Viajes apagado por el default de la columna.

   **Ojo, hallazgo aparte (no lo toco en este PRP):** esa misma policy permite hoy que un owner edite
   por API las fechas de licencia de su organización (`license_start_date` / `license_end_date`); no
   hay trigger que lo impida y la UI simplemente no lo ofrece. El trigger de módulos se puede extender
   para cubrirlas — decilo y lo sumo aquí o lo saco a su propio arreglo.

9. **Moneda** → se mantiene el patrón actual: `currency` por salida con default `'USD'`, como en
   `services`. *Por defecto del PRP.* Si más adelante molesta repetirla, se fija por organización.

10. **Confirmación y pago son ejes separados** → la reserva tiene `status` (¿el negocio acepta al
    pasajero?) y `deposit_status` (¿llegó el dinero?), y ninguno mueve al otro. Las cuatro
    combinaciones son válidas y se ven en la lista:

    | | Seña pendiente | Seña cobrada |
    |---|---|---|
    | **Sin aprobar** | recién reservada, vence si no paga | pagó, falta que el negocio la acepte |
    | **Confirmada** | tiene la plaza, debe la seña (vence igual) | todo listo |

    El vencimiento automático mira **la seña**, no la aprobación: una reserva confirmada pero impaga
    se cancela igual al vencer.

11. **¿Hay que aprobar las reservas?** → **lo decide el negocio en cada salida**
    (`trips.requires_approval`), mismo patrón que `services.requires_approval` en turnos: si está
    activo la reserva nace `pending`; si no, nace `confirmed`. Default `true`.
    *Alternativa si molesta marcarlo salida por salida:* un valor por defecto del negocio en Ajustes
    que precargue el switch. No entra en v1 por ahora; se suma con una columna.

12. **Exportar la lista de pasajeros** → **CSV con `downloadCsv` (`utils/csv.ts`)**, el helper
    client-side que ya usan los reportes, más la vista de impresión para el chofer. Una fila por
    pasajero. Sin PDF ni dependencias nuevas.

13. **Realtime** → en el **dashboard**, Realtime de verdad sumando `trips` y `trip_bookings` a la
    publicación de la 020 y al hook `useRealtimeEntities` (los listados de turnos ya funcionan así).
    En las **páginas públicas**, revalidación automática contra la edge function en vez de Realtime,
    porque Realtime respeta RLS y `anon` no tiene —ni debe tener— policies (ver Gotcha). Incluye
    llevar ese refresco también a `/book`, que hoy no lo tiene.

14. **Texto de la salida: plano, tal cual se escribe** (decidido 2026-09-12). El proyecto no tiene
    editor de texto enriquecido y no se agrega uno. La descripción y el punto de encuentro son
    textarea y se muestran respetando los saltos de línea (`whitespace-pre-line`), para que lo que el
    dueño escribe se vea igual en la web y se pueda **pegar tal cual en WhatsApp**.
    *Pendiente, pedido por el usuario para más adelante:* un botón "Compartir" que arme el texto de la
    salida listo para WhatsApp.

15. **El precio y la seña van por punto de recogida** (2026-09-12, migración 037). El mismo viaje
    se vende a distinto precio según dónde suba el pasajero. `trips.price_per_seat` queda como
    valor por defecto; si hay paradas cargadas, elegir una es obligatorio.

16. **Los cobros se registran como dinero recibido** (`amount_paid`), no como un booleano: el flujo
    real es seña por transferencia + resto en efectivo al chofer. `deposit_status` pasa a derivarse
    por trigger. Se puede cobrar la seña, el total o cualquier monto.

17. **Extras por reserva** (migración 038): descripción libre + monto que suma a lo que falta
    cobrar (aeropuerto, otro destino, equipaje).

18. **Chofer y vehículo por salida, opcionales**, y **ventana de reserva** (`booking_opens_at` /
    `booking_closes_at`, migración 039). La ventana solo limita la web: el negocio siempre puede
    cargar por teléfono. La página lista la salida cerrada con su fecha de apertura.

19. **Moneda por organización** (migración 039 + 040 para la vista). Se elige en Ajustes y todos los
    importes se formatean con `useMoney()`.

20. **Foto del vehículo por salida** (migración 041). Bucket **`trip-photos`** de Supabase Storage,
    el primero del proyecto. Decisiones: **lectura pública** (la página de reservas corre con la
    anon key y sin sesión; ahí no va nada personal), escritura solo para `admin`/`owner` de la
    organización dueña de la primera carpeta del path (`<organization_id>/<uuid>.jpg`, que ES la
    frontera de tenant), la columna guarda el **path y no la URL** (`trips.vehicle_photo_path`) para
    no congelar la URL del proyecto en miles de filas, y la foto se **achica en el navegador**
    (`utils/image.ts`, 1600px / JPEG 0.8) antes de subir: una foto de celular son 4-8 MB y el bucket
    corta en 5. Duplicar una salida **copia el archivo**, no comparte el path: si no, borrar la foto
    de una copia se la quitaba a la original.

21. **Ida y vuelta = propiedad de la RESERVA, no otra salida** (migración 042). El mismo ómnibus y
    los mismos asientos, solo cambia el precio: `trips.round_trip_enabled` + `price_round_trip`,
    `trip_pickup_points.price_round_trip` (NULL = hereda el de la salida) y
    `trip_bookings.trip_type`. La seña NO cambia: es lo que se cobra por guardar el asiento, no una
    parte del pasaje. El precio se resuelve en **un solo lugar**, la función `trip_seat_price`, que
    `create_trip_booking` llama — extraída justo para no volver a copiar esas 200 líneas en la
    próxima regla de precios. En el cliente, `seatPrice()` (types/trips.ts) aplica la misma regla.

22. **Duplicar copia también las paradas** (y la foto). Con los precios viviendo en las paradas, una
    copia sin ellas no sirve para nada.

23. **Los módulos se eligen al registrarse** con una pregunta de negocio ("¿Qué hace tu negocio?":
    turnos / asientos de viaje / las dos), y solo un admin los cambia después, desde el detalle de la
    organización (`ModulesCard`); el owner los ve en lectura. `self-signup` escribe las dos columnas
    después del RPC, como estaba decidido en la Fase 1. La `MobileTabBar` arma sus 4 slots según los
    módulos: un negocio solo-viajes no ve Turnos y el "+" lleva a Viajes.

24. **Revalidación, no Realtime, en las dos páginas públicas.** `/trips` y `/book` refrescan solas
    cada 30 s con la pestaña visible, al volver el foco, y `/trips` además **revalida antes de pedir
    los datos personales**: si la salida se llenó mientras el cliente elegía, vuelve a la lista en vez
    de dejarlo escribir todo para nada.

25. **WhatsApp de viajes: un mensaje por EVENTO** (migraciones 043 + 044, función `wa-trip-send`;
    `wa-send` no se toca). `trip_booked` (con la seña y sus instrucciones), `trip_notify_business`
    (solo para reservas web), `trip_approved` y `trip_deposit_paid` — aprobar y cobrar son ejes
    distintos y mandan mensajes distintos. Idempotencia por `(trip_booking_id, intent)`.

26. **Botón Compartir** en cada salida: arma el texto de WhatsApp (paradas con sus precios, horarios,
    seña, asientos libres y el link público) y abre `wa.me`. Es como venden estos negocios: pegando
    el viaje en sus grupos.

---

*PRP aprobado, pendiente de revisión final de Roberto. No se ha modificado código.
Implementación: skill `bucle-agentico`, fase por fase.*
