---
name: rediseno-v2
description: Rediseño v2 (paquete en docs/design/handoff) — aplicado entero el 2026-10-12 en la rama redesign-v2, sin subir; qué quedó distinto del diseño, decisiones y trampas
metadata:
  type: project
---

Paquete de diseño en `docs/design/` (llegó el 2026-10-12): `handoff/README.md` + `01-TOKENS`, `02-COMPONENTES`,
`03-PANTALLAS`, `04-ASSETS`, los prototipos `.dc.html` (referencia visual, **no** código para copiar) y
`handoff/assets/`. Sustituye al rediseño anterior ([[rediseno-ui-migracion]]): neutros cálidos, un solo verde de
acción (`#147a42`), fucsia solo para WhatsApp/avisos, sin gradientes, Geist + Geist Mono + Instrument Serif,
listas agrupadas, logo «3a».

## Estado (2026-10-12): aplicado, pendiente de la revisión de Roberto

Rama **`redesign-v2`** (desde `main`), con commits por fase, **sin subir ni fusionar** (el push es de Roberto).
Compila, `tsc` y `eslint` limpios, y se revisó con capturas en claro y oscuro.

- **Tokens y fuentes:** `app/globals.css` (mismos nombres de token, valores nuevos), tres fuentes en `app/layout.tsx`.
- **Primitivas** (`components/ui/`): rehechas, más `controls.tsx` (Switch, SearchInput, SegmentedControl,
  FilterChips), `layout.tsx` (PageHeader, SectionLabel, IconTile, EmptyState), `list.tsx` (ListGroup, ListRow,
  TimeBlock) y `spinner.tsx`.
- **Navegación:** `MobileTopbar`, `MobileTabBar` con «Más», `MoreSheet` (reemplaza a `Drawer.tsx`), `Sidebar`,
  `components/nav-items.ts`. Sin botones flotantes.
- **Pantallas:** Inicio, Turnos (lista, detalle, alta, Día y Semana), Servicios, Clientes, Profesionales, Usuarios,
  Organizaciones, Viajes, Recordatorios, acceso (login, registro, recuperar, invitación) y landing + precios.
  `ApptRow`, `ServiceCard`, `CustomerCard`, `StaffCard`, `UserCard`, `OrganizationCard` y `TripCard` conservan el
  nombre pero son filas de `ListGroup`.
- **El resto** (Ajustes, Reportes, Suscripción, Cuenta, Plataforma, detalle de organización, detalle de salida,
  páginas públicas `/book` y `/trips`, formularios) recibió un **barrido de clases**, no un rediseño a mano: sin
  gradientes, sin mayúsculas, escala de texto, pesos, anillos de foco y tintes oscuros nuevos.
- **Marca:** isotipo, favicon, íconos PWA, OpenGraph, `theme-color`, barra de estado, e íconos y splash nativos
  (`scripts/generate-icons.js`, sin dependencias nuevas). **Falta `cap sync` y la APK nueva.**
- **Guía de primeros pasos:** las 8 fotos rehechas. **Manual de `/help`:** textos al día con los nombres y la
  navegación nuevos; su hoja de estilos propia sigue con los colores viejos.

## Decisiones de Roberto (2026-10-12)

- Nombres de estado nuevos: Avisado, Confirmó, Llegó, Terminado, No vino, Reprogramado; acciones «Llegó» →
  «Empezar» → «Terminar» (en el detalle: «Marcar llegada», «Empezar atención», «Terminar»).
  **Ojo:** «Llegó» ya no salta a terminado: `checked_in` pasa a `in_progress`. El botón secundario «Terminar» del
  detalle sigue cerrando de una vez.
- Fuera la grilla de atajos del Inicio. Las tres tipografías se quedan, también en `/book` y `/trips`. Commits por
  fase. Guía y manual se rehacen al final.

## Distinto del diseño, a propósito o por falta de datos

- **Turnos:** ya va como el diseño (2026-10-12, a pedido de Roberto): la lista muestra **un día**, con la tira
  de la semana arriba, filtros agrupados con contador (`FILTER_GROUPS`: Todos, Por atender, En curso, Terminados,
  Cancelados) y el buscador detrás de la lupa, que busca de -7 a +60 días. La semana visible se pide aparte y sin
  filtros (`useAppointmentsQuery`) para los puntitos y los contadores. Queda distinto: en el teléfono la fila no
  muestra el N° de turno, y el estado vacío no dice «Tu página de reservas sigue abierta» (no se sabe si lo está).
- **Clientes:** sin agrupar por inicial (lista virtualizada y paginada); desactivar sigue en el menú de la fila.
- **Inicio:** sin «avisos para mañana» (pide una consulta nueva); hay una tarjeta de pasajes por aprobar.
- **Barra superior:** sin punto fucsia en la campana ni selector de negocio.
- **Landing:** no es solo-clara; funciona en ambos temas (las bandas invertidas usan `bg-inverse`). El mock de
  salida de la sección de pasajes no se hizo; el del hero es un recuadro estático, no una captura.
- **Sin negocio (admin):** la barra de pestañas se sigue mostrando (Inicio + Más).

## Reglas que pidió Roberto el 2026-10-12

- **Cambiar un filtro o un día no redibuja la pantalla:** el encabezado y los controles se quedan y solo la zona
  de datos se atenúa con un indicador (`LoadingRegion` de `components/ui/layout.tsx`, con `busy` =
  `isPlaceholderData`). Para eso la consulta lleva `placeholderData: keepPreviousData`; `useAppointmentsQuery`
  devuelve `stale`. Hecho en Turnos, Recordatorios y Clientes; seguirlo en cualquier lista con filtros en el servidor.
- **Todas las páginas del panel tienen el mismo ancho y el mismo arranque:** contenedor
  `mx-auto max-w-5xl px-5 pb-10 pt-4 lg:px-8 lg:pt-8`, encabezado y contenido por igual, y título con
  `PageHeader` (o `font-display text-display`). Nada de listas más estrechas que su encabezado ni de íconos antes
  del título. `html` lleva `scrollbar-gutter: stable` para que la barra de scroll no corra el contenido.
- **Los mensajes a soporte dicen qué negocio escribe:** `useSupportWhatsAppUrl(tema)` (temas `license`, `help`,
  `plan`, `connect` en `config/constants.ts`) agrega «Mi negocio: <nombre>.». Ya no existen las constantes
  `SUPPORT_WHATSAPP_*_URL`.

## Trampas

- **La fuente no se aplicaba con el `globals.css` del paquete:** `font-family: var(--font-sans)` en `body` se
  resuelve en `:root`, por encima del `<body>` donde next/font define `--font-geist`. El `body` usa
  `var(--font-geist)` directo.
- **`Button`:** variantes `primary`, `secondary` (con borde), `ghost` (transparente), `danger` (con borde),
  `danger-solid` (solo `ConfirmSheet`) y `whatsapp`. Los nombres viejos (`mesh-*`, `soft`, `info`…) ya no existen.
- **«Más» se cierra por ruta, no por clic:** el layout guarda en qué ruta se abrió (`moreOpenAt`). Cerrarlo al tocar
  un enlace haría `history.back()` encima de la navegación (ver `useBackToClose`).
- **`ListGroup` no recorta** (`overflow-hidden` cortaba el menú ⋮ de las filas): redondea la primera y la última.
- **Calendarios:** el bloque usa `--st-tint`; `--st-bg` quedó neutro.
- **Probar:** el `next dev` abierto no recargó el CSS nuevo; se verificó con `npm run build:next` +
  `python -m http.server` sobre `out/` (pararlo antes de recompilar: bloquea `out/`). Para ver, la cuenta demo de
  `scripts/create-review-account.mjs`; para escribir y para las fotos, un negocio `qa-fixture-*` creado con la
  clave de servicio y borrado al terminar (el plan Personal admite 1 profesional: subirlo a `salon` para abrir
  «Nuevo profesional»). `?create=1` no abre el formulario en una carga directa del `.html` exportado.
- **Fotos de la guía:** viewport 520x933 con `document.documentElement.style.zoom = 1.3333` (equivale a 390 de
  ancho), contorno naranja inyectado en el botón clave, y `sharp` a webp calidad 72.
- **431 en `localhost:3000`:** son cookies de Supabase de varios proyectos acumuladas en `localhost`; se arregla
  borrándolas en el navegador.

Relacionado: [[convenciones-de-codigo]], [[preferencias-roberto]], [[manual-de-usuario]].
