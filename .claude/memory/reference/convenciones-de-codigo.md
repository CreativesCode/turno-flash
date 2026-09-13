---
name: convenciones-de-codigo
description: Donde va cada cosa en turno-flash — service layer, hooks de React Query, schemas Zod, sistema de diseno (tokens st-*/mesh-*) y componentes ui
metadata:
  type: reference
---

Patrones ya establecidos en el repo. Seguirlos; no inventar capas nuevas.

## Capas

- `services/<dominio>.service.ts` — **clases estaticas** con toda la logica de negocio y
  acceso a Supabase. Contrato de retorno uniforme: `{ success: boolean; error?: string; data?: T }`.
  Nunca poner queries de Supabase sueltas dentro de componentes.
- `hooks/use<Dominio>.query.ts` — capa de **TanStack Query v5** sobre los services
  (`useAppointments.query.ts`, `useCustomers.query.ts`, `useServices.query.ts`,
  `useStaff.query.ts`, `useAnalytics.query.ts`, `useBusinessSettings.query.ts`).
  Hay listas infinitas (`useInfiniteAppointments`, `useInfiniteCustomers`) y updates
  optimistas; al tocar cache respetar `hooks/useNormalizedData.ts` y `utils/normalized-state.ts`.
- `hooks/useRealtimeTable.ts` / `useRealtimeEntities.ts` — Supabase Realtime (migracion 020).
- `schemas/*.schema.ts` — **Zod v4**, compartido entre formulario (react-hook-form) y service.
- `types/database.types.ts` — generado por el CLI de Supabase; no editar a mano ([[turno-flash-tooling]]).
- `utils/logger.ts` — logging centralizado (`Logger`), usado en services y hooks.

## Sistema de diseno (Tailwind v4, sin `tailwind.config`)

Todos los tokens viven en `app/globals.css` bajo `@theme inline`:

- Semanticos: `--background`, `--surface`, `--surface-2`, `--border`, `--border-2`,
  `--foreground`, `--foreground-muted`, `--foreground-subtle`.
- Marca: primary verde `#22c55e`, secondary fucsia `#db2777`.
- **`.st-<estado>`** (9 estados de turno) exponen `--st-c` / `--st-cb` / `--st-bg`.
  Es la unica fuente de color de estado: **nunca** condicionales de color en componentes.
- **`.mesh-{primary,secondary,info,warn,violet}`** + `--shadow-glow-*` para tiles/CTAs.
  Criterio acordado: **gradientes mesh en el home del dashboard; flat en listas y formularios.**
- Dark mode por clase (`@custom-variant dark (&:where(.dark, .dark *))`), no por
  `prefers-color-scheme`. Toggle en `contexts/theme-context.tsx`.

## Componentes

`components/ui/` tiene las primitivas: `Sheet` (bottom-sheet en mobile, modal centrado en
desktop) + `Field` + `sheetInputClasses`, `Card`, `Avatar`, `StatusBadge`, `Button`
(variantes `mesh-primary`, `mesh-secondary`, `soft`, size `icon`), `KebabMenu` (menu de tres puntos
de las cards) y `ConfirmSheet` (confirmacion destructiva). **Usar `ConfirmSheet` en vez de `confirm()` o de
modales `fixed` a mano** (adoptados en todo el dashboard desde 2026-09-10). Invitaciones por email:
`InvitationService.invite(email, orgId?)` en `services/invitations.service.ts`; no llamar a la edge
function `invite-user` a mano desde las paginas.

Inputs `datetime-local`: el valor debe ser **hora local**, nunca `toISOString().slice(0,16)` (eso es
UTC y al guardar `new Date(valor)` lo lee como local → la fecha se corre el offset en cada guardado).
Patron correcto: `toDateTimeInput` en `app/dashboard/organizations/details/page.tsx`.

Consultas de listas: **nunca N+1 por fila**. Traer las filas relacionadas en una sola query y agrupar
en el cliente (patron en `app/dashboard/organizations/page.tsx`: orgs + `user_profiles` con
`organization_id` no nulo en `Promise.all`, luego `Map` por org). Si crece mucho, pasar a RPC agregada
como las de analitica (migracion 022). El resto se agrupa por
dominio (`appointments/`, `calendar/`, `customers/`, `services/`, `staff/`, `analytics/`).
Navegacion: `Sidebar` (desktop) + `MobileTopbar` + `Drawer` + `MobileTabBar` (5 slots con "+" central).

Helpers de formato: `utils/format.ts` (`fmtMoney`, `fmtDuration`, `timeToMinutes`, `addMinutes`),
fechas con date-fns/date-fns-tz (`utils/date.ts`). `recharts` siempre via `next/dynamic`.

Relacionado: [[arquitectura-static-export]], [[rediseno-ui-migracion]].

## Primitivas y helpers agregados (2026-09-12)

- **`Select` (`components/ui/select.tsx`)**: todo `<select>` nuevo va con esta primitiva. El
  select nativo dibuja su flecha pegada al borde ignorando el padding; `Select` la tapa con
  `appearance-none` y dibuja un `ChevronDown` alineado. Acepta `wrapperClassName` para que el
  contenedor participe de un flex.
- **`RichTextEditor` / `RichText`**: texto con marcas de WhatsApp (`*negrita*`, `_cursiva_`,
  `~tachado~`, `\`\`\`mono\`\`\``). `RichText` renderiza elementos de React, nunca HTML.
- **`useMoney()`**: formatea en la moneda de la organizacion. **Ningun importe del dashboard se
  formatea llamando a `fmtMoney` sin moneda**; en las paginas publicas la moneda llega en el
  payload de la edge function.
- **`utils/image.ts` (`downscaleImage`)**: toda foto se achica en el navegador antes de subirla
  a Storage.
