# Plan: Dashboards de Analítica + Mejoras de Valor

> Creado: 2026-06-11
> Estado: ✅ COMPLETADO (2026-06-11) — todas las fases implementadas y desplegadas

Todas las funcionalidades de este plan comparten una premisa: **usan datos que ya
existen en la base de datos** (`appointments.price_charged`, `was_paid`, `rating`,
`status`, `source`, `customers.last_appointment_date`, `subscription_events`, etc.)
y la **infraestructura ya pagada** (Supabase + Edge Functions + OpenWA). Coste de
infra adicional: $0. Única dependencia nueva: `recharts` (gratis, MIT).

---

## Fase 1 — Dashboards (EN CURSO)

### 1.1 Dashboard de analítica para owners — `/dashboard/reports`

**Para quién:** owner y admin (con organización). Staff no tiene acceso.
**Por qué:** es la propuesta de valor visible que justifica la suscripción `pro`.

**Backend** — migración `022_analytics_functions.sql`:

- RPC `get_organization_analytics(p_start_date, p_end_date, p_organization_id?)`
  - SECURITY DEFINER con verificación de rol interna:
    - `owner` → solo su organización (ignora `p_organization_id`)
    - `admin` → cualquier organización
  - Devuelve un único JSONB (1 round-trip) con:
    - `summary`: turnos totales, completados, cancelados, no-shows, ingresos
      (cobrados y estimados), ingresos perdidos, rating promedio, clientes nuevos,
      clientes únicos
    - `previous`: mismas métricas del período anterior (para deltas %)
    - `revenue_by_day`: serie temporal de ingresos + turnos
    - `status_counts` y `source_counts`: distribución por estado y origen
    - `top_services`: top 8 por volumen e ingresos
    - `top_staff`: top 8 por volumen, ingresos y rating
    - `heatmap`: matriz día-de-semana × hora (horas pico)
  - Ingresos: `COALESCE(price_charged, services.price)`; "cobrado" = completed,
    "perdido" = cancelled/no_show.

**Frontend:**

- `types/analytics.ts` — tipos del JSON de la RPC
- `services/analytics.service.ts` — wrapper de `supabase.rpc`
- `hooks/useAnalytics.query.ts` — React Query (`staleTime` 5 min)
- `app/dashboard/reports/page.tsx`:
  - Selector de período: 7 días / 30 días / 90 días / mes actual
  - KPI cards con delta vs período anterior
  - Gráfico de área: ingresos por día (recharts)
  - Donut: distribución por estado
  - Barras: top servicios por ingresos
  - Tabla compacta: top profesionales (turnos, ingresos, rating)
  - Heatmap de horas pico (grid Tailwind, sin librería)
  - Distribución por origen de reserva (web/whatsapp/teléfono/walk-in)

### 1.2 Dashboard de plataforma para admin — `/dashboard/platform`

**Para quién:** solo `admin`.

**Backend** — misma migración:

- RPC `get_admin_platform_stats()` (solo admin, verificado en la función):
  - `orgs`: total, activas, licencias por estado (activa/gracia/expirada),
    licencias que vencen en los próximos 30 días (lista con nombre y fecha)
  - `subscriptions`: suscripciones activas por tienda, eventos RevenueCat
    últimos 30 días por tipo
  - `activity`: turnos por mes (últimos 6 meses), top 10 orgs por turnos
    (30 días), orgs sin actividad en 14 días (riesgo de churn)
  - `funnel`: orgs → con servicios → con staff → con turnos → con licencia activa
  - `whatsapp`: mensajes enviados/fallidos últimos 30 días
  - `errors`: errores últimos 7 días / sin resolver

**Frontend:** `app/dashboard/platform/page.tsx` reutilizando los componentes de
gráficos de reports.

### 1.3 Navegación y landing

- Sidebar + Drawer + atajos del dashboard: "Reportes" (owner/admin con org) y
  "Plataforma" (admin)
- Landing (`app/home-client.tsx`): nueva feature card "Reportes y estadísticas",
  añadirlo a los bullets de los planes y un FAQ

---

## Fase 2 — Automatizaciones WhatsApp (PENDIENTE)

Reutilizan la Edge Function `wa-send` y el patrón de `send-reminders` (cron).

### 2.1 Resumen diario por WhatsApp al dueño (~1 día)

- Edge Function `daily-summary` invocada por cron (pg_cron ya disponible)
- A la hora configurada (default 7:00 local de la org), envía al
  `whatsapp_phone` de la org: turnos de hoy, ingresos estimados, pendientes
  de confirmar
- Toggle en `business_settings` (`enable_daily_summary`, `daily_summary_time`)
- Nuevo `wa_outbound_intent`: `daily_summary`

### 2.2 Solicitud de valoración post-cita (~1 día)

- Trigger en `appointments` al pasar a `completed` (mismo patrón que
  `trigger_wa_on_appointment_cancel` de la migración 017)
- Mensaje con escala 1–5; `wa-inbound` parsea la respuesta numérica y guarda
  `rating` (y texto adicional en `feedback`)
- Nuevo intent: `rating_request`
- Alimenta el rating promedio del dashboard de reports

### 2.3 Reactivación de clientes dormidos (~1–2 días)

- Sección "Recuperar clientes" en `/dashboard/customers` (o tab propio)
- Lista clientes con `last_appointment_date` > 30/60/90 días (query simple,
  índice ya existente)
- Botón de envío individual o por lote vía `wa-send` con mensaje editable
- Guardar `last_reactivation_sent_at` en `customers` para no spamear
  (máx. 1 mensaje / 30 días por cliente)
- Nuevo intent: `reactivation`

### 2.4 Notificar lista de espera al liberarse un hueco (~1–2 días)

- Trigger al cancelar un turno: busca en `waitlist` entradas compatibles
  (org + servicio + fecha preferida) con status activo
- Notifica por WhatsApp al primero según `priority`; marca `notified_at`
- Nuevo intent: `waitlist_slot`

---

## Fase 3 — Exportación CSV (PENDIENTE, ~medio día)

- Botón "Exportar CSV" en `/dashboard/appointments` y `/dashboard/customers`
- Generación 100% client-side (Blob + download) con los filtros activos:
  sin dependencias nuevas ni carga en el servidor
- Columnas turnos: fecha, hora, cliente, teléfono, servicio, profesional,
  estado, precio, pagado, origen
- Columnas clientes: nombre, teléfono, email, total turnos, no-shows,
  última visita, tags

---

## Estado de ejecución

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Migración 022 (RPCs de analítica) | ✅ aplicada en remoto |
| 2 | `/dashboard/reports` (owners) | ✅ |
| 3 | `/dashboard/platform` (admin) | ✅ |
| 4 | Navegación (Sidebar/Drawer/atajos) | ✅ |
| 5 | Resumen diario WhatsApp (`daily-summary`) | ✅ desplegada + cron |
| 6 | Valoración post-cita (trigger + `wa-send`/`wa-inbound`) | ✅ desplegadas |
| 7 | Reactivación de clientes (`wa-campaign` + `/dashboard/customers/recover`) | ✅ desplegada |
| 8 | Export CSV (turnos y clientes) | ✅ |
| 9 | Lista de espera → WhatsApp (trigger + `wa-send`) | ✅ |
| 10 | Landing actualizado (features, planes, FAQ) | ✅ |

## Lo que quedó implementado (resumen técnico)

- **Migraciones**: 022 (RPCs analítica), 023 (fix vista de licencias: faltaban
  las columnas de suscripción de la 021), 024 (intents, columnas, triggers de
  rating y waitlist), 025 (habilita `pg_cron` y programa `wa-reminders` +
  `wa-daily-summary` cada 15 min — **antes los recordatorios no corrían solos**).
- **Edge functions desplegadas**: `wa-send` (intents nuevos: rating_request,
  rating_ack, waitlist_slot), `wa-inbound` (parsea respuestas 1-5 y guarda
  rating + feedback), `daily-summary` (nueva), `wa-campaign` (nueva).
- **Config por negocio** (`business_settings`):
  - `enable_rating_request` (default **true**): pide valoración al completar.
  - `enable_daily_summary` (default **false**, opt-in) + `daily_summary_time`
    (default 07:00 hora local de la org). No hay UI todavía para estos toggles:
    se activan por SQL/dashboard de Supabase. ⚠️ Pendiente menor: UI de settings.
- **Throttle reactivación**: `customers.last_reactivation_sent_at`, máx. 1
  mensaje cada 30 días, máx. 50 por envío (validado también en el servidor).
- `[functions.wa-inbound] verify_jwt = false` fijado en `supabase/config.toml`.

## Notas técnicas

- Las RPC devuelven JSONB agregado en Postgres: el cliente no descarga filas
  crudas (importante para móvil / bajo consumo de datos).
- Verificación de permisos **dentro** de las funciones SECURITY DEFINER
  (mismo patrón que `get_my_organization_license_status` de la migración 008).
- `recharts` se importa con `next/dynamic` en las páginas de dashboards para
  no engordar el bundle inicial (igual que DayCalendar/WeekCalendar).
- Aplicar migraciones con el CLI: `supabase db push` (proyecto ya enlazado).
