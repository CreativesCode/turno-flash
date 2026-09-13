---
name: mapa-docs
description: Que doc de docs/ sirve para que, y cuales estan obsoletos
metadata:
  type: reference
---

`docs/` tiene ~15.000 lineas acumuladas. Guia rapida antes de leer 3.000 lineas de golpe:

## Fiables (recientes o verificados)

| Doc | Para que |
|---|---|
| `design/MIGRATION-PLAN.md` | Rediseno de UI: mapeo prototipo → codigo, decisiones tomadas |
| `PLAN-DASHBOARDS-Y-MEJORAS.md` | Analitica + automatizaciones WhatsApp (completado, con resumen tecnico) |
| `PLAN-GOOGLE-PLAY.md` | Publicacion en Play + arquitectura RevenueCat ↔ licencias |
| `ROLES-AND-PERMISSIONS.md` | Matriz de permisos por rol (admin/owner/staff) |
| `APPOINTMENT-FLOW.md` | Maquina de estados de turnos y acciones por estado |
| `SERVICE-LAYER.md` | Contrato de los services (firmas de metodos) |
| `license-management.md`, `SETUP-LICENCIAS.md` | Sistema de licencias |
| `REMINDERS-SETUP.md` | Recordatorios manuales y automaticos |
| `CORRECCION-capacitor.md` | Por que static export y que implica |
| `ERROR-TRACKING.md` | Error logging propio (migracion 011) |
| `MOBILE-README.md`, `mobile-*.md`, `ADD-PLATFORMS-TO-REPO.md` | Build y flujo Capacitor |
| `COLOR-SYSTEM.md` | Paleta y tokens |
| `user-manual/turno-flash-user-manual.html` | Manual para clientes; fuente de `/help` ([[manual-de-usuario]]) |

## Obsoletos — leer con escepticismo

`ROADMAP-2026.md`, `PLAN-MEJORAS-PRO.md` (3.057 lineas), `ACTION-CHECKLIST.md`,
`ANALISIS-PERFORMANCE-PRIORIDADES.md`, `RESUMEN-FINAL.md`, `IMPLEMENTATION-PROGRESS.md`,
`REFACTOR-*.md`: son de **enero de 2026** y describen un proyecto mas joven. Dan por
pendientes cosas ya hechas (WhatsApp, analitica, waitlist, realtime, pagos) y por hechas
cosas que no existen (tests, CI, Sentry).

**Regla:** la fuente de verdad del estado real es `supabase/migrations/`, el codigo y
`git log`. Los docs son contexto de intencion, no de estado.

Relacionado: [[estado-actual-2026-09]].
