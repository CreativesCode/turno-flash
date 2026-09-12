# PRP-001: Reserva online pública

> **Estado**: IMPLEMENTADO (2026-09-10). En produccion: migraciones 029-031, edge function
> `public-booking`, `wa-send`/`wa-inbound` redesplegadas. Pendiente: prueba manual del dashboard con login.
> **Fecha**: 2026-09-10
> **Proyecto**: Turno Flash

---

## Objetivo

Cada negocio puede activar una página pública de reservas (un link para compartir) donde un cliente
final, sin cuenta, elige servicio, profesional (o "Sin preferencia"), día y horario libre, deja sus
datos y obtiene un turno que aparece al instante en el dashboard del negocio, `confirmed` o `pending`
según el servicio.

## Por Qué

| Problema | Solución |
|----------|----------|
| Hoy todos los turnos los carga el negocio a mano (source `admin`): cada reserva cuesta un mensaje o una llamada | El cliente se agenda solo, 24/7, desde un link |
| `staff_availability` existe pero está vacía y nada la usa: el sistema no sabe cuándo trabaja cada profesional (`checkAvailability` tiene un `TODO`) | UI para que el dueño cargue el horario semanal de cada profesional; el motor de horarios libres lo usa |
| El dueño no tiene nada que compartir en Instagram/WhatsApp para captar clientes | Toggle en Ajustes + link copiable/compartible |

**Valor de negocio**: es la feature que más acerca el producto a la competencia (Calendly/Booksy) y la
palanca de activación que el estado actual pide (7 orgs, adopción > escala). Cada reserva online es
trabajo que el negocio deja de hacer; además dispara el flujo WhatsApp ya existente sin costo extra.

## Qué

### Criterios de Éxito
- [ ] Un owner carga el horario semanal de un profesional en `/dashboard/staff` y al recargar sigue ahí (filas en `staff_availability`).
- [ ] Un owner activa la página en `/dashboard/settings`, copia el link, y un navegador **sin sesión** abre la página con los servicios y profesionales del negocio.
- [ ] Solo se ofrecen horarios dentro del horario del profesional, sin solape con turnos activos, respetando anticipación mínima/máxima del servicio y la zona horaria de la organización.
- [ ] Reservar crea un turno con `source = 'web'`, estado `pending` si `services.requires_approval` y `confirmed` si no; el cliente se reutiliza por teléfono o se crea.
- [ ] Dos reservas simultáneas al mismo horario/profesional: exactamente una gana, la otra recibe "ese horario ya no está disponible" (garantizado en Postgres, no en el cliente).
- [ ] "Sin preferencia" asigna el primer profesional libre (orden `sort_order`).
- [ ] Con la página desactivada, la licencia vencida (`org_license_usable = false`) o un slug inexistente, la página muestra "no disponible" y el endpoint rechaza reservas.
- [ ] Ninguna tabla gana políticas RLS para `anon`.

### Comportamiento Esperado (Happy Path)

1. **Dueño, una vez:** en Profesionales abre "Horario" de cada profesional y marca, por día, uno o más
   tramos (ej. Lun-Vie 09:00-13:00 y 15:00-19:00). En Ajustes activa "Página de reservas online",
   ve el link `https://<sitio>/book?b=<slug>` y lo copia o comparte por WhatsApp.
2. **Cliente:** abre el link → ve nombre del negocio y servicios reservables (duración y precio) →
   elige servicio → elige profesional o "Sin preferencia" → elige día (dentro de la ventana permitida)
   → ve los horarios libres → elige uno → completa nombre, apellido, teléfono (obligatorio), email y
   nota (opcionales) → confirma.
3. **Sistema:** la edge function `public-booking` valida todo, llama al RPC atómico, se crea/reutiliza
   el cliente y se inserta el turno. El trigger existente dispara WhatsApp (confirmación al cliente +
   aviso al negocio) si el negocio tiene WhatsApp conectado. El turno aparece en el dashboard por Realtime.
4. **Cliente ve:** "Turno confirmado" o "Solicitud recibida: el negocio te confirmará", según el servicio.

---

## Contexto

### Restricciones (dadas por el usuario, verificadas en el código)

- **Static export** (`next.config.ts` → `output: "export"`): sin API routes, sin middleware, sin rutas
  dinámicas nuevas. La página pública es **una ruta estática `/book`** y el negocio viaja por query
  param (`?b=<slug>`), mismo patrón que `app/dashboard/organizations/details/page.tsx`
  (`useSearchParams` + `Suspense`). El `/book/[slug]` que mencionan los docs viejos **no** aplica.
- **Sin RLS para anon.** Toda lectura/escritura pública pasa por una edge function con `service_role`.
- **`service_role` omite RLS**, incluido el guard de licencia de la migración 027: hay que llamar a
  `public.org_license_usable(org_id)` a mano (ya tiene `GRANT EXECUTE` a `service_role`).
- **Trigger WhatsApp** `trg_wa_send_on_appointment_insert` (migración 016) ya dispara `confirm` +
  `notify_business_new` en cada INSERT de `appointments`: no hay que enviar nada a mano.

### Referencias (código existente)

- `supabase/functions/self-signup/index.ts` — patrón de **edge function pública** (anon key en
  `Authorization` + `apikey`, CORS, `service_role` adentro, `json()` helper). Invocada con `fetch` desde
  `app/register/page.tsx`. `verify_jwt` queda por defecto (igual que self-signup).
- `supabase/migrations/010_appointment_system.sql` — tablas `services` (`requires_approval`,
  `duration_minutes`, `buffer_time_minutes`, `min_advance_booking_hours`, `max_advance_booking_days`,
  `available_for_online_booking`), `staff_members` (`is_active`, `is_bookable`,
  `accepts_online_bookings`, `sort_order`), `staff_availability` (`day_of_week` 0=Domingo,
  `start_time`, `end_time`, `is_available`, `effective_from/until`), `business_settings`
  (`booking_page_enabled`, `slot_duration_minutes`, `booking_page_url`), enum `appointment_source`
  (incluye `'web'`), trigger `set_appointment_number`.
- `supabase/migrations/027_enforce_license_on_writes.sql` — `org_license_usable`; la política de
  escritura de `staff_availability` ya exige owner/admin + licencia usable.
- `supabase/migrations/016_fix_wa_trigger_pgnet.sql` — trigger de WhatsApp en INSERT.
- `supabase/functions/wa-send/index.ts` (~l.416) — texto del intent `confirm`.
- `services/appointments.service.ts` — `create()` (regla `requires_approval` → `pending`) y
  `checkAvailability()` (solape con estados activos; `TODO` de horario del staff).
- `app/dashboard/settings/page.tsx` + `hooks/useBusinessSettings.query.ts` — `SettingRow`/`Toggle`,
  draft local + upsert por `organization_id`.
- `app/dashboard/staff/page.tsx`, `components/staff/StaffCard.tsx`, `services/staff.service.ts`,
  `hooks/useStaff.query.ts` — donde cuelga la UI de horario.
- `components/ui/` — `Sheet`, `Field`, `Button`, `Card`, `ConfirmSheet`, `KebabMenu`.
- `utils/metadata.ts` (`getSiteUrl`) — dominio web para armar el link (en la app nativa `window.location` no sirve).

### Arquitectura Propuesta (estructura real de Turno Flash, sin `src/features/`)

```
supabase/
├── migrations/029_public_booking.sql        # funciones SQL de slots + reserva atómica
└── functions/public-booking/index.ts        # único endpoint público (acciones: info | slots | book)

app/book/page.tsx                            # página pública estática (?b=<slug>), fuera de ProtectedRoute
components/booking/                          # pasos del flujo público (servicio, profesional, día/hora, datos, éxito)
components/staff/StaffScheduleSheet.tsx      # editor de horario semanal por profesional

services/staff-availability.service.ts       # CRUD de staff_availability (dashboard, con RLS normal)
services/public-booking.service.ts           # cliente fetch de la edge function (página pública)
hooks/useStaffAvailability.query.ts          # TanStack Query sobre el service
hooks/usePublicBooking.query.ts              # info/slots/book de la página pública
schemas/staff-availability.schema.ts         # tramos válidos (start < end, sin solape por día)
schemas/public-booking.schema.ts             # datos del cliente (compartido form + edge function)

app/dashboard/settings/page.tsx              # + toggle booking_page_enabled + link copiar/compartir
hooks/useBusinessSettings.query.ts           # + booking_page_enabled en select/patch
```

**Decisión clave — dónde vive la lógica de horarios:** en **Postgres**, no en TypeScript.
- `public_booking_slots(...)` calcula los horarios libres y `create_public_booking(...)` re-verifica y
  reserva **usando la misma función helper** (`is_staff_slot_free`). Una sola fuente de verdad: lo que
  la página muestra y lo que la base acepta no pueden divergir.
- `create_public_booking` toma `pg_advisory_xact_lock` por (profesional, fecha) antes de re-verificar
  e insertar → la carrera de dos reservas simultáneas se resuelve en la base.
- La edge function es una capa HTTP delgada: resuelve slug → org, chequea `booking_page_enabled` y
  `org_license_usable`, valida el input con Zod y llama a los RPC.

### Modelo de Datos

No hay tablas nuevas. Todo existe desde la migración 010; se agregan funciones.

```sql
-- 029_public_booking.sql (esbozo; el detalle se mapea en la Fase 1)

-- Helper: el tramo [start, end) cae dentro de un tramo de staff_availability de ese día
-- (is_available, vigencia effective_from/until) y no solapa turnos activos del profesional
-- (pending, confirmed, reminded, client_confirmed, checked_in, in_progress).
CREATE FUNCTION public.is_staff_slot_free(p_staff_id UUID, p_date DATE,
  p_start TIME, p_end TIME) RETURNS BOOLEAN ...;

-- Horarios libres para un servicio y día (p_staff_id NULL = cualquier profesional reservable).
-- Paso = business_settings.slot_duration_minutes (default 30); duración = duration_minutes
-- + buffer_time_minutes; filtra por min_advance_booking_hours / max_advance_booking_days
-- calculados en organizations.timezone.
CREATE FUNCTION public.public_booking_slots(p_org_id UUID, p_service_id UUID,
  p_staff_id UUID, p_date DATE) RETURNS TABLE (start_time TIME, staff_id UUID) ...;

-- Reserva atómica: lock, re-verificación, cliente por (org, teléfono) o nuevo, INSERT del turno
-- con source 'web', status según requires_approval, timezone de la org. Si p_staff_id es NULL,
-- asigna el primer profesional libre por sort_order. Devuelve jsonb {success, appointment_id,
-- status, appointment_number} o {success:false, error}.
CREATE FUNCTION public.create_public_booking(p_org_id UUID, p_service_id UUID,
  p_staff_id UUID, p_date DATE, p_start TIME, p_first_name TEXT, p_last_name TEXT,
  p_phone TEXT, p_email TEXT, p_notes TEXT) RETURNS JSONB ...;

-- Todas: SECURITY DEFINER, SET search_path = public,
-- REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role.
-- Índice no único customers(organization_id, phone) si no existe (búsqueda del cliente).
```

`staff_availability` ya tiene RLS (lectura: miembros de la org; escritura: owner/admin con licencia
usable). No se agregan políticas.

### Supuestos a confirmar con el usuario (producto)

1. **Profesional sin horario cargado = no aparece en la reserva online.** (Alternativa: "siempre
   disponible", peligroso: ofrecería horas a las 3 AM.)
2. **Servicios por profesional** (el usuario rechazó "todos hacen todo"): el dueño asigna qué servicios
   hace cada profesional sobre `staff_services` (existe desde 010, sin uso; `UNIQUE(staff_id, service_id)`,
   RLS de escritura owner/admin + licencia). **Estricto:** un profesional sin servicios asignados no se
   ofrece para ningún servicio, igual que sin horario. `proficiency_level` no se usa en v1.
3. **Cliente que ya existe (mismo teléfono en ese negocio) se reutiliza**; no se sobrescriben sus datos.
4. **El cliente no cancela desde la página** en v1: cancela respondiendo CANCELAR por WhatsApp (ya existe).
5. **Anti-abuso v1:** máximo 3 turnos futuros activos por teléfono y negocio + campo trampa
   (honeypot) en el formulario; sin captcha.
6. **Vacaciones y días libres entran en v1** (el usuario lo pidió al aprobar): se usa `staff_exceptions`
   (existe desde 010, sin UI). `staff_id` NULL = cierre de todo el negocio (feriado). Las excepciones
   recurrentes (`is_recurring`) quedan fuera de v1.

Supuestos 1-5 aprobados tal cual.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo se definen FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Motor de disponibilidad y reserva en Postgres
**Objetivo**: migración `029_public_booking.sql` con `is_staff_slot_free`, `public_booking_slots` y
`create_public_booking` (atómica, solo `service_role`), aplicada con `supabase db push` y tipos regenerados.
`is_staff_slot_free` también descarta tramos que se solapan con `staff_exceptions` del profesional o del
negocio (`staff_id` NULL). `public_booking_slots` y `create_public_booking` solo consideran profesionales
con fila en `staff_services` para ese servicio (también en "Sin preferencia").
**Validación**: con SQL de prueba sobre una org de demo: los slots respetan horario, solapes,
anticipación y timezone; dos `create_public_booking` al mismo slot → uno falla; `anon`/`authenticated`
no pueden ejecutar las funciones; `get_advisors` sin alertas nuevas.

### Fase 2: Edge function `public-booking`
**Objetivo**: endpoint público con acciones `info` (negocio + servicios + profesionales reservables),
`slots` y `book`; resuelve slug, exige `booking_page_enabled` y `org_license_usable`, valida con Zod,
aplica el límite anti-abuso y no expone datos internos (sin emails/teléfonos del staff, sin ids de clientes).
**Validación**: `curl` con anon key contra cada acción: happy path, slug inexistente, página
desactivada, licencia vencida, input inválido y horario tomado devuelven el código/mensaje esperado.

### Fase 3: Horario semanal y servicios por profesional (dashboard)
**Objetivo**: owner/admin elige qué servicios hace cada profesional (`staff_services`) y edita los tramos
por día de cada profesional desde `/dashboard/staff`
(sheet `StaffScheduleSheet`), con service + hook + schema siguiendo las convenciones; staff lo ve en solo lectura.
**Validación**: Playwright: cargar horario, recargar, persiste; tramos inválidos (fin antes que inicio,
solapados) se rechazan con mensaje; con licencia vencida la escritura falla (RLS 027).

### Fase 4: Días libres y vacaciones por profesional
**Objetivo**: owner/admin carga períodos no disponibles (vacaciones, día libre, trámite) por profesional
desde el mismo sheet del horario, y cierres de todo el negocio (feriados, `staff_id` NULL), sobre
`staff_exceptions` con service + hook + schema; los tramos se descuentan en `public_booking_slots`.
**Validación**: vacaciones de un profesional → esos días no ofrecen horarios; un feriado del negocio
bloquea a todos; al borrar la excepción los horarios vuelven.

### Fase 5: Activación y link en Ajustes
**Objetivo**: toggle "Página de reservas online" en `/dashboard/settings` (upsert de
`booking_page_enabled`), link `getSiteUrl()/book?b=<slug>` con copiar y compartir por WhatsApp, y aviso
de qué profesionales todavía no tienen horario o servicios asignados (no aparecerán en la página).
**Validación**: Playwright: activar → recargar → sigue activo; el link copiado abre la página correcta.

### Fase 6: Página pública `/book`
**Objetivo**: flujo mobile-first sin sesión (servicio → profesional/"Sin preferencia" → día → hora →
datos → éxito diferenciado confirmed/pending), estados vacíos y de error ("no disponible", "sin
horarios ese día", "ese horario acaba de ocuparse, elegí otro"), con el sistema de diseño existente.
**Validación**: Playwright en contexto sin sesión y a 390px: reserva completa end-to-end; el turno
aparece en `/dashboard/appointments` con `source = web` y el estado correcto.

### Fase 7: Mensaje de WhatsApp coherente con `pending`
**Objetivo**: el intent `confirm` de `wa-send` usa un texto de "solicitud recibida, el negocio te
confirmará" cuando el turno está `pending` (hoy dice "está reservado, confirmá con OK"), y se verifica
qué hace `wa-inbound` si el cliente responde OK a un turno pendiente.
**Validación**: turno `pending` creado desde la página → el mensaje encolado en `wa_outbound_messages`
tiene el texto de solicitud; un turno `confirmed` sigue con el texto actual.

### Fase 8: Validación Final
**Objetivo**: sistema funcionando end-to-end
**Validación**:
- [ ] `npx tsc --noEmit` pasa
- [ ] `npx eslint` sin errores nuevos en los archivos tocados
- [ ] `npm run build:next` exitoso (static export genera `out/book/index.html`)
- [ ] Playwright: dueño configura horario + activa página; cliente anónimo reserva; turno visible en dashboard
- [ ] Todos los Criterios de Éxito cumplidos
- [ ] Memoria actualizada (`estado-actual-2026-09.md`: reserva online implementada como `/book?b=`)

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

### 2026-09-10: Probar SQL contra producción sin dejar rastro
- **Error**: no hay Docker corriendo (sin base local) y el MCP de Supabase no tiene token.
- **Fix**: `supabase db query --linked -f archivo.sql` con `begin;` + la migración + un bloque `DO` que termina en
  `RAISE EXCEPTION 'TEST_RESULTS:%'`. El error revierte todo (verificado con una tabla sonda); los resultados
  viajan en el mensaje. La cola de `pg_net` también se revierte, así que no sale ningún WhatsApp.
- **Aplicar en**: cualquier migración futura de este proyecto.

### 2026-09-10: El trigger prevent_role_org_change bloquea tests
- **Error**: un test movía el perfil de un owner real a la org de prueba; el trigger lo impide (solo admins).
- **Fix**: crear el staff/servicio temporales dentro de la org real del owner, en la misma transacción revertida.
- **Aplicar en**: tests de RLS que necesiten un usuario real.

### 2026-09-10: Escapes que se pierden al generar TS desde la shell en Windows
- **Error**: un `"
"` terminó como salto de línea real dentro de un string de `wa-send` (error de sintaxis que se
  habría desplegado a la función que manda WhatsApp). Antes, heredocs de Bash con comillas simples fallaron.
- **Fix**: escribir archivos con la herramienta Write o con scripts que insertan caracteres por código, y chequear
  la sintaxis de las edge functions con `typescript.transpileModule` antes de desplegar (no hay Deno instalado).
- **Aplicar en**: todo deploy de edge functions.

### 2026-09-10: Migración 028 aplicada a mano
- **Error**: `public.ping()` existía en la base pero la 028 no figuraba en el historial; `db push` la iba a aplicar.
- **Fix**: como es idempotente se dejó que `db push` la registrara. Correr `supabase migration list --linked` antes
  de cada push para ver qué se va a aplicar.

### 2026-09-10: Un "OK" por WhatsApp aprobaba turnos pendientes
- **Error**: `wa-inbound` pasaba cualquier turno no cancelado a `client_confirmed`, incluidos los `pending`: el cliente
  se autoaprobaba, y el mensaje de confirmación le pedía justamente responder OK.
- **Fix**: con `pending` solo se registra `client_confirmed_at`; `wa-send` usa texto de "solicitud recibida".
- **Aplicar en**: cualquier flujo nuevo que cambie estados desde mensajes del cliente.

---

## Gotchas

- [ ] **Timezone**: `appointments.appointment_date/start_time` son fecha y hora locales sin zona.
      "Ahora" para la anticipación mínima debe calcularse en `organizations.timezone`, no en UTC ni en
      la zona del navegador del cliente. Guardar `appointments.timezone` = timezone de la org
      (`AppointmentsService.create` usa la del navegador: no copiar ese patrón).
- [ ] **`day_of_week`**: 0 = Domingo (igual que `EXTRACT(DOW)` de Postgres y `Date.getDay()`). No usar ISO (1 = Lunes).
- [ ] **Solape**: usar `[start, end)` y la misma lista de estados activos que `checkAvailability`;
      la duración ocupada incluye `buffer_time_minutes`.
- [ ] **`generate_appointment_number`** usa `MAX()+1`: dos INSERT concurrentes de una org pueden
      repetir número. El advisory lock es por profesional; evaluar si conviene lock por org para el INSERT.
- [ ] **No hay UNIQUE en `customers(organization_id, phone)`** y puede haber duplicados históricos:
      buscar por teléfono normalizado y tomar uno (el más reciente), no agregar UNIQUE en esta PRP.
- [ ] **`business_settings` puede no existir** para la org (solo 1 de 7 la tiene): defaults
      (`booking_page_enabled = false`, `slot_duration_minutes = 30`) cuando falta la fila; el toggle usa upsert.
- [ ] **`verify_jwt`**: la función se invoca con la anon key como self-signup. Si el proyecto pasa a
      claves `sb_publishable_` (no JWT), habrá que poner `verify_jwt = false` en `config.toml`.
- [ ] **Capacitor**: `/book` también entra en el bundle nativo (inofensivo), pero el link compartido
      debe usar `getSiteUrl()`, nunca `window.location.origin` (en la app es `https://localhost`).
- [ ] **`org_license_usable`** hay que llamarlo en `info` y en `book` (service_role omite la RLS de 027).
- [ ] **El trigger de WhatsApp** usa `SECURITY DEFINER` y no rompe el INSERT si falla: la reserva no
      depende de que WhatsApp funcione.
- [ ] **Datos expuestos**: la acción `info` es pública; devolver solo nombre/nickname/foto/color del
      staff y nombre/duración/precio/descripción del servicio.

- [ ] **`schedule_exception_type`**: `time_off`, `holiday` y `blocked` bloquean; `special_hours`
      se ignora en v1 (agrega horas en vez de quitarlas).
- [ ] **Prefijo del slug en la UI**: Nueva organización y Editar muestran `turnoflash.com/` delante del
      slug; alinearlo con el link real (`/book?b=`) al terminar.

## Anti-Patrones

- NO crear API routes, route handlers, middleware ni `app/book/[slug]` (rompe el static export).
- NO agregar políticas RLS para `anon`; todo lo público pasa por la edge function.
- NO calcular disponibilidad solo en el cliente o solo en TypeScript: la base es la autoridad.
- NO confiar en el `status` que mande el cliente: se decide en el RPC con `requires_approval`.
- NO enviar WhatsApp desde la edge function (el trigger ya lo hace; duplicaría mensajes).
- NO poner queries de Supabase en componentes (usar `services/` + hooks `.query`).
- NO introducir dependencias nuevas (calendarios, date pickers): `date-fns` + primitivas de `components/ui/`.
- NO omitir validación Zod en inputs de usuario (formulario y edge function).

---

*PRP aprobado el 2026-09-10. Implementación con bucle-agentico, fase por fase.*
