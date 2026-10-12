# Handoff · TurnoFlash Rediseño v2

> **Para Claude Code:** este documento es autosuficiente. Léelo entero antes de tocar código. Después lee `01-TOKENS.md`, `02-COMPONENTES.md` y `03-PANTALLAS.md` en ese orden. Trabaja **por fases**, una por PR o commit, y no pases a la siguiente sin que compile (`npm run build`) y sin revisar visualmente en claro y en oscuro.

## Prompt para pegar en Claude Code
```
Descomprimí el zip del rediseño en <ruta-del-zip>. Lee <ruta-del-zip>/handoff/README.md
y los archivos 01–04 de esa carpeta. Copia la carpeta handoff y los .dc.html a
docs/design/v2/ del repo. Después implementa la Fase 1 en la rama redesign-v2,
corre npm run build y muéstrame qué cambió. No avances a la siguiente fase sin mi OK.
```
Para cada fase siguiente basta con: "Sigue con la Fase N según docs/design/v2/README.md".

## Overview
Rediseño visual completo de TurnoFlash (Next.js 15 · Tailwind v4 · Capacitor). El objetivo es que la app se vea **profesional y sobria**:
- neutros cálidos y un solo color de acción (verde `#147a42`);
- el fucsia `#c4206a` solo para WhatsApp, avisos y "ahora";
- sin gradientes ni sombras de color;
- tipografía Geist + Geist Mono, con Instrument Serif para títulos;
- listas agrupadas con divisores en lugar de una card por ítem;
- un solo botón de "crear";
- logo nuevo (isotipo "3a": dos filas inclinadas + punto fucsia).

El rediseño se aplica **desde los tokens y los componentes**, no vista por vista: primero cambian los valores de los tokens (mismos nombres), después las primitivas de `components/ui/` y la navegación. Con eso se transforma ~80% de la app. Al final se ajustan las pantallas que tienen layout propio.

## Sobre los archivos de diseño
Los archivos `.dc.html` de la raíz de este zip son **referencias de diseño hechas en HTML** (prototipos con estilos inline). **No son código para copiar.** La tarea es **recrearlos en el código existente** (React + Tailwind v4 + los componentes de `components/ui/`) siguiendo sus patrones. Para abrirlos, sirve la carpeta raíz del zip con un servidor estático (por ejemplo `npx serve .`) y abre cada `.dc.html` en el navegador (necesitan `support.js`, que está en la misma carpeta).

| Archivo | Qué es |
|---|---|
| `TurnoFlash Rediseño.dc.html` | Lienzo principal: principios, 5 pantallas móviles en claro y en oscuro, "antes" (capturas actuales) y la hoja de componentes |
| `TF Screen.dc.html` | Las pantallas móviles (prop `screen`: home, turnos, detalle, servicios, clientes). **Fuente de verdad de medidas** de la app |
| `TF Componentes.dc.html` | Hoja de tokens y primitivas (colores, tipografía, Button, Tag, StatusTag, Field, Search, Segmented, FilterChips, Switch, Avatar, ListRow, EmptyState) |
| `TurnoFlash Landing.dc.html` | Landing completa (reemplaza `app/(app)/home-client.tsx` + `components/landing/PricingSection.tsx`) |
| `logo/3a-*.svg` | Isotipo nuevo |
| `ref/*.png` | Capturas del estado actual (solo como comparación) |

## Fidelidad
**Alta fidelidad (hifi).** Los colores, tamaños, radios, pesos y textos son finales. Los valores exactos están en los `.md` de esta carpeta y en los estilos inline de los `.dc.html`; ante una duda, manda el `.dc.html`.

**Íconos:** son de Lucide (`lucide-react`, ya instalado). En los prototipos se cargan desde `lucide-static@0.468.0`, así que el nombre del archivo es el nombre del ícono (`house` → `House`, `layout-grid` → `LayoutGrid`, `message-circle` → `MessageCircle`, `ellipsis-vertical` → `EllipsisVertical`). Tamaño 20–22px en navegación y 16–18px dentro de controles; `strokeWidth` por defecto (2).

## Fases de implementación

### Fase 0 · Preparación (sin cambios visuales)
1. Copia esta carpeta `handoff/` al repo como `docs/design/v2/` y los `.dc.html` como `docs/design/v2/reference/`.
2. Crea la rama `redesign-v2`.

### Fase 1 · Tokens y fuentes
Detalle en `01-TOKENS.md`.
1. Reemplaza `app/globals.css` por `handoff/globals.css` (mismos nombres de token, valores nuevos, sin Arial, mesh aplanados, glow en `none`).
2. En `app/layout.tsx`, cambia `Inter` por `Geist`, `Geist_Mono` e `Instrument_Serif` de `next/font/google` (snippet en `01-TOKENS.md`).
3. Cambia `theme_color` en `public/manifest.json` a `#147a42` y `background_color` a `#f5f4f0`.
4. Busca y corrige los usos de `primary-500` como texto o fondo en modo claro: ahora es el verde **claro** de modo oscuro. En claro, usa `primary` o `primary-600`. Comando: `grep -rn "primary-500" app components`.

✅ Verificación: la app compila, se ve en Geist, el fondo de página es crema `#f5f4f0` y no queda ningún gradiente.

### Fase 2 · Primitivas `components/ui/`
Detalle en `02-COMPONENTES.md`.
1. Rehaz `button`, `card`, `badge` (pasa a ser Tag), `status-badge`, `avatar`, `alert`, `sheet` (+`Field`, `SheetFooter`, `sheetInputClasses`), `select`, `kebab-menu`, `confirm-sheet`, `skeleton` y `logo`. **Mantén las APIs existentes**: los variants viejos (`mesh-primary`, `soft`, `success`, `info`…) pasan a ser alias de los nuevos, para no tocar los ~40 call sites.
2. Crea los componentes nuevos: `Switch`, `SearchInput`, `SegmentedControl`, `FilterChips`, `ListGroup` + `ListRow`, `EmptyState`, `PageHeader`, `SectionLabel`, `IconTile`, `Spinner`. Expórtalos todos desde `components/ui/index.ts`.

✅ Verificación: ninguna pantalla rompe, y botones, badges, sheets e inputs ya se ven con el estilo nuevo.

### Fase 3 · Navegación y shell
1. `MobileTopbar`: logo + nombre del negocio + campana + avatar. Sin hamburguesa.
2. `MobileTabBar`: Inicio · Turnos · **+** · Clientes · **Más**. El "+" es sólido, sin glow ni translate.
3. `Drawer` pasa a ser `MoreSheet`, un bottom sheet que se abre desde "Más".
4. `Sidebar` (escritorio): restyle.
5. **Elimina todos los FAB** (`fixed bottom-24 right-4 … mesh-primary`) de customers, services, staff, organizations y trips/details. El "Nuevo X" va en el `PageHeader`.
6. Reemplaza todos los usos de `mesh-*` en el JSX (`grep -rn "mesh-" app components`) y después borra esas clases de `globals.css`.

### Fase 4 · Pantallas con layout propio
Detalle en `03-PANTALLAS.md`. Orden:
1. Inicio: `app/(app)/dashboard/page.tsx`.
2. Turnos: lista, día y semana, más el detalle.
3. Servicios, Clientes y Profesionales.
4. Reminders, Users, Organizations y Trips (aplican los mismos patrones de lista).
5. Login y Register (aplican tokens y componentes, sin diseño específico).
6. **Landing**: `home-client.tsx` + `PricingSection.tsx`.

### Fase 5 · Logo y assets
Detalle en `04-ASSETS.md`. Reemplaza el isotipo, los íconos PWA, el favicon, la imagen de OpenGraph y los íconos y splash de Capacitor.

## Reglas para Claude Code
- **Cambios quirúrgicos** (ver `CLAUDE.md` del repo): no toques hooks, services, queries ni lógica de negocio. Sólo presentación.
- No inventes datos: si un diseño muestra un dato que hoy no existe (por ejemplo "Última visita" en Clientes), usa el fallback indicado en `03-PANTALLAS.md`.
- **No uses** `text-[9px]`, `text-[10px]` ni `text-[11px]` (salvo el label de la tab bar). Usa la escala `text-caption/meta/body/lead/title/display`.
- **No uses** `font-extrabold`. Pesos permitidos: 400, 500, 600 y 700 (este último solo para el logotipo y los precios grandes).
- **No uses** `uppercase tracking-…` para labels. Los labels van en sentence case, `text-meta font-semibold text-foreground-muted`.
- **Nada de emoji** en la UI (por ejemplo, quita el 👋 del saludo y el 🚫 de la pantalla bloqueada).
- **Contraste**: texto sobre `bg-primary` = `text-primary-foreground` (blanco en claro, verde oscuro en oscuro). Nunca `text-white` fijo sobre primary.
- Revisa cada pantalla en **claro y oscuro** y en **390px** de ancho.

## Archivos de este handoff
- `README.md`: este archivo.
- `globals.css`: reemplazo completo de `app/globals.css`.
- `01-TOKENS.md`: tokens, fuentes y cómo usarlos.
- `02-COMPONENTES.md`: especificación de cada primitiva.
- `03-PANTALLAS.md`: especificación por pantalla, landing incluida.
- `04-ASSETS.md` y `assets/`: logo, íconos, favicon, OpenGraph y Capacitor.
