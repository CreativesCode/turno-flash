---
name: rediseno-ui-migracion
description: Rediseno de UI (prototipo docs/design → codigo) — COMPLETO (9/9) desde 2026-09-10; decisiones cerradas y patrones a mantener
metadata:
  type: project
---

El rediseno vive en `docs/design/` (prototipo JSX con inline styles + clases `tf-*`) y se
porta a Tailwind v4 + tokens semanticos siguiendo
[docs/design/MIGRATION-PLAN.md](../../docs/design/MIGRATION-PLAN.md). **Nunca copiar el JSX
literal**: se levantan patrones, layouts y tokens, no codigo.

Orden del plan y estado:

1-8. ✅ Hechos: tokens (`st-*`, `mesh-*`, sombras, radios), atomos UI (`Avatar`, `Card`,
`StatusBadge`, `Button` con variantes mesh, `Sheet`/`Field`), navegacion (Sidebar desktop +
Topbar/Drawer/TabBar mobile), login y landing, dashboard home, appointments (page + Day/Week
calendar + modales), customers/services/staff, reminders.

9. ✅ Hecho (2026-09-10): pantallas de admin — Organizations (`OrganizationCard`), Users (`UserCard` +
`InviteUserSheet`) y NewOrg. Tambien (fuera del plan original) `/dashboard/organizations/details`
(`OrganizationEditSheet` + `AddMemberSheet`) e `/dashboard/invite`. Todo el admin esta migrado. El prefijo `turnoflash.com/` del slug en NewOrg es decorativo: la
reserva publica `/book/[slug]` aun no existe.

## Decisiones ya tomadas (no volver a preguntarlas)

- Bottom tab bar en mobile: **adoptada**; el drawer queda como navegacion secundaria.
- Mesh gradients: **solo en el home del dashboard**; listas y formularios planos.
- Fuente: se mantiene **Geist Sans** (el prototipo usaba Manrope; sin urgencia de cambiar).
- Los KPIs "de placeholder" del desktop (ocupacion %, tasa WhatsApp) debian resolverse con
  queries reales — de ahi salieron las RPC de analitica de la migracion 022.

Efecto colateral del rediseno: las tres pages CRUD pasaron de ~1995 a ~970 lineas
extrayendo cards y modales reusables. Mantener ese patron al tocar pantallas nuevas.

Relacionado: [[convenciones-de-codigo]], [[estado-actual-2026-09]].
