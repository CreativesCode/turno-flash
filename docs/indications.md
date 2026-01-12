# WhatsApp Booking (Next.js SPA + Capacitor + Supabase) — Template “multi-instancia”

Sistema de **reservas/turnos** para salones, barberías, clínicas y talleres, pensado para **bajo costo**, **bajo consumo de datos** y operación cómoda **desde el móvil del dueño**.

---

## Objetivo del producto

- Reducir **doble reserva**, llamadas y desorden.
- Dar al negocio:

  - **Calendario** móvil-first (día/semana) + gestión de turnos.
  - **Página pública de reservas** ultraligera.
  - Confirmaciones por **WhatsApp** (manual → semi-auto → auto).

---

## Estrategia de despliegue (low-cost real)

### ✅ Multi-instancia “sin forks”

- **Un solo repositorio template**.
- Por **cada cliente**:

  - 1 **Proyecto Supabase** (idealmente en cuenta del cliente).
  - 1 **Proyecto Vercel** (o el hosting que prefiera) con env vars apuntando a “su” Supabase.

- Beneficio: actualizas el template una vez y puedes replicar cambios sin la pesadilla de forks.

### Por qué esta estrategia

- En Supabase Free:

  - Los proyectos **se pausan tras 1 semana de inactividad** y hay **límite de 2 proyectos activos** en free. ([Supabase][1])

- En Vercel Hobby (gratis):

  - Se restringe a **uso personal/no comercial**; para clientes normalmente corresponde **Pro/Enterprise**. ([Vercel][2])

> Recomendación práctica: que **cada cliente sea owner** de su Supabase (y si aplica su Vercel). Tú quedas como colaborador.

---

## Stack

- **Frontend:** Next.js (SPA) + Tailwind (opcional)
- **App móvil (dueño):** Capacitor (iOS/Android) **sin perder la base web**
- **Backend:** Supabase

  - Postgres + RLS
  - Auth (OTP/magic link)
  - Realtime (actualizaciones instantáneas)
  - Edge Functions (webhooks y lógica sensible)
  - Storage (logo/imagen mínima)

- **WhatsApp:** 3 niveles de integración (A/B/C)

---

## Requisitos clave (no negociables)

### SPA real

- La app se comporta como **Single Page App**:

  - navegación client-side
  - render “ligero”

- Recomendado: **Static export** para minimizar costo de cómputo (sin SSR).

  - Next `output: 'export'` (cuando aplique) + hosting estático en Vercel/CDN.
  - Toda lógica sensible se mueve a **Supabase (DB/Edge Functions)**.

### Capacitor siempre

- El proyecto **siempre mantiene**:

  - carpeta `ios/` y `android/`
  - `capacitor.config.*`
  - workflow `build web → cap sync → build nativo`

- No se crea un “segundo frontend” para móvil: **un solo código**.

### “Modo bajo datos”

- Sin imágenes pesadas, sin dependencias grandes innecesarias.
- Caching agresivo (PWA) + carga incremental de slots.

---

## Módulos (MVP)

### 1) Panel del dueño (móvil-first)

- Login (OTP / magic link).
- Setup rápido:

  - negocio (nombre, zona horaria)
  - servicios (duración, buffer, precio opcional)
  - horarios semanales + excepciones (feriados/vacaciones)

- Calendario:

  - vista **Hoy** y **Semana**
  - aprobar / cancelar / reprogramar

- Acciones rápidas WhatsApp:

  - “Enviar confirmación”
  - “Enviar recordatorio”

### 2) Página pública de reservas (ultraligera)

- URL tipo: `/{slug}`
- Pasos:

  1. elegir servicio
  2. elegir día/hora disponible
  3. nombre + teléfono
  4. crear turno

- Feedback inmediato:

  - estado: `pending` / `confirmed` / `canceled` / `no_show`

- Botón “Confirmar por WhatsApp” (Nivel A).

### 3) Anti doble-reserva (core diferenciador)

- La base de datos debe impedir solapes (ver sección “Modelo de datos y reglas”).

---

## WhatsApp: niveles de integración

### Nivel A — “Click to WhatsApp” (MVP, costo ~0)

- No API. Se usa `wa.me` con mensaje prellenado.
- El sistema crea el turno y muestra botones:

  - “Enviar al cliente”
  - “Avisarme a mí”

- Ventajas: rápido, cero verificación, funciona con WhatsApp normal.

### Nivel B — Semi-automático (costo ~0)

- Plantillas de texto pre-armadas dentro del panel.
- Historial básico de “mensajes preparados” (sin envío automático).

### Nivel C — WhatsApp Business Platform (automático)

- Envío automático desde Edge Function + webhook.
- Regla clave:

  - puedes responder sin plantilla dentro de una **ventana de 24h** desde el último mensaje del usuario; fuera de esa ventana normalmente necesitas **Message Templates aprobados**. ([WhatsApp Business][3])

- Pricing:

  - Meta tiene esquema oficial de pricing y actualizaciones (cambia por país/categoría). ([Facebook Developers][4])

> En el template, Nivel C debe estar implementado como **add-on**, para que el cliente pague el costo variable.

---

## Arquitectura (alto nivel)

**Frontend (Next SPA)**

- Panel dueño (privado)
- Booking page (pública)

**Supabase**

- Postgres (fuente de verdad)
- Realtime para:

  - refrescar calendario
  - bloquear slots en UI si alguien reserva

- Edge Functions:

  - `create_booking` (opcional, recomendado si no quieres exponer lógica compleja en RLS)
  - `whatsapp_webhook`
  - `send_whatsapp_message` (Nivel C)

- Storage:

  - `org-assets/logo.png` (opcional)

---

## Modelo de datos (propuesto)

Tablas mínimas:

- `organizations`

  - `id`, `name`, `timezone`, `slug`, `whatsapp_phone`, `created_at`

- `services`

  - `id`, `organization_id`, `name`, `duration_min`, `buffer_min`, `price_cents?`, `is_active`

- `availability_rules`

  - `id`, `organization_id`, `weekday` (0-6), `start_time`, `end_time`

- `availability_exceptions`

  - `id`, `organization_id`, `date`, `is_closed`, `start_time?`, `end_time?`

- `customers`

  - `id`, `organization_id`, `name`, `phone`

- `bookings`

  - `id`, `organization_id`, `service_id`, `customer_id`, `start_at`, `end_at`, `status`, `source` (`public|admin`), `notes?`, `created_at`

- (opcional MVP+) `staff`, `staff_services`, `booking_staff`

### Reglas fuertes (anti solape)

- Un turno “bloqueante” no puede solaparse con otro del mismo recurso:

  - Si MVP sin staff: recurso = `organization_id`
  - Si con staff: recurso = `staff_id`

- Implementación recomendada:

  - restricción en DB (la BD manda), más validación en UI.
  - si luego agregas “staff”, migras la restricción al nivel staff.

---

## Seguridad: Auth + RLS (Supabase)

### Roles

- **Owner/Admin**: gestiona todo.
- **Public (anon)**: solo ve servicios/slots y crea booking bajo reglas.

### RLS recomendado

- Tablas privadas (owner):

  - `services`, `availability_*`, `bookings` (lectura completa), `customers`

- Público:

  - lectura limitada de `services` activos y disponibilidad “derivada”
  - `insert` en `bookings` solo si:

    - pertenece al `organization_id` del `slug` visitado
    - el slot es válido y libre
    - se setean campos controlados (`status=pending`, `source=public`)

> Si quieres máxima simplicidad y control, usa una Edge Function `create_booking` y mantén RLS público muy restrictivo.

---

## Estructura del repositorio (template)

```
/
  app/                       # Next.js (SPA)
  public/
  supabase/
    migrations/              # SQL migrations (source of truth)
    seed.sql                 # opcional
  capacitor.config.ts
  android/
  ios/
  scripts/
    provision-client.ts      # opcional (automatiza onboarding)
  README.md
```

---

## Configuración Next.js (SPA + export)

**Objetivo:** deploy estático para minimizar costos.

- Evitar SSR y endpoints propios (salvo que realmente lo necesites).
- Consumir Supabase directamente desde el cliente (anon key) + Edge Functions para secretos.

Checklist:

- rutas como client components donde aplique
- caching y splitting por rutas
- evitar librerías pesadas para el calendario (primero lista + semana simple)

---

## Capacitor (workflow recomendado)

### Desarrollo

- `npm run dev` (web)
- `npx cap sync` (cuando cambie webDir/build)
- `npx cap open ios|android` (para correr nativo)

### Producción

- `npm run build` (genera el bundle estático)
- `npx cap sync`
- build y firma en Xcode/Android Studio

Buenas prácticas:

- manejar deep links (más adelante)
- usar plugin Network para detectar offline y encolar acciones (MVP+)

---

## Variables de entorno (por instancia/cliente)

En Vercel (o tu hosting):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` _(solo si usas server/edge propio; si todo está en Supabase Functions, no lo pongas aquí)_
- `APP_BASE_URL` (para links)
- `DEFAULT_TIMEZONE` (fallback)
- `WHATSAPP_MODE` = `A | B | C`
- (Nivel C) `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`

En Supabase (Edge Functions secrets):

- tokens y secretos de WhatsApp (Nivel C)
- cualquier secreto externo

---

## Onboarding de un nuevo cliente (15–30 min)

1. **Crear Supabase Project** (ideal en cuenta del cliente).
2. Aplicar schema:

   - `supabase db push` (migrations)

3. Insertar configuración inicial:

   - org + slug + horarios + servicios

4. **Crear Vercel Project**:

   - apuntar al repo template
   - set env vars (URL/ANON KEY)
   - deploy

5. Configurar dominio (opcional)
6. Validar: crear reserva pública + ver calendario del dueño

---

## Reglas UX “low data” (obligatorias)

- Booking page:

  - máximo 2–3 requests para reservar
  - carga por día (no cargar todo el mes)
  - sin imágenes pesadas

- Owner:

  - lista “Hoy” (lo más rápido)
  - calendario semanal ligero

- Offline:

  - si no hay red, permitir ver caché y “cola” de acciones (MVP+)

---

## Roadmap (después del MVP)

- Multi-staff y asignación automática por servicio
- Recordatorios automáticos (Nivel C)
- Reprogramación por link
- Depósito/pagos (Stripe) como add-on
- Métricas: ocupación, cancelaciones, clientes recurrentes
- Roles: recepcionista vs dueño

---

## Nota sobre “gratis” vs “producción”

Este template está optimizado para costos mínimos, pero:

- Supabase Free pausa proyectos por inactividad y limita activos. ([Supabase][1])
- Vercel Hobby es para uso no comercial. ([Vercel][2])
  Para clientes reales, lo correcto es contemplar al menos **un plan pago básico** o que el cliente sea owner y asuma el plan según su caso.

---

## Definición de “hecho” para el MVP

- [ ] Crear org + servicios + horarios desde móvil
- [ ] Booking público crea turno sin solapes
- [ ] Dueño ve “Hoy” en realtime
- [ ] Botón WhatsApp (Nivel A) funcionando
- [ ] Deploy por instancia replicable sin forks

# WhatsApp Booking (Next.js SPA + Capacitor + Supabase) — Template “multi-instancia”

Sistema de **reservas/turnos** para salones, barberías, clínicas y talleres, pensado para **bajo costo**, **bajo consumo de datos** y operación cómoda **desde el móvil del dueño**.

---

## Objetivo del producto

- Reducir **doble reserva**, llamadas y desorden.
- Dar al negocio:

  - **Calendario** móvil-first (día/semana) + gestión de turnos.
  - **Página pública de reservas** ultraligera.
  - Confirmaciones por **WhatsApp** (manual → semi-auto → auto).

---

## Estrategia de despliegue (low-cost real)

### ✅ Multi-instancia “sin forks”

- **Un solo repositorio template**.
- Por **cada cliente**:

  - 1 **Proyecto Supabase** (idealmente en cuenta del cliente).
  - 1 **Proyecto Vercel** (o el hosting que prefiera) con env vars apuntando a “su” Supabase.

- Beneficio: actualizas el template una vez y puedes replicar cambios sin la pesadilla de forks.

### Por qué esta estrategia

- En Supabase Free:

  - Los proyectos **se pausan tras 1 semana de inactividad** y hay **límite de 2 proyectos activos** en free. ([Supabase][1])

- En Vercel Hobby (gratis):

  - Se restringe a **uso personal/no comercial**; para clientes normalmente corresponde **Pro/Enterprise**. ([Vercel][2])

> Recomendación práctica: que **cada cliente sea owner** de su Supabase (y si aplica su Vercel). Tú quedas como colaborador.

---

## Stack

- **Frontend:** Next.js (SPA) + Tailwind (opcional)
- **App móvil (dueño):** Capacitor (iOS/Android) **sin perder la base web**
- **Backend:** Supabase

  - Postgres + RLS
  - Auth (OTP/magic link)
  - Realtime (actualizaciones instantáneas)
  - Edge Functions (webhooks y lógica sensible)
  - Storage (logo/imagen mínima)

- **WhatsApp:** 3 niveles de integración (A/B/C)

---

## Requisitos clave (no negociables)

### SPA real

- La app se comporta como **Single Page App**:

  - navegación client-side
  - render “ligero”

- Recomendado: **Static export** para minimizar costo de cómputo (sin SSR).

  - Next `output: 'export'` (cuando aplique) + hosting estático en Vercel/CDN.
  - Toda lógica sensible se mueve a **Supabase (DB/Edge Functions)**.

### Capacitor siempre

- El proyecto **siempre mantiene**:

  - carpeta `ios/` y `android/`
  - `capacitor.config.*`
  - workflow `build web → cap sync → build nativo`

- No se crea un “segundo frontend” para móvil: **un solo código**.

### “Modo bajo datos”

- Sin imágenes pesadas, sin dependencias grandes innecesarias.
- Caching agresivo (PWA) + carga incremental de slots.

---

## Módulos (MVP)

### 1) Panel del dueño (móvil-first)

- Login (OTP / magic link).
- Setup rápido:

  - negocio (nombre, zona horaria)
  - servicios (duración, buffer, precio opcional)
  - horarios semanales + excepciones (feriados/vacaciones)

- Calendario:

  - vista **Hoy** y **Semana**
  - aprobar / cancelar / reprogramar

- Acciones rápidas WhatsApp:

  - “Enviar confirmación”
  - “Enviar recordatorio”

### 2) Página pública de reservas (ultraligera)

- URL tipo: `/{slug}`
- Pasos:

  1. elegir servicio
  2. elegir día/hora disponible
  3. nombre + teléfono
  4. crear turno

- Feedback inmediato:

  - estado: `pending` / `confirmed` / `canceled` / `no_show`

- Botón “Confirmar por WhatsApp” (Nivel A).

### 3) Anti doble-reserva (core diferenciador)

- La base de datos debe impedir solapes (ver sección “Modelo de datos y reglas”).

---

## WhatsApp: niveles de integración

### Nivel A — “Click to WhatsApp” (MVP, costo ~0)

- No API. Se usa `wa.me` con mensaje prellenado.
- El sistema crea el turno y muestra botones:

  - “Enviar al cliente”
  - “Avisarme a mí”

- Ventajas: rápido, cero verificación, funciona con WhatsApp normal.

### Nivel B — Semi-automático (costo ~0)

- Plantillas de texto pre-armadas dentro del panel.
- Historial básico de “mensajes preparados” (sin envío automático).

### Nivel C — WhatsApp Business Platform (automático)

- Envío automático desde Edge Function + webhook.
- Regla clave:

  - puedes responder sin plantilla dentro de una **ventana de 24h** desde el último mensaje del usuario; fuera de esa ventana normalmente necesitas **Message Templates aprobados**. ([WhatsApp Business][3])

- Pricing:

  - Meta tiene esquema oficial de pricing y actualizaciones (cambia por país/categoría). ([Facebook Developers][4])

> En el template, Nivel C debe estar implementado como **add-on**, para que el cliente pague el costo variable.

---

## Arquitectura (alto nivel)

**Frontend (Next SPA)**

- Panel dueño (privado)
- Booking page (pública)

**Supabase**

- Postgres (fuente de verdad)
- Realtime para:

  - refrescar calendario
  - bloquear slots en UI si alguien reserva

- Edge Functions:

  - `create_booking` (opcional, recomendado si no quieres exponer lógica compleja en RLS)
  - `whatsapp_webhook`
  - `send_whatsapp_message` (Nivel C)

- Storage:

  - `org-assets/logo.png` (opcional)

---

## Modelo de datos (propuesto)

Tablas mínimas:

- `organizations`

  - `id`, `name`, `timezone`, `slug`, `whatsapp_phone`, `created_at`

- `services`

  - `id`, `organization_id`, `name`, `duration_min`, `buffer_min`, `price_cents?`, `is_active`

- `availability_rules`

  - `id`, `organization_id`, `weekday` (0-6), `start_time`, `end_time`

- `availability_exceptions`

  - `id`, `organization_id`, `date`, `is_closed`, `start_time?`, `end_time?`

- `customers`

  - `id`, `organization_id`, `name`, `phone`

- `bookings`

  - `id`, `organization_id`, `service_id`, `customer_id`, `start_at`, `end_at`, `status`, `source` (`public|admin`), `notes?`, `created_at`

- (opcional MVP+) `staff`, `staff_services`, `booking_staff`

### Reglas fuertes (anti solape)

- Un turno “bloqueante” no puede solaparse con otro del mismo recurso:

  - Si MVP sin staff: recurso = `organization_id`
  - Si con staff: recurso = `staff_id`

- Implementación recomendada:

  - restricción en DB (la BD manda), más validación en UI.
  - si luego agregas “staff”, migras la restricción al nivel staff.

---

## Seguridad: Auth + RLS (Supabase)

### Roles

- **Owner/Admin**: gestiona todo.
- **Public (anon)**: solo ve servicios/slots y crea booking bajo reglas.

### RLS recomendado

- Tablas privadas (owner):

  - `services`, `availability_*`, `bookings` (lectura completa), `customers`

- Público:

  - lectura limitada de `services` activos y disponibilidad “derivada”
  - `insert` en `bookings` solo si:

    - pertenece al `organization_id` del `slug` visitado
    - el slot es válido y libre
    - se setean campos controlados (`status=pending`, `source=public`)

> Si quieres máxima simplicidad y control, usa una Edge Function `create_booking` y mantén RLS público muy restrictivo.

---

## Estructura del repositorio (template)

```
/
  app/                       # Next.js (SPA)
  public/
  supabase/
    migrations/              # SQL migrations (source of truth)
    seed.sql                 # opcional
  capacitor.config.ts
  android/
  ios/
  scripts/
    provision-client.ts      # opcional (automatiza onboarding)
  README.md
```

---

## Configuración Next.js (SPA + export)

**Objetivo:** deploy estático para minimizar costos.

- Evitar SSR y endpoints propios (salvo que realmente lo necesites).
- Consumir Supabase directamente desde el cliente (anon key) + Edge Functions para secretos.

Checklist:

- rutas como client components donde aplique
- caching y splitting por rutas
- evitar librerías pesadas para el calendario (primero lista + semana simple)

---

## Capacitor (workflow recomendado)

### Desarrollo

- `npm run dev` (web)
- `npx cap sync` (cuando cambie webDir/build)
- `npx cap open ios|android` (para correr nativo)

### Producción

- `npm run build` (genera el bundle estático)
- `npx cap sync`
- build y firma en Xcode/Android Studio

Buenas prácticas:

- manejar deep links (más adelante)
- usar plugin Network para detectar offline y encolar acciones (MVP+)

---

## Variables de entorno (por instancia/cliente)

En Vercel (o tu hosting):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` _(solo si usas server/edge propio; si todo está en Supabase Functions, no lo pongas aquí)_
- `APP_BASE_URL` (para links)
- `DEFAULT_TIMEZONE` (fallback)
- `WHATSAPP_MODE` = `A | B | C`
- (Nivel C) `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`

En Supabase (Edge Functions secrets):

- tokens y secretos de WhatsApp (Nivel C)
- cualquier secreto externo

---

## Onboarding de un nuevo cliente (15–30 min)

1. **Crear Supabase Project** (ideal en cuenta del cliente).
2. Aplicar schema:

   - `supabase db push` (migrations)

3. Insertar configuración inicial:

   - org + slug + horarios + servicios

4. **Crear Vercel Project**:

   - apuntar al repo template
   - set env vars (URL/ANON KEY)
   - deploy

5. Configurar dominio (opcional)
6. Validar: crear reserva pública + ver calendario del dueño

---

## Reglas UX “low data” (obligatorias)

- Booking page:

  - máximo 2–3 requests para reservar
  - carga por día (no cargar todo el mes)
  - sin imágenes pesadas

- Owner:

  - lista “Hoy” (lo más rápido)
  - calendario semanal ligero

- Offline:

  - si no hay red, permitir ver caché y “cola” de acciones (MVP+)

---

## Roadmap (después del MVP)

- Multi-staff y asignación automática por servicio
- Recordatorios automáticos (Nivel C)
- Reprogramación por link
- Depósito/pagos (Stripe) como add-on
- Métricas: ocupación, cancelaciones, clientes recurrentes
- Roles: recepcionista vs dueño

---

## Nota sobre “gratis” vs “producción”

Este template está optimizado para costos mínimos, pero:

- Supabase Free pausa proyectos por inactividad y limita activos. ([Supabase][1])
- Vercel Hobby es para uso no comercial. ([Vercel][2])
  Para clientes reales, lo correcto es contemplar al menos **un plan pago básico** o que el cliente sea owner y asuma el plan según su caso.

---

## Definición de “hecho” para el MVP

- [ ] Crear org + servicios + horarios desde móvil
- [ ] Booking público crea turno sin solapes
- [ ] Dueño ve “Hoy” en realtime
- [ ] Botón WhatsApp (Nivel A) funcionando
- [ ] Deploy por instancia replicable sin forks
