---
name: actividad-por-negocio
description: TUR0006 — el admin ve cuánto usa la app cada negocio (tarjeta «Actividad», línea en la lista, reporte completo con ?org=)
metadata:
  type: project
---

TUR0006 (pedido de Roberto) **implementado 2026-10-19**, migración **089** en producción. **Roberto lo subió y lo dio por bueno el 2026-10-19** (`eac99ce`); TUR0006 en Hecho y despliegue registrado en Tasknic (web sin verificar en Vercel, migración verificada).

- **Ficha de la organización** (solo admin): tarjeta «Actividad» con 30 días / 90 días / Siempre
  (`components/organizations/OrgActivityCard.tsx`). Turnos por estado, online vs panel, ingresos,
  pasajes (si el módulo está), clientes, WhatsApp enviados, cuándo entró el dueño, último turno/pasaje
  y profesionales/servicios activos.
- **Lista de organizaciones:** una línea por negocio («63 turnos · 20 pasajes · último 06 oct 2026»).
- **Reporte completo:** `/dashboard/reports?org=<id>`, solo admin. Antes el admin no veía Reportes
  (no tiene negocio propio). `useOrganizationModules(orgId?)` y `useMoney(orgId?)` aceptan otro negocio
  para que la moneda sea la suya (también en los gráficos).
- **SQL:** `get_admin_organization_activity(org, start?, end?)` y `get_admin_organizations_activity()`,
  SECURITY DEFINER con `is_platform_admin()`; sin `anon`. Sin fechas = desde siempre.
- **Definiciones:** «Aceptados» = ni `pending` ni `cancelled` (no hay historial de estados, solo el actual;
  incluye `no_show`). Períodos por fecha del turno / de la salida, igual que el reporte del dueño, para
  que coincidan. «Clientes» cuenta también los desactivados (si no, «nuevos» superaba al total).
- **Verificado** con un admin temporal (creado con la clave de servicio y borrado) contra «Organización
  test»: cifras iguales a la consulta directa, sin errores de consola, sin desborde a 390 px.
- El manual `/help` no cambia: no cubre el panel de admin.
