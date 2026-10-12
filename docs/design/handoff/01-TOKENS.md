# 01 · Tokens y fuentes

El archivo `globals.css` de esta carpeta es el reemplazo completo de `app/globals.css`. Esta guía explica qué cambió y cómo usar cada token.

## Colores

| Rol (nombre en el diseño) | Token Tailwind | Claro | Oscuro |
|---|---|---|---|
| Fondo de página (`bg`) | `bg-background` | `#f5f4f0` | `#0f100f` |
| Superficie (`surface`) | `bg-surface` | `#ffffff` | `#181a18` |
| Superficie 2 (`surface-2`) | `bg-surface-2` | `#efede8` | `#222422` |
| Hover sobre surface | `bg-muted` | `#f5f4f0` | `#1d1f1d` |
| Divisor (`line`) | `border-border` / `bg-border` | `#e6e3dc` | `#2a2d2a` |
| Borde de control (`line-2`) | `border-border-2` | `#d6d2c8` | `#383b38` |
| Texto (`ink`) | `text-foreground` | `#161714` | `#f2f1ec` |
| Texto 2 (`ink-2`) | `text-foreground-muted` | `#4b4c47` | `#b6b5ae` |
| Texto 3 (`ink-3`) | `text-foreground-subtle` | `#85857d` | `#7c7c75` |
| Acción (`accent`) | `bg-primary` / `text-primary` | `#147a42` | `#38b86c` |
| Texto sobre acción | `text-primary-foreground` | `#ffffff` | `#06210f` |
| Acción suave (`accent-soft`) | `bg-primary-100` · dark `bg-primary-900` | `#e2f0e6` | `#16301f` |
| Texto acento (`accent-text`) | `text-primary-700` · dark `text-primary-400` | `#0e5e32` | `#6dd497` |
| Fucsia (`pink`) | `bg-secondary` / `text-secondary` | `#c4206a` | `#ee5a9c` |
| Fucsia suave (`pink-soft`) | `bg-secondary-100` · dark `bg-secondary-900` | `#fae7ef` | `#3a1828` |
| Aviso (`warn`) | `text-warning-700` · dark `text-warning-400` | `#9a6200` | `#f0b54a` |
| Aviso suave | `bg-warning-100` · dark `bg-warning-900` | `#fbf0d6` | `#3a2c0f` |
| Peligro (`danger`) | `text-danger-600` · dark `text-danger-400` | `#c0352b` | `#f0675c` |
| Peligro suave | `bg-danger-100` · dark `bg-danger-900` | `#fbe5e2` | `#3b1a17` |
| Invertido (chip activo) | `bg-inverse text-inverse-foreground` | `#161714` / `#fff` | `#f2f1ec` / `#0f100f` |
| Overlay de sheet | `bg-overlay` | `rgba(22,23,20,.38)` | `rgba(0,0,0,.55)` |

> Patrón para pares claro/oscuro: `bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400`. Es el mismo patrón que ya usa el código, solo cambian los números.

### Colores de estado de turno (`.st-{status}`)
Se aplican con la clase `st-{status}`. El estado ya **no tiñe** badges ni filas: solo un **punto de 7px** con `var(--st-c)`. El calendario Día/Semana usa `var(--st-tint)` como fondo del bloque.

| Estado | Label nuevo sugerido | `--st-c` |
|---|---|---|
| pending | Pendiente | `#a8a296` |
| confirmed | Confirmado | `#3b7ddd` |
| reminded | Avisado | `#8b5cf6` |
| client_confirmed | Confirmó | `#0fa3a3` |
| checked_in | Llegó | `#e0a106` |
| in_progress | En curso | `#ea6c1b` |
| completed | Terminado | `#2a9d5c` |
| cancelled | Cancelado | `#dc3d3d` |
| no_show | No vino | `#77776f` |
| rescheduled | Reprogramado | `#0e8ec9` |

Actualiza `label` en `utils/appointment-status.ts` con estos textos, que son más cortos y caben en una pill. Los `NEXT_ACTIONS` sugeridos son:
- confirmed, reminded y client_confirmed → "Llegó"
- checked_in → "Empezar"
- in_progress → "Terminar"

Ajústalos solo si el dueño del producto lo aprueba; si no, deja los actuales.

### Colores de servicio y de staff
Son los que ya guarda la base de datos (`service.color`, `staff.color`). En el diseño se muestran:
- como un punto de 6×6 con radio 2 al lado del nombre del servicio;
- como un tile de 42×42 con radio 13, fondo `color + "22"` (alpha 13%) y un cuadrado interior de 12×12 con radio 4.

## Tipografía

### `app/layout.tsx`
```tsx
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// <body className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
```
Borra la importación de `Inter`. El `body` ya usa `var(--font-sans)` desde `globals.css`.

### Escala
| Token | Clase | Uso | Especificación |
|---|---|---|---|
| display | `font-display text-display` | Título de pantalla ("Turnos"), saludo del Inicio | Instrument Serif 40/1.05, `tracking-[-0.01em]` |
| display XL | `font-display text-[60px] leading-[0.9]` | Número grande del resumen del día | Instrument Serif 60 |
| title | `text-title font-semibold tracking-[-0.01em]` | Título de sheet, nombre en el detalle | Geist 20/600 |
| lead | `text-lead font-semibold` | Títulos de card, preguntas de la FAQ | Geist 17/600 |
| body | `text-body` | Nombre en filas (`font-semibold`), inputs, texto | Geist 15 |
| meta | `text-meta` | Línea secundaria de fila, subtítulos, labels de sección (`font-semibold text-foreground-muted`) | Geist 13 |
| caption | `text-caption` | Duración, días del calendario, tags | Geist 12 |
| tab label | `text-[11px]` | **Solo** en la tab bar | Geist 11 · 500, o 600 si está activa |
| data | `font-mono tabular-nums` | Horas, precios, N° de turno, teléfonos, contadores | Geist Mono 15 o 13, peso 500 |

**Regla:** horas, precios, contadores y números de turno siempre van en `font-mono`.

## Radios
| Token | Clase | Uso |
|---|---|---|
| 7px | `rounded-tag` | Tag |
| 9–10px | `rounded-[9px]` / `rounded-[10px]` | Segmento activo, botón pequeño |
| 12px | `rounded-control` | Botones md, inputs, icon buttons, segmented |
| 13–14px | `rounded-[14px]` | Botones lg, SearchInput, botón "+" de la tab bar, day chips |
| 20px | `rounded-card` | Cards y ListGroup |
| 28px | `rounded-t-sheet` | Esquinas superiores del bottom sheet |
| full | `rounded-full` | Avatares, StatusTag, chips de filtro, switch |

## Sombras
Solo `shadow-card` (`0 1px 2px rgba(22,23,20,.05)`) en cards y en el segmento activo. Sin glow y sin `shadow-lg` en la UI de la app (solo las cards flotantes de la landing llevan una sombra suave, ver `03-PANTALLAS.md`).

## Espaciado
- Usa la escala de Tailwind (4px). Márgenes laterales de pantalla en móvil: **20px** (`px-5`).
- Separación entre secciones: 28px. Label de sección a card: 10px.
- Padding de fila: `py-3.5 px-4` (14/16px). Padding de card: 16–20px.
- Altura de controles: botón sm 36 · md 44 · lg 54; input 48; chip 36; tab bar 48 + 30 de safe area.
