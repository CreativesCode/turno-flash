---
name: estado-actual-2026-09
description: Foto del proyecto a septiembre de 2026 — que esta hecho, que falta y donde estan los agujeros (testing, CI, monitoreo)
metadata:
  type: project
---

Foto tomada el **2026-09-07** al instalar Titan Factory. Version del app: 0.1.0
(Android `versionCode` 2 / `versionName` 1.0.1).

## Hecho y desplegado

- Sistema de turnos completo (9 estados, calendario dia/semana, lista virtualizada,
  modales bottom-sheet), clientes, servicios, staff, recordatorios.
- Multi-organizacion con roles admin/owner/staff y RLS.
- Licencias + trial de 7 dias + gracia + bloqueo de escritura ([[license-enforcement]]).
- Registro self-service (`/register`) y creacion segura de orgs (migracion 026).
- Suscripciones RevenueCat + webhook; paginas legales (privacidad, terminos) y
  eliminacion de cuenta (requisitos de Google Play).
- Automatizaciones WhatsApp con crons ([[whatsapp-automatizaciones]]).
- Dashboards de analitica: `/dashboard/reports` (owner) y `/dashboard/platform` (admin),
  con RPCs que agregan en Postgres (migracion 022); export CSV.
- Realtime (migracion 020), indices de performance (012), error logging (011),
  keepalive de Supabase via GitHub Actions.
- Rediseno de UI completo, 9/9 pasos ([[rediseno-ui-migracion]]).

## Tamano real de la BD (2026-09-10)

Etapa temprana: **7 organizaciones, 4 usuarios, 42 turnos, 20 clientes, 93 mensajes de
WhatsApp salientes**; solo 1 org tiene `business_settings` (WhatsApp configurado).
Waitlist, notifications, staff_availability y service_categories estan vacias.
Las 21 tablas de `public` tienen RLS. Implicacion: optimizaciones de escala no son prioridad;
adopcion y activacion de negocios si.

## Dominio

**`https://turno-flash.vercel.app`** (confirmado por el usuario 2026-09-11). Es el fallback de
`getBaseUrl()` en `utils/metadata.ts`, asi que el build de Vercel no necesita `NEXT_PUBLIC_SITE_URL`
(`.env*` esta en .gitignore). En local esa variable si esta en `.env.local`.

## Agujeros reales (a septiembre 2026)

- **Testing: cero.** No hay Jest ni Playwright configurados pese a lo que digan los docs.
- **CI/CD: solo** `.github/workflows/keep-supabase-alive.yml`. No hay pipeline de build/lint/test.
- **Monitoreo:** no hay Sentry; el error tracking es propio, en tabla de Postgres (migracion 011).
- `npm run lint` roto y errores de ESLint preexistentes ([[turno-flash-tooling]]).
- Reserva publica online implementada 2026-09-10 ([[reserva-online]]): `/book?b=<slug>`, opt-in por
  negocio; ningun negocio la tiene activa todavia.
- ~~`/manifest.json` 404~~ resuelto 2026-09-11: `public/manifest.json` + iconos web generados desde
  `public/images/isotipo.svg` con sharp (`icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`).

## Bugs arreglados que dejan huella en datos

- **Fechas de licencia se corrian al editar** (`/dashboard/organizations/details`), arreglado
  2026-09-10: cada guardado del form movia `license_*_date` +N horas (N = offset de la zona del admin,
  +3h en Argentina). Las orgs editadas antes de esa fecha pueden tener vencimientos corridos unas
  horas; no hay forma de saber cuales. Regla en [[convenciones-de-codigo]].

## Cuidado con los docs

`docs/` tiene ~15.000 lineas y **buena parte esta desactualizada** (`ROADMAP-2026.md`,
`PLAN-MEJORAS-PRO.md`, `ACTION-CHECKLIST.md`, `RESUMEN-FINAL.md` son de enero de 2026 y
dan por pendientes cosas ya hechas, o por hechas cosas que no lo estan).
**Verificar siempre contra `supabase/migrations/` y el codigo antes de creer un doc.**
Los fiables por ser recientes: `PLAN-DASHBOARDS-Y-MEJORAS.md`, `PLAN-GOOGLE-PLAY.md`,
`design/MIGRATION-PLAN.md`.
