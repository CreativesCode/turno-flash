---
name: cola-de-trabajo
description: Orden de trabajo acordado el 2026-10-15 — qué se hace, en qué orden, y qué quedó descartado o aparcado
metadata:
  type: project
---

Acordado con el equipo el 2026-10-15, al repasar los pendientes.

**Cola, en este orden:**
1. ~~**Licencia vencida = bloqueo total** (D-10)~~ — **hecho el 2026-10-16** ([[license-enforcement]]).
2. **Siguiente:** botón «Compartir» de una salida que arme el mensaje del viaje para WhatsApp ([[modulo-reserva-asientos]]).
3. **Precio distinto para solo ida y para ida y vuelta** (hoy se simula con dos paradas).
4. **Reportes con la zona horaria del negocio** (P0-13, punto 7 de [[qa-piloto-cuba]]).
5. **Fecha del detalle de una salida** que se ve como `2026-10-09`.

**Ya cerrado:** categorías de servicios en la web, probado en producción.

**Aparcado (no tocar sin que lo pidan):**
- Prueba en iPhone (P1-26): necesita un Mac, no se hará por ahora.
- Vencimiento automático del anticipo no pagado (Fase 5 de pasajes).
- Rol `special`.
- Contestar desde el número propio de cada negocio: se mantiene, para no sobrecargar OpenWA.

**Descartado:** pedidos de fotos sueltas por tamaño y reportes por categoría.
