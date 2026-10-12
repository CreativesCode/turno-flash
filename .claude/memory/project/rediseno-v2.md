---
name: rediseno-v2
description: Rediseño v2 (paquete en docs/design/handoff) — fases 1-3 aplicadas en la rama redesign-v2 el 2026-10-12; qué falta y trampas encontradas
metadata:
  type: project
---

Paquete de diseño nuevo en `docs/design/` (llegó el 2026-10-12): `handoff/README.md` + `01-TOKENS`,
`02-COMPONENTES`, `03-PANTALLAS`, `04-ASSETS`, `handoff/globals.css`, los prototipos `.dc.html` (referencia
visual, **no** código para copiar) y `handoff/assets/`. Sustituye al rediseño anterior ([[rediseno-ui-migracion]]):
neutros cálidos, un solo verde de acción (`#147a42`), fucsia solo para WhatsApp/avisos, sin gradientes,
Geist + Geist Mono + Instrument Serif, listas agrupadas, logo «3a». El plan por fases es el del propio README.

## Estado (2026-10-12)

Rama **`redesign-v2`** (creada desde `main`), **con commits por fase** y sin subir (el push es de Roberto).

- **Fase 1 hecha:** `app/globals.css` (tokens nuevos, mismos nombres), fuentes en `app/layout.tsx`,
  `manifest.json`, y `primary-500` → `primary` en 33 archivos.
- **Fase 2 hecha:** primitivas de `components/ui/` rehechas y nuevas: `controls.tsx` (Switch, SearchInput,
  SegmentedControl, FilterChips), `layout.tsx` (PageHeader, SectionLabel, IconTile, EmptyState), `list.tsx`
  (ListGroup, ListRow, TimeBlock), `spinner.tsx`. Todavía casi sin usar en las pantallas.
- **Fase 3, la navegación, hecha:** `MobileTopbar` (logo, negocio, campana, avatar), `MobileTabBar` con «Más»,
  `MoreSheet` (reemplaza a `Drawer.tsx`, borrado), `Sidebar`, `components/nav-items.ts` compartido, y los 5
  botones flotantes de crear eliminados.
- **Fase 4, a medias:** hechos Inicio (saludo por hora, resumen con barra, «Ahora», «Próximos»; sin atajos),
  la lista de Turnos, Servicios y Clientes. `ApptRow`, `ServiceCard` y `CustomerCard` conservan el nombre pero
  ya son filas de `ListGroup`.
- **Fase 5, parte web hecha:** isotipo, favicon, íconos PWA, apple-touch, OpenGraph, `theme-color` y barra de
  estado nativa.
- **Falta:** detalle y alta de turno (`AppointmentModal`), calendarios Día/Semana, Profesionales, Usuarios,
  Organizaciones, Recordatorios, Viajes, login/registro, quitar los `mesh-*` que quedan y sus clases, la landing
  (al final), íconos y splash nativos, y **rehacer toda la guía de primeros pasos y el manual** al terminar.

## Decisiones de Roberto (2026-10-12)

- Nombres de estado nuevos aprobados: Avisado, Confirmó, Llegó, Terminado, No vino, Reprogramado; acciones
  «Llegó» → «Empezar» → «Terminar». **Ojo:** «Llegó» ya no salta a terminado: `checked_in` pasa a `in_progress`.
  El botón «Terminar» del detalle sigue cerrando de una vez.
- Fuera la grilla de atajos del Inicio. Landing al final. Las tres tipografías se quedan, también en `/book` y
  `/trips`. Commits por fase. Guía y manual se rehacen enteros al terminar, no pantalla a pantalla.

## Pendiente dentro de lo ya hecho

- Turnos: los filtros siguen siendo de un solo estado (el diseño los agrupa en «Por atender», etc., y eso pide
  tocar la consulta); no hay tira de días ni contadores en los filtros; el buscador sigue visible.
- Clientes: sin agrupar por inicial (la lista es virtualizada y paginada); desactivar sigue en el menú de la fila.
- Inicio: sin la tarjeta «avisos para mañana» (pide una consulta nueva). En su lugar hay una de pasajes por
  aprobar, que antes vivía en los atajos.
- La cuenta demo no tiene turnos de hoy: las filas de turno y la tarjeta «Ahora» **no se vieron con datos**.

## Trampas

- **La fuente no se aplicaba con el `globals.css` del paquete:** `font-family: var(--font-sans)` en `body` se
  resuelve en `:root`, por encima del `<body>` donde next/font define `--font-geist`, y queda vacío. El `body`
  usa `var(--font-geist)` directo.
- **Nombres de variante de `Button`:** `secondary` ahora es el botón con borde (antes fucsia) y `ghost` es
  transparente. Los 24 `variant="ghost"` viejos se renombraron a `secondary`; `mesh-primary`, `soft`, etc.
  siguen como alias en `ALIASES` de `button.tsx`. `danger` es con borde; el rojo sólido es `danger-solid`
  (solo `ConfirmSheet`).
- **«Más» se cierra por ruta, no por clic:** el layout guarda en qué ruta se abrió (`moreOpenAt`). Cerrar el
  sheet al tocar un enlace haría `history.back()` encima de la navegación (ver `useBackToClose`).
- **Sin negocio (admin) la barra de pestañas se sigue mostrando** (Inicio + Más): sin la hamburguesa era la
  única forma de llegar al menú.
- **Probar:** el `next dev` que ya estaba abierto no recargó el CSS nuevo; se verificó con `npm run build:next`
  + `python -m http.server` sobre `out/`, entrando con la cuenta demo de `scripts/create-review-account.mjs`
  (Barbería Demo), solo mirando.
- No se puso el punto fucsia de la campana ni el selector de negocio de la barra superior: piden datos que hoy
  no hay.

Relacionado: [[convenciones-de-codigo]], [[preferencias-roberto]].
