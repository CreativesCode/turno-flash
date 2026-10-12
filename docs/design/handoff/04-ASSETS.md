# 04 · Logo y assets

Logo elegido: **isotipo 3a**. Son dos filas de agenda inclinadas, en verde, más un punto fucsia que representa "el turno de ahora". El logotipo es el nombre "**turno**flash" en minúsculas, en Geist 700 con `tracking -0.045em`: "turno" va en el color del texto y "flash" en el color primario.

## Geometría (viewBox 0 0 48 48)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <g transform="skewX(-20)">
    <rect x="17" y="8"  width="30" height="10" rx="5" fill="#147a42"/>
    <rect x="19" y="21" width="20" height="10" rx="5" fill="#147a42"/>
  </g>
  <circle cx="12.5" cy="39" r="5.2" fill="#c4206a"/>
</svg>
```
| Versión | Filas | Punto | Uso |
|---|---|---|---|
| light | `#147a42` | `#c4206a` | Fondos claros |
| dark | `#38b86c` | `#ee5a9c` | Fondos oscuros |
| white | `#ffffff` | `#ffc2db` | Sobre el verde de marca |

Área de respeto mínima: 25% del tamaño a cada lado. Tamaño mínimo: 16px.

## `components/ui/logo.tsx` (nuevo)
Renderízalo **inline** para que se adapte al tema, en lugar de `next/image`:
```tsx
export function Logo({ size = 28, withWordmark = false, className = "" }: { size?: number; withWordmark?: boolean; className?: string; priority?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden={withWordmark} aria-label={withWordmark ? undefined : "TurnoFlash"} className="shrink-0">
        <g transform="skewX(-20)">
          <rect x="17" y="8" width="30" height="10" rx="5" className="fill-primary" />
          <rect x="19" y="21" width="20" height="10" rx="5" className="fill-primary" />
        </g>
        <circle cx="12.5" cy="39" r="5.2" className="fill-secondary" />
      </svg>
      {withWordmark && (
        <span className="font-bold tracking-[-0.045em] text-foreground" style={{ fontSize: Math.round(size * 0.72) }}>
          turno<span className="text-primary">flash</span>
        </span>
      )}
    </span>
  );
}
```
Mantén la prop `priority` (ignorada) para no romper los call sites.

## Archivos en `handoff/assets/` → destino en el repo
| Archivo | Destino | Notas |
|---|---|---|
| `svg/isotipo-light.svg` | `public/images/isotipo.svg` | Reemplaza al actual. Lo usa `scripts/generate-icons.js` |
| `svg/isotipo-dark.svg` | `public/images/isotipo-dark.svg` | |
| `svg/isotipo-white.svg` | `public/images/isotipo-white.svg` | |
| `public/favicon.ico` | `app/favicon.ico` **y** `public/favicon.ico` | Incluye 16, 32 y 48 px |
| `public/icon-192.png` | `public/icon-192.png` | Fondo crema `#f5f4f0` |
| `public/icon-512.png` | `public/icon-512.png` | |
| `public/icon-maskable-512.png` | `public/icon-maskable-512.png` | Marca al 46%, dentro de la zona segura |
| `public/apple-touch-icon.png` | `public/apple-touch-icon.png` | 180×180 |
| `public/opengraph-image.jpg` | `public/opengraph-image.jpg` **y** `public/images/opengraph.jpg` | 1200×630, "Tu agenda, en piloto automático." |
| `capacitor/icon-only.png` | `assets/icon-only.png` (raíz del repo) | 1024, para `@capacitor/assets` |
| `capacitor/icon-foreground.png` | `assets/icon-foreground.png` | 1024 con fondo transparente (ícono adaptativo de Android) |
| `capacitor/icon-background.png` | `assets/icon-background.png` | 1024 sólido `#f5f4f0` |
| `capacitor/splash.png` | `assets/splash.png` | 2732, fondo crema |
| `capacitor/splash-dark.png` | `assets/splash-dark.png` | 2732, fondo `#0f100f` |

Además:
- **Borra** `public/images/logo_horizontal.svg` y `logo_vertical.svg` si ya nadie los usa (`grep -rn "logo_horizontal\|logo_vertical"`). Los lockups se arman con `<Logo withWordmark />`.
- `public/manifest.json`: `"theme_color": "#147a42"`, `"background_color": "#f5f4f0"`.
- `app/layout.tsx`: añade `<meta name="theme-color" content="#f5f4f0" media="(prefers-color-scheme: light)">` y `content="#0f100f"` para oscuro. Actualiza `useCapacitor` (status bar) con esos mismos colores de fondo.

## Íconos y splash nativos
Opción recomendada, con un solo comando que genera todos los tamaños de Android e iOS:
```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#f5f4f0' --iconBackgroundColorDark '#0f100f' --splashBackgroundColor '#f5f4f0' --splashBackgroundColorDark '#0f100f'
```
La alternativa es mantener `scripts/generate-icons.js` y cambiar ahí:
- todos los `background: { r: 255, g: 255, b: 255, alpha: 1 }` → `{ r: 245, g: 244, b: 240, alpha: 1 }`;
- en `ic_launcher` y `AppIcon`, redimensiona el SVG al **60%** del lienzo y centrado (hoy va al 100%, sin margen);
- el `iconSize` del foreground adaptativo de `0.66` a `0.44`;
- en el splash, `getLogoSize` de `0.25` a `0.14`.

Después: `npx cap sync`. Revisa el ícono en Android (redondo y squircle) y en iOS.

> La tienda (Play Store) necesita screenshots y un feature graphic nuevos cuando la app ya esté migrada: regenera `store-assets/` con capturas reales.
