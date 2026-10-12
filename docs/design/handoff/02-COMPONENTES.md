# 02 · Componentes (`components/ui/`)

Referencia visual: `TF Componentes.dc.html` y `TF Screen.dc.html`. **Mantén las props existentes** de cada componente. Lo que se indica aquí es el aspecto nuevo y las props nuevas, que siempre son opcionales.

---

## Button · `button.tsx`
Variants **nuevos** y alias de los viejos, para no tocar los call sites:

| Variant | Estilo | Alias que mapean aquí |
|---|---|---|
| `primary` | `bg-primary text-primary-foreground hover:brightness-95` | `mesh-primary`, `success` |
| `secondary` | `bg-surface border border-border-2 text-foreground hover:bg-muted` | `ghost` (viejo), `soft`, `info`, `warning` |
| `ghost` | `bg-transparent text-foreground-muted hover:bg-muted hover:text-foreground` | — (antes `ghost` tenía borde: los call sites viejos pasan a `secondary`) |
| `danger` | `bg-surface border border-border-2 text-danger-600 dark:text-danger-400 hover:bg-danger-100 dark:hover:bg-danger-900` | — |
| `danger-solid` | `bg-danger text-white` (solo en el botón de confirmar de `ConfirmSheet`) | — |
| `whatsapp` | `bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400 hover:brightness-95` | `mesh-secondary`, `secondary` (viejo) |

> Ojo: `secondary` cambia de significado (antes era fucsia, ahora es el botón con borde). Haz el mapeo de alias en un solo objeto `ALIASES` dentro de `button.tsx` y, cuando termine la migración, renombra los call sites con un find & replace.

| Size | Alto | Padding | Radio | Texto |
|---|---|---|---|---|
| `sm` | 36px `h-9` | `px-3` | `rounded-[10px]` | `text-meta font-semibold` |
| `md` | 44px `h-11` | `px-[18px]` | `rounded-control` | `text-body font-semibold` |
| `lg` | 54px `h-[54px]` | `px-[22px]` | `rounded-[14px]` | `text-[16px] font-semibold` |
| `icon` | 44×44 | — | `rounded-control` | ícono 20px |

- Base: `inline-flex items-center justify-center gap-2 transition-[background-color,filter] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 dark:focus-visible:ring-primary-900`.
- Sin `shadow-glow`, sin `translate-y` y sin `rounded-md`.
- Prop nueva `loading?: boolean`: muestra `<Spinner size={16} />` a la izquierda y pone `aria-busy`.
- **Regla de pantalla:** un solo `primary` visible por vista.

## Card · `card.tsx`
`bg-surface rounded-card border border-border shadow-card`. `flat` quita el borde y la sombra. Sin cambios de API.

## ListGroup + ListRow · **NUEVO** `list.tsx`
Reemplaza el patrón de una `Card` por ítem en Turnos, Clientes, Servicios, Staff, Users, Organizations y Trips.
```tsx
<ListGroup>            {/* rounded-card border border-border bg-border grid gap-px overflow-hidden shadow-card */}
  <ListRow             {/* bg-surface flex items-center gap-3.5 px-4 py-3.5 ; hover:bg-muted si hay onClick */}
    leading={...}      // time block | Avatar | ServiceSwatch
    title="Sofía Hernández"            // text-body font-semibold truncate
    subtitle="Coloración · Lucía F."   // text-meta text-foreground-muted, mt-[3px]
    subtitleDot="#e59a0b"              // opcional: punto 6×6 rounded-[2px] antes del subtítulo
    trailing={<StatusTag status="checked_in" />}  // | Switch | ChevronRight 18px text-foreground-subtle
    dimmed={status === "completed"}    // opacity-55
    onClick={...}
  />
</ListGroup>
```
- **Time block** (leading de turno): `flex flex-col gap-0.5 min-w-12`. La hora va en `font-mono text-body font-medium` y la duración en `text-caption text-foreground-subtle`.
- Los divisores salen del `gap-px` sobre `bg-border`, así que no hay `border-b` en las filas.
- Si una fila necesita `KebabMenu`, va como `trailing`. Preferible: tocar la fila abre el detalle o la edición.

## SectionLabel · **NUEVO**
`flex items-center gap-2 px-1 pt-7 pb-2.5 text-meta font-semibold text-foreground-muted`. Lleva un contador opcional en `font-mono font-medium text-foreground-subtle` y una acción opcional a la derecha (`text-meta font-semibold text-primary-700 dark:text-primary-400`, por ejemplo "Ver agenda"). **Sentence case, nunca en mayúsculas.** Reemplaza todos los `text-[11px] font-bold uppercase tracking-[0.06em]`.

## PageHeader · **NUEVO**
```tsx
<PageHeader title="Servicios" subtitle="3 activos · 1 pausado" actions={<Button size="md" variant="secondary"><Plus/>Nuevo</Button>} />
```
- Contenedor: `flex items-end justify-between gap-3 px-5 pt-4`.
- Título: `font-display text-display`. Subtítulo: `text-meta text-foreground-subtle mt-0.5`.
- Debajo, opcionalmente (con `flex flex-col gap-4 pt-[18px]`): `SearchInput`, `FilterChips`.
- **No es sticky** en móvil: lo que queda fijo es la topbar. En escritorio puede ser sticky con `bg-background/90 backdrop-blur`.

## SearchInput · **NUEVO**
`h-12 rounded-[14px] bg-surface-2 px-3.5 flex items-center gap-2.5`. Ícono `Search` de 18px en `text-foreground-subtle`. Input sin borde, `bg-transparent text-body placeholder:text-foreground-subtle`. En foco: `ring-4 ring-primary-100 dark:ring-primary-900 bg-surface`. Botón de limpiar (`X` 16px) cuando hay texto.

## Field + inputs · `sheet.tsx`
- `Field` label: `text-meta font-medium text-foreground-muted mb-1.5`, **sin mayúsculas**. Hint: `text-caption text-foreground-subtle mt-1`. Error: `text-caption text-danger-600 mt-1`.
- `sheetInputClasses`: `block w-full h-12 rounded-control border border-border-2 bg-surface px-3.5 text-body text-foreground placeholder:text-foreground-subtle transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900 aria-[invalid=true]:border-danger-600`. Para textarea: `h-auto min-h-24 py-3`.
- `Select` usa las mismas clases y el chevron en `text-foreground-subtle`.

## Sheet · `sheet.tsx`
- Overlay: `bg-overlay`.
- Panel: `rounded-t-sheet sm:rounded-card bg-surface shadow-none sm:border sm:border-border`.
- Handle: `h-[5px] w-10 rounded-full bg-border-2`, con `pt-2.5 pb-3`.
- Header: el título en `text-title font-semibold tracking-[-0.01em]` y el subtítulo en `text-meta text-foreground-muted`. Botón de cerrar de 40×40, `rounded-control bg-surface-2`, ícono `X` de 18px.
- Padding del body: `px-5 pb-[34px]` (+ safe area).
- `SheetFooter`: `border-t border-border bg-surface px-5 py-3 gap-2`. Los botones van en `lg`, el primario a la derecha y ocupando `flex-1`.

## Tag (antes Badge) · `badge.tsx`
`inline-flex h-6 items-center rounded-tag px-[9px] text-caption font-semibold`. Sin borde. Tonos:

| variant | claro | oscuro |
|---|---|---|
| `muted` (default) | `bg-surface-2 text-foreground-muted` | igual |
| `primary` / `success` | `bg-primary-100 text-primary-700` | `bg-primary-900 text-primary-400` |
| `secondary` | `bg-secondary-100 text-secondary-600` | `bg-secondary-900 text-secondary-400` |
| `warning` | `bg-warning-100 text-warning-700` | `bg-warning-900 text-warning-400` |
| `danger` | `bg-danger-100 text-danger-600` | `bg-danger-900 text-danger-400` |
| `info` | igual que `muted` | |

Reemplaza los chips hechos a mano (`rounded-full border border-*-600 bg-*-50 …`) en `ServiceCard`, `CustomerCard`, `StaffCard`, `TripCard`, `UserCard` y `OrganizationCard` por `<Badge variant=…>`.
- Roles: admin = `secondary`, owner = `primary`, staff = `muted`, special = `warning`.
- **Sin uppercase.**

## StatusTag · `status-badge.tsx`
`st-{status} inline-flex h-[26px] items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-caption font-medium text-foreground-muted whitespace-nowrap`, con un punto `size-[7px] rounded-full bg-[var(--st-c)]`. `size="sm"` lo deja en `h-[22px] px-2 text-[11px]`. En el detalle de turno puede llevar un sufijo de hora: "Llegó · 11:24".

## Switch · **NUEVO** `switch.tsx`
`role="switch" aria-checked`. Track `w-11 h-[26px] rounded-full p-0.5`: encendido `bg-primary`, apagado `bg-border-2`. Thumb `size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-transform`, `translate-x-[18px]` cuando está encendido. Área táctil mínima de 44px (envuélvelo en un `button` con `p-2 -m-2`). Reemplaza el switch inline de `ServiceCard` y los checkbox de "activo" en los formularios.

## SegmentedControl · **NUEVO**
Contenedor `inline-flex p-[3px] rounded-control bg-surface-2`. Segmento `h-[34px] px-3 rounded-[9px] text-meta font-semibold`. Activo: `bg-surface text-foreground shadow-card`. Inactivo: `text-foreground-subtle`. Úsalo en Lista/Día/Semana (Turnos) y en el período de facturación (Precios).

## FilterChips · **NUEVO**
Fila `flex gap-2 overflow-x-auto scrollbar-none px-5`. Chip `h-9 px-3.5 rounded-full text-meta font-semibold flex items-center gap-1.5 shrink-0`, con contador en `font-mono font-medium opacity-60`. Activo: `bg-inverse text-inverse-foreground border border-inverse`. Inactivo: `bg-surface border border-border-2 text-foreground-muted`. Reemplaza los chips de estado de Turnos y los de Activos/Inactivos de Clientes.

## Avatar · `avatar.tsx`
Iniciales en `font-semibold`, **fondo tintado suave + texto oscuro del mismo tono**, sin sombra interior. Paleta de 5 pares `[bg, fg]`:
```ts
["#e4e7fb","#3f43b8"], ["#dcefe2","#1d6d3d"], ["#fbe9d3","#9a5a0f"], ["#f8e1ec","#a3215c"], ["#dfeefa","#1f5e95"]
```
En oscuro usa `[fg con alpha 22%, fg aclarado]`, o simplemente `bg-surface-2 text-foreground-muted`. Elige el color con un **hash de todo el id** (suma de char codes % 5), no con el último carácter. Prop nueva `seed?: string`. Si pasan `color`, se respeta (para el staff con color propio): `bg = color+"22"`, `fg = color`. Tamaños: 34 en la topbar, 40 en filas y 52 en el detalle; el texto va a `size*0.36`.

## IconTile · **NUEVO**
`size-10 rounded-control bg-surface-2 flex items-center justify-center`, ícono de 20px en `text-foreground`. Variantes de tono: `pink` (`bg-secondary-100 text-secondary-600` / dark `bg-secondary-900 text-secondary-400`) y `primary`. Reemplaza todos los `mesh-*` cuadrados con ícono blanco.

## EmptyState · **NUEVO**
`border border-dashed border-border-2 rounded-card px-5 py-7 flex flex-col items-center text-center gap-1.5`. Lleva:
1. `IconTile` de 44px con `mb-1.5`;
2. título en `text-body font-semibold`;
3. texto en `text-meta text-foreground-muted`;
4. acción opcional: `Button size="sm" variant="secondary"` con `mt-2.5`.

Reemplaza los empty states repetidos de Customers, Services, Staff, Appointments y el Dashboard.

## Spinner · **NUEVO**
`size-5 rounded-full border-2 border-border-2 border-t-foreground animate-spin`. La carga de página completa usa `Spinner` + `text-meta text-foreground-muted`. Mejor todavía: usa los `skeleton` con `bg-surface-2 animate-pulse rounded-control`.

## Alert · `alert.tsx`
`rounded-card p-4 text-meta flex gap-3`, con ícono de 18px. Tonos con los mismos pares que Tag. Úsalo para los banners de licencia y el de sin organización (quita el `<svg>` dibujado a mano en `dashboard/page.tsx` y usa `AlertTriangle` de Lucide).

## KebabMenu · `kebab-menu.tsx`
- Trigger: 40×40, `rounded-control`, ícono `EllipsisVertical` de 20px en `text-foreground-subtle`, `hover:bg-muted`.
- Menú: `bg-surface border border-border rounded-[14px] shadow-[0_12px_32px_-12px_rgba(22,23,20,.25)] p-1.5 min-w-44`.
- Ítems: `h-10 px-3 rounded-[9px] text-body hover:bg-muted`. Los peligrosos van en `text-danger-600 dark:text-danger-400`.

## ConfirmSheet · `confirm-sheet.tsx`
Usa `Sheet`. El cuerpo va en `text-body text-foreground-muted`. Footer: `Button secondary lg` para "Cancelar" y `danger-solid` o `primary` lg para confirmar.

## Toasts (sonner) · `app/layout.tsx`
`<Toaster position="top-center" closeButton={false} richColors={false} toastOptions={{ className: "!rounded-[14px] !border-border !bg-surface !text-foreground !shadow-card !font-sans" }} />`. Los íconos de éxito y error toman el color del tono, sin fondos de color completos.

## Logo · `logo.tsx`
Renderiza el isotipo 3a **inline como SVG** con `fill="var(--color-primary)"` y `fill="var(--color-secondary)"`, para que se adapte al tema (ver `04-ASSETS.md`). Prop nueva `withWordmark?: boolean`: añade `<span className="font-bold tracking-[-0.045em]">turno<span className="text-primary">flash</span></span>`, con tamaño de texto ≈ `size*0.75`.
