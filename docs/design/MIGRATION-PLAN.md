# Plan de migración — Rediseño Claude Design → código real

Este documento mapea **qué hay en `docs/design/`** y **dónde se aplica** en el código real. La meta no es copiar JSX literal (el prototipo usa inline styles + clases `tf-*`; nuestro código usa Tailwind v4 + tokens semánticos `bg-surface`, `text-foreground`, etc.), sino **levantar patrones, layouts, jerarquías y tokens de color** del prototipo y traducirlos a nuestra stack.

---

## 1 · Compatibilidad de base (lo bueno)

Estos puntos del rediseño **encajan tal cual** con el código actual:

| Aspecto | Diseño (`docs/design`) | Código actual | Acción |
| --- | --- | --- | --- |
| Paleta primary (verde) | `--tf-primary-500: #22c55e` | `--color-primary-500: #22c55e` | ✅ Idéntica |
| Paleta secondary (fucsia) | `--tf-secondary-500: #db2777` | `--color-secondary-500: #db2777` | ✅ Idéntica |
| Info / warn / danger | mismos valores hex | mismos valores hex | ✅ Idéntica |
| 9 estados de turno | `pending`, `confirmed`, `reminded`, `client_confirmed`, `checked_in`, `in_progress`, `completed`, `cancelled`, `no_show` | mismas claves en `types/appointment` | ✅ Mapeo directo |
| Roles | `admin` / `owner` / `staff` | mismos | ✅ |
| Iconos Lucide | `Ico.*` (SVG inline estilo Lucide stroke 1.75) | `lucide-react` ya está instalado | ✅ Sustituir directo |

**Conclusión:** podemos reutilizar la **mayoría del trabajo de diseño** sin cambiar tokens base.

---

## 2 · Inventario de los archivos del rediseño

| Archivo | Qué contiene | Reusable como… |
| --- | --- | --- |
| [tf-tokens.css](tf-tokens.css) | Design tokens completos: colores, sombras, radios, badges, botones, mesh gradients, clases por estado `tf-st-*` | **Fuente de verdad** — extender [app/globals.css](../../app/globals.css) |
| [tf-data.js](tf-data.js) | Datos mock + helpers (`fmtMoney`, `fmtDuration`, `addMinutes`, `stats`, `NEXT_ACTIONS`) | Helpers a portar a [utils/](../../utils/) |
| [tf-ui.jsx](tf-ui.jsx) | Atomos: `Ico`, `StatusBadge`, `Avatar`, `Card`, `MobileTopbar`, `MobileTabBar`, `Drawer` | Componentes a crear/reemplazar en [components/ui/](../../components/ui/) |
| [tf-screens-1.jsx](tf-screens-1.jsx) | Landing, Login, Home dashboard (mobile) + `MiniStat`, `DashCard`, `ApptRow` | Plantilla de [app/page.tsx](../../app/page.tsx), [app/login/page.tsx](../../app/login/page.tsx), [app/dashboard/page.tsx](../../app/dashboard/page.tsx) |
| [tf-screens-2.jsx](tf-screens-2.jsx) | Turnos (lista/día/semana), `DayCalendar`, `WeekCalendar`, `ApptModal` | Plantilla de [app/dashboard/appointments/page.tsx](../../app/dashboard/appointments/page.tsx) y [components/calendar/](../../components/calendar/) |
| [tf-screens-3.jsx](tf-screens-3.jsx) | Customers, Services, Staff, Reminders, Organizations, Users, NewOrg | Plantilla del resto del dashboard |
| [tf-desktop.jsx](tf-desktop.jsx) | Sidebar desktop, Home desktop con KPIs y actividad reciente, Appointments desktop con right-rail | Plantilla de [components/Sidebar.tsx](../../components/Sidebar.tsx) y de versiones desktop |
| [ios-frame.jsx](ios-frame.jsx) | Marco iOS para previsualización | ❌ No portar — solo es chrome del prototipo |
| [design-canvas.jsx](design-canvas.jsx), [tf-canvas.jsx](tf-canvas.jsx), [tf-app.jsx](tf-app.jsx), [tweaks-panel.jsx](tweaks-panel.jsx) | Stack de previsualización (tabs prototipo/canvas, panel de tweaks) | ❌ No portar |
| [TurnoFlash Redesign.html](TurnoFlash%20Redesign.html) | Entry point del prototipo | ❌ No portar |

---

## 3 · Cambios al sistema de diseño base

### 3.1 · `app/globals.css` — extender tokens

**Origen:** [tf-tokens.css](tf-tokens.css) líneas 4–66 (light) y 68–97 (dark + densidad + radio).

**Destino:** [app/globals.css](../../app/globals.css)

**Qué añadir:**

1. **Sombras semánticas** (líneas 52–57 del design): `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-primary`, `--shadow-secondary`. Hoy no tenemos sombras tokenizadas — todas son inline.
2. **Radios tokenizados** (líneas 59–62): `--radius`, `--radius-sm`, `--radius-lg`, `--radius-xl` (10/8/14/18 px).
3. **Mesh gradients** (líneas 207–237): `.mesh-primary`, `.mesh-secondary`, `.mesh-info`, `.mesh-warn`, `.mesh-violet` — claves para hero / dashboard cards / FAB.
4. **Clases por estado de turno** (líneas 109–127): `.st-pending` … `.st-no_show` con CSS vars `--c`, `--cb`, `--bg`. **Esto reemplaza la lógica condicional de colores que hoy está repartida** en [components/calendar/DayCalendar.tsx](../../components/calendar/DayCalendar.tsx) y [components/calendar/WeekCalendar.tsx](../../components/calendar/WeekCalendar.tsx).
5. **Surface secundaria** (`--tf-surface-2: #f6f7f9`): hoy hay `--muted-background` y `--subtle-background` (mismo color). Renombrar/dejar el actual y mapear `surface-2 → muted` para no romper nada.

**Atención al detalle:** el prototipo usa **Manrope** como fuente. Hoy usamos **Geist Sans** (variable `--font-geist-sans` en [app/layout.tsx](../../app/layout.tsx)). Decisión a tomar: ¿migramos a Manrope o mantenemos Geist? El diseño está optimizado para Manrope (letter-spacing -0.01/-0.02em), pero Geist también funciona. **Recomendación: mantener Geist** salvo que el resultado visual no convenza.

### 3.2 · Helpers utilitarios

**Origen:** [tf-data.js](tf-data.js) líneas 88–113.

**Destino:** crear [utils/format.ts](../../utils/format.ts) y [utils/appointment-status.ts](../../utils/appointment-status.ts).

- `fmtMoney(n, locale)` — formateo de moneda.
- `fmtDuration(min)` — `90 → "1h 30m"`.
- `timeToMinutes(t)` / `addMinutes(t, mm)` — verificar si ya existen (sospecho que sí en algún lado del flujo de turnos).
- `NEXT_ACTIONS` (líneas 15–25 de `tf-data.js`) — mapa estado actual → acción siguiente. **Esto centraliza la lógica de "¿cuál es el próximo botón a mostrar?"** que hoy probablemente está cableada en [app/dashboard/appointments/page.tsx](../../app/dashboard/appointments/page.tsx).
- `STATUSES` (líneas 3–13) — array con `key`, `label`, `short`, `icon`. **Reemplazaría** cualquier diccionario de labels disperso.

---

## 4 · Componentes nuevos / a reemplazar

### 4.1 · Componentes atómicos a crear en `components/ui/`

Hoy [components/ui/](../../components/ui/) tiene `alert`, `badge`, `button`, `skeleton`. El diseño asume estos extras:

| Nombre | Origen en design | Notas |
| --- | --- | --- |
| `Avatar` | [tf-ui.jsx](tf-ui.jsx) líneas 80–91 | Iniciales sobre fondo de color, sombra interna sutil |
| `StatusBadge` | [tf-ui.jsx](tf-ui.jsx) líneas 66–77 | Badge con dot + label, lee de `STATUSES` |
| `Card` | [tf-ui.jsx](tf-ui.jsx) líneas 94–101 | Wrapper estándar (radius-lg, shadow-sm, border) |
| `MeshTile` | [tf-tokens.css](tf-tokens.css) líneas 207–237 | Cuadrado con gradient mesh + icono blanco — usado en dashboard cards y nav drawer |
| `IconChip` | [tf-tokens.css](tf-tokens.css) líneas 201–205 | Cuadrito 36×36 con surface-2 + icono |
| **Reemplazar** [components/ui/badge.tsx](../../components/ui/badge.tsx) | — | Adaptar a la API de `StatusBadge` (variantes por estado) |
| **Reemplazar** [components/ui/button.tsx](../../components/ui/button.tsx) | [tf-tokens.css](tf-tokens.css) líneas 141–172 | Variantes: `primary` (gradient verde), `secondary` (gradient fucsia), `ghost`, `soft`, `icon` |

### 4.2 · Navegación

| Componente actual | Reemplazo | Origen |
| --- | --- | --- |
| [components/Sidebar.tsx](../../components/Sidebar.tsx) | Sidebar desktop con avatar de usuario + sección admin separada por `<hr>` | [tf-desktop.jsx](tf-desktop.jsx) líneas 4–89 |
| [components/MobileNavbar.tsx](../../components/MobileNavbar.tsx) | `MobileTopbar` (título + subtítulo + botón menú/acción) | [tf-ui.jsx](tf-ui.jsx) líneas 122–146 |
| **NUEVO** | `MobileTabBar` — barra inferior con 5 tabs (Inicio, Turnos, **+** central, Clientes, Avisos), botón central con mesh gradient elevado | [tf-ui.jsx](tf-ui.jsx) líneas 149–201 |
| **NUEVO** | `Drawer` — sidebar móvil que se abre desde el botón menú, con avatar, ítems filtrados por rol y toggle de tema | [tf-ui.jsx](tf-ui.jsx) líneas 204–301 |

> **Decisión clave:** el rediseño introduce **bottom tab bar en mobile** (más nativo, mejor para Capacitor iOS/Android). Hoy usamos drawer-only. Sugiero adoptarlo.

---

## 5 · Pantallas — mapeo 1:1

### 5.1 · Landing
- **Origen:** [tf-screens-1.jsx](tf-screens-1.jsx) líneas 5–140 (`ScreenLanding`).
- **Destino:** [app/home-client.tsx](../../app/home-client.tsx) (cliente) + [app/page.tsx](../../app/page.tsx).
- **Cambios:**
  - Hero con `mesh-primary`, badge tipo "pill" con icono sparkle, h1 grande con kerning negativo.
  - **Mockup flotante** sobre el hero (rotado -1°) que muestra una appointment card real → muy bueno para SEO y demo, replicar.
  - Grid de 6 features (cada uno con `MeshTile` de distinto color).
  - CTA inferior con `mesh-secondary` (fucsia).
  - Footer minimal "© 2026 TurnoFlash · hecho en 🇦🇷" — ajustar al país real.

### 5.2 · Login
- **Origen:** [tf-screens-1.jsx](tf-screens-1.jsx) líneas 143–200 (`ScreenLogin`).
- **Destino:** [app/login/page.tsx](../../app/login/page.tsx).
- **Cambios:**
  - Logo arriba (mesh-primary 56×56 con icono Lightning).
  - Card centrada con título "Bienvenida", labels mayúsculos pequeños, input estándar, toggle de password con `Eye/EyeOff`.
  - Pie: "¿Aún no tenés cuenta? Pedí una invitación" (no signup público).

### 5.3 · Dashboard (Home)
- **Origen:** [tf-screens-1.jsx](tf-screens-1.jsx) líneas 203–343 (mobile) + [tf-desktop.jsx](tf-desktop.jsx) líneas 92–201 (desktop).
- **Destino:** [app/dashboard/page.tsx](../../app/dashboard/page.tsx).
- **Cambios mayores:**
  - **Banner de licencia** al tope (warning soft, con CTA "Renovar"). Hoy ya existe `LicenseNotificationBanner` — reemplazar visual.
  - **Hero stat card**: muestra total del día (38pt) + 4 mini-stats por estado (`MiniStat`) con colores semánticos. **Reemplaza** los cards genéricos de "Información del Usuario" / "Estado" actuales.
  - **Grid de atajos** (5–6 tarjetas con mesh gradient): Turnos, Clientes, Recordatorios, Servicios, Equipo (+Organizaciones para admin).
  - **Próximos turnos** (lista de 3 `ApptRow`) + en desktop, segunda columna con **Actividad reciente**.
  - **Desktop:** añade KPIs (Ocupación 86%, Confirmación WA 92%, Nuevos clientes 14) — datos a calcular o dejar como placeholders inicialmente.

### 5.4 · Appointments (la pantalla más importante)
- **Origen:** [tf-screens-2.jsx](tf-screens-2.jsx) líneas 5–270 (mobile) + [tf-desktop.jsx](tf-desktop.jsx) líneas 220–319 (desktop con right-rail).
- **Destino:** [app/dashboard/appointments/page.tsx](../../app/dashboard/appointments/page.tsx) (1726 líneas — esta es la refactorización más grande).
- **Cambios estructurales:**
  - **Sticky header** con view-switcher (Lista/Día/Semana), barra de búsqueda y chips de filtro horizontales scrollables.
  - **Lista**: grupos por "Mañana" / "Tarde" con `SectionHeader`. Cada turno usa `ApptRow` ([tf-screens-1.jsx:346](tf-screens-1.jsx) líneas 346–384) que tiene:
    - Bloque hora a la izquierda (16pt bold + duración).
    - Separador vertical.
    - Nombre cliente + servicio (con dot de color) + profesional (con dot de color) + nick.
    - `StatusBadge` + **botón pill "Próxima acción →"** (lee de `NEXT_ACTIONS`).
    - **Borde izquierdo de 4px** con el color del estado (vía clase `st-{status}` y CSS var `--c`).
  - **Día**: ver §5.5.
  - **Semana**: ver §5.6.
  - **FAB** (botón flotante) con mesh-primary, redondeo 28px, sombra primary, posicionado bottom-right por sobre la tab bar.
  - **Empty state** con icono calendar + texto "Sin turnos · No encontramos turnos con esos filtros".
  - **Desktop**: 2 columnas — calendario a la izquierda + right-rail (360px) con resumen del día (mini grid de estados), próximo turno, y carga del equipo (avatar + nombre + nº de turnos).

### 5.5 · DayCalendar
- **Origen:** [tf-screens-2.jsx](tf-screens-2.jsx) líneas 162–270.
- **Destino:** [components/calendar/DayCalendar.tsx](../../components/calendar/DayCalendar.tsx) (311 líneas).
- **Cambios:**
  - Header con prev/next/hoy + nombre del día (mayúsculas pequeñas) + fecha en grande.
  - Grilla con rail de horas a la izquierda (44px), líneas dasheadas, sub-líneas dotted cada 30 min.
  - **Indicador "ahora"**: línea horizontal fucsia (`secondary-500`) con dot a la izquierda y label de hora pegado a la derecha.
  - **Bloques de turno**: posicionados absolutos, `borderLeft: 4px var(--c)`, fondo `var(--bg)` (versión clarita del color del estado), texto en `var(--cb)` (versión oscura). Si `h > 40px` muestra también el servicio.
  - **Importante:** la lógica de colores ya no se decide en el componente — se hereda de la clase `st-{status}` que añadimos a [globals.css](../../app/globals.css).

### 5.6 · WeekCalendar
- **Origen:** [tf-screens-2.jsx](tf-screens-2.jsx) líneas 273–386.
- **Destino:** [components/calendar/WeekCalendar.tsx](../../components/calendar/WeekCalendar.tsx) (283 líneas).
- **Cambios:**
  - Header día por día con label corto + número del día (con burbuja verde si es hoy) + contador de turnos.
  - Grilla compacta (HOUR_PX=38), bloques mínimos de 12px, sólo muestra hora.
  - Día actual con fondo `rgba(34,197,94,0.04)`.

### 5.7 · Modal de turno (crear / detalle)
- **Origen:** [tf-screens-2.jsx](tf-screens-2.jsx) líneas 389–533 (`ApptModal`).
- **Destino:** modal en [app/dashboard/appointments/page.tsx](../../app/dashboard/appointments/page.tsx) o extraer a `components/appointments/AppointmentModal.tsx`.
- **Patrón clave:** **bottom sheet en mobile** (radius-tl/tr, drag handle de 40×4px, max-height 85%) y modal centrado en desktop.
- **Modo "create"**: cliente selector → fecha/hora (2 cols) → grid 2×2 de servicios con dot de color → carrusel horizontal de profesionales (chips con dot) → notas → botones "Cancelar / Crear turno".
- **Modo "detail"**: avatar + nombre + tel + StatusBadge → grid 2×3 de detalles (Fecha, Hora, Servicio con dot, Profesional con dot, Duración, Precio) → CTA primario "Próxima acción →" + 3 botones cuadrados (WhatsApp / Editar / Cancelar).

### 5.8 · Customers
- **Origen:** [tf-screens-3.jsx](tf-screens-3.jsx) líneas 5–55.
- **Destino:** [app/dashboard/customers/page.tsx](../../app/dashboard/customers/page.tsx) (590 líneas).
- **Cambios:**
  - Topbar + buscador sticky.
  - **CustomerCard**: avatar 42px → nombre + chip verde "WA" (si tiene WhatsApp) → teléfono + email con iconos pequeños → notas en cursiva si existen → botón `MoreV` (kebab).

### 5.9 · Services
- **Origen:** [tf-screens-3.jsx](tf-screens-3.jsx) líneas 58–134.
- **Destino:** [app/dashboard/services/page.tsx](../../app/dashboard/services/page.tsx) (682 líneas).
- **Cambios:**
  - **ServiceCard** con barra superior de 3px del color del servicio.
  - Cuadrado 44px del color con icono tijera (sustituir por icono apropiado por categoría).
  - Layout: nombre + precio bold a la derecha → duración (con icono clock) + buffer → chips "Reserva online" (info) y "Requiere aprobación" (warning).
  - **Switch toggle** de activo/inactivo (32×18 px, animación translateX) + botón "Editar" con icono.

### 5.10 · Staff
- **Origen:** [tf-screens-3.jsx](tf-screens-3.jsx) líneas 137–184.
- **Destino:** [app/dashboard/staff/page.tsx](../../app/dashboard/staff/page.tsx) (723 líneas).
- **Cambios:**
  - Avatar 48px con **dot verde inferior-derecha** si es `bookable`.
  - Nombre completo + nickname en muted.
  - Chips de especialidades.
  - Indicadores con dot: "Reservable / No reservable" + "Online sí / Online no".

### 5.11 · Reminders
- **Origen:** [tf-screens-3.jsx](tf-screens-3.jsx) líneas 187–284.
- **Destino:** [app/dashboard/reminders/page.tsx](../../app/dashboard/reminders/page.tsx) (454 líneas).
- **Cambios:**
  - **Day chips** verticales (label + fecha apilados): Hoy / Mañana / +2 días / +3 días.
  - **3 stat cards** con mesh gradient: Por enviar (info), Enviados (primary), Tasa de respuesta (secondary).
  - **CTA grande mesh-primary** "Enviar a N clientes ahora" full-width.
  - Lista de turnos con avatar + datos + botón verde pill "Enviar" con icono WhatsApp.

### 5.12 · Organizations (admin)
- **Origen:** [tf-screens-3.jsx](tf-screens-3.jsx) líneas 287–333.
- **Destino:** [app/dashboard/organizations/page.tsx](../../app/dashboard/organizations/page.tsx).
- **Cambios:**
  - Card por organización con icono mesh-info → nombre + chip de licencia (Activa/Por vencer/Vencida con colores semánticos) → slug + owner + miembros → fecha de vencimiento → kebab.

### 5.13 · Users (admin)
- **Origen:** [tf-screens-3.jsx](tf-screens-3.jsx) líneas 336–379.
- **Destino:** [app/dashboard/users/page.tsx](../../app/dashboard/users/page.tsx).
- **Cambios:**
  - Botón "soft" full-width "Invitar nuevo usuario".
  - Cards con avatar + nombre + email + organización + chip de rol uppercase (admin = secondary, owner = primary, staff = info).

### 5.14 · Nueva organización
- **Origen:** [tf-screens-3.jsx](tf-screens-3.jsx) líneas 382–431.
- **Destino:** [app/dashboard/organizations/new/page.tsx](../../app/dashboard/organizations/new/page.tsx).
- **Cambios:** topbar con back chevron, formulario con secciones `Field` (label uppercase pequeño + input), prefijo `turnoflash.com/` para slug, owner como card seleccionable, fechas en 2 cols.

---

## 6 · Orden sugerido de implementación

Pensado para no romper nada en el camino y para que cada PR sea reviewable:

1. ~~**Fundamentos** (`globals.css` + tokens) — sombras, radios, mesh gradients, clases `st-*`. Sin cambios visuales aún. **PR pequeño, alto impacto.**~~ ✅ **Hecho** — surface-2, border-2, foreground-subtle, shadow-glow-primary/secondary, mesh-{primary,secondary,info,warn,violet}, st-{9 estados} con CSS vars `--st-c/--st-cb/--st-bg`.
2. ~~**Atomos UI** — `Avatar`, `StatusBadge` (refactor de `Badge`), `Card`, refactor de `Button` con variantes mesh. Helpers `fmtMoney/fmtDuration` + `STATUSES`/`NEXT_ACTIONS`.~~ ✅ **Hecho** — `Avatar` ([avatar.tsx](../../components/ui/avatar.tsx)), `Card` ([card.tsx](../../components/ui/card.tsx)), `StatusBadge` ([status-badge.tsx](../../components/ui/status-badge.tsx)) consume las clases `.st-*`. `Button` extendido con variantes `mesh-primary`, `mesh-secondary`, `soft` y tamaño `icon` sin romper la API. Helpers nuevos: [utils/format.ts](../../utils/format.ts) (`fmtMoney`, `fmtDuration`, `timeToMinutes`, `addMinutes`) y [utils/appointment-status.ts](../../utils/appointment-status.ts) (`STATUSES`, `NEXT_ACTIONS`, `getStatusMeta`). `Badge` legacy y `config/constants.ts` se mantienen para no romper pantallas no migradas.
3. ~~**Navegación** — `Sidebar` (desktop), `MobileTopbar` + `MobileTabBar` + `Drawer` (mobile). Reemplazar `MobileNavbar` actual.~~ ✅ **Hecho** — `Sidebar` reescrito como desktop-only ([Sidebar.tsx](../../components/Sidebar.tsx)) con tile mesh-primary + avatar block + nav role-filtered + footer tema/logout. Mobile: `MobileTopbar` ([MobileTopbar.tsx](../../components/MobileTopbar.tsx)) sticky con safe-area, `Drawer` ([Drawer.tsx](../../components/Drawer.tsx)) overlay, `MobileTabBar` ([MobileTabBar.tsx](../../components/MobileTabBar.tsx)) con 5 slots y botón "+" central mesh elevado. Layout único en [app/dashboard/layout.tsx](../../app/dashboard/layout.tsx). Eliminados `MobileNavbar.tsx` y `DashboardLayout.tsx` huérfano.
4. ~~**Login + Landing** — pantallas pequeñas, perfectas para probar el sistema.~~ ✅ **Hecho** — Login ([app/login/page.tsx](../../app/login/page.tsx)) con tile mesh-primary del logo, card centrada "Bienvenida", labels uppercase, botón mesh-primary "Ingresar", pie de invitación. Landing ([app/home-client.tsx](../../app/home-client.tsx)) con hero mesh-primary + badge sparkle + mockup `Card` flotante usando `Avatar` y `StatusBadge` reales, grid de 6 features con tiles mesh por categoría, gallery preservada, FAQs como Cards, CTA mesh-secondary con sombra glow. Lógica de auth (`signInWithPassword`, hash callback, useAuth) intacta.
5. ~~**Dashboard home** — hero stat + grid de atajos + próximos turnos. (Mobile primero, desktop después.)~~ ✅ **Hecho** — [app/dashboard/page.tsx](../../app/dashboard/page.tsx) reescrita con `useAppointments({startDate, endDate: hoy})` para datos reales. Hero stat card con total grande + 4 mini-stats (`MiniStat` usando `st-{status}` y `--st-bg/--st-cb`). 8 shortcuts en grid `mesh-*` filtrados por rol y `requiresOrg`. Próximos turnos: top 3 elegibles (pending/confirmed/reminded/client_confirmed) ordenados por hora, usando el nuevo [components/appointments/ApptRow.tsx](../../components/appointments/ApptRow.tsx) (reutilizable en paso 6). Lógica de licencias y bloqueo intactas. KPIs desktop (Ocupación %, WhatsApp %, etc.) **omitidos** — esperaban placeholders y los dejamos para más adelante con queries reales.
6. ~~**Appointments** (refactor más grande):~~ ✅ **Hecho**
   - 6a. ✅ [ApptRow](../../components/appointments/ApptRow.tsx) (lista) — borde izquierdo `--st-c`, time block + cliente + servicio/staff con dots, `StatusBadge` + pill "Próxima acción →".
   - 6b. ✅ [DayCalendar](../../components/calendar/DayCalendar.tsx) — header día (uppercase) + fecha grande + contador, hour rail 44px, líneas dasheadas + dotted half-hour, indicador "ahora" fucsia, bloques con `st-{status}` (border-l 4px `--st-c`, bg `--st-bg`, texto `--st-cb`).
   - 6c. ✅ [WeekCalendar](../../components/calendar/WeekCalendar.tsx) — headers compactos con burbuja del día (verde si hoy), `HOUR_PX=40`, día actual con tinte verde, bloques mínimos con clases `st-*`.
   - 6d. ✅ [AppointmentModal.tsx](../../components/appointments/AppointmentModal.tsx) — wrapper `Sheet` (bottom-sheet en mobile con drag handle + radius-tl/tr + max-h 85vh; modal centrado en desktop). `AppointmentCreateModal` con `Field` uppercase, services como grid 2x2 con dots, staff como carrusel de chips. `AppointmentDetailModal` con avatar + StatusBadge, grid 2x3 (Fecha/Hora/Servicio/Profesional/Duración/Precio), CTA `mesh-primary` "Próxima acción →" (vía `NEXT_ACTIONS`) + `ActionTile`s (WhatsApp/No vino/Cancelar).
   - 6e. ✅ [appointments/page.tsx](../../app/dashboard/appointments/page.tsx) — sticky header con título + view-switcher segmentado (Lista/Día/Semana), buscador + chips horizontales scrollables, lista agrupada por fecha (Hoy/Mañana/día) con sub-secciones Mañana/Tarde, FAB mesh-primary mobile, botón "Nuevo turno" desktop. Eliminados `AppointmentCard` inline y los modales legacy. Lógica intacta: `useInfiniteAppointments`, `useNormalizedData`, mutations de status/recordatorio/cliente.
7. ~~**Customers / Services / Staff** — son CRUD parecidos, se pueden hacer en paralelo o consecutivos.~~ ✅ **Hecho**
   - **UI compartida extraída** a [components/ui/sheet.tsx](../../components/ui/sheet.tsx): `Sheet` (bottom-sheet móvil con drag handle + radius-tl/tr + max-h 85vh; modal centrado en desktop), `Field` (label uppercase + content), `sheetInputClasses` (estilo común para inputs/selects/textareas). [AppointmentModal](../../components/appointments/AppointmentModal.tsx) ahora consume el `Sheet` extraído.
   - **Customers** ([customers/page.tsx](../../app/dashboard/customers/page.tsx)): sticky header (titulo + subtitulo con conteo y filtro) + buscador. Lista virtualizada con [CustomerCard](../../components/customers/CustomerCard.tsx) (avatar de color por hash del id, chip "WA" si tiene WhatsApp, phone+email con iconos, notas en cursiva, kebab con menú Editar/Desactivar). [CustomerFormModal](../../components/customers/CustomerFormModal.tsx) como bottom-sheet con campos en grid 2-col + checkbox activo. FAB mesh-primary mobile + botón "Nuevo cliente" desktop.
   - **Services** ([services/page.tsx](../../app/dashboard/services/page.tsx)): sticky header + buscador, grid 1/2/3-col responsive de [ServiceCard](../../components/services/ServiceCard.tsx) (barra superior 3px del color del servicio, cuadrado 44px del color con icono, precio bold a la derecha, duración + buffer + chips "Reserva online"/"Requiere aprobación"/"Pausado", switch toggle activo + botón Editar). Eliminada la query con `isActive: true` para mostrar también pausados. [ServiceFormModal](../../components/services/ServiceFormModal.tsx) con grid de duración/buffer/precio + color picker + checkboxes.
   - **Staff** ([staff/page.tsx](../../app/dashboard/staff/page.tsx)): sticky header + buscador, grid 1/2/3-col de [StaffCard](../../components/staff/StaffCard.tsx) (avatar 48px con dot verde inferior-derecha si bookable + activo, nombre + apodo, chips de especialidades, indicadores con dot "Reservable"/"Online sí/no", kebab con Editar/Pausar/Eliminar). [StaffFormModal](../../components/staff/StaffFormModal.tsx) con grids 2-col, hint para CSV de especialidades, color picker, 3 toggles.
   - **Lógica de negocio intacta** en los tres: `useInfiniteCustomers` / `useServicesQuery` / `useStaffQuery`, mutations de create/update/(de)activate/delete, debounced search, permisos por rol (admin/owner) en services/staff. Reducción combinada: ~1995 → ~970 líneas en las 3 pages, con cards y modales reusables.
8. ~~**Reminders** — depende de chips de día y stat cards, ya disponibles en paso 2.~~ ✅ **Hecho** — [reminders/page.tsx](../../app/dashboard/reminders/page.tsx) reescrita: sticky header con título + subtítulo (`{N} por enviar`) + day chips horizontales scrollables (Hoy/Mañana/+2/+3 días) con label arriba y fecha debajo. 3 stat cards mesh: `Por enviar` (mesh-info), `Enviados` (mesh-primary), `Tasa de respuesta` (mesh-secondary, calculada como `client_confirmed / sent`, `—` si no hay enviados). CTA `mesh-primary` full-width "Enviar a N clientes ahora" con tracking de batch (success/failed). `ReminderRow` (avatar + nombre + hora·servicio + pill verde "Enviar" con icono WhatsApp y `shadow-glow-primary`). EmptyState propio. Hook `useSendReminder` (consistente con AppointmentDetailModal); `useAppointments` con statuses `[pending, confirmed, reminded, client_confirmed]` para que el contador de "Enviados" y la tasa funcionen sin queries extra. Permisos por rol mantenidos.
9. **Admin (Organizations / Users / NewOrg)** — al final, son los menos usados.

---

## 7 · Cosas a NO copiar literal

- **Inline styles del prototipo**: el design genera todo con `style={{...}}` para ser portátil sin Tailwind. Nosotros traducimos a clases Tailwind v4 + tokens semánticos (`bg-surface`, `text-foreground`, `border-border`, `rounded-lg`, `shadow-sm`, etc.). Excepción: gradients mesh que necesitan vars CSS específicas → mantenerlos como clases utilitarias en [globals.css](../../app/globals.css).
- **Datos mock** de [tf-data.js](tf-data.js): es solo para el prototipo. Nosotros leemos de Supabase.
- **Componentes de previsualización** (`ios-frame.jsx`, `tweaks-panel.jsx`, `design-canvas.jsx`, `tf-canvas.jsx`, `tf-app.jsx`): ignorar, son chrome del playground.
- **Fechas hardcodeadas** ("Martes 5 may", "8 días"): reemplazar con `date-fns` (ya está en `package.json`).
- **Datos del banner de licencia**: usar lo que ya viene de [utils/license.ts](../../utils/license.ts).
- **Manrope font**: opcional. Geist Sans funciona bien con el resto del sistema.

---

## 8 · Riesgos / decisiones que requieren tu OK

1. **Bottom tab bar en mobile** — cambia el modelo de navegación. Implica que el menú "drawer" pasa a ser secundario (accesible vía botón menú en la topbar, no via swipe). ¿Lo adoptamos? R: Si adáptalo
2. **Reescritura de `appointments/page.tsx`** — son 1726 líneas. Es la pantalla núcleo. Sugiero hacerlo **detrás de un feature flag** o en una rama larga, no en main directamente.
3. **Mesh gradients vs cards planos** — el prototipo permite alternar (`tweaks-panel` ofrece `cardStyle: gradient | flat`). Mi recomendación: **gradient en home dashboard** (atajos + KPIs) y **flat en el resto** (listas, formularios) para no saturar. R: vale, hacemos lo q sugieres
4. **Manrope vs Geist** — sin urgencia, decidir más adelante viendo cómo queda.
5. **WhatsApp como tasa de respuesta 92%** y otros KPIs del dashboard desktop — son placeholders. ¿Tenemos las queries de backend para calcularlos o los dejamos hardcoded por ahora? R: busca si podemos hacer queries para esto

---

## 9 · Resumen ejecutivo

- ✅ **Sí** podemos usar el rediseño tal cual planeado. Compatibilidad ~95% (mismos tokens, mismos estados, mismos roles).
- ⚠️ **No** copiamos JSX/CSS literal: traducimos a Tailwind v4 + componentes existentes.
- 🎯 **Camino más corto a valor**: pasos 1-3 (tokens + atomos + navegación) ya cambian el aspecto general sin tocar lógica de negocio.
- 🧱 **Trabajo más grande**: refactor de `appointments/page.tsx` (paso 6) — sugiero rama larga + flag.
