---
name: whatsapp-automatizaciones
description: Capa de WhatsApp (OpenWA) — recordatorios, resumen diario, valoraciones, reactivacion y waitlist; que corre solo y que se configura por negocio
metadata:
  type: project
---

WhatsApp es el canal de comunicacion del producto. Proveedor: **OpenWA** (sesion por
negocio, no Twilio ni la API oficial). Migraciones 014, 016-019, 024, 025.

## Piezas

- **Edge functions**: `wa-send` (saliente, por *intent*: reminder, rating_request,
  rating_ack, waitlist_slot...), `wa-inbound` (entrante: parsea confirmaciones y
  valoraciones 1-5, guarda rating + feedback), `send-reminders`, `daily-summary`,
  `wa-campaign` (reactivacion de clientes inactivos).
- `wa-inbound` tiene **`verify_jwt = false`** en `supabase/config.toml` (es webhook publico;
  la firma se verifica dentro).
- **Crons (pg_cron, migracion 025)**: `wa-reminders` y `wa-daily-summary` cada 15 min.
  Antes de la 025 los recordatorios **no corrian solos**.
- **Triggers**: pedir valoracion al completar un turno; avisar de hueco liberado a waitlist.

## Configuracion por negocio (`business_settings`)

| Columna | Default | Que hace |
|---|---|---|
| `whatsapp_integration_enabled` / `openwa_session_id` | — | Conexion de la sesion de WhatsApp |
| `enable_rating_request` | `true` | Pide valoracion al completar el turno |
| `enable_daily_summary` | `false` (opt-in) | Resumen matutino al telefono de la org |
| `daily_summary_time` | `07:00` (hora local de la org) | Hora del resumen |

UI de estos toggles: `/dashboard/settings` (owner/admin con org).

**Throttle de reactivacion:** `customers.last_reactivation_sent_at` — maximo 1 mensaje por
cliente cada 30 dias y 50 por envio, validado tambien en servidor. No lo saltes.

Docs: [docs/REMINDERS-SETUP.md](../../docs/REMINDERS-SETUP.md), [docs/PLAN-DASHBOARDS-Y-MEJORAS.md](../../docs/PLAN-DASHBOARDS-Y-MEJORAS.md).
Relacionado: [[producto-y-dominio]], [[arquitectura-static-export]].
