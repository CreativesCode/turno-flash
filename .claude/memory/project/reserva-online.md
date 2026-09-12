---
name: reserva-online
description: Reserva online publica — decisiones de producto aprobadas por el usuario, arquitectura y estado de implementacion
metadata:
  type: project
---

Plan completo: `.claude/PRPs/prp-public-booking.md`. **IMPLEMENTADO 2026-09-10** (8 fases).

En produccion: migraciones 029 (motor de huecos + reserva atomica), 030 (search_path de helpers), 031
(`save_staff_schedule`, SECURITY INVOKER), edge function `public-booking`, y `wa-send`/`wa-inbound`
redesplegadas. Ningun negocio tiene la pagina activa todavia (opt-in en Ajustes).

El usuario probo el flujo completo con login (2026-09-10) y funciona. Al aprobar un turno `pending` el
cliente recibe WhatsApp (migracion 032, ver [[whatsapp-automatizaciones]]).

## Decisiones de producto (del usuario, no reabrir)

- **Horario por profesional** (`staff_availability`), no horario del negocio. Sin horario = no aparece.
- **Servicios por profesional** (`staff_services`), estricto: sin servicios asignados = no aparece.
  El usuario rechazo explicitamente "todos los profesionales hacen todos los servicios".
- **Aprobacion segun cada servicio**: `services.requires_approval` → turno `pending`; si no, `confirmed`.
- **Cada dueno activa su pagina** (`business_settings.booking_page_enabled`, toggle en Ajustes).
- **El cliente elige profesional o "Sin preferencia"** (asigna el primero libre por `sort_order`).
- **Vacaciones y feriados incluidos en v1** (`staff_exceptions`; `staff_id` NULL = cierre del negocio).
- Cliente existente por telefono se reutiliza; cancela por WhatsApp; anti-abuso = max 3 turnos futuros
  por telefono + honeypot, sin captcha.

**Why:** el usuario prefiere precision real del negocio aunque cueste mas configuracion al dueno.
**How to apply:** ante cualquier atajo que "simplifique" asumiendo disponibilidad o capacidad que el
dueno no cargo, la respuesta es no ofrecerlo y avisar en Ajustes que falta configurar.

## Arquitectura

Link publico `getSiteUrl()/book?b=<slug>` (ruta estatica; dominio real `https://turno-flash.vercel.app`). Logica de huecos y reserva atomica en
Postgres (migracion 029, `SECURITY DEFINER`, solo `service_role`), expuesta por la edge function
`public-booking`, que chequea `booking_page_enabled` + `org_license_usable` a mano. Sin RLS para anon.
WhatsApp sale solo por el trigger existente de INSERT en `appointments`.

Dashboard: `StaffScheduleSheet` (kebab "Horario y servicios" en Profesionales) guarda horario + servicios
via RPC atomica; `ExceptionsEditor` (dias libres por profesional y feriados del negocio, en Ajustes);
`BookingPageDetails` (link, compartir y aviso de profesionales que no apareceran). Pagina publica:
`app/book` + `components/booking/`.

Telefono del cliente: acepta **cualquier pais** (`config/phone-countries.ts`, nombres via
`Intl.DisplayNames`). El pais se preselecciona sin red: zona horaria del dispositivo → zona del
negocio → idioma del navegador → Cuba. Se descarto la IP a proposito (VPN en Cuba, servicio externo).
El backend ya aceptaba cualquier `+` con 8-15 digitos.

Relacionado: [[producto-y-dominio]], [[arquitectura-static-export]], [[whatsapp-automatizaciones]].
