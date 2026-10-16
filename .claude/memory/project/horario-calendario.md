---
name: horario-calendario
description: Horas visibles del calendario Día/Semana por negocio (TUR0002, pedido de Aicenis), implementado 2026-10-16
metadata:
  type: project
---

**Pedido (Tasknic TUR0002, Aicenis de Espiral Studio):** poder acortar las horas que dibuja el calendario, por
ejemplo «solo hasta el turno de las 2 pm». Antes era fijo 8:00-20:00 (`BUSINESS_HOURS` en `config/constants.ts`).

**Decisión de Roberto (2026-10-16):** ajuste del negocio (no automático por horarios del personal ni por
dispositivo) y en horas en punto.

**Cómo quedó:**
- Migración **086**: `business_settings.calendar_start_hour` / `calendar_end_hour` (smallint, 8 y 20 por defecto,
  CHECK 0-23 y start < end). Aplicada en producción el 2026-10-16; tipos regenerados. RLS sin cambios: cualquier
  miembro lee, owner/admin escriben (ensayado por rol: staff lee solo su negocio y no escribe; anon no ve nada).
- Ajustes → tarjeta de automatizaciones de turnos → fila **«Horario del calendario»** con dos `Select` (Desde /
  Hasta, 00:00-23:00; «Hasta» siempre después de «Desde»). Se guarda con el mismo «Guardar cambios».
- `utils/calendar-hours.ts`: `DEFAULT_HOUR_RANGE` y `fitHourRange(range, appts)`. **«Hasta» es la última fila
  incluida** (la fila 14 cubre 14:00-14:59). Los calendarios (`DayCalendar`, `WeekCalendar`) reciben
  `startHour/endHour` desde la página de turnos (`useBusinessSettings`) y **se estiran solos** si un turno del
  día (o de la semana) cae fuera: nunca se oculta un turno.
- Manual: fila «Día» de ambas guías + h3 «Acortar las horas del calendario» en la agenda del dueño, con foto
  `public/images/help/calendar-hours.webp` (19 fotos ya).

**Verificado 2026-10-16** con un negocio desechable (`qa-fixture-tur0002`, borrado al terminar): con 8-14, el día
con un turno a las 16:00 mostró 08-16 y el día siguiente 08-14; la semana 08-16; sin errores de consola.

**Trampas:** la fila de «Hasta» incluida confunde si se piensa en «hora de cierre»: por eso el texto de la tarjeta lo
dice. Si algún día se quiere un rango por día de la semana, la columna `business_hours_config` (JSONB de la 010,
sin uso) ya existe, pero hoy nada la lee.

Relacionado: [[categorias-servicios]] (otro pedido de Aicenis), [[manual-de-usuario]], [[estado-actual-2026-09]].
