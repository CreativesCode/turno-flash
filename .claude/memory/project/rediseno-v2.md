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

Rama **`redesign-v2`** (creada desde `main`; **sin commits todavía**, todo en el árbol de trabajo).

- **Fase 1 hecha:** `app/globals.css` (tokens nuevos, mismos nombres), fuentes en `app/layout.tsx`,
  `manifest.json`, y `primary-500` → `primary` en 33 archivos.
- **Fase 2 hecha:** primitivas de `components/ui/` rehechas y nuevas: `controls.tsx` (Switch, SearchInput,
  SegmentedControl, FilterChips), `layout.tsx` (PageHeader, SectionLabel, IconTile, EmptyState), `list.tsx`
  (ListGroup, ListRow, TimeBlock), `spinner.tsx`. Todavía casi sin usar en las pantallas.
- **Fase 3, la navegación, hecha:** `MobileTopbar` (logo, negocio, campana, avatar), `MobileTabBar` con «Más»,
  `MoreSheet` (reemplaza a `Drawer.tsx`, borrado), `Sidebar`, `components/nav-items.ts` compartido, y los 5
  botones flotantes de crear eliminados.
- **Falta:** quitar los `mesh-*` del JSX (~116 usos en 47 archivos), Fase 4 (Inicio, Turnos, detalle, Servicios,
  Clientes, resto de listas, login/registro, landing) y Fase 5 (íconos, favicon, OpenGraph, Capacitor).

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
