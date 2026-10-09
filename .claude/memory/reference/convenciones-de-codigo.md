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
Patron correcto: `toDateTimeInput` en `app/(app)/dashboard/organizations/details/page.tsx`.

Consultas de listas: **nunca N+1 por fila**. Traer las filas relacionadas en una sola query y agrupar
en el cliente (patron en `app/(app)/dashboard/organizations/page.tsx`: orgs + `user_profiles` con
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

## Helpers agregados en la campaña QA del piloto (2026-10-06)

- **`useStepHistory(initial)`** (`hooks/`): flujos de varios pasos en los que el botón Atrás del
  teléfono vuelve un paso. `go()` avanza, `replace()` cambia sin crear entrada (resultados) y
  `back(n)`. Lo usan `/book` y `/trips`.
- **`useBackToClose(open, onClose)`** (`hooks/`): ya está dentro de `Sheet` y `Drawer`, así que
  Atrás cierra la hoja de arriba. Si una hoja **navega** a otra pantalla, hay que llamar antes al
  `release` que devuelve el hook.
- **`useRequestKey()`** (`hooks/`): clave de idempotencia para una reserva pública; se reutiliza
  mientras no cambie la elección.
- **`utils/phone.ts`** (`toInternationalPhone`, `nationalDigits`, `DEFAULT_COUNTRY_CODE = "+53"`):
  todo teléfono que se guarda pasa por aquí. Es la misma regla que `booking_phone_key` (SQL) y
  `phoneToChatId` (Edge).
- **`capacityError()`** (`services/trip-bookings.service.ts`): traduce los errores de cupo de la
  migración 053.
- **Guardas de doble toque**: un `savingRef` que se comprueba antes del primer `await` en los
  `handleSave` de los formularios que crean filas.
- **Edge Functions**: `isServiceRole()` (`_shared/auth.ts`) en toda función que no deba llamar un
  anónimo, y `frameCustomerMessage()` (`_shared/wa-message.ts`) en todo mensaje de WhatsApp a un
  cliente.
- **Errores de restricciones de la BD** que se traducen en la app: `23P01` = turno solapado (049),
  `seats_below_taken:N` / `no_seats_left:N` (053), `booking_window_closed` (039).

## Helpers y reglas del cierre de P2 (2026-10-06)

- **`useSessionState(key, initial)`** (`hooks/`): `useState` que sobrevive a una recarga de la pestaña
  (sessionStorage). Lo usan los flujos públicos; una clave por campo (`booking:<slug>:service`…).
- **`useCreateParam(onCreate, ready)`** (`hooks/`): abre el formulario de alta con `?create=1` y limpia la URL.
  Lo tienen Turnos, Viajes, Servicios y Profesionales. Necesita `<Suspense>` arriba (usa `useSearchParams`):
  el patrón es `function XContent()` + `export default function XPage()` que lo envuelve.
- **Datos que deben verse sin señal:** agregar la raíz de su query key a `PERSISTED_ROOTS`
  (`contexts/query-client-provider.tsx`). Nunca huecos, asientos ni clientes. Las mutaciones no se encolan.
- **`OfflineBanner`** (`components/offline-banner.tsx`): ya está en el layout del panel; no repetir avisos
  de "sin conexión" por pantalla.
- **`useSetupProgress` + `OnboardingService`**: progreso de la guía de primeros pasos; los pasos y sus
  textos están en `STEPS` de `components/onboarding/SetupGuide.tsx` y las fotos en `public/images/guide/`.
- **Páginas públicas (`/book`, `/trips`):** están fuera de `app/(app)/`, sin `AuthProvider`. No usar `useAuth`,
  no importar `utils/supabase/client` ni el barril `@/hooks`, y cargar Zod con `import()` (ver
  `loadCustomerSchema` en `components/booking/BookingSteps.tsx`). Detalle en [[arquitectura-static-export]].
- **Texto para el dueño o el cliente:** frases cortas, nombrar los botones tal como se ven («Crear servicio»)
  y, si es una guía, con foto real de la pantalla ([[preferencias-roberto]]).

## Helpers y reglas del cierre de P3 (2026-10-08)

- **`Field` (`components/ui/sheet.tsx`)** enlaza solo la etiqueta con su primer hijo (`useId` + `cloneElement`): no
  pasar `htmlFor`. Si el primer hijo es un contenedor, la etiqueta queda apuntando a él y no hace nada (aceptado).
- **Dinero:** `fmtMoney` fuerza el separador de miles. Reportes y gráficos usan `useMoney()`; ya no existe
  `formatMoney` en `components/analytics/widgets.tsx`. En las edge functions, la misma regla a mano.
- **Rol visible:** `ROLE_META[role].label` (`components/users/UserCard.tsx`), nunca el valor crudo.
- **Estado de turno visible:** `getStatusLabel()` de `config/constants.ts`.
- **Páginas públicas:** `components/booking/BusinessInfo.tsx` (`BusinessContactLink`, `BusinessTimeNote`);
  `focusNextOnEnter`, `stickyActionClasses` y `stickyActionStyle` en `BookingSteps.tsx` para todo formulario de un
  paso público.
- **Apellido opcional en todas partes** (reserva pública, ficha de cliente, alta rápida en un turno). Mostrar el
  nombre con `` `${first} ${last}`.trim() ``.
- **Lista de turnos:** estado, texto y «Mis turnos» se filtran **en el servidor** vía los filtros de
  `useInfiniteAppointments` (`status`, `search`, `staffId`), y solo en vista Lista; los calendarios traen todo.
  El texto pasa por un saneado de caracteres de PostgREST antes del `.or(...)`.
- **Cambios de estado:** `updateStatus` agrega `.eq("status", estadoValidado)`; 0 filas puede ser licencia,
  permiso o «alguien lo cambió».
- **Módulos:** `MODULE_ROUTES` en `app/(app)/dashboard/layout.tsx` lista las rutas de cada módulo; una sección
  nueva de un módulo se agrega ahí además de en `Sidebar`/`Drawer`.
- **Tema:** solo se guarda en `localStorage` cuando el usuario lo elige (`userChose` en `theme-context`).
- **Soporte:** `SUPPORT_WHATSAPP_URL` (licencia) y `SUPPORT_WHATSAPP_CONNECT_URL` (pedir conexión de WhatsApp) en
  `config/constants.ts`.
- **Consultas sueltas:** la lista de negocios para invitar vive en `InvitationService.listOrganizations()`; el
  equipo, en `TeamService.listStaff()` con la query key `["team", orgId]` (compartida por TeamCard y Profesionales).
- **Lint:** quedan errores previos en `theme-context` (setState en efecto), `appointments.service` (3 `any`) y el
  aviso de `roleLabel` sin uso en `dashboard/page.tsx`. No son de este trabajo; no «arreglarlos» de paso.
