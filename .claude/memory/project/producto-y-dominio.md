---
name: producto-y-dominio
description: Que es Turno Flash, su modelo de dominio (organizaciones, roles, turnos) y la maquina de estados de turnos
metadata:
  type: project
---

**Turno Flash** es un SaaS de gestion de turnos/citas para negocios de servicio
(peluquerias, consultorios, spas, talleres). Web (Next.js en Vercel) + app movil
nativa (Capacitor iOS/Android, `appId: com.turnoflash.app`). Idioma de producto: **espanol**.

## Modelo multi-organizacion

Todo cuelga de `organizations`. Un usuario (`user_profiles`) pertenece a una org y tiene un rol:

| Rol | Alcance |
|---|---|
| `admin` | Global (todas las orgs). Gestiona orgs, usuarios y licencias. **No** le afecta la licencia. |
| `owner` | Su org completa: turnos, clientes, servicios, staff, invitaciones, reportes, settings. Sujeto a licencia. |
| `staff` | Su org, operativo: crea/edita turnos y clientes, **no** borra; servicios y staff en solo lectura. Sujeto a licencia. |

Entidades core: `appointments`, `customers`, `services` (+ `service_categories`),
`staff_*`, `appointment_requests`, `waitlist`, `business_settings`,
`subscription_events`, `reminder_logs`, tablas de error logging.

## Maquina de estados de turnos (9 estados)

`pending` → `confirmed` → `reminded` → `client_confirmed` → `checked_in` →
`in_progress` → `completed`. Finales: `completed`, `cancelled`, `no_show`.

- Un turno nace en `pending` si el servicio requiere aprobacion; si no, en `confirmed`.
- **Se permiten saltos hacia adelante** (ej. `confirmed` → `completed`); los estados
  finales no se pueden cambiar.
- Fuente de verdad en codigo: `utils/appointment-status.ts` (`STATUSES`, `NEXT_ACTIONS`,
  `getStatusMeta`) y las clases CSS `.st-<estado>` de `app/globals.css`.
- Validacion de transiciones y de disponibilidad: `services/appointments.service.ts`.
- Doc: [docs/APPOINTMENT-FLOW.md](../../docs/APPOINTMENT-FLOW.md), [docs/ROLES-AND-PERMISSIONS.md](../../docs/ROLES-AND-PERMISSIONS.md).

## Monetizacion

Licencia por organizacion con trial y periodo de gracia, alimentada por RevenueCat
(Google Play Billing) via edge function `revenuecat-webhook`. Registro self-service
(`/register` + edge function `self-signup`) crea la org con **trial de 7 dias**.
Detalle del bloqueo: [[license-enforcement]].

Relacionado: [[arquitectura-static-export]], [[whatsapp-automatizaciones]], [[estado-actual-2026-09]].
