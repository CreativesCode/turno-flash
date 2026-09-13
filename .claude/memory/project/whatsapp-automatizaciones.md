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

**Turnos `pending` (reserva web de servicios con aprobacion), desde 2026-09-10:** el `confirm` dice
"solicitud recibida" y no pide OK; si el cliente responde OK igual, `wa-inbound` solo registra
`client_confirmed_at` y **no cambia el estado** (aprobar es del negocio). Cuando el dueno aprueba
(`pending` → `confirmed`), el trigger de la migracion 032 envia el intent `approved` ("aprobo tu
solicitud, tu turno esta confirmado" + opcion CANCELAR); idempotente por turno.

**OpenWA responde HTTP 500 a `send-text` aunque entrega el mensaje** (visto 2026-09-11; el ultimo envio
con respuesta OK fue 2026-06-14; session id de la org de prueba correcto). Efectos: filas `failed` sin
`message_id`, acks sin actualizar, y los recordatorios pueden llegar 2 veces (ventana de 30 min, cron
cada 15, `reminder_sent_at` solo se marca con exito). Es del servidor OpenWA, no del codigo.
Causa documentada en el FAQ de OpenWA (docs/12-troubleshooting-faq.md): WhatsApp Web 2.3000.x renombro
el id interno del mensaje que lee whatsapp-web.js; OpenWA lo arregla con el parche
`scripts/patch-wwebjs-201832.js` (se aplica al instalar y puede perderse al reconstruir). Fix en el
servidor: verificar/reaplicar el parche o actualizar OpenWA (`git pull` + `docker compose up -d --build`;
0.23.4 del 2026-09-05 corrige otro campo renombrado). OJO: en junio los 500 a `5452564206` eran reales
(numero con codigo 54 de Argentina, no existe en WhatsApp).

**Como `wa-inbound` ubica el turno de una respuesta (desde 2026-09-11):** `resolveChatIds` traduce el
remitente (a veces alias `@lid`) a nuestros `chat_id` via message_ids viejos o sufijo del numero; luego
toma el ultimo mensaje abierto (incl. `approved`) de un turno **aun abierto y no pasado**. Antes elegia
por message_id sin mirar el estado y cancelo un turno viejo de mayo (T-0022) en vez del nuevo.
Verificado en real 2026-09-11: el CANCELAR del cliente cancelo el turno correcto (T-0036).
Limite: un cliente nuevo que responde desde `@lid` sin mensajes previos con id no se puede ubicar.

Docs: [docs/REMINDERS-SETUP.md](../../docs/REMINDERS-SETUP.md), [docs/PLAN-DASHBOARDS-Y-MEJORAS.md](../../docs/PLAN-DASHBOARDS-Y-MEJORAS.md).
Relacionado: [[producto-y-dominio]], [[arquitectura-static-export]].

**Viajes (`wa-trip-send`, migraciones 043-047):** reserva recibida, aviso al negocio (solo reservas
web), aprobada, anticipo cobrado, reserva cancelada y salida cancelada. Un envío por intent por
reserva. Detalle en [[modulo-reserva-asientos]].
